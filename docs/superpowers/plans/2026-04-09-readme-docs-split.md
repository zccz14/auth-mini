# README / docs 拆分 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `README.md` 收敛为偏产品首页与接入预览，并把详细 SDK / WebAuthn / API / CLI-ops / JWT verify 内容下沉到 `docs/`。

**Architecture:** 这次改动只做文档信息架构重组，不改产品行为。`README.md` 负责项目定位、适用边界、设计取舍、简短流程图与最小接入预览；`docs/` 承接静态权威参考；`demo/` 继续作为交互式补充入口而不是主参考来源。

**Tech Stack:** Markdown, Mermaid, existing repo docs structure

---

## Chunk 1: 文档骨架与迁移落点

### Task 1: 锁定迁移映射与目标文件

**Files:**

- Modify: `README.md`
- Create: `docs/integration/browser-sdk.md`
- Create: `docs/integration/webauthn.md`
- Create: `docs/integration/backend-jwt-verification.md`
- Create: `docs/reference/http-api.md`
- Create: `docs/reference/cli-and-operations.md`

- [ ] **Step 1: Re-read the approved spec and current README sections**

Read:

- `docs/superpowers/specs/2026-04-09-readme-docs-split-design.md`
- `README.md`

Expected: a complete topic-by-topic mapping with no orphaned README section.

- [ ] **Step 2: Verify target directories and exact target files**

Run:

```bash
ls docs && ls docs/integration docs/reference
```

Expected:

- parent `docs/` exists
- `docs/integration` / `docs/reference` either already exist or are clearly absent and need creation
- exact target files are confirmed absent before creation or intentionally reviewed if they already exist

- [ ] **Step 3: Write a persisted migration checklist before editing**

Checklist must cover:

- README section kept and rewritten
- README section moved to a new doc
- README section linked to an existing doc
- Any section intentionally dropped

Expected: each current README topic has exactly one destination, and the checklist is available for final review (for example in implementation notes or PR body).

## Chunk 2: 新建详细文档并承接原内容

### Task 2: 提取 Browser SDK 详细说明

**Files:**

- Create: `docs/integration/browser-sdk.md`
- Modify: `README.md`

- [ ] **Step 1: Write the destination doc with moved SDK details**

Content to include:

- SDK endpoint and `.d.ts` availability
- direct cross-origin loading guidance
- localhost example
- startup state model
- `me.get()` vs `me.reload()`
- passkey example snippet
- operational limits
- demo/docs publishing guidance
- clear note that `demo/` is an interactive companion, while `docs/` is the canonical static reference

- [ ] **Step 2: Preserve only the minimal SDK preview in README**

README should keep only:

- one short paragraph introducing the SDK
- one minimal `<script src=...>` example
- one link to `docs/integration/browser-sdk.md`

- [ ] **Step 3: Check links between README and SDK doc**

Expected: relative links resolve in both directions where present.

### Task 3: 提取 WebAuthn 详细说明

**Files:**

- Create: `docs/integration/webauthn.md`
- Modify: `README.md`

- [ ] **Step 1: Move WebAuthn flow details into the new doc**

Content to include:

- step-by-step register/authenticate flow
- registration payload example
- authentication payload example
- discoverable credential explanation
- challenge invalidation / preservation rules
- `@simplewebauthn/server` note and advertised algorithms constraint

- [ ] **Step 2: Reduce README to philosophy + high-level passkey positioning**

README should not retain JSON payloads or ceremony details.

- [ ] **Step 3: Add docs cross-links**

Expected: README points to `docs/integration/webauthn.md`, and the WebAuthn doc can reference related SDK/API docs if useful.

### Task 4: 提取 API、CLI/ops、backend verify 参考

**Files:**

- Create: `docs/reference/http-api.md`
- Create: `docs/reference/cli-and-operations.md`
- Create: `docs/integration/backend-jwt-verification.md`
- Modify: `README.md`

- [ ] **Step 1: Write `docs/reference/http-api.md`**

Content to include:

- public endpoints list
- authenticated endpoints list
- bearer token note
- refresh JSON body example
- `/me` behavior note

