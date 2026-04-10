# auth-mini `sdk/browser` 子路径导出设计

## 背景

- 当前 `auth-mini` npm 包主要作为 CLI 分发，尚未提供稳定的模块化 SDK 子路径导出。
- 当前浏览器 SDK 已经存在，但它是通过服务端分发的 IIFE 脚本暴露为全局对象 `window.AuthMini`。
- 这导致下游只能通过全局对象消费浏览器 SDK，无法直接通过 npm package import 使用。
- 用户希望本轮优先打通“单包 + 子路径导出”的技术路线，而不是同时重做 SDK API 形状、session 模型或 verifier 模型。
- 用户明确要求本轮保留现有 IIFE SDK；先让下游 Demo 从 `window.AuthMini` 迁移到模块化 SDK，后续再考虑移除 IIFE。

## 目标

- 新增稳定可 import 的 npm 子路径：`auth-mini/sdk/browser`。
- 该子路径导出一个显式构造函数，用于创建与现有 IIFE `window.AuthMini` 等价的浏览器 SDK 实例。
- 导出形态固定为命名导出：`export function createBrowserSdk(serverBaseUrl: string): AuthMiniApi`。
- 让下游 Demo 可以从模块导出迁移，而无需同时重写业务调用代码。
- 为后续在同一个 npm 包内继续新增其他 SDK 子路径建立 `exports` 技术路线。
- 为 `auth-mini/sdk/browser` 提供完整 TypeScript 类型。

## 非目标

- 本轮不删除 `/sdk/singleton-iife.js`。
- 本轮不删除 `window.AuthMini`。
- 本轮不重做浏览器 SDK 的 API 形状。
- 本轮不新增 `auth-mini/sdk/session`、`auth-mini/sdk/nodejs`、`auth-mini/sdk/api` 等其他公共子路径。
- 本轮不引入新的 client 对象模型，不重命名现有 `AuthMini` 能力面。
- 本轮不做 verifier SDK。

## 方案对比

### 方案 1：推荐，新增 `auth-mini/sdk/browser`，导出 `createBrowserSdk(serverBaseUrl)`

- 新增一个公共子路径：`auth-mini/sdk/browser`。
- 子路径导出命名导出 `createBrowserSdk(serverBaseUrl)`。
- `createBrowserSdk(...)` 返回的对象方法面尽量与现有 `window.AuthMini` 保持一致。
- IIFE 继续保留，并复用同一套底层实现。

优点：

- 范围最小，风险最低。
- Demo 迁移成本仍然较低，主要只需要增加一行构造代码。
- 能先把 npm 子路径导出、类型发布、模块消费路径打通。

缺点：

- 仍然保留了现有浏览器 SDK 的历史形状，暂时不处理更长期的 API 重构。

### 方案 2：新增 `auth-mini/sdk/browser`，但改成新的 client / session API

- 用这次机会把浏览器 SDK 彻底改成新的模块 API。

优点：

- 长期 API 形状可能更理想。

缺点：

- 变更过大，会把“模块化导出路线”与“SDK 产品重设计”耦合在一起。
- 不利于控制本轮风险。

### 方案 3：直接删除 IIFE，只保留模块 SDK

- 本轮同时完成模块 SDK 接入与旧全局 SDK 下线。

优点：

- 技术面更干净。

缺点：

- 迁移风险最高。
- 与用户要求“先迁移 Demo，再移除 IIFE”冲突。

## 结论

- 采用方案 1。
- 本轮只新增 `auth-mini/sdk/browser`。
- 该子路径以命名导出 `createBrowserSdk(serverBaseUrl)` 的方式，创建与现有 `window.AuthMini` 等价的浏览器 SDK 能力。
- IIFE 与 `window.AuthMini` 本轮继续保留。

## 详细设计

### 包级导出

`package.json` 新增公共子路径：

- `./sdk/browser`

要求：

- `auth-mini/sdk/browser` 可被 npm 安装后的消费者直接 import。
- `exports` 必须同时提供运行时代码路径与类型路径。
- 本轮不新增其他公共 SDK 子路径。

### 模块导出形态

`auth-mini/sdk/browser` 对外固定提供：

```ts
export function createBrowserSdk(serverBaseUrl: string): AuthMiniApi;
```

本轮不提供：

- `default export`
- `createAuthMiniClient(...)`
- `export const AuthMini = ...`

这样定义的原因：

- 模块版不像 IIFE 一样能从脚本 URL 推断 `baseUrl`，因此必须显式提供 `serverBaseUrl`。
- 返回值仍然复用现有 `AuthMini` 方法面，下游迁移时无需同时重写业务调用。
- 可以把 API 形状变更推迟到下一轮，在模块导出路线打通之后再讨论。

### 公开 API 原型

`createBrowserSdk(...)` 的返回值公开形状应与现有浏览器 SDK 公共合同保持一致；本轮至少固定为：

```ts
export function createBrowserSdk(serverBaseUrl: string): AuthMiniApi;

export type AuthMiniApi = {
  email: {
    start(input: { email: string }): Promise<void>;
    verify(input: { email: string; code: string }): Promise<void>;
  };
  passkey: {
    authenticate(): Promise<void>;
    register(): Promise<void>;
  };
  webauthn: {
    authenticate(): Promise<void>;
    register(): Promise<void>;
  };
  me: {
    get(): MeResponse | null;
    reload(): Promise<MeResponse>;
  };
  session: {
    getState(): SessionSnapshot;
    onChange(listener: (state: SessionSnapshot) => void): () => void;
    refresh(): Promise<void>;
    logout(): Promise<void>;
  };
};
```

