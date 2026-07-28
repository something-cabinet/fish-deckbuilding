---
title: Recurring Pattern: Untested Orchestrator = P0s
type: memory
tags: [failure, testing, orchestration]
status: active
---

All P0 bugs across both project architectures were in the untested UI orchestration layer, never in pure function logic. The pattern repeated because orchestrator tests were deleted during cleanup without replacement. NEVER delete orchestrator integration tests without a replacement test suite covering the bridge→UI path. Full reference: @wiki/concepts/untested-ui-orchestration-p0s