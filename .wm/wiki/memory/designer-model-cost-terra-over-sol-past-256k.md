---
title: Designer model cost — terra over sol past 256K
type: memory
tags: [cost, models, designer, terra, sol]
status: active
---

Designer lane model guidance: prefer `terra` for designer tasks; `sol` is fine under 256K context but costs 2x beyond it. Avoid resuming large designer sessions (e.g., after a big polish build) — spawn fresh terra designer sessions instead. Applies to all future designer dispatches.