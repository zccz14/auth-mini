# `examples/demo` 首页产品定位增强设计

## 问题陈述

- 当前 `examples/demo/src/routes/home.tsx` 仍以“浏览器 auth demo / 先 setup 再试流程”为主叙事，落点更像内部验证页，而不是对外展示 `auth-mini` 产品价值的首页。
- 这会让首次到访者在理解“为什么值得用 auth-mini”之前，就被引导去做 setup 或试流程，削弱 README 已经建立起来的产品定位：一个最小、自托管、聚焦认证本身的 Auth Server。
- 本轮需要把 demo 首页默认切回“官方 Auth Server 体验”的介绍页：先解释产品价值、适用边界与能力，再引导用户进入 demo 流程页验证功能。

## 目标

- 将首页主标题固定为 **`Minimal Self-Hosted Auth Server for your Apps`**，并以 README 的语气强化 `auth-mini` 的产品感与可信度。
- 面向独立开发者、全栈工程师、以及对收益敏感的小企业主，优先回答“为什么值得使用 auth-mini”。
- 首页默认呈现官方 Auth Server 体验，而不是把 setup 作为页面中心。
- 采用已批准的信息架构：1) Hero 2) Core Value Grid 3) Capability Strip 4) Scope Boundary 5) Demo Entry。
- 保持 scope 收敛到首页与极少量支持样式；保留现有顶栏导航 / app shell，其他路由继续承担功能证明页职责。

## 非目标

- 不重做 `examples/demo` 的整体路由结构、导航结构或其他页面职责。
- 不把首页扩展成完整营销站点，不加入夸张动画、插画、轮播或品牌宣传素材。
- 不在本轮改变 setup、email、passkey、session 路由的功能逻辑。
- 不引入 README 未承诺的能力，如 RBAC、社交登录、用户管理后台或用户资料系统。

## 用户受众

### 核心受众

- **独立开发者**：希望尽快为自己的产品补上可靠认证能力，但不想引入过重平台。
- **全栈工程师**：需要一个容易部署、容易理解、容易接入前后端链路的认证服务。
- **收益敏感的小企业主**：关注自托管、成本、依赖控制与长期维护负担。

### 他们最关心的问题

- 能不能快速理解 `auth-mini` 到底提供什么。
- 为什么它比“自己从零拼 auth”或“接一个更重的平台”更值得。
- 它的能力边界是否清楚，避免误以为这是全家桶身份平台。

## 内容结构

### 1. Hero

- 页面开头直接呈现 `auth-mini` 是官方 Auth Server 体验，而不是“先做 setup 的示例页”。
- 标题使用批准文案：`Minimal Self-Hosted Auth Server for your Apps`。
- 副文案需强调：最小、自托管、面向真实应用的认证核心；重点放在“你掌控服务与数据”“只解决 authentication 这件事”。
- Hero 内允许保留一条简短状态提示，说明当前 demo 配置是否 ready，但该提示只能是辅助信息，不能压过产品定位。

### 2. Core Value Grid

- 用 3~4 个价值卡片解释为什么值得用，内容基于 README 已有承诺组织，而不是发明新卖点。
- 推荐覆盖方向：
  - 自托管与数据控制权
  - Password-less 认证主路径（Email OTP + Passkey）
  - JWT access token + refresh token + JWKS 的后端接入模式
  - SQLite 带来的部署与运维简洁性
- 每个卡片强调“对应用开发者的直接收益”，避免写成 API 清单。

### 3. Capability Strip

- 用一条更紧凑的能力带概括 README 中的能力轮廓，帮助读者快速扫读。
- 文案应突出“auth server core”而非“demo flow list”，例如：邮件 OTP、Passkey、Session、JWKS、跨域前端接入。
- 这一段是能力摘要，不承载详细操作说明。

### 4. Scope Boundary

- 明确给出 **Good fit / Not included** framing，并与 README 保持一致。
- Good fit 要表达：如果应用需要一个可自托管、聚焦认证、支持浏览器与后端验证链路的最小 Auth Server，`auth-mini` 是合适选择。
- Not included 要明确排除：Authorization（RBAC/ACL/权限/角色等）、社交登录、SMS/TOTP 2FA、用户资料、管理后台等。
- 这一段要帮助读者快速判断边界，避免首页为了“显得强大”而模糊 scope。

