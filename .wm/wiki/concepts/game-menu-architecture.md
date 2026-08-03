---
title: "Concept: Game Menu Architecture"
type: concept
tags: ["concept", "game-ui", "menu", "settings"]
---

## What This Is

A complete turn-key menu system for turn-based tactics games that elegantly handles:
- Main menu with atmospheric backdrop
- Settings overlay (toggles for movement hints, visual effects)
- Navigation to card library and card creator
- Fresh game boots on each "Start"

## Pattern Overview

The menu system is built on the app-shell architecture (`FishMafiaApp` screen union) and consists of:

1. **MenuScreen** — Main entry point with Start/Settings/Library/Create buttons, dark overlay, atmospheric background image
2. **SettingsOverlay** — Modal with two toggles (movement hints, visual effects) that feed into game settings state
3. **Navigation callbacks** — passed from shell to screen; each button fires `setScreen()`

## Key Design Decisions

### Background Image
- Generated via AI (noir underwater aesthetic for Fish Mafia's theme)
- Stored in `/public/menu-bg.png`
- CSS `background-image` with `cover` sizing, vignette darkening overlay for text contrast

### Settings Overlay
- Modal with semi-transparent backdrop (`bg-black/80`)
- Two settings with clear labels and descriptions:
  - **Movement Hints**: Toggles the reachable-tile dots on the board during unit selection
  - **Visual Effects**: Disables particle canvas and floating damage numbers for performance
- Settings persist in app state across sessions (can be extended to localStorage if needed)

### Menu Button Styling
- Dark background (`bg-ocean-deep/50`) with backdrop blur
- Gold borders/text (`border-gold/40`, `text-gold`) matching in-game UI language
- Hover brightens to `hover:bg-gold/15`
- Responsive layout with proper spacing

### Game Exit Path
- In-game "Menu" button (bottom-right control cluster) calls `onExit()`
- `onExit` routes back to `screen = "menu"`, preserving menu/settings state
- Prevents accidental data loss; user can resume settings they configured

## Implementation

### MenuScreen Props
```tsx
interface Props {
  settings: GameSettings
  onChangeSettings: (s: GameSettings) => void
  onStart: () => void
  onOpenLibrary: () => void
  onOpenCreate: () => void
}
```

### Settings Flow
```tsx
// MenuScreen renders SettingsPanel when showSettings=true
// Panel has toggles:
//   movement hints ↔ setSettings({...settings, movementHints: !...})
//   visual effects ↔ setSettings({...settings, visualEffects: !...})
// Settings passed to FishMafiaGame as prop
// Board receives settings.movementHints to gate reachable array
// Board receives settings.visualEffects to gate particle canvas
```

### Game Integration
The game respects settings:
- If `movementHints = false` → empty reachable array passed to Board → no dots shown
- If `visualEffects = false` → particle canvas and floating numbers conditionally rendered

## When This Works Well

- **First-time user experience** — Settings overlay appears before first game, explains UI aids
- **Accessibility** — Toggle visual effects for users with motion sensitivity or low-end devices
- **Customization** — Players tweak experience to their preference before committing to a run
- **Thematic consistency** — Menu styling and language matches the game's noir aesthetic

## Extensions

- **Difficulty picker** — Add a third toggle for difficulty level, adjust enemy AI/scaling
- **Audio toggle** — Mute sound effects (easy to add if audio is implemented)
- **Persist settings** — Save to localStorage with a "Reset to defaults" button
- **Keybinds** — Let players remap control keys
- **Language** — Support i18n translations

## Related

- Decision: App Shell Screen Orchestration (the foundation for menu routing)
- Pattern: Card Library and Authoring (screens accessible from menu)
- Task: Added menu page with Start and Settings
