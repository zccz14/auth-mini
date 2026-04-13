# OpenAPI HTTP API 合同与低层 SDK 生成设计

## 背景

- 当前仓库的 HTTP API 合同分散在 `src/server/app.ts`、`src/shared/http-schemas.ts`、SDK 类型声明、集成测试与集成文档中，缺少单一可审计的接口来源。
- 现有公开 SDK 以 `auth-mini/sdk/browser` 与 `auth-mini/sdk/device` 为主，分别封装浏览器与设备场景；但仓库尚未提供一个直接对应服务端 HTTP API 的低层 TypeScript SDK。
- 本轮已批准的方向是引入 OpenAPI 合同文件，使用社区 CLI `@hey-api/openapi-ts` 生成低层 SDK 与类型，并把生成产物提交到仓库，作为后续文档与高层 SDK 演进的共同基础。

## 目标

- 在仓库根目录新增并维护唯一 HTTP API 合同文件 `openapi.yaml`。
- 将 `openapi.yaml` 定义为 auth-mini HTTP API 的单一事实来源。
- 使用 `@hey-api/openapi-ts` 从该合同生成 TypeScript 低层 API SDK 与配套类型。
- 对外新增公共包入口 `auth-mini/sdk/api`，暴露低层 HTTP API SDK。
- 要求生成后的 SDK 支持运行时传入可配置的 `baseUrl`，而不是把服务端地址写死在生成产物里。
- 将 OpenAPI 合同、生成脚本配置、生成结果与对应文档一并纳入仓库版本控制。

## 非目标

- 本轮不迁移 `auth-mini/sdk/browser` 的公开 API、内部实现或使用方式。
- 本轮不迁移 `auth-mini/sdk/device` 的公开 API、内部实现或使用方式。
- 本轮不重写现有浏览器 SDK 的状态管理、存储、WebAuthn、session lifecycle 封装。
- 本轮不要求服务端运行时直接消费 OpenAPI 合同自动注册路由。
- 本轮不引入自定义 SDK 生成 CLI、私有代码生成器或仓库内长期维护的 bespoke generator。
- 本轮不把所有历史文档一次性改写成 OpenAPI 参考手册，只处理会直接误导接入方的 HTTP API 说明入口。

## 决策

仓库根目录新增 `openapi.yaml`，以 OpenAPI 格式描述 auth-mini 当前对外 HTTP API。该文件成为 HTTP API 的唯一合同来源；后续新增、删除或修改 HTTP 接口时，必须先更新该合同，再同步服务端实现、测试与生成产物。SDK 生成统一使用社区 CLI `@hey-api/openapi-ts`，不新增自研生成器。生成结果包含一套可直接发包的低层 TypeScript API SDK 与对应类型，并通过新的公共导出 `auth-mini/sdk/api` 暴露。生成 SDK 必须允许调用方在运行时传入 `baseUrl`，以适配不同 auth-mini 实例地址。生成产物直接提交到仓库，保证 npm 包、测试、文档与代码评审都能基于稳定文件工作。本轮仅新增 OpenAPI 合同与低层 SDK，不迁移现有 `auth-mini/sdk/browser`、`auth-mini/sdk/device` 的对外路线。

## 方案对比

### 方案 A：采用 OpenAPI + `@hey-api/openapi-ts` 生成低层 SDK（采用）

- 优点：合同格式通用；社区工具成熟；生成结果可审查；后续可扩展到校验、示例与外部集成。
- 缺点：需要维护一份新的 `openapi.yaml`，并建立服务端实现与合同之间的同步纪律。

### 方案 B：继续依赖手写类型、手写 fetch 封装与集成测试充当合同

- 优点：短期改动最少。
- 缺点：合同继续分散，难以清晰回答“当前 HTTP API 到底是什么”；也无法稳定产出低层 SDK 入口。

### 方案 C：引入 OpenAPI，但同时自研定制生成 CLI

- 优点：表面上定制性更高。
- 缺点：与已批准的“使用社区 CLI、不做自定义 generator CLI”直接冲突，并会扩大维护面。

## 范围

### 纳入范围

