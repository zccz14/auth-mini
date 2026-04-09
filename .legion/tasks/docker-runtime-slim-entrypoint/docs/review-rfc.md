# RFC 审查报告

## 结论

FAIL

- 可实现性：**FAIL**
- 可验证性：**FAIL**
- 可回滚性：**PASS**
- 是否 APPROVED：**否**

## 阻塞问题

- [ ] **基础镜像 tag 仍未在 RFC 内最终钉死，和“可复现”目标自相矛盾**  
      RFC 一边把“避免 floating tag”作为核心目标，一边又允许“实现时按当天官方存在的最新 slim 变体替换”。这会导致评审通过的不是一个确定设计，而是一个“实现时再决定”的占位方案；同一 RFC 在不同日期可能落到不同 tag，无法严格审阅、复现和回滚。  
      **最小化复杂度修复建议：** 在 RFC 中直接写死本轮准备采用的 builder/runtime tag；如果确实还未确认，则先补一条“确认官方 tag 并回填 RFC”作为前置门禁，未回填前不要给 APPROVED。

- [ ] **验证方案不能证明最终镜像里的 cloudflared 二进制真的可用**  
      RFC 把 `bash docker/test-image-smoke.sh` 视为“cloudflared 仍被正确复制并可执行”的主要证据，但当前 smoke test 通过 PATH 前置 stub 覆盖了镜像内真实的 `/usr/local/bin/cloudflared`；`docker/test-entrypoint.sh` 也只是用 `node:20-slim` 跑脚本，不验证最终 runtime 二进制。现有验证最多证明“入口脚本会调用名为 cloudflared 的命令”，不能证明“被复制进镜像的真实 cloudflared 可执行且与目标 runtime 兼容”。  
      **最小化复杂度修复建议：** 新增一个最小断言即可，例如：构建后直接运行镜像内真实 `cloudflared --version`，或在 smoke test 中专门加一个不注入 cloudflared stub 的 case，只验证 `/usr/local/bin/cloudflared` 可执行。

- [ ] **“评估 entrypoint 是否可移除”仍不够可执行，缺少当前轮的明确判定输出**  
      RFC 列出了“未来要移除 entrypoint 必须满足的 6 条条件”，但没有把“当前代码是否已满足这些条件”逐条映射出来。结果会退化成一句“本轮默认保留”，这不是审查友好的结论，也不足以满足 plan 里“形成职责拆解、移除可行性结论与前置条件”的验收。  
      **最小化复杂度修复建议：** 补一个一页内表格：`职责 -> 当前承载点 -> 是否已有替代 -> 缺口 -> 本轮结论`。若 6 项里任一项为“无替代”，就明确写出“本轮不可移除，原因是 X/Y/Z”。不要只给未来条件，不给当前判定。

## 非阻塞建议

- 将 `docker/test-entrypoint.sh` 的 `BASE_IMAGE="node:20-slim"` 与 RFC 目标 runtime tag 对齐，或从 Dockerfile 派生，避免测试基线漂移。
- 在 RFC 显式重申当前镜像边界仍是 `linux/amd64`，因为 `cloudflared-linux-amd64` 下载路径本身带架构假设。
- 把 “cloudflared-fetch 阶段可放在 builder 之前或之间” 收敛成一个明确选择，避免实现者再做二次设计；奥卡姆剃刀下，优先选**最少新增阶段**的方案。
- 文档已较长，建议补一个 10 行以内摘要，把“本轮只做什么 / 不做什么 / entrypoint 当前结论”放到最前面，降低误读成本。

## 修复指导

按最小修改顺序建议：

1. 先在 RFC 内钉死最终 Node slim tag，消除设计漂移。
2. 补一条“真实 cloudflared 二进制可执行”的验证路径，消除验证假阳性。
3. 补 entrypoint 职责判定表，给出本轮明确结论：**可移除 / 不可移除**，以及最少前置条件。
4. 其余优化（测试基线对齐、架构边界、摘要）可作为后续整理项。

## 审查摘要

- 这份 RFC 的主方向是对的：**runtime 去 apt、entrypoint 本轮默认保留**，整体比“顺手重构进程模型”更克制。
- 但当前版本还有 3 个关键缺口：**设计输入未完全钉死、验证证据不足、entrypoint 评估结论不够落地**。
- 在补齐上述问题前，不建议 APPROVED。
