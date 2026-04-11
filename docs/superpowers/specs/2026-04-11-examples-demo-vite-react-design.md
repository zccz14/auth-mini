# `examples/demo` Vite React Demo 设计

## 概述

- 在 `examples/demo` 新建一个正式的 demo，技术栈使用 Vite、React、TypeScript、Tailwind，以及真实的 `shadcn/ui` 组件结构。
- 保留当前 demo 的核心认证流程，但整体体验做减法：移除 API 参考和偏文档型内容，把页面改造成一个更像小型产品的 SPA。
- 本轮不替换当前 `demo/` 目录，不修改 CI，也不调整当前发布路径。

## 目标

- 在 `examples/demo` 创建一个可独立安装的前端包，拥有自己的 `package.json` 和前端依赖。
- 保留最能体现 auth-mini 价值的核心流程：
  - email start
  - email verify
  - passkey register
  - passkey authenticate
  - session / 当前用户状态查看
  - 清理本地认证状态
- 将当前偏长文档式的 demo 改成更简洁的 `shadcn/ui` 风格应用壳。
- 让 demo 的观感和交互更接近一个“仿真的产品页面”，而不是文档页面。
- 通过 auth-mini 的公开包接口消费 browser SDK，而不是直接引用仓库内部实现。

## 非目标

- 本轮不替换或删除现有 `demo/` 目录。
- 本轮不修改 CI、Pages 发布方式或部署流程。
- 本轮不把仓库改造成 workspace/monorepo。
- 不原样复用旧 `demo/*.js` 的页面结构。
- 不保留当前 demo 中的 API reference 区域。

## 约束

- `examples/demo` 必须拥有独立的 `package.json`，避免前端依赖污染根包 `auth-mini`。
- 新 demo 必须使用 `react-router` 和 `HashRouter`，使其具备多逻辑页面的 SPA 体验，同时保持静态托管简单。
- UI 必须使用真实的 `shadcn/ui` 组件结构，而不是只模仿视觉风格。
- demo 应以包消费者的方式使用 `auth-mini/sdk/browser`。
- 开发流程需要“自动一些”，不能要求每次都手动完整重建根包后才能继续调试 demo。

## 包边界与依赖模型

### 选定方案

`examples/demo` 作为独立前端包，通过下面的方式依赖仓库根包：

```json
{
  "dependencies": {
    "auth-mini": "file:../.."
  }
}
```

demo 内部只通过公开导出使用 SDK：

```ts
import { createBrowserSdk } from 'auth-mini/sdk/browser';
```

### 选择原因

- 能把前端依赖完全隔离在 `examples/demo` 内。
- 能真实覆盖外部消费者使用 `auth-mini/sdk/browser` 的方式。
- 避免 demo 对 `src/` 下内部源码形成耦合。
- 避免本轮 scope 扩大成整个仓库的 workspaces 改造。

### 代价与取舍

- 根包仍然需要先具备满足 `exports` 的构建产物。
- 本地开发需要一层辅助脚本，避免每次都手工重建根包。

## 开发工作流

### 选定方案

在保持“包消费者边界”不变的前提下，增加少量自动化支持。

- 根包仍是 `auth-mini/sdk/browser` 的唯一来源。
- `examples/demo` 作为标准的 Vite 应用运行。
- 提供一个仓库级联动命令，在开发时持续保证根包 browser SDK 构建产物可用，同时启动 `examples/demo` 的 Vite dev server。

### 预期开发流程

- 根目录依赖按现有方式安装。
- `examples/demo` 单独安装自己的依赖。
- 运行一个统一入口命令，同时完成：
  - 保持根包 browser SDK 构建输出为最新
  - 启动 `examples/demo` 的开发服务器

### 验证边界

即使开发态有辅助，最终验证仍以真实包契约为准：

- 根包构建成功
- `examples/demo` typecheck 成功
- `examples/demo` build 成功

## 应用结构

新 demo 是一个基于 `HashRouter` 的 SPA，但整体体验更像一个紧凑的产品控制台。

### 路由

- `/#/`
  - 首页 / Landing
  - 展示产品定位、核心能力和当前连接准备状态
- `/#/setup`
  - 配置 auth server origin
  - 展示 page origin
  - 生成启动命令和必要说明
- `/#/email`
  - 邮件登录流程页
  - 包含 email start 和 OTP verify
- `/#/passkey`
  - Passkey 流程页
  - 包含 passkey 注册和 passkey 登录
- `/#/session`
  - 会话状态页
  - 展示当前 session、当前用户信息和本地状态清理入口

### 应用壳结构

- 顶部导航，负责主要页面切换
- 紧凑的环境 / 状态栏
- 居中的主内容区，使用卡片和分区布局
- 同时兼顾桌面端和移动端，不依赖纯侧边栏式布局

## 运行时状态模型

### 共享状态

使用一个共享的 React context 统一管理：

- 当前配置的 auth server origin
- SDK 实例
- 配置有效性 / 连接可用性状态
- 来自 SDK 的 session 状态
- 当前用户快照与最近一次刷新结果
- 当前动作的请求中状态
- 顶层错误与成功提示

