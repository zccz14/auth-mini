# 设备 SDK 私钥种子输入设计

## 背景

- 当前设备 SDK 设计以 `createDeviceSdk(...)` 作为公开工厂，并要求调用方提供 `serverBaseUrl`、`credentialId`、`privateKey`。
- 现有 `privateKey` 采用 `DevicePrivateKeyJwk` 形态暴露在类型、实现、测试、示例与文档中，这让设备侧接入方需要理解 JWK 结构，而不是只传入稳定的原始密钥材料。
- 已批准的新边界要求把设备 SDK 私钥输入收敛为单一 seed 字符串，并保持既有 `/ed25519/start` 与 `/ed25519/verify` 协议不变。
- 本轮是一次性 breaking change，只允许切换到新输入合同，不保留旧 JWK 兼容层。

## 目标

- 将 `createDeviceSdk()` 的公开输入从 `privateKey: DevicePrivateKeyJwk` 改为 `privateKeySeed: string`。
- 明确 `privateKeySeed` 只接受 `base64url` 编码后的 32-byte seed。
- 要求 SDK 在初始化阶段立即完成字符串、base64url 合法性与解码长度为 32 的校验，并在非法输入时直接抛出初始化错误。
- 保持设备登录协议不变：SDK 内部仅把 seed 解码并派生 Ed25519 私钥，再继续签名 challenge 并走现有 `/ed25519/start`、`/ed25519/verify` 流程。
- 统一更新类型、实现、测试、dts fixtures、examples 与 docs，使仓库公开表面只暴露 `privateKeySeed`。

## 非目标

- 不修改任何服务端 API、请求体字段、响应结构或 `/ed25519/start`、`/ed25519/verify` 协议语义。
- 不提供对旧 `DevicePrivateKeyJwk` 输入的兼容、迁移适配或双写过渡层。
- 不新增除 base64url 之外的其他 seed / 私钥编码方式。
- 不扩展设备 SDK 的其他公开能力、生命周期语义或认证模型。

## 决策

`createDeviceSdk(...)` 的私钥输入统一收敛为 `privateKeySeed: string`。调用方必须传入一个 base64url 编码的 32-byte seed；SDK 在实例初始化时立即校验输入类型、base64url 可解码性与解码结果长度，任一条件不满足都直接抛出初始化错误，不进入后续 challenge 登录流程。校验通过后，SDK 在内部解码 seed、派生 Ed25519 private key，并继续沿用现有 challenge 签名与 `/ed25519/start`、`/ed25519/verify` 协议完成设备登录。仓库内所有公开类型、实现、测试、声明夹具、示例与文档同步切换到 `privateKeySeed`，并移除 `DevicePrivateKeyJwk` 在公开表面的用法与示例。

## 方案对比

### 方案 A：切换为 `privateKeySeed: string`，不保留 JWK 兼容（采用）

- 优点：设备侧接入输入最小；类型表面更简单；仓库文档与示例更一致；避免同时维护两套私钥输入语义。
- 缺点：属于一次性 breaking change，现有 JWK 调用方需要同步迁移。

### 方案 B：同时支持 `privateKeySeed` 与 `DevicePrivateKeyJwk`

- 优点：迁移期更平滑。
- 缺点：与已批准的“一次性 breaking change、不做旧 JWK 兼容”相冲突；会扩大类型、文档与测试面。

### 方案 C：继续暴露 JWK，只在内部补充 seed 派生

- 优点：表面改动最小。
- 缺点：不能满足“公开输入改为 seed 字符串”的已批准边界，也无法移除仓库表面的 `DevicePrivateKeyJwk`。

## 公开合同

### `createDeviceSdk(options)` 输入

- `serverBaseUrl`：保持不变。
- `credentialId`：保持不变。
- `privateKeySeed`：新增且替代原 `privateKey`，类型为 `string`。