相关公开类型至少包括：

```ts
export type MeResponse = {
  user_id: string;
  email: string;
  webauthn_credentials: string[];
  active_sessions: string[];
};

export type SessionSnapshot = {
  status: 'authenticated' | 'recovering' | 'anonymous';
  authenticated: boolean;
  sessionId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  receivedAt: string | null;
  expiresAt: string | null;
  me: MeResponse | null;
};
```

备注：

- 上述原型是本轮公共合同的一部分，供评审与迁移使用。
- 实际导出名应尽量复用现有源码里的公开类型名，避免再制造一套平行命名。
- 若现有实现中的具体返回类型略有差异，应优先以“与现有 `window.AuthMini` 行为一致”为准，并在实施时把模块导出与全局导出对齐到同一套类型。

### 与现有 IIFE 的关系

- IIFE 继续保留。
- `window.AuthMini` 继续保留。
- 模块版 `createBrowserSdk(...)` 返回的对象与全局对象 `window.AuthMini` 必须复用同一套底层实现，避免逻辑漂移。
- 本轮不能出现“模块版行为和 IIFE 版行为不同步”的分叉实现。

这意味着实现优先顺序应是：

- 先抽出一个可复用的浏览器 SDK 构造入口。
- 再让 IIFE 安装器与 npm 子路径导出都建立在该入口之上。

### Demo 迁移目标

- 下游 Demo 应从依赖 `window.AuthMini` 迁移为依赖 `auth-mini/sdk/browser`。
- Demo 迁移应主要改为 `import { createBrowserSdk } from 'auth-mini/sdk/browser'` 并显式传入 `serverBaseUrl`。
- Demo 中原有业务调用方式，例如 `AuthMini.session.onChange(...)`、`AuthMini.email.start(...)`，在构造完成后应尽量保持不变。

### TypeScript 合同

- `auth-mini/sdk/browser` 必须可直接被 TypeScript 消费。
- 使用者必须可以直接写：

```ts
import { createBrowserSdk } from 'auth-mini/sdk/browser';
import type {
  AuthMiniApi,
  SessionSnapshot,
  MeResponse,
} from 'auth-mini/sdk/browser';

const AuthMini = createBrowserSdk('https://auth.example.com');
```

- 不再要求使用远程 `.d.ts` 或额外全局声明文件才能获得模块 SDK 类型。
- 现有 IIFE 的远程 `.d.ts` 本轮可以继续保留，以避免破坏旧接入路径。

### Tree-shaking 与副作用约束

- `auth-mini/sdk/browser` 必须是一个可 import 的 ESM 模块。
- 模块本身不应通过 import 即把 `AuthMini` 挂到 `window` 上。
- “安装到 `window`” 的行为必须继续只存在于 IIFE / bootstrap 路径中。
- 模块入口只导出构造函数，不应隐式创建全局单例；不能附带任何全局副作用。

本轮对 tree-shaking 的贡献主要是：

- 打通单包子路径导出路线。
- 让未来新增其他 SDK 子路径时能沿用同一套 `exports` 机制。

本轮不以“把现有 browser SDK 拆到最细粒度”作为验收目标。

## 测试与验收

### 包导出验收

- 真实 `npm pack` 后安装 tarball，可以成功：

```ts
import { createBrowserSdk } from 'auth-mini/sdk/browser';

const AuthMini = createBrowserSdk('https://auth.example.com');
```

- TypeScript 能正确解析 `auth-mini/sdk/browser` 的值导出与类型导出。

### 行为验收

- `createBrowserSdk(serverBaseUrl)` 返回的对象在行为上与现有 IIFE 版 `window.AuthMini` 保持一致。
- 现有 browser SDK 关键能力不回退：
  - email start / verify
  - passkey / webauthn authenticate / register
  - `me.get()` / `me.reload()`
  - `session.getState()` / `session.onChange()` / `session.refresh()` / `session.logout()`

### 兼容验收

- 现有 IIFE 路径继续可用：
  - `/sdk/singleton-iife.js`
  - `window.AuthMini`
- 现有 IIFE 相关文档和测试本轮不必删除。
- Demo 迁移到模块 SDK 后，IIFE 仍可作为过渡兼容路径存在。

## 风险与取舍

- 这是一条刻意保守的路线：优先解决“模块导出能否成立”，延后“SDK 形状是否最佳”。
- 因为本轮仍然保留现有 browser SDK 的对象形状，本轮不会自动获得最理想的 tree-shaking 粒度。
- 但它能以最小风险为后续多个子路径 SDK 铺路，并尽快让下游摆脱 `window.AuthMini` 依赖。

## 后续阶段约束

在本轮完成并让 Demo 成功迁移后，后续阶段可以再讨论：

1. 是否移除 IIFE 与 `window.AuthMini`
2. 是否拆出 `auth-mini/sdk/session`
3. 是否新增 Node / verifier 子路径
4. 是否重构 `AuthMini` 的单例 API 形状

但这些都不属于本轮实施范围。
