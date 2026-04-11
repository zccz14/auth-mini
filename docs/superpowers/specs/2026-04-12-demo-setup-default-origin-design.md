# `examples/demo` Setup 默认后端与命令说明调整设计

## 概述

- 收紧 `examples/demo` 的 Setup 页 scope，只调整默认 auth origin、Setup 文案语义，以及展示给用户的命令列表。
- 目标是让公开 demo 在没有 hash 覆盖、也没有本地持久化覆盖时即可直接可用，同时把“自建服务端”与“直接体验官方 demo”两种使用路径明确区分开。

## 目标

- 当用户没有通过 URL hash 指定 auth origin，且本地也没有存储过覆盖值时，demo 默认使用 `https://auth.zccz14.com`。
- Setup 页明确说明：只有在用户想部署自己的 self-hosted auth-mini 服务端时，才需要执行 Setup；否则直接使用官方 demo 后端即可。
- Setup 页的命令列表与 README 当前推荐的 CLI 流程保持一致，避免继续展示过时或误导性的命令。
- 为上述行为补齐聚焦测试，确保默认配置回退和命令渲染约束稳定。

## 非目标

- 不修改 Email、Passkey、Session 页的交互流程。
- 不调整 demo 的整体路由结构、导航、视觉风格或状态管理架构。
- 不在本轮引入新的部署方式说明，也不扩展为完整自托管文档。

## 需求

### 1. 默认 auth origin 回退

- Setup / demo 配置读取逻辑必须优先保留现有覆盖顺序：先看 hash 覆盖，再看已存储覆盖。
- 仅当 hash 覆盖不存在且已存储覆盖不存在时，默认 auth origin 才回退到 `https://auth.zccz14.com`。
- 该默认值的目标是让公开 demo 页面开箱即用，而不是继续停留在“未配置、不可操作”的等待态。

### 2. Setup 页语义

- Setup 页标题和说明文案应表达“这里是自建 auth-mini 服务端时才需要的设置页”。
- 页面必须同时明确：如果用户只是想体验官方 demo，默认官方后端已经足够，不需要先完成 Setup。
- 页面仍可显示当前 page origin 和 auth origin，但文案重点应从“先配置后才能用”改为“默认可用，按需覆盖”。

### 3. Setup 命令列表

- Setup 页展示的命令列表必须仅覆盖“自建 auth-mini 服务端”所需的最小命令集合，并按下面顺序展示：
  1. `npx auth-mini init ./auth-mini.sqlite`
  2. 与 README 对齐的 SMTP 配置命令
  3. 针对当前 page origin 的 origin add 命令
  4. 仅包含 `--issuer` 的 start 命令
- SMTP 配置命令必须沿用 README 中的参数结构与示例风格，避免 demo 与 README 各自维护不同写法。
- origin add 命令必须显式使用当前页面 origin，确保 Setup 文案仍然说明浏览器来源需要加入允许列表。
- start 命令必须形如 `npx auth-mini start ./auth-mini.sqlite --issuer <auth-origin>`。
- start 命令中不得包含 `--host`、`--port`。
- 命令列表中不得包含 `npm --prefix examples/demo run dev -- --host ... --port ...` 或任何其他 demo dev 启动命令。

## 验收标准

- 在未提供 hash 覆盖且本地无存储覆盖时，demo 配置会自动使用 `https://auth.zccz14.com`。
- Setup 页文案能让用户区分“直接使用官方 demo”与“自建服务端”两种路径，且不会暗示 Setup 是所有用户的前置步骤。
- Setup 命令列表包含 init、SMTP、origin add、start 四类命令。
- Setup 命令列表不包含 demo dev 命令。
- Setup start 命令只包含 `--issuer`，不包含 `--host` 或 `--port`。

## 测试要求

- 为默认配置读取逻辑补充或更新测试，覆盖“无 hash 覆盖 + 无本地存储时回退到 `https://auth.zccz14.com`”。
- 为 Setup 页命令渲染补充或更新测试，至少断言：
  - SMTP 配置命令存在。
  - demo dev 命令不存在。
  - start 命令只包含 `--issuer`。
  - start 命令不包含 `--host`、`--port`。
- 若现有测试仍断言“auth origin 缺失时处于等待态”或断言旧命令内容，需要同步改写为上述新语义。

## 影响范围

- `examples/demo` 中负责 demo 配置默认值的逻辑。
- `examples/demo/src/routes/setup.tsx` 及其相关测试。
- 仅限本次 Setup 功能变更直接涉及的测试文件；不扩展到无关页面。
