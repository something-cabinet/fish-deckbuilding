# Fish Mafia: Ledger Tactics — Product Doc

## One-liner
A single-player, turn-based grid tactics card game where you play **Guppy the Debtor**, a fedora-wearing fish trying to survive the loan-shark mob before the **Foreclosure** clock runs out.

## Fantasy & Tone
An underwater crime-noir. The player is a small fish drowning in debt; the enemies are a crimson crew of loan enforcers. Everything is themed around debt collection — cards are "Demand Letter", "Collection Call", "Foreclose"; income is "Coin", the doom clock is "Foreclosure", and the combat log is a "Bulletin".

## Core Loop
1. **Your Move (player phase)** — for each of your fish: *move once*, then *act once*.
2. **Cast cards** from hand by dragging them onto a target, or tapping to arm then tapping the target.
3. **Manage economy** — spend Mana to play cards; sell unwanted cards for Coin; use Coin to draw/replay.
4. **End Turn** — the mob advances and attacks.
5. Repeat until you win (wipe the mob) or lose (Guppy dies or Foreclosure hits 0).

## Turn Rules
- Each unit has **one move + one action** per turn.
- Movement uses BFS pathfinding limited by the unit's `move` range; occupied tiles block.
- Basic attacks use the unit's `range` (1 = melee).
- Mana refreshes and grows each turn (`maxMana` ramps); a new card is drawn at the start of each player turn.

## Economy
- **Mana** — per-turn resource that gates card casting.
- **Coin** — persistent currency earned by selling cards (each card has a `value`) and by the *Cash Flow* skill; spent to draw more cards.
- **Interest** — a rising counter that represents mounting debt pressure each turn.
- **Foreclosure clock** — starts at a fixed number of turns and ticks down; reaching 0 is a loss condition.

## Board
- 9 columns (A–I) × 5 rows (1–5) ocean grid.
- Player fish start on the left, the mob spawns on the right.

## Units
| Unit | Team | HP | ATK | Move | Notes |
|------|------|----|-----|------|-------|
| Guppy (hero) | Player | 14 | 2 | 3 | You lose if it dies |
| Goon | Player | 5 | 2 | 2 | Summoned by *Hired Muscle* |
| Thug | Enemy | 4 | 2 | 2 | Basic aggressor |
| Enforcer | Enemy | 6 | 3 | 2 | Heavy hitter |
| The Boss | Enemy | 16 | 4 | 1 | Slow, deadly kingpin |

## Card Library
| Card | Type | Cost | Target | Effect |
|------|------|------|--------|--------|
| Demand Letter | Attack | 1 | Enemy | Deal 2 damage |
| Collection Call | Attack | 2 | Enemy | Deal 3 damage |
| Foreclose | Attack | 4 | Enemy | Deal 6 damage |
| Kneecap | Attack | 2 | Enemy | Deal 2 damage, -1 target ATK |
| Loan Shark | Attack | 3 | Enemy | Deal 4 damage, heal boss 2 |
| Cash Flow | Skill | 1 | Self | Gain 3 Coin |
| Market Rate | Skill | 1 | Self | Draw 2 cards |
| Hush Money | Skill | 2 | Ally | Heal 5 HP |
| Hired Muscle | Summon | 3 | Empty tile | Summon a Goon (5 HP / 2 ATK) |

## Win / Lose
- **Win:** all enemy fish are defeated.
- **Lose:** Guppy is defeated, or the Foreclosure clock reaches 0.

## Enemy AI
Each enemy turn, units pathfind toward the nearest player unit and attack if a target is in range; otherwise they advance.

## Future Ideas
- Multiple scenarios / campaign with escalating mobs.
- Deck-building and card upgrades between fights.
- Sound design and richer boss mechanics.
- Persistent progression (save state, unlocks).