- `openapi.yaml` 中对当前公开 HTTP API 的路径、请求体、响应体、认证方式与错误表面建模。
- `@hey-api/openapi-ts` 的生成配置、执行脚本与生成输出目录。
- `package.json` 中新增 `auth-mini/sdk/api` 公共导出。
- 与 `auth-mini/sdk/api` 对应的基础使用文档。
- 现有文档中涉及“HTTP API 合同来源”的描述迁移到 OpenAPI 口径。

### 明确排除

- 不把浏览器/设备 SDK 改造成基于生成 SDK 重写。
- 不因生成低层 SDK 而改变现有 HTTP 路由语义、字段命名或认证协议。
- 不新增与当前服务端实现无关的未来接口占位。
- 不为了适配生成器而重组整个 `src/server/` 路由结构。

## 文件布局

本轮目标布局如下：

- `openapi.yaml`
  - 仓库根目录 HTTP API 合同文件。
- `package.json`
  - 新增 `./sdk/api` 对外导出，以及 OpenAPI 生成相关脚本与依赖。
- `src/sdk/api/`
  - 放置少量手写包装层，仅负责承接生成代码的公共入口、运行时 `baseUrl` 配置与必要的稳定导出。
- `src/generated/api/`
  - 存放 `@hey-api/openapi-ts` 生成的低层 SDK 与类型。
  - 该目录中的文件视为生成产物，但仍提交到仓库。
- `docs/integration/api-sdk.md`
  - 说明 `auth-mini/sdk/api` 的定位、初始化方式与 `baseUrl` 用法。

约束：生成代码与手写包装层必须目录分离，避免后续重新生成时覆盖手写入口逻辑。

## 合同边界

### `openapi.yaml` 的角色

- `openapi.yaml` 是 HTTP API 唯一合同来源。
- 当前服务端已公开的主要路径都应收敛到该合同，包括至少以下族群：
  - `POST /email/start`
  - `POST /email/verify`
  - `GET /me`
  - `POST /session/refresh`
  - `POST /session/logout`
  - 已公开的 WebAuthn 与 Ed25519 认证/凭证管理接口
  - `GET /.well-known/jwks.json` 或当前 JWKS 暴露路径
- 合同中请求/响应字段应以现有线上行为为准，不得借写合同之机发明与实现不一致的新语义。
- 若现有实现中的某些错误响应尚未完全结构化，本轮可以按当前真实返回表面建模，但不得在 spec 中写成含糊的“任意对象”。

### 与服务端实现的关系

- `src/server/app.ts` 仍是当前路由实现位置，但不再充当对外合同定义来源。
- 后续任何 HTTP API 变更都应遵循“先改 `openapi.yaml`，再改实现与测试”的顺序。
- 本轮不要求服务端代码生成或运行时自动校验与 `openapi.yaml` 绑定，但验证流程必须能发现合同与实现明显漂移。

## 生成流程

### 生成原则

- 仅使用 `@hey-api/openapi-ts` CLI 生成，不新增仓库自定义 generator CLI。
- 生成命令输入固定为仓库根目录 `openapi.yaml`。
- 生成结果必须可重复执行，避免依赖人工编辑生成文件。
- 生成结果提交到仓库，CI、本地测试与打包均直接消费已提交的产物。

### 推荐流程

1. 维护或更新 `openapi.yaml`。
2. 执行仓库脚本调用 `@hey-api/openapi-ts` 生成低层 SDK 与类型到约定目录。
3. 执行手写包装层构建或类型整理，使 `auth-mini/sdk/api` 暴露稳定入口。
4. 运行类型检查、打包验证与针对生成 SDK 的最小行为测试。
5. 将 `openapi.yaml`、生成配置、生成产物、文档与测试一并提交。

### 变更纪律

- 禁止直接手改生成目录中的文件后不回写 OpenAPI 合同或生成配置。
- 若需要稳定化某些导出形状，应通过手写包装层解决，而不是在生成文件里做手工补丁。

## 公共 SDK 形状

### 包入口

- 对外新增 `auth-mini/sdk/api`。
- 该入口的定位是“低层 HTTP API SDK”，不是浏览器态或设备态 session 管理 SDK。
- 该入口应与现有 `auth-mini/sdk/browser`、`auth-mini/sdk/device` 并存，不互相替代。