本轮后，`privateKeySeed` 是设备 SDK 唯一允许的私钥输入字段；`privateKey` 与 `DevicePrivateKeyJwk` 不再属于设备 SDK 的公开合同。

### `privateKeySeed` 格式约束

- 必须是字符串。
- 必须是合法的 base64url 编码。
- base64url 解码结果必须恰好为 32 byte。
- 以上任一约束不满足时，SDK 必须在初始化阶段立即抛出错误，而不是延迟到首次登录请求或签名阶段。

## 初始化与签名流程

### 初始化校验

SDK 创建实例时，必须按以下顺序处理 `privateKeySeed`：

1. 校验输入值是字符串。
2. 校验字符串可按 base64url 成功解码。
3. 校验解码后的原始字节长度等于 32。
4. 校验通过后，将该 seed 作为 Ed25519 私钥派生输入缓存到实例内部可用形态。

如果任一步失败，SDK 直接抛出初始化错误；实例不得进入可继续认证的正常初始化路径。

### 认证链路

- `/ed25519/start` 请求与响应保持不变。
- SDK 使用解码后的 seed 在内部派生 Ed25519 private key。
- SDK 使用派生出的私钥对 challenge 原文签名。
- `/ed25519/verify` 请求与响应保持不变。
- 成功登录后的 session 建立、`ready`、自动 refresh、`dispose` 与 `logout` 生命周期语义保持现有行为，不因输入切换而改变。

## 仓库更新边界

本轮实现需要在以下表面统一切换到 `privateKeySeed`：

- 设备 SDK 公开类型与实现。
- 设备 SDK 测试。
- dts fixtures / declaration surface 校验样例。
- examples 中的设备 SDK 调用。
- 仓库文档中的设备 SDK 接入说明。

同时应移除仓库公开表面中 `DevicePrivateKeyJwk` 的用法与示例，避免新旧输入合同并存。

## 测试期望

实现阶段至少应覆盖以下验证：

- 成功路径：合法 `privateKeySeed` 能驱动现有设备登录链路成功完成。
- 非法 base64url：非法 base64url 输入会在初始化阶段立即报错。
- 解码长度错误：解码后不是 32 byte 的输入会在初始化阶段立即报错。
- 声明表面：类型声明与 dts fixtures 只暴露 `privateKeySeed`，不再暴露 `DevicePrivateKeyJwk` 用法。
- 生命周期非回归：既有 `ready`、`dispose`、`logout` 行为不因 seed 输入切换而回归。

## 验收标准

- `createDeviceSdk()` 的公开输入字段从 `privateKey` 切换为 `privateKeySeed`。
- `privateKeySeed` 只接受 base64url 编码的 32-byte seed。
- SDK 在初始化阶段立即校验字符串类型、base64url 合法性与解码长度为 32，并在非法输入时直接抛出初始化错误。
- SDK 内部通过 seed 派生 Ed25519 private key 后签名 challenge。
- `/ed25519/start` 与 `/ed25519/verify` 协议保持不变。
- 类型、实现、测试、dts fixtures、examples 与 docs 统一使用 `privateKeySeed`。
- 仓库公开表面不再保留 `DevicePrivateKeyJwk` 用法或示例。
- 测试覆盖成功路径、非法 base64url、解码长度错误、声明表面与 `ready` / `dispose` / `logout` 非回归。

## 风险与控制

- 风险：实现阶段保留 `DevicePrivateKeyJwk` 兼容入口，导致 breaking change 不彻底。
  - 控制：spec 明确要求不支持旧 JWK 兼容，并移除仓库公开表面的旧用法。
- 风险：把 seed 校验延后到登录时，导致错误暴露过晚。
  - 控制：spec 明确要求在 SDK 初始化阶段立即完成字符串、base64url 与长度校验并抛错。
- 风险：输入合同切换时顺手调整服务端协议或认证生命周期。
  - 控制：spec 明确限制 `/ed25519/start`、`/ed25519/verify`、`ready`、`dispose`、`logout` 保持既有语义不变。
