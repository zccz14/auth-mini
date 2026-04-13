# OpenAPI 生成类型与浏览器 SDK 公开类型别名收敛设计

## 背景

- `src/sdk/types.ts` 目前仍手写维护了一批与 `src/generated/api/types.gen.ts` 重复、且结构已经一致的公开类型。
- 仓库已经引入 OpenAPI 作为低层 HTTP 合同来源；继续双份维护这些等价类型，会增加类型漂移与后续合同演进时的修改面。
- 同时，浏览器 SDK 的对外入口已经稳定，不能因为内部转向消费生成类型而让使用方改成引用 `src/generated/api/*` 或感知生成目录结构。

## 目标

- 保持现有 SDK 公开导出名称稳定，不破坏 `src/sdk/types.ts` 与 `src/sdk/browser.ts` 的消费方式。
- 将其中一组与 OpenAPI 生成类型结构等价的手写 SDK 类型，改为对生成类型的类型别名。
- 继续由 SDK facade 承担公开类型出口职责，生成类型只作为内部依赖来源。
- 不引入任何运行时行为变化，尤其不改变 `/me` 响应解析逻辑。

## 非目标

- 不重写 SDK 模块实现、不调整请求路径、不迁移到直接暴露 `src/generated/api/index.ts`。
- 不缩窄或重定义当前由 SDK 自己拥有语义的状态、会话、依赖注入与错误相关类型。
- 本轮不处理 `WebauthnVerifyResponse` 的收窄，即使生成代码里存在更具体的返回形状。

## 决策

`src/sdk/types.ts` 继续作为浏览器 SDK 的公开类型门面，但其中与 OpenAPI 生成类型结构等价的条目改为 `import type` + `export type ... = ...` 的别名方式维护。SDK 对外仍只从 `src/sdk/types.ts`、`src/sdk/browser.ts` 暴露这些名字，不新增任何要求调用方直接引用生成目录的导出路径。未被纳入别名集合的类型继续保留为 SDK 自有定义。

## 别名范围

### 计划收敛为生成类型别名的公开名

- `MeWebauthnCredential`
- `MeEd25519Credential`
- `MeActiveSession`
- `MeResponse`
- `EmailStartInput`
- `EmailVerifyInput`
- `EmailStartResponse`
- `PasskeyOptionsInput`

要求：仅当目标生成类型与现有 SDK 公开形状在本轮设计口径下可视为结构等价时，才允许用别名替换；实现时不得顺带扩张到更多公开类型。

### 保持为 SDK 自有定义的类型

- `SdkStatus`
- `SessionSnapshot`
- `PersistedSdkState`
- `AuthenticatedStateInput`
- `SessionTokens`
- `SessionResult`
- `NavigatorCredentialsLike`
- `Listener`
- `DeviceSdkOptions`
- `DeviceSdkApi`
- `AuthMiniApi`
- `AuthMiniInternal`
- `InternalSdkDeps`
- `ServerErrorPayload`
- `WebauthnVerifyResponse`

其中 `WebauthnVerifyResponse` 本轮继续保留为现状；即便生成类型更具体，也不借此扩大本轮 public type 收窄范围。

## 公开导出边界

- `src/sdk/types.ts` 仍是浏览器 SDK 公开类型的单一门面。
- `src/sdk/browser.ts` 仍从 `./types.js` 转导出公开类型名，不直接转导出生成模块路径。
- 允许 SDK 内部实现引用生成类型，但不得把 `src/generated/api/*` 变成对外 API 的一部分。

## 运行时与解析行为约束

- 本轮只做类型层收敛，不改运行时代码语义。
- `/me` parser 继续保持现有校验与返回行为；即使 `MeResponse` 改为别名，`parseMeResponse` 的输入校验和输出字段填充也不变化。
- 任何为适配别名而触发的运行时重构都视为超出 scope。

## 验证

本轮验证聚焦类型稳定性，而不是行为变更：

- TypeScript 仍能通过 SDK 相关类型检查，确保别名替换后现有源码继续编译。
- 现有浏览器 SDK 公开导出名保持不变，消费者仍从 `src/sdk/types.ts` / `src/sdk/browser.ts` 获取类型。
- `/me` 相关实现与行为不变，不新增运行时差异。
- 如仓库已有针对 SDK 或整体工程的 `tsc` / build 校验，优先复用现有命令验证 public type 稳定性。

## 风险与控制

- 风险：把并非真正等价的公开类型误替换成生成类型，导致 facade 类型语义漂移。
  - 控制：实现时逐项比对，仅处理本 spec 明确列出的候选；若候选与生成形状不再等价，必须停在最小范围并升级决策。
- 风险：内部开始直接复用生成模块导出路径，削弱 SDK 门面边界。
  - 控制：公开导出仍统一留在 `src/sdk/types.ts` 与 `src/sdk/browser.ts`。
- 风险：顺手把 `WebauthnVerifyResponse` 一并收窄，带来额外 consumer breakage 面。
  - 控制：本轮明确排除该项。

## 验收标准

- `src/sdk/types.ts` 中仅将批准集合内、且结构等价的公开类型改为生成类型别名。
- `src/sdk/browser.ts` 的公开 re-export 名称保持稳定，不暴露生成目录路径。
- SDK 自有类型与 `WebauthnVerifyResponse` 继续保持现状。
- 不发生运行时行为变化，`/me` parser 行为保持一致。
- 现有 TypeScript 消费者在不改导入路径与公开类型名的前提下仍可编译。
