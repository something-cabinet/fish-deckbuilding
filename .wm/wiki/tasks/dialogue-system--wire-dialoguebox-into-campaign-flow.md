---
title: Dialogue system — wire DialogueBox into campaign flow
type: task
id: wiki:tasks:dialogue-system--wire-dialoguebox-into-campaign-flow
status: todo
priority: low
tags: [p1, story, ui]
---

P1 — AC-13: Story chapters have dialogue/cutscenes and unlock new zones. DialogueBox.svelte is built but imported nowhere. VictoryScreen is unreachable (nothing sets screen='victory'). Campaign has no ending or chapter transitions.

Fix:
1. Wire DialogueBox into campaign start and chapter transitions
2. Set screen='victory' on final boss defeat
3. Add chapter transition sequence: dialogue → zone unlock → map update