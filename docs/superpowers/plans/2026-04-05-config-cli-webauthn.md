# 配置持久化与 CLI 资源化 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 SMTP 和 allowed origins 资源化到数据库与 Oclif topic 命令中，移除 `--smtp-config` / `--origin` 旧路径，并把 WebAuthn `rp_id` 改成按请求选择并持久化的事实字段。

**Architecture:** 先用 schema 与基础 repo/helper 锁死新的持久化模型，再分别改造应用执行层、Oclif 命令层和 WebAuthn 协议链路。CLI 以 `<instance>` 为统一位置参数名，当前仍解析为 SQLite 路径；WebAuthn options 默认从规范化后的 `Origin.hostname` 推导 `rp_id`，verify 阶段绑定 challenge 里的 `origin` 与 `rp_id` 做一致性校验。

**Tech Stack:** TypeScript, Node.js, Oclif, Zod, better-sqlite3, Hono, @simplewebauthn/server, Vitest

---

## 文件结构

- Modify: `sql/schema.sql` - 新 schema：`allowed_origins`，`webauthn_challenges.origin/rp_id`，`webauthn_credentials.rp_id`
- Modify: `src/shared/config.ts` - 删除 `create --smtp-config` / `start --origin` / `start --rp-id` 的运行时输入，统一 `<instance>` 输入语义
- Create: `src/infra/origins/repo.ts` - `allowed_origins` 的 canonicalization 与 CRUD
- Create: `src/app/commands/origin/*.ts` - origin CRUD 的应用执行层
- Create: `src/app/commands/smtp/*.ts` - SMTP CRUD 的应用执行层
- Modify: `src/app/commands/create.ts` - 去掉 SMTP import，仅保留 init/bootstrap
- Modify: `src/app/commands/start.ts` - 从数据库读取 origins，不再接受 CLI origins/rpId
- Modify: `src/commands/create.ts` or rename to `src/commands/init.ts` - 将命令语义改成 `init <instance>`
- Modify/Create: `src/commands/origin/*.ts` - Oclif origin topic 命令
- Modify/Create: `src/commands/smtp/*.ts` - Oclif smtp topic 命令
- Modify: `src/commands/start.ts` - args/help 改成 `<instance>`，移除 `--origin` / `--rp-id`
- Modify: `src/server/app.ts` - 注入数据库 origins；WebAuthn options/verify 改用请求期 `rp_id`
- Modify: `src/shared/http-schemas.ts` - 为 register/authenticate options 新增可选 `rp_id`
- Modify: `src/modules/webauthn/service.ts` - challenge/credential 持久化 `origin` / `rp_id`，verify 绑定 origin + rp_id
- Modify: `src/modules/webauthn/repo.ts` - 新列读写与按 `rp_id` 约束查找 credential
- Modify: `tests/integration/oclif-cli.test.ts` - 新命令面与 breaking CLI 行为
- Modify/Create: `tests/unit/**/*` / `tests/integration/**/*` - origins canonicalization、SMTP/origin CRUD、WebAuthn `rp_id` / origin 约束
- Modify: `README.md` - 新 CLI 命令与配置方式

## Chunk 1: Schema 与基础存储边界

### Task 1: 锁定 breaking schema 与 instance 输入契约

**Files:**

- Modify: `sql/schema.sql`
- Modify: `src/shared/config.ts`
- Test: `tests/unit/shared.test.ts`
- Test: `tests/integration/cli-create.test.ts`

- [ ] **Step 1: 写失败测试，锁定新的 create/init 和 start 输入契约**

```ts
it('rejects create smtp-config flag in the new contract', async () => {
  const result = await runBuiltCli([
    'create',
    '/tmp/auth.sqlite',
    '--smtp-config',
    './smtp.json',
  ]);
  expect(result.exitCode).toBeGreaterThan(0);
});

it('parses start config without origin or rp-id flags', () => {
  expect(
    parseRuntimeConfig({
      dbPath: '/tmp/auth.sqlite',
      issuer: 'https://issuer.example',
    }),
  ).toMatchObject({
    dbPath: '/tmp/auth.sqlite',
    issuer: 'https://issuer.example',
  });
});
```