### 5. Demo Entry

- 在页面末尾再引导进入 demo flows，而不是让 flows 成为首页主角。
- 入口文案需区分“理解产品”与“验证功能”：先知道它是什么，再进入 Setup / Email / Passkey / Session 页面体验。
- 这里可以给出 1~2 个明确 CTA，例如“Start with official Auth Server setup”“Try browser auth flows”，但仍保留当前导航为主入口之一。

## 文案方向

- 整体语气对齐 README：克制、直接、面向工程实践，不写成夸张营销口号。
- 首页应多使用“self-hosted / auth server / auth core / your apps / control your data”这类产品语言，少用“toy demo / sample UI / guided flow”语汇。
- 文案重点是收益与取舍：为什么轻、为什么够用、为什么边界清楚，而不是把所有技术点都摊开。
- 对于 setup 状态、交互流程等说明，采用次级信息层级，避免再次把首页重心拉回“内部测试页”。

## 视觉与布局方向

- 视觉基调为**克制的开发者产品落地页**：整洁、稳重、可信，不像内部测试页面，也不做 flashy marketing page。
- 延续当前 `AppShell`、顶栏导航、整体浅色调与现有设计 token，避免把首页做成与其他路由完全割裂的新站点。
- 首页主体允许比当前 `FlowCard` 更自由的多段落布局，但仍应保持清晰的纵向阅读节奏与适度留白。
- Hero 与核心价值区可以使用卡片、边框、细粒度背景层次来增强“产品页”感；避免大面积插画、渐变特效、视频或复杂装饰。

## 组件 / 文件影响

- **主要改动文件**：`examples/demo/src/routes/home.tsx`
  - 负责承载新的首页信息架构与文案层级。
- **可选支持文件**：`examples/demo/src/styles/globals.css`
  - 仅在需要补充极少量全局或首页专用样式时调整；优先使用现有 Tailwind utility。
- **明确保留不改**：`examples/demo/src/components/app/app-shell.tsx`
  - 保留当前顶栏导航与 app shell。
- **其他路由职责保持不变**：`/setup`、`/email`、`/passkey`、`/session`
  - 继续作为功能证明页，不在本轮被重新定义为营销内容页。

## 验收标准

- 首页首屏能清晰传达 `auth-mini` 是官方 Auth Server 体验，且默认叙事不是“先 setup”。
- 页面包含并按顺序呈现 Hero、Core Value Grid、Capability Strip、Scope Boundary、Demo Entry 五个信息区块。
- 主标题精确使用 `Minimal Self-Hosted Auth Server for your Apps`。
- 首页文案与 README 语气一致，并明确体现 Good fit / Not included 边界。
- 页面显式说明官方 Auth Server default experience，并保留现有导航与其他路由职责。
- 实现范围只落在首页与最小支持样式，不扩散到其他页面重构。

## 验证方式

- 视觉走查：确认首页结构、文案层级与导航保留符合本 spec。
- 构建验证：至少执行 `npm run demo:build`，确保首页改版不会破坏 demo 构建产物。
- 类型校验：至少执行 `npm run demo:typecheck`，确保 demo 路由与样式改动保持类型正确。
- 如新增或调整首页相关测试，可做最小必要补充；若不新增测试，需至少通过人工走查确认五段式结构、标题文案与边界信息存在。

## 风险与控制

- 风险：为了“更强产品感”而滑向过度营销，和 README 语气脱节。
  - 控制：所有价值表达都从 README 已承诺能力与边界中提炼，不新增夸张卖点。
- 风险：首页又被 setup 状态或 demo 操作说明主导。
  - 控制：把配置状态降级为辅助信息，把进入流程的 CTA 放到 Demo Entry 段落。
- 风险：首页视觉过度特化，破坏现有 demo shell 一致性。
  - 控制：保留顶栏导航、主容器宽度与现有视觉 token，只做首页内容层级重排。

## 自检结论

- 已检查无 `TODO`、`TBD` 或占位文案。
- 各章节口径一致：范围仅限首页与最小支持样式，不触及其他路由职责。
- “官方 Auth Server 默认体验”“Good fit / Not included”“保留导航与其他功能页职责”均已明确写入，无相互冲突表述。
