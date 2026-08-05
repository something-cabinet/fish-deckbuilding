---
title: Import card-database.json into CARD_LIBRARY and wire save button
type: task
id: wiki:tasks:import-card-databasejson-into-cardlibrary-and-wire-save-button
status: done
priority: high
tags: [from-spec, spec:card-database-persistence]
spec: wiki:specs:card-database-persistence
acceptance_criteria:
  - text: "AC-3: On page reload, saved cards appear in the library alongside built-in cards"
  - text: "AC-4: card-database.json is validated against CardPackSchema on import"
  - text: "AC-6: Card appears in library immediately after save without page reload"
---

Import card-database.json in card-library.ts and merge into CARD_LIBRARY. Wire the card creator's Save to Library button to POST to the API route. Keep local React state for instant feedback.