- [ ] **Step 2: 跑定向测试，确认当前失败**

Run: `npx vitest run tests/unit/shared.test.ts tests/integration/cli-create.test.ts`
Expected: FAIL，旧 schema / 旧 `create` 契约仍接受 `smtpConfig` 或要求 `origin` / `rpId`；`init` 命令名改造放在 Task 4 单独落地

- [ ] **Step 3: 修改 schema 与共享 config，去掉旧输入并新增新表/列**

```sql
CREATE TABLE IF NOT EXISTS allowed_origins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  origin TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  ...,
  rp_id TEXT NOT NULL,
  ...
);

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  ...,
  rp_id TEXT NOT NULL,
  origin TEXT NOT NULL,
  ...
);
```

```ts
const runtimeConfigSchema = z.object({
  dbPath: z.string().min(1),
  host: z.string().min(1).default('127.0.0.1'),
  port: z.coerce.number().int().positive().default(7777),
  issuer: z.url(),
});

const createCommandSchema = z.object({
  dbPath: z.string().min(1),
});
```

- [ ] **Step 4: 重跑定向测试，确认通过**

Run: `npx vitest run tests/unit/shared.test.ts tests/integration/cli-create.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add sql/schema.sql src/shared/config.ts tests/unit/shared.test.ts tests/integration/cli-create.test.ts
git commit -m "feat: reset config schema for resource-based cli"
```

### Task 2: 明确旧 schema 直接失败，并调整测试基础设施

**Files:**

- Modify: `src/app/commands/start.ts`
- Modify: `src/infra/db/bootstrap.ts` or `src/infra/db/client.ts`
- Modify: `tests/helpers/app.ts`
- Create or Modify: `tests/helpers/db.ts`
- Test: `tests/integration/cli-create.test.ts`
- Test: `tests/integration/oclif-cli.test.ts`

- [ ] **Step 1: 写失败测试，锁定旧 schema 失败与新测试 helper 路径**

```ts
it('fails fast when starting against an old schema database', async () => {
  // create a minimal old-schema db file without allowed_origins / rp_id columns
  const result = await runBuiltCli([
    'start',
    oldDbPath,
    '--issuer',
    'https://issuer.example',
  ]);
  expect(result.exitCode).toBeGreaterThan(0);
  expect(result.stderr).toContain('schema');
});
```

- [ ] **Step 2: 跑测试，确认当前失败**

Run: `npx vitest run tests/integration/cli-create.test.ts tests/integration/oclif-cli.test.ts`
Expected: FAIL，当前不会对旧 schema 给出明确失败

- [ ] **Step 3: 实现最小 schema guard，并把测试 helper 改成向 DB 写 allowed origins**

```ts
assertRequiredTablesAndColumns(db, {
  allowed_origins: ['origin'],
  webauthn_challenges: ['rp_id', 'origin'],
  webauthn_credentials: ['rp_id'],
});
```

```ts
export async function createTestApp(options = {}) {
  // seed allowed_origins rows into db instead of passing global origins/rpId into createApp
}
```

- [ ] **Step 4: 重跑测试，确认通过**

Run: `npx vitest run tests/integration/cli-create.test.ts tests/integration/oclif-cli.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/commands/start.ts src/infra/db/bootstrap.ts src/infra/db/client.ts tests/helpers/app.ts tests/helpers/db.ts tests/integration/cli-create.test.ts tests/integration/oclif-cli.test.ts
git commit -m "fix: fail fast on incompatible instance schema"
```

### Task 3: 建立 allowed origins canonicalization 与 repo

**Files:**

- Create: `src/infra/origins/repo.ts`
- Test: `tests/unit/origin-repo.test.ts`

- [ ] **Step 1: 写失败测试，锁定 canonical form 与 CRUD 行为**

```ts
it('canonicalizes allowed origins before insert', () => {
  expect(normalizeAllowedOrigin('HTTPS://Example.COM:443')).toBe(
    'https://example.com',
  );
});

it('rejects origins with paths', () => {
  expect(() => normalizeAllowedOrigin('https://localhost:3000/path')).toThrow();
});
```

