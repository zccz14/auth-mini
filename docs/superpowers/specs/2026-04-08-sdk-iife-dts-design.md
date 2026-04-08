# auth-mini SDK IIFE 类型声明设计

## 背景

- 当前仓库已经通过 `GET /sdk/singleton-iife.js` 提供浏览器全局 SDK，运行时入口是 `window.AuthMini`。
- SDK 的公开类型目前主要存在于 `src/sdk/types.ts`，但集成方通过 `<script>` 直接接入时，无法通过一个稳定 URL 获取配套的 TypeScript 声明。
- 用户明确希望先保持当前单仓库形态，不引入 monorepo / workspace / 独立 SDK 仓库；当前目标仅是让浏览器全局 SDK 可以通过 URL 获取 `.d.ts`。

## 目标

- 新增一个稳定可访问的声明文件 URL：`GET /sdk/singleton-iife.d.ts`。
- 声明文件面向浏览器全局接入，包含 `declare global`，让集成方能获得 `window.AuthMini` 的完整类型。
- 远程声明的唯一公开入口是 `window.AuthMini`；不新增任何供集成方直接引用的额外全局类型名。
- 声明内容尽量复用仓库内现有 SDK 类型合同，避免再维护一套手写的平行接口。
- 文档明确两种消费方式：远程获取后本地纳入项目、或通过三斜线/编辑器工作流引用该声明来源。

## 非目标

- 本轮不把 SDK 拆成独立 npm 包。
- 本轮不为 `import { ... } from 'auth-mini'` 这类模块导入场景补齐包级类型出口。
- 本轮不重构 SDK 运行时架构，也不顺手整理发布体系。

## 方案

### 1. 声明文件产物

- 在构建产物中新增一个专门面向 IIFE 全局脚本的声明文件，例如 `dist/sdk/singleton-iife.d.ts`。
- 该文件只描述浏览器全局合同，不承载 npm 模块发布语义。
- 该文件必须是单文件可消费产物：
  - 不包含未解析的相对导入
  - 不引用仓库内部源码路径
  - 集成方拿到这一份文件后即可作为独立 `.d.ts` 使用
- 声明的核心结构是：
  - 采用模块形态声明文件，例如 `export {}; declare global { interface Window { AuthMini: ... } }`
  - 在声明文件内部定义 `Window['AuthMini']` 所需的结构类型
  - 通过 `declare global` 扩展 `Window`：`AuthMini: ...`
  - 不通过顶层 `type` / `interface` 向外额外暴露名字

### 2. 类型来源与边界

- 新增一个很薄的 SDK 全局声明入口文件，职责只有两件事：
  - 从现有 `src/sdk/types.ts` 复用公开类型
  - 补上浏览器全局 `declare global`
- 允许在构建阶段把所需公开类型内联/折叠进单文件声明，但对外结果仍必须保持“只有 `window.AuthMini` 是公开入口”。
- 不把内部依赖注入类型、测试辅助类型或额外命名类型泄漏到远程声明中。

### 3. 服务端暴露方式

- 服务端新增与现有 IIFE JS 文件对称的静态响应路径：`GET /sdk/singleton-iife.d.ts`。
- 返回构建后的声明文件内容，确保部署后的 auth-mini 实例天然能同时提供 JS SDK 与配套类型声明。
- 该路由应保持“纯静态产物直出”模式，不在请求时动态拼接类型字符串，以降低维护复杂度和行为分歧风险。

### 4. 文档口径

- 在 README 的 Browser SDK 部分补充类型声明 URL。
- 文档只承诺“可以通过该 URL 获取声明文件，并可下载后纳入本地 TypeScript 工程”。
- 文档避免把 TypeScript 对远程 URL 的所有工具链行为说成统一标准能力，重点保持事实口径：auth-mini 提供可访问、可下载、可纳入工程的 `.d.ts` 来源。

## 数据与接口合同

