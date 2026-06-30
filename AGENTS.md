需要写工作区的任务的工作流程:

1. 更新本地主分支
2. 创建 Git WorkTree 并切换到新分支
3. 使用 clean-agent 调度 multi agents 处理开发任务
4. 完成后，使用 gitmoji 规范提交代码，推送代码
5. 提 PR，打开 Auto Merge，并 watch 直到它结束
6. 更新本地主分支。

只读任务不需要进行上述流程。