- [ ] **Step 2: 跑测试，确认当前失败**

Run: `npx vitest run tests/unit/origin-repo.test.ts`
Expected: FAIL，repo/helper 尚不存在

- [ ] **Step 3: 实现最小 repo/helper**

```ts
export function normalizeAllowedOrigin(input: string): string {
  const url = new URL(input);
  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    throw new Error('invalid_origin');
  if (url.pathname !== '/' || url.search || url.hash)
    throw new Error('invalid_origin');
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  const port =
    url.port && !isDefaultPort(url.protocol, url.port) ? `:${url.port}` : '';
  return `${url.protocol}//${hostname}${port}`;
}
```

- [ ] **Step 4: 重跑测试，确认通过**

Run: `npx vitest run tests/unit/origin-repo.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/infra/origins/repo.ts tests/unit/origin-repo.test.ts
git commit -m "feat: add allowed origin normalization repo"
```

## Chunk 2: Oclif resource commands 与应用执行层

### Task 4: 将 `create` 收敛成 `init <instance>`

**Files:**

- Modify: `src/app/commands/create.ts`
- Modify or Move: `src/commands/create.ts`
- Test: `tests/integration/oclif-cli.test.ts`
- Modify: `README.md`

- [ ] **Step 1: 写失败测试，锁定 `init <instance>` 命令与 `<instance>` 文案**

```ts
it('supports init as the instance bootstrap command', async () => {
  const result = await runBuiltCli(['init', dbPath]);
  expect(result.exitCode).toBe(0);
});

it('documents <instance> as the positional argument', async () => {
  const result = await runBuiltCli(['start', '--help']);
  expect(result.stdout).toContain('<instance>');
});
```

- [ ] **Step 2: 跑测试，确认当前失败**

Run: `npx vitest run tests/integration/oclif-cli.test.ts`
Expected: FAIL，当前仍是 `create <dbPath>`

- [ ] **Step 3: 修改命令层与执行层**

```ts
static args = {
  instance: Args.string({required: true, description: 'Auth-mini instance (currently a SQLite database path)'})
}

await runCreateCommand({dbPath: args.instance})
```

- [ ] **Step 4: 重跑测试，确认通过**

Run: `npx vitest run tests/integration/oclif-cli.test.ts`
Expected: PASS（至少相关断言通过）

- [ ] **Step 5: Commit**

```bash
git add src/app/commands/create.ts src/commands/create.ts tests/integration/oclif-cli.test.ts README.md
git commit -m "feat: rename bootstrap command to init instance"
```

### Task 5: 加入 origin topic 命令与执行层

**Files:**

- Create: `src/app/commands/origin/list.ts`
- Create: `src/app/commands/origin/add.ts`
- Create: `src/app/commands/origin/update.ts`
- Create: `src/app/commands/origin/delete.ts`
- Create: `src/commands/origin/list.ts`
- Create: `src/commands/origin/add.ts`
- Create: `src/commands/origin/update.ts`
- Create: `src/commands/origin/delete.ts`
- Test: `tests/integration/oclif-cli.test.ts`
- Test: `tests/integration/origin-cli.test.ts`

- [ ] **Step 1: 写失败测试，锁定 origin CRUD 命令**

```ts
it('adds and lists allowed origins', async () => {
  await runBuiltCli([
    'origin',
    'add',
    dbPath,
    '--value',
    'HTTPS://Example.COM:443',
  ]);
  const result = await runBuiltCli(['origin', 'list', dbPath]);
  expect(result.stdout).toContain('https://example.com');
});
```

- [ ] **Step 2: 跑测试，确认当前失败**

Run: `npx vitest run tests/integration/origin-cli.test.ts tests/integration/oclif-cli.test.ts`
Expected: FAIL，命令不存在

- [ ] **Step 3: 实现最小命令层与执行层**

```ts
export default class OriginAddCommand extends BaseCommand {
  static args = {
    instance: Args.string({
      required: true,
      description: 'Auth-mini instance (currently a SQLite database path)',
    }),
  };
  static flags = {
    value: Flags.string({
      required: true,
      description: 'Allowed origin value',
    }),
  };
  async run() {
    /* open db, normalize origin, insert row */
  }
}
```

- [ ] **Step 4: 重跑测试，确认通过**

Run: `npx vitest run tests/integration/origin-cli.test.ts tests/integration/oclif-cli.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/commands/origin src/commands/origin tests/integration/origin-cli.test.ts tests/integration/oclif-cli.test.ts
git commit -m "feat: add origin resource commands"
```

### Task 6: 加入 SMTP topic 命令并删掉 `--smtp-config`

**Files:**

- Create: `src/app/commands/smtp/list.ts`
- Create: `src/app/commands/smtp/add.ts`
- Create: `src/app/commands/smtp/update.ts`
- Create: `src/app/commands/smtp/delete.ts`
- Create: `src/commands/smtp/list.ts`
- Create: `src/commands/smtp/add.ts`
- Create: `src/commands/smtp/update.ts`
- Create: `src/commands/smtp/delete.ts`
- Modify: `src/commands/create.ts` or `src/commands/init.ts`
- Modify: `src/app/commands/create.ts`
- Test: `tests/integration/cli-create.test.ts`
- Test: `tests/integration/smtp-cli.test.ts`

- [ ] **Step 1: 写失败测试，锁定 `--smtp-config` 删除与 SMTP CRUD**

```ts
it('rejects init --smtp-config after the breaking change', async () => {
  const result = await runBuiltCli([
    'init',
    dbPath,
    '--smtp-config',
    './smtp.json',
  ]);
  expect(result.exitCode).toBeGreaterThan(0);
});

