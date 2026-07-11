# 修复 Passkey Discoverable Credential 契约 - 日志

## 会话进展 (2026-07-11)

### ✅ 已完成

- 完成 Legion 入口判断、upstream 同步、现状调查与 task contract 回读。
- RFC Heavy 已完成，首轮 review-rfc 的三项阻塞均修订并在复审中关闭，最终 PASS。
- 实现、自动化验证、安全 review、walkthrough 与 wiki writeback 已完成。

(暂无)

### 🟡 进行中

- 初始化任务日志。
- 按 High Risk / RFC Heavy 路径完成设计与对抗审查。
- 在批准 RFC 边界内实现核心协议、测试、OpenAPI 与文档。
- 等待 Firefox/Bitwarden 实机互操作门禁后执行 commit、push、PR auto-merge 与终态清理。
- 按用户明确指示，在 PR 前将当前 worktree 构建产物直接部署到受控主机 acorn 进行 Firefox/Bitwarden 实机验证。

### ⚠️ 阻塞/待定

- EXTERNAL-01：当前环境无 Firefox、Bitwarden、GUI 或测试 vault；main merge 会自动 release/deploy，故实机 chooser 证据完成前禁止 merge。

(暂无)
(暂无)
(暂无)
(暂无)
(暂无)
(暂无)

---

## 关键文件

## (暂无)

## 关键决策

| 决策                                | 原因                                                                                 | 替代方案                                        | 日期       |
| ----------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- | ---------- |
| PR 前直接部署当前 worktree 到 acorn | 用户明确说明受控机器允许直接部署，并指定目标主机 acorn，以解除目标域实机互操作门禁。 | 先开 Draft PR 或先合并 main；均被用户明确否决。 | 2026-07-11 |

---

## 快速交接

**下次继续从这里开始：**

1. 构建 release binary，备份 acorn 当前二进制后替换并健康检查。
2. 在 auth.0xc1.wang 完成 Firefox/Bitwarden 门禁；随后恢复 PR/auto-merge lifecycle。

**注意事项：**

- 部署必须保留可执行回滚点。
- 不得修改 acorn 数据库或既有 credential。

(暂无)
(暂无)
(暂无)
(暂无)
(暂无)
(暂无)
(暂无)

---

_最后更新: 2026-07-11 11:16 by Legion CLI_