### 运行时配置

- 调用方必须能在运行时传入 `baseUrl`。
- `baseUrl` 是低层 SDK 的必填初始化输入，用于指向具体 auth-mini 实例。
- 不允许把 `baseUrl` 固定写在生成文件中，也不依赖构建时环境变量注入实例地址。
- 如生成器默认输出的 client 形状不直接满足该要求，应由 `src/sdk/api/` 中的极薄包装层统一提供稳定初始化入口。

### 能力边界

- 低层 SDK 负责按 OpenAPI 合同组织请求函数、请求/响应类型与基础 client 配置。
- 低层 SDK 不负责浏览器存储、多标签恢复、自动 refresh 编排、`ready` 生命周期或设备私钥签名封装。
- 文档必须明确告知：需要浏览器会话语义时继续使用 `auth-mini/sdk/browser`；需要设备登录封装时继续使用 `auth-mini/sdk/device`。

## 文档迁移

- 新增一份面向包消费者的低层 SDK 接入文档，说明 `auth-mini/sdk/api` 的定位、安装后导入方式与 `baseUrl` 初始化方式。
- 现有浏览器/设备 SDK 文档保留，但应避免把它们表述成“HTTP API 唯一参考来源”。
- 与 HTTP API 合同直接相关的说明，应改为引用 `openapi.yaml` 或基于其生成的文档，而不是继续让读者从 `src/server/app.ts`、测试或高层 SDK 代码倒推出接口。
- 本轮不要求删除所有旧文档段落，但必须去掉会误导用户认为浏览器/设备 SDK 已迁移到底层 OpenAPI SDK 的表述。

## 验证

本轮最小验证应覆盖：

- `openapi.yaml` 可被 `@hey-api/openapi-ts` 成功读取并生成代码。
- `auth-mini/sdk/api` 能通过 TypeScript 类型检查与打包入口检查。
- 生成 SDK 的初始化路径支持运行时传入 `baseUrl`。
- 仓库 `exports`、已提交生成产物与文档引用保持一致。
- 至少有一组针对关键接口的契约验证，确保生成 SDK 请求路径与当前服务端实现没有明显偏移。

如果仓库添加专门验证脚本，优先使用脚本化检查，而不是依赖人工逐文件比对。

## 风险与约束

- 风险：`openapi.yaml` 写成理想化接口，而不是当前真实实现。
  - 控制：编写 spec 时以 `src/server/app.ts`、现有 schema、集成测试与已发布 SDK 实际调用路径为准。
- 风险：生成 SDK 入口直接暴露生成器原始结构，后续升级 `@hey-api/openapi-ts` 时产生破坏性漂移。
  - 控制：通过 `src/sdk/api/` 提供薄包装层，隔离生成目录内部结构。
- 风险：团队继续把高层 SDK 文档当成 HTTP API 合同维护，导致 OpenAPI 失去单一事实来源地位。
  - 控制：文档明确声明 `openapi.yaml` 是唯一合同来源，后续 HTTP API 变更流程必须先更新该文件。
- 风险：本轮 scope 漂移到 browser/device SDK 重构。
  - 控制：spec 明确限制本轮只新增 OpenAPI 合同与低层 SDK，不迁移现有高层 SDK。
- 约束：生成产物需提交到仓库，因此目录选择、review 体验与 npm 打包边界都必须可控。

## 验收标准

- 仓库根目录存在 `openapi.yaml`，并作为 HTTP API 单一事实来源被文档明确声明。
- SDK 生成使用 `@hey-api/openapi-ts`，不引入自定义 generator CLI。
- 仓库新增可发布的低层 TypeScript SDK 与类型，并通过 `auth-mini/sdk/api` 对外导出。
- 低层 SDK 支持运行时配置 `baseUrl`。
- 生成产物提交到仓库，而不是仅在发布或 CI 时临时生成。
- 本轮不迁移 `auth-mini/sdk/browser` 与 `auth-mini/sdk/device` 到新低层 SDK。
- 文档中关于 HTTP API 合同来源与低层 SDK 使用方式的入口已更新到 OpenAPI 口径。