it('adds smtp rows through the smtp topic', async () => {
  const result = await runBuiltCli([
    'smtp',
    'add',
    dbPath,
    '--host',
    'smtp.example.com',
    '--port',
    '587',
    '--username',
    'mailer',
    '--password',
    'secret',
    '--from-email',
    'noreply@example.com',
  ]);
  expect(result.exitCode).toBe(0);
});
```

- [ ] **Step 2: 跑测试，确认当前失败**

Run: `npx vitest run tests/integration/cli-create.test.ts tests/integration/smtp-cli.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现最小 SMTP 命令与删除旧 flag**

```ts
static flags = {
  host: Flags.string({required: true}),
  port: Flags.integer({required: true}),
  username: Flags.string({required: true}),
  password: Flags.string({required: true}),
  'from-email': Flags.string({required: true}),
  'from-name': Flags.string(),
  secure: Flags.boolean(),
  weight: Flags.integer(),
}
```

- [ ] **Step 4: 重跑测试，确认通过**

Run: `npx vitest run tests/integration/cli-create.test.ts tests/integration/smtp-cli.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/commands/create.ts src/app/commands/smtp src/commands/create.ts src/commands/smtp tests/integration/cli-create.test.ts tests/integration/smtp-cli.test.ts
git commit -m "feat: add smtp resource commands"
```

## Chunk 3: Start 运行时与 WebAuthn 契约迁移

### Task 7: 让 start 从数据库读取 origins，并移除 `--origin` / `--rp-id`

**Files:**

- Modify: `src/app/commands/start.ts`
- Modify: `src/commands/start.ts`
- Modify: `src/server/app.ts`
- Modify: `tests/helpers/app.ts`
- Test: `tests/integration/oclif-cli.test.ts`
- Test: `tests/unit/start-command.test.ts`

- [ ] **Step 1: 写失败测试，锁定新的 start 契约**

```ts
it('starts without origin or rp-id flags when allowed origins are stored in db', async () => {
  await insertAllowedOrigin(dbPath, 'https://app.example.com');
  const child = spawnCli([
    'start',
    dbPath,
    '--issuer',
    'https://issuer.example',
  ]);
  // expect listening + clean shutdown
});
```

- [ ] **Step 2: 跑测试，确认当前失败**

