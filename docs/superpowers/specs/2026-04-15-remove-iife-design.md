# 移除仓库内现行 IIFE 概念设计

## 背景

- 仓库此前围绕浏览器全局 SDK 建立过一套 IIFE / singleton-IIFE 路径，包括公开端点、`window.AuthMini` 安装方式、构建脚本、测试与文档说明。
- 近期调整后，运行时公开入口已经部分收缩，但仓库中的 README、集成文档、构建/发布脚本与测试仍保留 IIFE 相关合同，形成“运行时看似已移除、文档和工具链仍继续承诺”的不一致状态。
- `src/sdk/browser.ts` 当前仍在结构上依赖 `src/sdk/singleton-entry.ts`，说明模块 SDK 与 IIFE 入口尚未真正解耦；如果直接删除 IIFE 文件，容易把模块 SDK 一起打断。
- 现有 build / publish / test 流程仍要求 singleton-IIFE 相关产物存在，测试覆盖也混杂了真正的 IIFE 场景与“借道 singleton 入口驱动的共享运行时”场景，导致后续清理边界不清。
- 本轮需要先用 spec 明确清理目标、保留范围与实施顺序，避免实现阶段再次扩大范围或误删非目标内容。

## 目标

- 移除仓库内所有仍处于现行合同中的 IIFE 相关概念，覆盖公开端点、浏览器全局安装路径、IIFE 专属构建脚本、测试与 README / 集成文档说明。
- 保持 npm / 模块化 SDK 作为唯一继续维护的浏览器 SDK 交付路径。
- 在清理过程中先抽离中性的浏览器共享运行时，再让模块 SDK 指向该中性运行时，最后删除 IIFE 专属代码与配套资产，避免因删除顺序错误破坏现有模块 SDK。
- 明确历史 spec / implementation plan 文档属于保留对象，不纳入本轮清理。

## 非目标

- 本轮不修改历史 spec / implementation plan 文档，即使其中仍包含 IIFE、`singleton-iife` 或 `window.AuthMini` 描述，也视为历史记录保留。
- 本轮不改变与 IIFE 清理无关的 SDK 对外 API 语义，不把本次工作扩展为通用 SDK 重构。
- 本轮不把 `node_modules`、第三方依赖实现或依赖内部文档当作清理目标。
- 本轮不处理 `.worktrees/` 目录中已有内容；这些内容不属于当前 repo 主线待清理对象。

## 问题分析

### 1. 运行时与文档合同错位

- 仓库当前状态已经表现出“运行时公开 IIFE 端点趋于移除”的方向，但 README、集成文档与其他现行说明仍继续承诺 IIFE 能力。
- 这种错位会让使用者依据文档寻找已经不应继续存在的入口，也会让维护者误以为工具链仍必须保留 IIFE 支持。

### 2. 模块 SDK 仍结构性依赖 singleton 入口

- `src/sdk/browser.ts` 仍通过 `src/sdk/singleton-entry.ts` 承接部分共享逻辑，导致模块 SDK 与 IIFE 入口没有真正解耦。
- 如果不先抽出中性共享运行时，而是直接删除 singleton 入口，模块 SDK 很可能在构建、类型或运行时层面一起受损。

### 3. 工具链仍要求 singleton-IIFE 产物

- 构建、发布与测试流程仍围绕 singleton-IIFE artifact 组织，说明 IIFE 尚未从仓库维护面彻底退出。
- 这会让“运行时已下线”与“仓库仍必须产出/校验 IIFE artifact”同时存在，形成长期维护负担。

### 4. 测试边界混杂

- 当前测试中同时存在两类覆盖：
- 一类是真正面向 IIFE / 浏览器全局合同的覆盖。
- 一类本质上是在验证共享浏览器运行时，但路径上却借道 singleton 入口。
- 若不先拆开这两类测试，后续删除 IIFE 时会难以判断哪些测试应删除、哪些测试应迁移到中性运行时或模块 SDK 路径。

## 设计原则

