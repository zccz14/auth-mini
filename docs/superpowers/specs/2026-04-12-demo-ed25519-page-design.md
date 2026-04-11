# `examples/demo` ED25519 页面设计

## 概述

- 在 `examples/demo` 新增一个顶层 demo 路由页面，用于演示浏览器侧 ED25519 密钥生成、凭证注册与私钥登录。
- 本页只复用现有服务端 `/ed25519/start` 与 `/ed25519/verify` 以及当前用户已登录后的凭证注册能力，不新增后端接口，也不扩展公开 SDK API。
- 页面定位为 demo 层能力展示：输入格式、错误展示与状态面板都优先服务调试与理解流程，而不是做产品化封装。

## 目标与范围

### 目标

- 提供一个新的顶层路由页面，纳入 `examples/demo` 现有导航。
- 支持在页面内临时生成一对 Ed25519 密钥对，生成结果仅保留在当前页面状态中，不做任何持久化。
- 支持用户粘贴 `base64url` 编码的 Ed25519 公钥，并在已有登录 Session 前提下，把它注册到当前用户的 ED25519 credentials。
- 支持用户粘贴 `base64url` 编码的 32-byte Ed25519 seed，在浏览器内派生公钥、对 challenge 签名，并通过现有 `/ed25519/start` + `/ed25519/verify` 流程换取 Session。

### 范围约束

- 新页面是 `examples/demo` 内的新顶层 route/page，不复用到 SDK 公共 API。
- 注册行为必须绑定“当前已登录用户”；未登录时只能展示受限态，不做匿名注册。
- 登录行为直接走浏览器侧签名，不引入新的中转服务或私钥托管逻辑。
- 私钥输入格式本轮固定为 `base64url` 32-byte seed；公钥输入格式本轮固定为 `base64url` 32-byte 原始公钥。
- 注册必须手动输入 credential name，不自动推导默认名称。

## 信息架构与页面布局

页面沿用 `examples/demo` 现有卡片式布局与 JSON 调试面板模式，主体分为两个操作区和三个状态区。

### 区域 1：Register credential

- 展示“生成临时密钥对”入口。
- 展示手动输入项：`credential name`、`public key`。
- 允许用户点击生成后把生成出的公钥回填到注册表单，也允许直接粘贴外部公钥。
- 展示注册按钮；仅当 setup 已就绪、存在已登录 Session、name 非空、公钥格式合法时可点击。

### 区域 2：Sign in with private key

- 展示 `credential id` 输入框；这是复用现有 `/ed25519/start` 所必需的最小参数。
- 展示私钥 seed 输入框。
- 提供“使用当前生成 seed 回填”“使用最近注册结果回填 credential id”这一类 demo 辅助交互即可，但不要求持久化或导出。
- 展示登录按钮；仅当 setup 已就绪、`credential id` 非空且 seed 格式合法时可点击。

### 状态区

- `session`：展示当前共享 Session 快照，沿用现有 Session 页面数据来源。
- `last responses`：展示最近一次 register / sign-in 请求结果，失败时保留原始错误对象或原始响应结构，便于调试。
- `current credentials`：展示当前用户最新的 `ed25519_credentials` 快照；未登录时可为空或提示需先登录。

## UX 与数据流

### 1. 生成密钥对

1. 用户在页面点击生成按钮。
2. demo 页通过仅限 demo 的浏览器辅助逻辑生成 Ed25519 seed，并派生对应公钥。
3. 页面立即显示 seed 与 public key，保存在当前 React 状态中。
4. 这些值只服务当前页面交互，不写入 localStorage、不下载、不上传到服务端。

### 2. 注册凭证

1. 用户已通过其他方式登录，页面可拿到当前 Session 与当前用户信息。
2. 用户输入 credential name，并提供公钥（可来自刚生成的结果，也可手动粘贴）。
3. 页面先在 demo 层校验 name 非空、公钥为合法 `base64url` 且解码后为 32-byte。
4. 校验通过后，调用现有服务端凭证注册能力，把 `name` 与 `public_key` 注册到当前登录用户。
5. 成功后刷新当前用户信息或凭证列表面板，使 `current credentials` 立即反映最新结果。
6. 失败时直接展示原始错误，不做额外错误语义包装。

### 3. 使用私钥登录

