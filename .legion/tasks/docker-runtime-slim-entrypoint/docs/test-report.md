# 测试报告

## 执行命令

- `bash -n docker/test-entrypoint.sh && bash -n docker/test-image-smoke.sh`

## 结果

- PASS（语法检查）

## 备注

- 本轮已删除 launcher，未额外添加 Node 启动脚本检查。
- 容器级 Docker 测试仍待在有 Docker daemon 的环境执行。
