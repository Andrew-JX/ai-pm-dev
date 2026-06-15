# Acceptance Tests: 一个搞怪好玩的约会计划小程序：从"愿意和我约会吗"开始，依次选择日期时间、吃什么、想做的活动，最后生成一份约会计划

## Product Acceptance

双方能在 3 分钟内完成全流程并拿到一份满意的约会计划

## Test Scenarios

1. A target user can complete the core workflow: 从首页进入，依次确认是否约会、日期时间、吃什么、做什么，平滑过渡到最终计划
2. The product records or displays required data: 不需要后端账号；生成的约会计划可绑定手机日历或做本地提醒
3. Deterministic rules are calculated without AI guessing: 
4. AI output stays inside the declared boundary: 
5. AI output shows evidence or state: 
6. Risk guardrails are visible in the workflow: 保持轻松搞怪，避免让任何一方有压力或被冒犯；不收集敏感个人数据
