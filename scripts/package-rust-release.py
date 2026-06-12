from pathlib import Path
import hashlib
import os
import tarfile
import zipfile


target = os.environ["TARGET"]
binary = os.environ["BINARY"]
archive_name = os.environ["ARCHIVE"]

binary_path = Path("rust-backend") / "target" / target / "release" / binary
dist_dir = Path("dist")
dist_dir.mkdir(exist_ok=True)
archive_path = dist_dir / archive_name

if archive_name.endswith(".zip"):
    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.write(binary_path, binary)
else:
    with tarfile.open(archive_path, "w:gz") as archive:
        archive.add(binary_path, binary)

checksum = hashlib.sha256(archive_path.read_bytes()).hexdigest()
checksum_path = archive_path.with_name(f"{archive_name}.sha256")
checksum_path.write_text(f"{checksum}  {archive_name}\n", encoding="utf-8")
