use std::{
    io,
    path::{Path, PathBuf},
    time::Instant,
};

use rusqlite::Connection;
use serde::Serialize;
use sysinfo::{CpuRefreshKind, Disks, Networks, Pid, ProcessesToUpdate, System};

#[derive(Debug, Serialize)]
pub(crate) struct SystemResourcesSnapshot {
    pub sampled_at: i64,
    pub sample_interval_ms: u64,
    pub cpu: CpuSnapshot,
    pub memory: MemorySnapshot,
    pub network: NetworkSnapshot,
    pub disk: Option<DiskSnapshot>,
    pub sqlite: SqliteSnapshot,
}

#[derive(Debug, Serialize)]
pub(crate) struct CpuSnapshot {
    pub usage_percent: f32,
    pub load_1m: f64,
    pub logical_cpus: usize,
}

#[derive(Debug, Serialize)]
pub(crate) struct MemorySnapshot {
    pub used_bytes: u64,
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub process_used_bytes: u64,
    pub other_used_bytes: u64,
    pub usage_percent: f64,
    pub swap_used_bytes: u64,
    pub swap_total_bytes: u64,
}

#[derive(Debug, Serialize)]
pub(crate) struct NetworkSnapshot {
    pub receive_bytes_per_second: u64,
    pub transmit_bytes_per_second: u64,
    pub interfaces: usize,
}

#[derive(Debug, Serialize)]
pub(crate) struct DiskSnapshot {
    pub mount_point: String,
    pub used_bytes: u64,
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub usage_percent: f64,
}

#[derive(Debug, Serialize)]
pub(crate) struct SqliteSnapshot {
    pub main_bytes: u64,
    pub wal_bytes: u64,
    pub shm_bytes: u64,
    pub total_bytes: u64,
    pub freelist_bytes: u64,
    pub freelist_percent: f64,
}

pub(crate) struct ResourceMonitor {
    system: System,
    disks: Disks,
    networks: Networks,
    last_sample: Instant,
}

impl ResourceMonitor {
    pub(crate) fn new() -> Self {
        let mut system = System::new();
        system.refresh_memory();
        system.refresh_cpu_list(CpuRefreshKind::nothing().with_cpu_usage());
        Self {
            system,
            disks: Disks::new_with_refreshed_list(),
            networks: Networks::new_with_refreshed_list(),
            last_sample: Instant::now(),
        }
    }

    pub(crate) fn sample(
        &mut self,
        database_path: &Path,
        database: &Connection,
    ) -> io::Result<SystemResourcesSnapshot> {
        self.system.refresh_cpu_usage();
        self.system.refresh_memory();
        let process_id = Pid::from_u32(std::process::id());
        self.system
            .refresh_processes(ProcessesToUpdate::Some(&[process_id]), true);
        self.disks.refresh(true);
        self.networks.refresh(true);

        let now = Instant::now();
        let elapsed = now.duration_since(self.last_sample);
        self.last_sample = now;
        let sample_seconds = elapsed
            .max(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL)
            .as_secs_f64();
        let received = self
            .networks
            .values()
            .map(sysinfo::NetworkData::received)
            .sum::<u64>();
        let transmitted = self
            .networks
            .values()
            .map(sysinfo::NetworkData::transmitted)
            .sum::<u64>();
        let memory_used = self.system.used_memory();
        let memory_total = self.system.total_memory();
        let process_used = self
            .system
            .process(process_id)
            .map(sysinfo::Process::memory)
            .unwrap_or_default();

        Ok(SystemResourcesSnapshot {
            sampled_at: chrono::Utc::now().timestamp(),
            sample_interval_ms: u64::try_from(elapsed.as_millis()).unwrap_or(u64::MAX),
            cpu: CpuSnapshot {
                usage_percent: self.system.global_cpu_usage(),
                load_1m: System::load_average().one,
                logical_cpus: self.system.cpus().len(),
            },
            memory: MemorySnapshot {
                used_bytes: memory_used,
                total_bytes: memory_total,
                available_bytes: self.system.available_memory(),
                process_used_bytes: process_used,
                other_used_bytes: memory_used.saturating_sub(process_used),
                usage_percent: percentage(memory_used, memory_total),
                swap_used_bytes: self.system.used_swap(),
                swap_total_bytes: self.system.total_swap(),
            },
            network: NetworkSnapshot {
                receive_bytes_per_second: rate(received, sample_seconds),
                transmit_bytes_per_second: rate(transmitted, sample_seconds),
                interfaces: self.networks.len(),
            },
            disk: disk_usage(&self.disks, database_path),
            sqlite: sqlite_usage(database_path, database)?,
        })
    }
}

