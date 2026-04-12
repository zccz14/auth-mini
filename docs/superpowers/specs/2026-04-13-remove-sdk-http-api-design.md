# 移除原始 `/sdk/*` HTTP API 设计

## 背景

- 当前服务端仍暴露两个面向浏览器全局 SDK 的 HTTP 静态入口：`GET /sdk/singleton-iife.js` 与 `GET /sdk/singleton-iife.d.ts`。
- 仓库已经具备 npm SDK 子路径导出能力，当前公开路线应以包内模块导出为主，而不是继续承诺服务端托管的 `/sdk/*` HTTP API。
- 用户本轮已明确批准的范围是仅下线这两个 HTTP 入口，不扩展到 npm SDK API、内部源码整理或构建体系收缩。

## 目标

- 移除服务端对 `GET /sdk/singleton-iife.js` 的公开暴露。
- 移除服务端对 `GET /sdk/singleton-iife.d.ts` 的公开暴露。
- 保持 npm SDK 子路径 `auth-mini/sdk/browser` 与 `auth-mini/sdk/device` 的对外行为不变。
- 保持当前 public npm SDK API 不变，避免把“移除 HTTP 入口”升级成“重做 SDK 合同”。
- 通过集成测试明确验证上述两个端点已经不再暴露。

## 非目标

- 本轮不修改 `auth-mini/sdk/browser` 的模块导出形状。
- 本轮不修改 `auth-mini/sdk/device` 的模块导出形状。
- 本轮不新增、删除或重命名任何 public npm SDK API。
- 本轮不主动移除 singleton / IIFE 相关内部源码。
- 本轮不主动移除 singleton / IIFE 相关构建脚本。
- 本轮不主动清理已有 singleton / IIFE 构建产物或仓库内其他关联 artifact。
- 本轮不顺手调整其他 HTTP API、Demo 接入方式或文档口径。

## 方案对比

### 方案 1：推荐，只移除两个 HTTP GET 路由

- 服务端不再注册 `GET /sdk/singleton-iife.js` 与 `GET /sdk/singleton-iife.d.ts`。
- 保留 npm SDK 子路径导出与现有模块侧实现。
- 集成测试从“返回 200”改为“返回 404，确认端点已下线”的断言。

优点：

- 与批准范围完全一致。
- 变更面最小，风险最可控。
- 可以避免把外部接入迁移与内部产物清理耦合在一次改动里。

缺点：

- 仓库内仍会暂时保留与 IIFE 相关的内部实现和构建痕迹，需要后续单独清理。

### 方案 2：移除 HTTP 路由，同时清理 singleton / IIFE 内部实现与构建链路

- 在下线 HTTP 入口的同时，删除相关源码、脚本与构建产物。

优点：

- 技术面更整洁。

缺点：

- 明显超出本轮批准范围。
- 更容易引入与 npm SDK 导出、构建流程或历史接入兼容性有关的额外风险。

## 结论

- 采用方案 1。
- 本轮只下线 `GET /sdk/singleton-iife.js` 与 `GET /sdk/singleton-iife.d.ts` 两个 HTTP 入口。
- npm SDK 子路径导出 `auth-mini/sdk/browser` 与 `auth-mini/sdk/device` 保持不变。
- 不主动删除 singleton / IIFE 内部源码、构建脚本或现有 artifact。

## 详细设计

### 服务端路由边界

- 服务端不再对外暴露 `GET /sdk/singleton-iife.js`。
- 服务端不再对外暴露 `GET /sdk/singleton-iife.d.ts`。
- 本轮仅移除这两个已知 HTTP GET 路由；不得顺手扩大到其他 `/sdk/*` 路径，除非实现时发现它们只是这两个端点的直接别名且无法分离。

### npm SDK 边界

- `auth-mini/sdk/browser` 必须保持现有可用性与导出合同不变。
- `auth-mini/sdk/device` 必须保持现有可用性与导出合同不变。
- 包级 `exports` 中与上述两个子路径相关的现有公开入口，本轮不得收缩、重命名或改语义。
- 本轮的目标是移除“服务端托管 SDK 文件下载入口”，不是移除“npm SDK 发布能力”。

### 内部代码与产物边界

- 即使某些 singleton / IIFE 源码、构建脚本或构建产物在移除路由后看起来暂时未被使用，本轮也不主动删除。
- 实现应优先最小化为“取消公开暴露”，而不是“完成整轮内部清理”。
- 若移除路由后存在编译或测试必需的最小联动调整，可以做最小必要改动；但不得借机扩展为源码整理或构建重构。

### 对外行为

- 访问 `GET /sdk/singleton-iife.js` 时，不应再得到原先的 SDK JavaScript 响应体。
- 访问 `GET /sdk/singleton-iife.d.ts` 时，不应再得到原先的 TypeScript 声明响应体。
- 对外合同层面要求这两个端点返回常规未命中结果，默认表现为 `404`。
- 本 spec 不要求为下线路径新增专门 JSON 错误格式、跳转或替代提示文案。

## 测试与验证

### 集成测试调整

- 更新现有覆盖 SDK HTTP 入口的集成测试。
- 原先验证 `GET /sdk/singleton-iife.js` 返回成功内容的断言，应改为验证该端点返回 `404`。
- 原先验证 `GET /sdk/singleton-iife.d.ts` 返回成功内容的断言，应改为验证该端点返回 `404`。
- 测试应继续聚焦 HTTP 可见行为，不把内部源码、构建脚本或 artifact 是否保留作为本轮断言对象。

### 回归关注点

- 验证 `auth-mini/sdk/browser` 相关既有能力没有因移除 HTTP 路由而被破坏。
- 验证 `auth-mini/sdk/device` 相关既有能力没有因移除 HTTP 路由而被破坏。
- 验证此次变更不会意外影响非目标范围内的其他服务端认证接口。

## 实施提示

- 预期实现方向是删除这两个 HTTP GET 路由的注册/暴露逻辑。
- 预期测试方向是把相关集成测试更新为验证这两个端点已经下线。
- 若实现过程中发现仍存在对这两个路由的文档、示例或外部流程引用，不在本轮自动扩展处理范围内，除非它们会直接导致当前实现或验证失败。