1. 用户输入 `credential id` 与 `base64url` 32-byte seed。
2. 页面先在浏览器内解析 seed，派生公钥，并在本地保留派生结果用于调试展示或后续校验。
3. 页面使用 `credential id` 调用现有 `/ed25519/start`，获得 challenge 载荷。
4. 页面使用浏览器侧 Ed25519 签名逻辑直接对 challenge 原文签名。
5. 页面把签名结果提交到 `/ed25519/verify`，成功后由现有 demo Session 状态接管并更新 `session` 面板。
6. 失败时直接展示原始错误；不新增更友好的错误翻译层。

## 实现边界

### 允许的改动

- `examples/demo` 内新增 route、页面组件、测试与少量 demo 专用工具代码。
- 新增一个薄的 demo-only helper，负责：
  - `base64url` 解析/格式校验
  - seed -> public key 派生
  - challenge 签名
- 在 demo 路由与导航中接入新页面。

### 明确不做

- 不新增任何服务端接口。
- 不修改现有 `/ed25519/start`、`/ed25519/verify` 协议。
- 不扩展 `auth-mini/sdk/browser` 的公开 API。
- 不把 Ed25519 私钥处理抽象成仓库通用加密模块。
- 不做私钥持久化、下载、导入导出或多格式兼容。

## 状态与受限态规则

- setup 未完成时：注册与登录操作都禁用，并沿用 demo 现有文案风格提示先完成 setup。
- setup 已完成但用户未登录时：注册区禁用，并明确提示“注册需要已有登录 Session”；登录区可继续使用。
- 注册区提交中时：注册按钮禁用，避免重复提交。
- 登录区提交中时：登录按钮禁用，避免重复提交。
- `credential id` 为空、公钥非法或 seed 非法时：对应主操作禁用，并显示原始校验错误文本。

## 错误处理

- demo 页面不引入新的错误分类体系。
- 输入格式错误直接在页面本地展示。
- 服务端或签名流程抛出的错误原样展示在页面中，并同步保留到 `last responses` 区域。
- 当注册或登录成功后，最近一次成功响应应覆盖前一条同类结果，便于用户确认当前状态。

## 验证与测试

实现阶段至少覆盖以下测试：

- 路由测试：新顶层路由已出现在 app shell 导航中，进入对应路径能看到 ED25519 页面核心区域。
- 注册流程测试：在已登录状态下，输入 name + 合法 public key 后可触发注册调用，并刷新/展示最新凭证结果。
- 登录流程测试：输入合法 `credential id` + seed 后可触发 `/ed25519/start` + 浏览器签名 + `/ed25519/verify` 对应调用，并更新 Session 结果展示。
- 禁用态测试：setup 未就绪、未登录、输入非法等场景下，对应按钮保持禁用且提示符合本 spec 约束。

最终验证至少应覆盖：

- `examples/demo` 目标测试通过。
- `examples/demo` typecheck 通过。
- 新页面未破坏现有 demo 路由与共享 provider 基本行为。

## 非目标

- 不持久化生成的 seed / keypair。
- 不提供下载、复制导出、文件导入等私钥管理能力。
- 不扩展 SDK API 以暴露 Ed25519 专用高阶方法。
- 不支持除 `base64url` 32-byte seed 之外的额外私钥格式。
- 不新增后端 endpoint、服务端代理或专用 demo API。

## 验收标准

- `examples/demo` 新增一个 ED25519 顶层页面，并纳入现有导航。
- 页面包含两个主区域：`Register credential` 与 `Sign in with private key`。
- 页面支持生成临时 Ed25519 keypair，且生成结果不持久化。
- 页面支持把手动输入的 `name` + `base64url public key` 注册到当前已登录用户的 ED25519 credentials。
- 页面支持用 `credential id` + `base64url` 32-byte seed 在浏览器侧完成签名登录并获得 Session。
- 页面展示 `session`、`last responses`、`current credentials` 三类调试信息。
- 整体实现严格限制在 demo 层，不引入 SDK 公共 API 变化或新的服务端接口。

## 风险与控制

- 风险：demo 为了接 Ed25519 浏览器能力而把加密逻辑扩展成仓库通用抽象。
  - 控制：仅允许添加 demo-only helper，职责限于解析、派生与签名。
- 风险：注册流程误做成匿名注册或针对任意用户注册。
  - 控制：spec 明确要求依赖当前已登录 Session，并绑定当前用户。
- 风险：输入格式范围被悄悄扩大，导致实现与页面说明不一致。
  - 控制：本轮私钥仅接受 `base64url` 32-byte seed，公钥仅接受 `base64url` 原始 32-byte 公钥，其他格式都列为非目标。