- 先解耦，再删除：先提取中性共享运行时，再删除 IIFE 专属实现，避免破坏模块 SDK。
- 只清理 repo 自有、现行维护内容：历史 spec / plan、依赖内部内容、`.worktrees/` 既有内容不在范围内。
- 文档、测试、构建、发布口径必须同步收敛到“仅保留模块 SDK”这一事实合同，不能只删运行时代码而保留旧说明。

## 方案

### 1. 先从 `src/sdk/singleton-entry.ts` 提取中性浏览器共享运行时

- 将当前由 `src/sdk/singleton-entry.ts` 承载、同时被模块 SDK 与 IIFE 路径间接依赖的共享浏览器运行时能力抽离到一个不带 singleton / IIFE 语义的新中性入口。
- 该中性入口只表达浏览器 SDK 的共享运行时能力，不再包含浏览器全局安装、IIFE 包装或 `window.AuthMini` 暴露语义。
- `src/sdk/singleton-entry.ts` 在完成迁移前可以作为过渡桥接点存在；最终目标是让其不再承载不可替代的共享逻辑。

### 2. 将模块 SDK 改为直接依赖中性运行时

- `src/sdk/browser.ts` 后续实现必须改为直接消费上一步抽离出的中性共享运行时，而不是继续结构性依赖 `src/sdk/singleton-entry.ts`。
- 模块 SDK 对外导出合同保持既有语义，不因去除 IIFE 路径而扩大变更范围。
- 只有在模块 SDK 已独立工作后，才允许继续删除 IIFE 专属入口。

### 3. 删除 IIFE 专属源码、构建、类型与浏览器全局路径

- 在模块 SDK 完成解耦后，删除仅服务于 IIFE / singleton-IIFE 的源码、构建脚本、发布校验、类型声明与其他专属产物要求。
- 删除服务端或静态资源层面仍面向 IIFE 的公开端点约定。
- 删除 `window.AuthMini` 浏览器全局安装路径及其对应文档、测试与类型合同。

### 4. 同步清理 README、集成文档、测试与发布校验

- README、示例接入文档与其他 repo 自有非历史文档中，不再描述 IIFE、`singleton-iife` 或 `window.AuthMini` 作为现行接入方式。
- 测试需要拆分并收敛为两类结果：
- 原本真正验证 IIFE / 浏览器全局合同的测试应删除。
- 原本只是借道 singleton 入口验证共享浏览器运行时的测试，应改挂到中性运行时或模块 SDK 路径。
- 构建、发布、lint、typecheck、测试校验均不得再要求 singleton-IIFE artifact 存在。

## 范围边界

### 应清理内容

- repo 自有的公开 IIFE HTTP / 静态入口描述与实现。
- repo 自有的 `window.AuthMini` 浏览器全局安装及其类型/测试/文档合同。
- repo 自有的 `singleton-iife` 构建、发布、校验与测试痕迹。
- README、集成文档、示例说明等仍把 IIFE 当作现行能力的内容。

### 保留内容

- `docs/superpowers/specs/`、implementation plan 等历史文档中的 IIFE 记载。
- `node_modules` 与第三方依赖内部内容。
- `.worktrees/` 目录下已有工作树内容。
- 与 IIFE 清理无关的 SDK API 及行为。

## 验收标准

- repo 自有、非历史 spec / plan 内容中，不再包含 `IIFE`、`singleton-iife` 或 `window.AuthMini`。
- 模块浏览器 SDK 不再结构性依赖 `src/sdk/singleton-entry.ts`，而是依赖抽离后的中性共享浏览器运行时。
- IIFE 专属源码、构建、发布校验、测试与浏览器全局安装路径已移除。
- README、集成文档与其他现行说明已改为仅描述保留的模块 SDK 路径。
- 在完成上述更新后，仓库的 build、test、lint、typecheck 均通过。

## 实施提示

- 实现顺序必须遵循“先抽共享运行时，再切模块 SDK，最后删 IIFE 专属内容”的依赖关系，避免直接删除导致模块 SDK 回归。
- 清理文本时应只针对 repo 自有、非历史内容进行搜索与替换，避免误改历史 spec / plan。
- 如果实现阶段发现某些测试名称或夹具仍带有 singleton 痕迹，但其验证对象其实是共享运行时，应优先迁移测试意图，而不是机械保留旧入口。