### 启动行为

- 启动时从 URL 状态和本地持久化状态中读取 auth origin。
- 如果 origin 合法，则通过 `createBrowserSdk(serverBaseUrl)` 创建 SDK 实例。
- 如果 origin 缺失或不合法，应用仍可浏览，但交互按钮禁用，并明确引导用户去 setup 页完成配置。

### 交互行为

- email 页面和 passkey 页面触发真实的 SDK 行为。
- session 页面展示当前 SDK session 状态和用户状态。
- 清理本地状态时，同时清理 demo 持久化输入和 SDK 本地认证状态。
- 路由切换不会重复创建 SDK 实例，共享状态会在页面间保持。

## UI 与体验

### 视觉方向

- 干净、克制的 `shadcn/ui` 风格
- 低噪音的中性色调
- 更像产品 demo，而不是文档页面
- 以卡片、表单、状态块和明确主操作为主

### 核心组件集

- `Button`
- `Input`
- `Card`
- `Alert`
- `Badge`
- `Tabs`
- `Separator`
- 如有必要再使用 `Dialog` 或 `Sheet` 展示聚焦信息

### 简化原则

- 完全移除 API reference 区域。
- 文案只保留理解和使用流程所需的最小说明。
- 优先展示状态卡片和动作结果，而不是长篇解释。
- setup 指导保留，但放到独立路由里，不再主导整个页面结构。

## 文件与职责草图

实现阶段文件名允许微调，但整体结构应接近下面的职责划分：

- `examples/demo/package.json`
  - 独立的前端依赖与脚本
- `examples/demo/vite.config.ts`
  - Vite 配置
- `examples/demo/tsconfig.json`
  - 前端 TypeScript 配置
- `examples/demo/index.html`
  - Vite 入口 HTML
- `examples/demo/src/main.tsx`
  - React 启动入口
- `examples/demo/src/app/router.tsx`
  - 路由树与应用壳组合
- `examples/demo/src/app/providers/demo-provider.tsx`
  - SDK / 配置 / session 共享上下文
- `examples/demo/src/routes/home.tsx`
  - 首页
- `examples/demo/src/routes/setup.tsx`
  - 配置页
- `examples/demo/src/routes/email.tsx`
  - 邮件流程页
- `examples/demo/src/routes/passkey.tsx`
  - Passkey 流程页
- `examples/demo/src/routes/session.tsx`
  - 会话状态页
- `examples/demo/src/components/ui/*`
  - `shadcn/ui` 组件文件
- `examples/demo/src/components/app/*`
  - 应用专用布局与流程组件
- `examples/demo/src/lib/*`
  - 配置解析、格式化、存储、SDK 适配等小型工具

## 测试策略

实现阶段必须遵循 TDD。

### 必须覆盖的重点

- config / origin 解析逻辑
- 路由壳和基础导航行为
- origin 缺失或非法时的禁用态
- 共享 provider 的 SDK 初始化与状态传播
- email 流程的状态切换
- passkey 页面在不同条件下的受限态与结果展示
- session 页面在 anonymous / authenticated / error 场景下的展示

### 验证预期

- `examples/demo` 依赖安装成功
- `examples/demo` typecheck 成功
- `examples/demo` build 成功
- 新 demo 的目标测试通过
- 根包 build 仍通过，因为 demo 依赖其公开 SDK 导出契约

## 风险与缓解

### 根包构建耦合

风险：
本地 `file:` 依赖仍然依赖根包构建正确输出。

缓解：
提供明确的联动开发脚本，并在最终验证时坚持走公开导出契约。

### 范围漂移到发布流程

风险：
新 demo 可能在实现过程中演变成直接替换旧 demo 和发布链路的改造。

缓解：
本轮严格限制在 `examples/demo` 新建与本地验证，不进入旧 demo 替换和 CI 改造。

### UI 过度设计

风险：
页面可能看起来更“像 dashboard”，但反而掩盖了真实认证流程。

缓解：
每个路由都必须围绕一个明确的认证任务展开，并始终保留输入、状态和结果的可见性。

## 验收标准

- 在 `examples/demo` 下存在一个新的独立前端应用。
- `examples/demo` 拥有自己的 `package.json` 和前端依赖。
- 应用使用 Vite、React、TypeScript、`react-router`、`HashRouter`、Tailwind 和真实 `shadcn/ui` 组件文件。
- 应用通过本地包依赖消费 `auth-mini/sdk/browser` 中的 `createBrowserSdk`，而不是直接引用 auth-mini 内部源码。
- 应用保留当前 demo 的核心认证交互，同时移除 API reference / 重文档化区域。
- 应用呈现为一个正式、简洁、产品化的多路由 UI。
- 当前 `demo/` 目录和 CI 在本轮保持不变。

## 本轮后的后续工作

- 评估是否让 `examples/demo` 替换当前 `demo/`。
- 更新 CI，使其安装、测试并构建新 demo。
- 决定发布 / 部署文档是否迁移到新的 Vite 应用结构上。
