---
title: "Pattern: Card Library and Authoring UI"
type: pattern
tags: ["pattern", "ui-patterns", "card-games", "forms"]
---

## Problem

Card-based games need a way for users to:
1. Browse a collection of cards (base + custom)
2. Filter and search by type/rarity/mechanics
3. Create new custom cards with visual feedback
4. Preview designs before saving

A naive approach duplicates card display logic (inventory view, creation preview, library). This leads to inconsistency and maintenance burden.

## Solution

Build a **shared card presentational component** (`CardFace`) used everywhere cards are displayed, paired with dedicated screens for library browsing and card creation:

### Component Hierarchy

```
CardFace (reusable display)
├── Used in: CardLibraryScreen
├── Used in: CardCreateScreen (live preview)
└── Used in: GameCard (in-game hand)

CardLibraryScreen
├── Type filter chips (All / Attack / Skill / Summon)
├── Grid of CardFace + badge (base vs. Custom)
├── Live card count

CardCreateScreen
├── Form fields (name, type, target, mana, effects)
├── Icon picker (28-icon registry)
├── Live preview (CardFace on right panel)
├── Save validation (name required)
```

### Icon Registry Pattern

Centralize icon metadata in a single `icons.ts` source of truth:

```tsx
// icons.ts
export const ICON_REGISTRY = [
  { id: "fire", name: "Incinerate", icon: Flame, category: "offensive" },
  { id: "heal", name: "Restore", icon: Heart, category: "defensive" },
  // ... 28 total
]

// In CardCreateScreen
const [selectedIcon, setSelectedIcon] = useState("fire")
const iconDef = ICON_REGISTRY.find(i => i.id === selectedIcon)
```

This eliminates scattered icon lookups and ensures consistency across UI.

### Form State Pattern

Keep form state local to the create screen with sensible defaults:

```tsx
const [form, setForm] = useState({
  name: "",
  type: "attack",
  target: "unit",
  mana: 1,
  sell: 2,
  description: "",
  resolveEffect: "damage",
  icon: "fire",
})

const isValid = form.name.trim().length > 0
```

Validation is minimal (name only), allowing exploration.

### Live Preview

Render `CardFace` with form data in real-time as the user edits:

```tsx
<CardFace
  name={form.name || "(Untitled)"}
  type={form.type}
  mana={form.mana}
  sell={form.sell}
  description={form.description}
  icon={form.icon}
/>
```

This gives immediate visual feedback and helps users discover what looks good.

## When to Use

- Card collection browsers in deck-builders or roguelikes
- Custom content creation (user-authored decks, mods, skins)
- Any game needing a "card creator" tutorial or pro-builder mode

## When Not to Use

- One-off card displays (use the card component directly, not a full library infrastructure)
- Read-only collections without filtering (simpler component, no need for shell state)
- Highly domain-specific card rules that don't generalize (might need a custom editor)

## Architecture Decisions

- **CardFace is dumb** — receives all data as props, no internal state or logic. Makes it reusable.
- **Library screen is also dumb** — receives card arrays as props, delegates to CardFace for display
- **Create screen manages form locally** — keeps UI state isolated; only saves to parent on commit
- **Icon registry centralized** — one source of truth, prevents icon/name mismatches
- **Append-only custom cards** — stored in app-shell state, no delete/edit (MVP). Adding these is trivial later.

## Code Layout

```
/components/game/
  card-face.tsx (presentational, 120 lines)
  card-library-screen.tsx (browsable collection, 100 lines)
  card-create-screen.tsx (form + preview, 280 lines)

/lib/game/
  icons.ts (registry, 70 lines)
```

## Extensions

- **Delete/Edit cards** — add icon buttons on CardFace, wire to parent callbacks
- **Import/Export** — serialize `customCards` to JSON, load from file picker
- **Deckbuilding** — track which custom cards are in active decks, warn before delete
- **Search** — add text input filtering by name/description in library screen

## Related

- Decision: App Shell Screen Orchestration (where custom cards are stored)
- Pattern: Form State Management (generalizable form + preview pattern)
- Concept: Icon and asset registries (centralized metadata)
