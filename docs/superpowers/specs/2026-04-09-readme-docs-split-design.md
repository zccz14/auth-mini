# README 拆分到 docs 设计

## 目标

- 把当前过长、兼具首页与参考手册职责的 `README.md` 收敛为“项目首页 + 集成预览 + 导航入口”。
- 保留足够的卖点、设计取向与接入预览，让首次访问仓库的用户能快速判断 `auth-mini` 是否适合自己的系统。
- 将详细集成与参考内容下沉到 `docs/`，减少 README 的滚动长度与认知负担。

## 非目标

- 不改动产品行为、CLI、HTTP API 或 SDK。
- 不重写已有 `docs/deploy/docker-cloudflared.md` 的技术内容，只调整 README 对它的引用方式。
- 不为所有现有 README 段落都创建独立文档；优先做最小、清晰的专题拆分。

## 当前问题

- 当前 `README.md` 同时承担项目定位、哲学说明、CLI 手册、HTTP API 参考、Browser SDK 手册、WebAuthn 细节与 Docker 部署入口，首页信息层级不清。
- 首次读者需要滚过大量实现细节后，才能建立“这是什么、适不适合我、为什么这样设计”的判断。
- 已经存在 `docs/` 目录与部署文档，但 README 仍承载过多应当下沉的参考信息。

## 设计原则

### 1. README 优先回答决策问题

首页按以下顺序组织：

1. `What is this`：项目定位与一句话价值。
2. `Who is this for`：适用与不适用场景边界。
3. `Why this shape`：关键设计取舍与哲学。
4. `How it fits`：一个足够短的集成预览。
5. `Where to go next`：详细文档导航。

### 2. README 保留“peek”，不保留完整手册

- README 应保留最小可理解的接入预览，例如一张流程图、最小 CLI 启动示例、最小浏览器集成示例。
- README 不再保留完整 Browser SDK 手册、完整 HTTP API 参考、完整 WebAuthn 载荷示例与长篇部署步骤。

### 3. docs 按读者任务拆分

- 按“我要怎么接”“我要查什么接口”“我要怎么部署”拆分，而不是按代码目录拆分。
- 新文档应尽量承接 README 已有内容，避免发明新的信息架构。

### 4. 明确单一事实来源

- `README.md` 是仓库首页与决策入口。
- `docs/` 是静态、可链接的权威说明与参考文档目录。
- `demo/` 继续保留为交互式 demo/docs 页面，但不再作为唯一的细节承载位置；README 应优先链接 `docs/` 中的静态文档，`demo/` 可以在相关文档中作为体验入口被引用。

## 拟议信息架构

### README 保留内容

- 项目标题与一句话定位。
- 一段简短项目介绍，强调小而清晰、自托管、针对 auth-only 场景。
- `For / Not For` 或同等表达的适用性说明。
- `Core selling points`：4-6 条高价值卖点。
- `Philosophy`：压缩后的设计取舍说明，服务于用户判断，不展开成长篇手册。
- 按用户旅程拆开的 2-3 张精简流程图：
  - Email OTP sign-in
  - Passkey registration / sign-in
  - Frontend -> backend -> `/jwks` verification
- 一个简短 `Quick peek`：
  - 最小 `init` / `start` 示例
  - 最小浏览器 SDK 加载示例
  - 一句 JWKS / backend verify 说明
- `Docs` 导航区，链接到更详细文档。
- `Development` 与 `License`。

README 的可执行边界如下：

- 顶级 section 控制在 8 个以内。
- 只保留 2 个代码示例：
  - 一个最小 CLI 启动示例
  - 一个最小 Browser SDK 加载示例
- 保留 2-3 张小型流程图，分别服务于 email、passkey、backend verify 三类阅读任务，不使用一张大而全的总图。
- 不再保留以下详细正文：
  - Browser SDK 状态模型与跨域细节
  - 完整 HTTP API endpoint 列表
  - WebAuthn payload JSON 示例
  - Docker 部署步骤与排障正文

### 从 README 下沉到 docs 的内容

- Browser SDK 详细说明：
  - SDK 加载方式
  - cross-origin 使用说明
  - startup state model
  - `me.get()` vs `me.reload()`
  - operational limits
  - demo/docs 发布说明
