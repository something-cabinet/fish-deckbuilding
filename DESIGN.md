# Battle Desk Design System

## World

The battle screen is a dark tactical board: wet navy asphalt under a pool of instrument light, with ivory records and steel fittings around the playable field. It plays the Duelyst/StS craft bar straight: the board is the arena, every surrounding region is a stable desk location, and a player can identify capacity, threat, and loss without searching.

The registry register belongs only to story-facing material. A **balloon** marks death or danger; a **bowl** marks victory or sanctuary; **THE CITY ABOVE** names the human division during enemy phase. Never use those motifs as generic decoration. Engine-owned log lines are always rendered verbatim.

## Tokens

| Variable | Purpose |
| --- | --- |
| `--font-display` | Strong section and control face; system-hosted Trebuchet/Segoe stack. |
| `--font-work` | General UI copy; system-hosted Segoe/Helvetica stack. |
| `--font-readout` | Fixed-width counts, ledger data, and keyboard labels. |
| `--ground-void`, `--ground-deep`, `--ground-asphalt`, `--ground-wet` | Layered wet-dark tactical ground. |
| `--panel-ink`, `--panel-steel` | Dense panel surfaces and raised steel. |
| `--steel`, `--steel-light` | Borders, secondary labels, and non-semantic metal marks. |
| `--ivory`, `--ivory-muted`, `--ivory-deep`, `--ink` | Record surfaces, readable text, card-face gradient stop, and dark foreground. |
| `--move`, `--move-light` | Neon cyan: movement only. |
| `--action`, `--action-light` | Neon amber: attack, playable, and active transport only. |
| `--signal-red`, `--signal-red-light` | Damage, debt, defeat, and foreclosure only. |
| `--balloon` | Alias of `--signal-red`; death/danger motif only. |
| `--bowl` | Alias of `--move`; victory/sanctuary motif only. |
| `--success` | Account-settled/support state where it is not a damage/debt story signal. |
| `--line-quiet`, `--line-strong` | Quiet and active structural rules. |
| `--shadow-deep`, `--shadow-panel` | Board and panel depth. |
| `--radius-tight`, `--radius-panel` | Record and zone corner radii. |
| `--space-1` through `--space-6` | Spacing ladder. |
| `--focus-ring` | Keyboard-visible cyan focus treatment. |

### Font decision

The deleted VT323 and Silkscreen files are **not re-bundled** for P1. The system-hosted display/work/readout stacks keep the canonical board clean and legible at desktop distance, browser zoom, and early responsive breakpoints without reintroducing pixel chrome or a font download. `Trebuchet MS` adds controlled character to labels; Segoe/Helvetica carries reading; Consolas/Liberation Mono makes values feel like a registry readout. This is a deliberate P1 performance and clarity decision, not an unrecorded fallback.

### Color grammar

- **Do:** use cyan for a unit's move path and amber for attack/playability; pair all color with a positional or shape cue.
- **Do:** reserve signal-red for damage, debt, defeat, and foreclosure. `--balloon` is that same established red, never a new red.
- **Don't:** use red for buttons, warnings unrelated to debt/damage, card rarity, generic emphasis, or decorative lighting.
- **Don't:** use balloon, bowl, or city-above labels as filler. Their story meaning is fixed.

## Zone geography

| Zone | Stable position | Job |
| --- | --- | --- |
| Field label | Header rail | Phase identity and current turn/mana. |
| Economy | Left named corner | Coin, interest, foreclosure deadline. |
| Board | Center cell | Dedicated 9×5 Pixi canvas, never covered by DOM zones. |
| Piles | Lower-left named corner | Fixed deck/discard stacks with counts. |
| Bulletin | Right named corner | Last six engine-owned log lines. |
| Hand | Bottom-center strip | Flat upright card row (no fan) with per-card SELL foot strip. |
| End turn | Bottom-right of the hand | Persistent turn transport. |

**Zones never move:** the desktop grid has named fixed cells; at narrower widths those cells reflow into a reading order, but no cell overlays the board. The board is constrained by its own 9:5 aspect container with `min(52vh, 490px)` sizing and a `100%` width ceiling, so it remains entirely visible at the 1280×950 acceptance target and below.

## Hand-card pattern (extracted, reusable)

The hand card is the surface's record unit — reuse its grammar for any card-like element (pile popovers, future deck view), not just the hand.

- **Anatomy:** index badge (top-left, amber circle), cost tier strip (top edge: steel = 1, move-cyan = 2, action-amber = 3+), cost badge (top-right, ivory circle with amber ring), type tag, name (display face, uppercase), effect text (readout face, muted). Fixed corners = fixed mental model (FAB).
- **States:** playable = amber border; armed = amber-light border + 2px amber glow; unplayable = desaturated/dimmed (saturate 0.35, brightness 0.82). Color always pairs with position — never color alone.
- **Hover (quiet):** 16px lift + border/shadow emphasis, 140ms ease-out, no scale, no fan rotation. The click target must never leave the cursor — geometry changes that move the pointer away from the card are banned.
- **SELL affordance:** always-visible full-width foot strip (min-height 1.6rem hit target), ink panel, muted text brightening on hover. Never opacity-0-until-hover; never a floating corner chip overlapping card content.
- **Tokens:** card face uses `--ivory` → `--ivory-deep` gradient; borders `--steel`/`--action`/`--action-light`; text `--ink`/`--panel-steel`; foot strip `--panel-ink` + `--line-quiet`.

## Motion thesis

P4 implements the authored motion, all stepped or removed under `prefers-reduced-motion` (the app.css kill-switch plus per-tween `motionEnabled` branches in the renderer). The single focal sequence is the **cinematic enemy turn**: intent telegraphs enter in 650ms (fade + scale), block commitment pulses the shield readout (300ms), damage resolves as floating numbers with a 150ms merge window per unit, and a single hit ≥ 7 triggers one non-stacking 350ms shake with a 2.5% focus zoom. Unit walks tween 300ms/tile with `easeOutCubic` (`cubic-bezier(0.16,1,0.3,1)`); floating numbers rise 34px and fade over 900ms with ±24px jitter; story marks enter in 650ms (defeat balloon descends, victory bowl rises). The timing ladder is 100–150 immediate, 150–300 routine, 300–500 layout/overlay, 500–800 authored entrance; exits are faster. Transient FX are budget-capped at 20 per turn. Input is never blocked: hit-testing reads snapshot positions, never tween state. `prefers-reduced-motion` makes every tween instant (walk snaps, no shake/zoom, no merge animation, marks appear in place).

## Accessibility and discipline

Keyboard focus uses the high-contrast cyan `--focus-ring`; controls are semantic buttons; end-state copy is an assertive live region; background treatment and inline motif marks are hidden from assistive technology. Color is never the sole cue: intent uses glyph + number in P2, cards use fixed placement in P3, and the balloon mark is an inline shape. Keep direct DOM copy concise, preserve log strings exactly, and keep all new visual variables recorded in this document.