- [ ] **Step 2: Write `docs/reference/cli-and-operations.md`**

Content to include:

- `init`, `origin`, `smtp`, `start`, `rotate jwks` usage details
- compatibility alias notes currently mentioned in README
- logging behavior and sensitive-field note

- [ ] **Step 3: Write `docs/integration/backend-jwt-verification.md`**

Content to include:

- how backends use `/jwks`
- the high-level verification chain already previewed in README
- where this fits relative to access token / refresh token behavior

- [ ] **Step 4: Remove detailed API/CLI/ops/backend verify prose from README and replace with docs navigation**

Expected: README becomes an overview, not a reference manual.

## Chunk 3: 重写 README 首页信息架构

### Task 5: 重写 README 为偏产品首页

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Rewrite the opening sections**

README must include:

- title
- one-sentence positioning
- short intro paragraph
- `For / Not For`
- `Core selling points`

- [ ] **Step 2: Rewrite `Philosophy` as concise decision support**

Keep compact subsections for:

- why not a full auth platform
- why email OTP + passkeys
- why SQLite
- why access + refresh tokens

Expected: these sections are shorter than the current README and help users judge fit.

- [ ] **Step 3: Keep the quick peek section small and concrete**

README should keep:

- 2-3 small Mermaid flow diagrams
- one minimal CLI example
- one minimal browser SDK example
- a short note pointing to backend JWT verification docs

README should not keep:

- complete endpoint tables
- complete operational walkthroughs
- WebAuthn payload JSON blocks
- Docker troubleshooting body text

- [ ] **Step 4: Add the docs map near the end of README**

Include links to:

- `docs/integration/browser-sdk.md`
- `docs/integration/webauthn.md`
- `docs/integration/backend-jwt-verification.md`
- `docs/reference/http-api.md`
- `docs/reference/cli-and-operations.md`
- `docs/deploy/docker-cloudflared.md`
- `demo/`

- [ ] **Step 5: Keep `Development` and `License` intact or minimally adjusted**

Expected: repo contributor workflow remains easy to find.

## Chunk 4: 验证与收尾

### Task 6: 验证文档结构与链接

**Files:**

- Modify: `README.md` (only if fixes are needed)
- Modify: `docs/integration/*.md`
- Modify: `docs/reference/*.md`

- [ ] **Step 1: Re-read all touched docs for broken structure**

Read:

- `README.md`
- all newly created docs

Expected: heading levels are sane, links are relative and consistent, no obvious duplication drift.

- [ ] **Step 2: Verify README hard boundaries from the approved spec**

Check explicitly that README now has:

- no more than 8 top-level sections
- exactly 2 code examples
- 2 or 3 small Mermaid flow diagrams
- no detailed Browser SDK state model prose
- no complete HTTP API endpoint tables
- no WebAuthn payload JSON blocks
- no Docker troubleshooting body text

Expected: README satisfies the spec boundaries rather than only "feeling shorter".

- [ ] **Step 3: Verify migration against the approved spec checklist**

Check that each original README topic ended up in exactly one of:

- kept in README
- moved to existing doc
- moved to new doc
- intentionally dropped

Expected: no orphaned topic and no accidental duplicate “source of truth”.

- [ ] **Step 4: Verify README / docs / demo role descriptions are consistent**

Check that:

- README presents `docs/` as the canonical static reference entry
- `demo/` is described as an interactive companion rather than the sole detailed docs surface
- new docs do not contradict that ownership

Expected: no confusion about the primary place to look for static documentation.

- [ ] **Step 5: Run any repo-local docs validation if available**

Suggested commands:

```bash
bash docker/check-docs.sh post
```

If unavailable or inapplicable, record that validation fell back to manual link/structure review.

- [ ] **Step 6: Review final diff before completion**

Run:

```bash
git diff -- README.md docs/integration docs/reference
```

Expected: diff shows a README that is shorter and more product-oriented, with detailed material moved to docs.

- [ ] **Step 7: Commit**

```bash
git add README.md docs/integration docs/reference
git commit -m "docs: split README reference content into docs"
```