Run: `npx vitest run tests/unit/start-command.test.ts tests/integration/oclif-cli.test.ts`
Expected: FAIL，当前仍要求 `origin` / `rp-id`

- [ ] **Step 3: 实现最小运行时改造**

```ts
const origins = listAllowedOrigins(db);
const app = createApp({
  db,
  issuer: config.issuer,
  logger,
  origins,
});
```

- [ ] **Step 4: 重跑测试，确认通过**

Run: `npx vitest run tests/unit/start-command.test.ts tests/integration/oclif-cli.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/commands/start.ts src/commands/start.ts src/server/app.ts tests/unit/start-command.test.ts tests/integration/oclif-cli.test.ts
git commit -m "feat: load allowed origins from instance database"
```

### Task 8: 扩展 WebAuthn options 路由与 SDK 合约，显式接入可选 `rp_id`

**Files:**

- Modify: `src/shared/http-schemas.ts`
- Modify: `src/server/app.ts`
- Modify: `src/sdk/types.ts`
- Modify: `src/sdk/singleton-entry.ts`
- Modify: `tests/unit/sdk-webauthn.test.ts`
- Modify: `tests/helpers/app.ts`

`register options` 与 `authenticate options` 都要接入相同的可选 `rp_id` 契约；这里只用一组 SDK 示例锁定入口，执行时两条路由必须同时改。

- [ ] **Step 1: 写失败测试，锁定 options body 与 SDK 可选 `rpId` 参数**

```ts
it('passes optional rpId through the sdk authenticate options call', async () => {
  await MiniAuth.passkey.authenticate({ rpId: 'example.com' });
  expect(fetchMock).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ body: JSON.stringify({ rp_id: 'example.com' }) }),
  );
});
```

- [ ] **Step 2: 跑测试，确认当前失败**

Run: `npx vitest run tests/unit/sdk-webauthn.test.ts`
Expected: FAIL，当前 SDK / route 还不接受该参数

- [ ] **Step 3: 实现最小 options 路由与 SDK 接口改造**

```ts
export const webauthnOptionsSchema = z.object({
  rp_id: z.string().min(1).optional(),
});

await window.MiniAuth.passkey.authenticate({ rpId });
```

- [ ] **Step 4: 重跑测试，确认通过**

Run: `npx vitest run tests/unit/sdk-webauthn.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/http-schemas.ts src/server/app.ts src/sdk/types.ts src/sdk/singleton-entry.ts tests/unit/sdk-webauthn.test.ts tests/helpers/app.ts
git commit -m "feat: accept optional rp ids in webauthn options"
```

### Task 9: 扩展 WebAuthn repo/service，持久化 `origin` / `rp_id`

**Files:**

- Modify: `src/modules/webauthn/repo.ts`
- Modify: `src/modules/webauthn/service.ts`
- Test: `tests/integration/webauthn.test.ts`

- [ ] **Step 1: 写失败测试，锁定新 WebAuthn options / verify 行为**

```ts
it('defaults rp_id to the normalized Origin.hostname', async () => {
  const response = await app.request('/webauthn/authenticate/options', {
    method: 'POST',
    headers: { Origin: 'https://APP.example.com:443' },
  });
  expect((await response.json()).publicKey.rpId).toBe('app.example.com');
});

it('rejects verify when request origin differs from stored challenge origin', async () => {
  // options under https://a.example.com, verify under https://b.example.com
  expect(response.status).toBe(400);
});
```

- [ ] **Step 2: 跑测试，确认当前失败**