- 本 spec 所说“公开面”只有一层：`window.AuthMini` 方法面。
- 集成方合同不包括任何额外全局命名类型；如果声明文件内部需要辅助结构，应以内联对象类型或非暴露形式承载，不能形成新的顶层公开名字。
- `window.AuthMini` 覆盖以下公开入口：
  - `window.AuthMini.email.start`
  - `window.AuthMini.email.verify`
  - `window.AuthMini.passkey.authenticate`
  - `window.AuthMini.passkey.register`
  - `window.AuthMini.webauthn.authenticate`
  - `window.AuthMini.webauthn.register`
  - `window.AuthMini.me.get`
  - `window.AuthMini.me.reload`
  - `window.AuthMini.session.getState`
  - `window.AuthMini.session.onChange`
  - `window.AuthMini.session.refresh`
  - `window.AuthMini.session.logout`
- `ready` 等内部构造返回值只在模块侧使用，不进入浏览器全局合同。

## 规范化 API 形状

远程 `.d.ts` 必须把 `window.AuthMini` 描述为下列可调用形状；以下签名是合同，不是实现提示。下列内容表示结构约束，不代表这些名字会作为额外全局类型名暴露给集成方：

```ts
export {};

declare global {
  interface Window {
    AuthMini: {
      email: {
        start(input: {
          email: string;
        }): Promise<{ ok?: boolean } & Record<string, unknown>>;
        verify(input: { email: string; code: string }): Promise<{
          sessionId: string;
          accessToken: string | null;
          refreshToken: string;
          receivedAt: string;
          expiresAt: string;
          me: {
            user_id: string;
            email: string;
            webauthn_credentials: Array<unknown>;
            active_sessions: Array<unknown>;
          };
        }>;
      };
      passkey: {
        authenticate(input?: { rpId?: string }): Promise<{
          sessionId: string;
          accessToken: string | null;
          refreshToken: string;
          receivedAt: string;
          expiresAt: string;
          me: {
            user_id: string;
            email: string;
            webauthn_credentials: Array<unknown>;
            active_sessions: Array<unknown>;
          };
        }>;
        register(input?: { rpId?: string }): Promise<Record<string, unknown>>;
      };
      me: {
        get(): {
          user_id: string;
          email: string;
          webauthn_credentials: Array<unknown>;
          active_sessions: Array<unknown>;
        } | null;
        reload(): Promise<{
          user_id: string;
          email: string;
          webauthn_credentials: Array<unknown>;
          active_sessions: Array<unknown>;
        }>;
      };
      session: {
        getState(): {
          status: 'recovering' | 'authenticated' | 'anonymous';
          authenticated: boolean;
          sessionId: string | null;
          accessToken: string | null;
          refreshToken: string | null;
          receivedAt: string | null;
          expiresAt: string | null;
          me: {
            user_id: string;
            email: string;
            webauthn_credentials: Array<unknown>;
            active_sessions: Array<unknown>;
          } | null;
        };
        onChange(
          listener: (state: {
            status: 'recovering' | 'authenticated' | 'anonymous';
            authenticated: boolean;
            sessionId: string | null;
            accessToken: string | null;
            refreshToken: string | null;
            receivedAt: string | null;
            expiresAt: string | null;
            me: {
              user_id: string;
              email: string;
              webauthn_credentials: Array<unknown>;
              active_sessions: Array<unknown>;
            } | null;
          }) => void,
        ): () => void;
        refresh(): Promise<{
          sessionId: string;
          accessToken: string | null;
          refreshToken: string;
          receivedAt: string;
          expiresAt: string;
          me: {
            user_id: string;
            email: string;
            webauthn_credentials: Array<unknown>;
            active_sessions: Array<unknown>;
          };
        }>;
        logout(): Promise<void>;
      };
      webauthn: {
        authenticate(input?: { rpId?: string }): Promise<{
          sessionId: string;
          accessToken: string | null;
          refreshToken: string;
          receivedAt: string;
          expiresAt: string;
          me: {
            user_id: string;
            email: string;
            webauthn_credentials: Array<unknown>;
            active_sessions: Array<unknown>;
          };
        }>;
        register(input?: { rpId?: string }): Promise<Record<string, unknown>>;
      };
    };
  }
}
```

