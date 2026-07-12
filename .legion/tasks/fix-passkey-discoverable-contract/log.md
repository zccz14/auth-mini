# 修复 Passkey Discoverable Credential 契约 - 日志

## 会话进展 (2026-07-11)

### ✅ 已完成

- 完成 Legion 入口判断、upstream 同步、现状调查与 task contract 回读。
- RFC Heavy 已完成，首轮 review-rfc 的三项阻塞均修订并在复审中关闭，最终 PASS。
- 实现、自动化验证、安全 review、walkthrough 与 wiki writeback 已完成。
- acorn 已运行 b4f6cf7 对应部署，公网 OpenAPI 新契约通过；用户确认 Firefox/Bitwarden 注册、发现与无用户名登录成功，EXTERNAL-01 已满足。

### 🟡 进行中

- 更新并推送最终证据，向上游 zccz14/auth-mini:main 创建中文 PR，启用 auto-merge 并跟踪终态。

### ⚠️ 阻塞/待定

(暂无)

---

## 关键文件

- **`.legion/tasks/fix-passkey-discoverable-contract/docs/rfc.md`** [completed]
  - 作用: High Risk RFC Heavy 设计真源
  - 备注: review-rfc 最终 PASS
- **`.legion/tasks/fix-passkey-discoverable-contract/docs/test-report.md`** [completed]
  - 作用: 自动化、acorn 公网契约与实机验证证据
  - 备注: EXTERNAL-01 SATISFIED
- **`.legion/tasks/fix-passkey-discoverable-contract/docs/review-change.md`** [completed]
  - 作用: 安全视角交付审查
  - 备注: PASS，允许 merge/release
- **`.legion/tasks/fix-passkey-discoverable-contract/docs/pr-body.md`** [completed]
  - 作用: 上游中文 PR 说明
  - 备注: 问题、必要性、风险、验证与回滚均已覆盖

---

## 关键决策

| 决策                                                        | 原因                                                            | 替代方案                                            | 日期       |
| ----------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------- | ---------- |
| 注册验证严格要求 `clientExtensionResults.credProps.rk=true` | false 或缺失都不能证明新凭据满足无用户名发现契约                | 仅拒绝 false、接受缺失                              | 2026-07-11 |
| 采用高层 WebAuthn API + typed-first/fail-closed projection  | 保留 0.5.5 安全 wrapper 与存储兼容，同时封闭浏览器扩展面        | unsafe core、专用 resident API、透传全部 extensions | 2026-07-11 |
| PR 前直接部署当前 worktree 到 acorn                         | 用户明确指定受控机器直接部署以解除实机门禁                      | Draft PR 或先合并 main                              | 2026-07-11 |
| 上游 PR 使用中文 Conventional Commit 标题与问题导向说明     | 用户明确要求 Conventional Commit 标题，并用中文说明问题与必要性 | 英文标题/body 或仅列改动                            | 2026-07-11 |

---

## 快速交接

**下次继续从这里开始：**

1. 提交最终验证证据并 rebase/push feature branch。
2. 创建标题为 fix(webauthn): 统一 Passkey discoverable credential 契约 的上游 PR。
3. 启用 auto-merge，watch checks/review 到 merged 后清理。

**注意事项：**

- EXTERNAL-01 SATISFIED，review-change 允许 merge/release。
- PR base 为 zccz14/auth-mini:main，head 为 Thrimbda feature branch，body 全中文。

---

_最后更新: 2026-07-11 11:16 by Legion CLI_