Run: `npx vitest run tests/integration/webauthn.test.ts tests/unit/sdk-webauthn.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现最小 schema/repo/service 变更**

```ts
const selectedRpId = input.rpId ?? normalizeOrigin(input.origin).hostname
assertValidRpIdForOrigin(input.origin, selectedRpId)
createChallenge(db, {type: 'authenticate', challenge, rpId: selectedRpId, origin: canonicalOrigin})
createCredential(db, {..., rpId: selectedRpId})
```

- [ ] **Step 4: 重跑测试，确认通过**

Run: `npx vitest run tests/integration/webauthn.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/webauthn/repo.ts src/modules/webauthn/service.ts tests/integration/webauthn.test.ts
git commit -m "feat: persist webauthn rp ids per ceremony"
```

### Task 10: 强化 verify 的 origin / rp 一致性约束

**Files:**

- Modify: `src/modules/webauthn/service.ts`
- Modify: `src/modules/webauthn/repo.ts`
- Test: `tests/integration/webauthn.test.ts`

- [ ] **Step 1: 写失败测试，锁定 verify 强约束**

```ts
it('rejects authenticate verify when credential.rp_id differs from challenge.rp_id', async () => {
  expect(response.status).toBe(400);
});
```

- [ ] **Step 2: 跑测试，确认当前失败**

Run: `npx vitest run tests/integration/webauthn.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现最小强约束**

```ts
if (credential.rpId !== challenge.rpId) {
  throw new InvalidWebauthnAuthenticationError();
}

if (
  requestOrigin !== challenge.origin ||
  clientDataOrigin !== challenge.origin
) {
  throw new InvalidWebauthnAuthenticationError();
}
```

- [ ] **Step 4: 重跑测试，确认通过**

Run: `npx vitest run tests/integration/webauthn.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/webauthn/service.ts src/modules/webauthn/repo.ts tests/integration/webauthn.test.ts
git commit -m "fix: bind webauthn verify to origin and rp namespace"
```

## Chunk 4: 文档、回归与最终验证

### Task 11: 更新 README 与帮助文案

**Files:**

- Modify: `README.md`
- Modify: `src/commands/start.ts`
- Modify: `src/commands/create.ts` or `src/commands/init.ts`
- Modify: `src/commands/origin/*.ts`
- Modify: `src/commands/smtp/*.ts`

- [ ] **Step 1: 写失败测试，锁定 README 新命令**

```ts
it('documents init, origin CRUD, and smtp CRUD in README', async () => {
  const readme = await readFile(resolve(process.cwd(), 'README.md'), 'utf8');
  expect(readme).toContain('auth-mini init <instance>');
  expect(readme).toContain(
    'auth-mini origin add <instance> --value https://a.com',
  );
  expect(readme).toContain('auth-mini smtp add <instance>');
});
```

- [ ] **Step 2: 跑测试，确认当前失败**

Run: `npx vitest run tests/integration/oclif-cli.test.ts`
Expected: FAIL

- [ ] **Step 3: 更新 README 和 help 文案**

```md
- `start` 仅接受 `<instance>`、`--issuer` 和进程监听参数
- `origin` 与 `smtp` 通过资源命令维护
- `<instance>` 当前只接受 SQLite 路径，后续可扩展为 alias
```

- [ ] **Step 4: 重跑测试，确认通过**

Run: `npx vitest run tests/integration/oclif-cli.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add README.md src/commands/start.ts src/commands/create.ts src/commands/origin src/commands/smtp tests/integration/oclif-cli.test.ts
git commit -m "docs: update cli usage for resource-based config"
```

### Task 12: 跑最终验证并整理执行入口

**Files:**

- Verify: `docs/superpowers/specs/2026-04-05-config-cli-webauthn-design.md`
- Verify: `docs/superpowers/plans/2026-04-05-config-cli-webauthn.md`

- [ ] **Step 1: 跑定向回归测试**

Run: `npx vitest run tests/unit/shared.test.ts tests/unit/origin-repo.test.ts tests/unit/start-command.test.ts tests/integration/cli-create.test.ts tests/integration/origin-cli.test.ts tests/integration/smtp-cli.test.ts tests/integration/oclif-cli.test.ts tests/integration/webauthn.test.ts`
Expected: PASS

- [ ] **Step 2: 跑全量验证**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: 全通过

- [ ] **Step 3: 检查 git 状态**

Run: `git status --short`
Expected: 仅包含本计划相关修改

- [ ] **Step 4: 完成最终提交**

```bash
git add .
git commit -m "feat: persist instance config resources in sqlite"
```

- [ ] **Step 5: 执行前复核**

确认 README、spec、plan、CLI help、测试与 schema 已一致，再进入执行阶段。
