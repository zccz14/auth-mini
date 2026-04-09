# sessions.revoked_at 删除设计

## 背景

- 当前运行时会话语义已经统一收敛到 `expires_at`。
- `src/modules/session/repo.ts` 与 `src/modules/users/repo.ts` 不再读写 `revoked_at`。
- `sessions.revoked_at` 仅残留在 schema 与测试辅助代码中，属于遗留字段。

## 目标

- 从仓库 schema 与测试中彻底删除 `sessions.revoked_at`。
- 对指定数据库 `auth.zccz14.com.sqlite` 执行一次性迁移，物理移除该列。
- 保持现有会话数据与运行时行为不变。

## 非目标

- 不引入通用 migration 框架。
- 不修改会话业务语义；仍以 `expires_at` 作为唯一失效判定。
- 不处理除 `auth.zccz14.com.sqlite` 之外的其他外部数据库。

## 方案

### 代码与测试

- 从 `sql/schema.sql` 的 `sessions` 表定义删除 `revoked_at`。
- 从 `tests/helpers/db.ts` 的 legacy schema 删除 `revoked_at`。
- 调整 `tests/integration/sessions.test.ts`，不再构造带 `revoked_at` 的会话行；保留并强化“`active_sessions` 仅依赖 `expires_at`”这一行为断言。

### 数据库迁移

- 目标文件固定为仓库根目录下的 `auth.zccz14.com.sqlite`；若该文件不存在，则本次迁移直接失败，不做跳过。
- 执行迁移前用 `sqlite3 auth.zccz14.com.sqlite "PRAGMA schema_version;"` 做一次只读探测；若 SQLite 返回 busy/locked，则立即中止，不进入表重建步骤。
- 先为 `auth.zccz14.com.sqlite` 生成同目录时间戳备份，命名规则固定为 `auth.zccz14.com.sqlite.bak-YYYYMMDDHHMMSS`。
- 使用 SQLite 重建表方式迁移：
  1. 在事务内创建 `sessions_new`
     - 结构必须与原 `sessions` 完全等价，只删除 `revoked_at`
     - 保留 `PRIMARY KEY`
     - 保留各列 `NOT NULL`
     - 保留 `created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`
     - 保留 `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
  2. 从旧 `sessions` 拷贝 `id, user_id, refresh_token_hash, expires_at, created_at`
  3. 删除旧表
  4. 将 `sessions_new` 重命名为 `sessions`
- 迁移后校验：
  - `PRAGMA table_info(sessions)` 不包含 `revoked_at`
  - 迁移前后 `sessions` 行数一致
  - `created_at` 保持原值
  - `PRAGMA foreign_key_check` 为空
  - `PRAGMA integrity_check` 返回 `ok`

### 回滚

- 只有在迁移后校验失败时才执行备份恢复。
- 若事务执行阶段就失败，则依赖 SQLite 回滚，保留原库与备份文件，不做覆盖恢复。
- 若事务提交后校验失败，则先停止占用该数据库的进程，再用本次迁移刚生成的 `auth.zccz14.com.sqlite.bak-YYYYMMDDHHMMSS` 覆盖恢复 `auth.zccz14.com.sqlite`。
- 恢复后至少重新执行 `PRAGMA table_info(sessions)` 与 `PRAGMA integrity_check`，确认库已回到可用状态。

## 风险与约束

- SQLite 删除列在兼容性上不如重建表稳定，因此采用重建表而不是依赖 `ALTER TABLE ... DROP COLUMN`。
- 若目标数据库在迁移期间被其他进程占用，事务可能失败；失败时保留原库与备份文件，由人工重试。
- 仓库中的 `bootstrapDatabase` 目前只执行 schema 文件，不会自动把已存在数据库的多余列删掉，因此目标库必须单独迁移。
- 若仓库中存在其他相似数据库副本，本轮只处理用户明确指定的 `auth.zccz14.com.sqlite`，避免误迁移。

## 验收

- `sql/schema.sql` 与 `tests/helpers/db.ts` 中的 `sessions` 定义都不再包含 `revoked_at`。
- `tests/integration/sessions.test.ts` 明确验证 `/me` 的 `active_sessions` 仅依赖 `expires_at`。
- `npm test -- tests/integration/sessions.test.ts` 通过。
- `auth.zccz14.com.sqlite` 迁移完成且已无 `revoked_at` 列。
- `auth.zccz14.com.sqlite` 迁移后 `sessions` 行数与迁移前一致，且 `foreign_key_check` / `integrity_check` 通过。