## 测试与验证

### 构建验证

- 构建后应能看到 `dist/sdk/singleton-iife.d.ts`。
- 声明文件应包含 `export {}; declare global { interface Window { AuthMini: ... } }` 这一类模块形态的全局扩展骨架。
- 声明文件不应新增任何供集成方直接引用的顶层公开类型名。
- 声明文件除文件头部的 `export {}` 与 `declare global` 内的 `interface Window` augment 外，不应出现任何可命名引用的顶层声明或导出，包括 `export type`、`export interface`、`type`、`interface`、`class`、`namespace`、`enum`、`declare const`。

### 路由/集成验证

- 为 `/sdk/singleton-iife.d.ts` 增加集成测试，验证：
  - 返回 200
  - 返回 `text/plain; charset=utf-8` 或 `application/typescript; charset=utf-8`
  - 响应体包含 `declare global`、`interface Window` 与 `AuthMini:` 这一组全局扩展骨架
  - 响应体通过一份固定的文本快照或等价整面断言，覆盖本 spec `规范化 API 形状` 中约定的全部公开方法结构
  - 响应体不包含未解析的相对导入，也不包含 `src/sdk/` 等内部源码路径
  - 响应体除文件头部的 `export {}` 与 `declare global` 内的 `interface Window` augment 外，不包含任何可命名引用的顶层声明或导出

### 消费方类型验证

- 增加一个最小 TypeScript fixture：
  - 仅包含浏览器 lib、下载后的 `singleton-iife.d.ts`、以及一份引用 `window.AuthMini` 的示例代码
  - 不引用仓库源码路径
- 对该 fixture 运行 `tsc --noEmit`，验证以下代码可通过类型检查：

```ts
window.AuthMini.session.onChange((state) => {
  state.status;
});

window.AuthMini.email.start({ email: 'user@example.com' });
window.AuthMini.me.get();
```

### 回归边界

- 保持现有 `/sdk/singleton-iife.js` 行为不变。
- 不改变 `window.AuthMini` 的运行时安装方式。

## 风险与控制

- 风险：声明入口若直接复制类型，后续最容易漂移。
  - 控制：声明入口只做复用与全局扩展，不重复定义公开接口。
- 风险：把内部类型带进远程声明，会让公开面失控。
  - 控制：最终产物只保留 `declare global` 下的 `Window.AuthMini` 扩展，不保留额外顶层命名类型。
- 风险：文档若过度承诺“远程 URL 可被所有 TS 工具直接消费”，会产生支持口径风险。
  - 控制：README 只承诺 URL 可访问和可下载纳入工程，不夸大工具链兼容性。

## 验收标准

- 访问部署中的 auth-mini 实例时，`/sdk/singleton-iife.d.ts` 返回 200，且 `Content-Type` 为 `text/plain; charset=utf-8` 或 `application/typescript; charset=utf-8`。
- 返回内容是单文件可消费的 `.d.ts`：无未解析相对导入、无仓库内部源码路径泄漏。
- 该声明文本显式 `declare global` 扩展 `Window`，并完整覆盖本 spec `规范化 API 形状`。
- 该声明文本只为 `window.AuthMini` 提供公开类型入口，不新增额外供集成方直接引用的全局类型名。
- 该声明文本除文件头部的 `export {}` 与 `declare global` 内的 `interface Window` augment 外，不包含任何可命名引用的顶层声明或导出。
- 最小消费方 fixture 在只引入该 `.d.ts` 文件的前提下可通过 `tsc --noEmit`，并可对 `window.AuthMini` 进行类型检查。
- 不引入 monorepo、workspace 或新仓库。