- WebAuthn 详细说明：
  - register / authenticate 步骤
  - 详细 payload 示例
  - discoverable credential 约束
  - challenge 生命周期说明
- HTTP API 参考：
  - public endpoints
  - authenticated endpoints
  - refresh body 格式
- CLI / operations：
  - 详细 CLI topic 用法
  - JWKS rotation 说明
  - logging 行为与注意事项
- Backend token verification：
  - 使用 `/jwks` 验证 access token 的说明
- Docker 部署仍链接到现有 `docs/deploy/docker-cloudflared.md`。

## 新增/修改文件

### 修改

- `README.md`
  - 重写为偏产品首页的结构。
  - 删除详细参考段落，改为 docs 链接。

### 新增

- `docs/integration/browser-sdk.md`
  - 承接当前 README 中 Browser SDK 与 demo/docs 发布相关说明。
- `docs/integration/webauthn.md`
  - 承接当前 README 中 WebAuthn flow 与 payload 细节。
- `docs/reference/http-api.md`
  - 承接当前 README 中 HTTP API 参考。
- `docs/reference/cli-and-operations.md`
  - 承接当前 README 中详细 CLI、JWKS rotation、logging 相关说明。
- `docs/integration/backend-jwt-verification.md`
  - 承接当前 README 中 backend verify / JWKS 使用说明。

## 现有 README 章节迁移对照

- `Demo / Docs`
  - README：保留为 docs/demo 导航入口，但改为更短的导航说明。
- `Interaction flow`
  - README：保留 1 张精简流程图。
- `Features`
  - README：保留并改写为更偏卖点的核心能力列表。
- `CLI`
  - README：只保留最小 `init` / `start` 预览。
  - `docs/reference/cli-and-operations.md`：承接详细 topic、rotation、logging。
- `Logging`
  - 移至 `docs/reference/cli-and-operations.md`。
- `Docker deployment`
  - README：只保留一句说明与部署文档入口，不保留 `docker run` snippet。
  - `docs/deploy/docker-cloudflared.md`：保留详细正文与排障。
- `HTTP API`
  - 移至 `docs/reference/http-api.md`。
- `Browser SDK`
  - README：只保留最小加载预览。
  - `docs/integration/browser-sdk.md`：承接详细说明与 demo/docs 发布说明。
- `WebAuthn flow`
  - 移至 `docs/integration/webauthn.md`。
- `Philosophy`
  - README：保留压缩版，作为首页核心判断信息。
- `Development` / `License`
  - README：保留。

## 内容迁移规则

- 尽量复用 README 现有文本，优先“搬运 + 收敛”，而不是重新发明整套文案。
- README 中保留的哲学段落要明显压缩，避免再形成新的长文。
- 文档之间使用相对链接互相引用，README 的 docs 导航应覆盖新增文档与现有部署文档。
- 迁移时必须保证每个当前 README 主题都满足以下四选一：
  - 留在 README
  - 移到现有文档
  - 移到新文档
  - 明确判定为本次删除且不会影响核心理解
- 不允许出现“从 README 删掉，但没有新归宿”的内容孤岛。

## 验收标准

- `README.md` 满足本 spec 里定义的 section / snippet / flow 图边界，且不再包含完整 Browser SDK、完整 HTTP API、完整 WebAuthn 参考正文。
- 首屏或前几个 section 能清楚回答：这是什么、适合谁、为什么这样设计。
- README 仍保留最小接入预览，不变成纯营销页。
- 新增文档能独立承接被移出的细节内容，且 README 链接有效。
- 现有 `docs/deploy/docker-cloudflared.md` 保持可达并在 README 中有明确入口。
- `demo/` 的角色在 README 或相关 docs 中得到明确说明，不与 `docs/` 形成相互竞争的主入口。
- 按“现有 README 章节迁移对照”检查后，不存在失联主题。

## 验证

- 手动检查 `README.md` 的标题层级与相对链接。
- 手动检查新增 `docs/` 文件之间及从 README 指向它们的链接路径。
- 对照“现有 README 章节迁移对照”逐项检查内容是否保留、迁移或明确删除。
- 手动确认 `README`、`docs/`、`demo/` 三者的角色描述一致。
- 如仓库已有文档校验脚本，则运行相关脚本；否则以链接与结构检查为主。