fn disk_usage(disks: &Disks, database_path: &Path) -> Option<DiskSnapshot> {
    let disk = disks
        .list()
        .iter()
        .filter(|disk| database_path.starts_with(disk.mount_point()))
        .max_by_key(|disk| disk.mount_point().components().count())?;
    let total = disk.total_space();
    let available = disk.available_space();
    let used = total.saturating_sub(available);

    Some(DiskSnapshot {
        mount_point: disk.mount_point().to_string_lossy().into_owned(),
        used_bytes: used,
        total_bytes: total,
        available_bytes: available,
        usage_percent: percentage(used, total),
    })
}

fn sqlite_usage(database_path: &Path, database: &Connection) -> io::Result<SqliteSnapshot> {
    let mut snapshot = sqlite_file_usage(database_path)?;
    let (page_size, page_count, freelist_count) = database
        .query_row(
            "SELECT (SELECT * FROM pragma_page_size()), (SELECT * FROM pragma_page_count()), (SELECT * FROM pragma_freelist_count())",
            [],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?, row.get::<_, i64>(2)?)),
        )
        .map_err(io::Error::other)?;
    let page_size = u64::try_from(page_size).map_err(io::Error::other)?;
    let page_count = u64::try_from(page_count).map_err(io::Error::other)?;
    let freelist_count = u64::try_from(freelist_count).map_err(io::Error::other)?;
    snapshot.freelist_bytes = page_size.saturating_mul(freelist_count);
    snapshot.freelist_percent = percentage(freelist_count, page_count);
    Ok(snapshot)
}

fn sqlite_file_usage(database_path: &Path) -> io::Result<SqliteSnapshot> {
    let main_bytes = file_size(database_path)?;
    let wal_bytes = file_size(&with_suffix(database_path, "-wal"))?;
    let shm_bytes = file_size(&with_suffix(database_path, "-shm"))?;
    Ok(SqliteSnapshot {
        main_bytes,
        wal_bytes,
        shm_bytes,
        total_bytes: main_bytes
            .saturating_add(wal_bytes)
            .saturating_add(shm_bytes),
        freelist_bytes: 0,
        freelist_percent: 0.0,
    })
}

fn file_size(path: &Path) -> io::Result<u64> {
    match std::fs::metadata(path) {
        Ok(metadata) => Ok(metadata.len()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(0),
        Err(error) => Err(error),
    }
}

fn with_suffix(path: &Path, suffix: &str) -> PathBuf {
    let mut value = path.as_os_str().to_owned();
    value.push(suffix);
    value.into()
}

fn percentage(used: u64, total: u64) -> f64 {
    if total == 0 {
        0.0
    } else {
        used as f64 / total as f64 * 100.0
    }
}

fn rate(bytes: u64, seconds: f64) -> u64 {
    (bytes as f64 / seconds).round() as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sqlite_file_usage_includes_wal_and_shared_memory_files() {
        let directory =
            std::env::temp_dir().join(format!("auth-mini-resources-{}", std::process::id()));
        std::fs::create_dir_all(&directory).expect("temporary directory creates");
        let database_path = directory.join("auth-mini.sqlite");
        std::fs::write(&database_path, [0_u8; 3]).expect("main database writes");
        std::fs::write(with_suffix(&database_path, "-wal"), [0_u8; 5]).expect("wal writes");
        std::fs::write(with_suffix(&database_path, "-shm"), [0_u8; 7])
            .expect("shared memory writes");

        let snapshot = sqlite_file_usage(&database_path).expect("SQLite usage reads");

        assert_eq!(snapshot.main_bytes, 3);
        assert_eq!(snapshot.wal_bytes, 5);
        assert_eq!(snapshot.shm_bytes, 7);
        assert_eq!(snapshot.total_bytes, 15);
        std::fs::remove_dir_all(directory).expect("temporary directory removes");
    }

    #[test]
    fn missing_sqlite_sidecars_count_as_zero() {
        let path = PathBuf::from("target/no-such-auth-mini-resource.sqlite");

        let snapshot = sqlite_file_usage(&path).expect("SQLite usage reads");

        assert_eq!(snapshot.total_bytes, 0);
    }
}
