/**
 * Engine public contract — the single source of truth for the game.
 *
 * Both render layers (PixiJS desk, Svelte channel-strip UI) depend ONLY on
 * this file. The engine implementation lives in this directory and is pure
 * TypeScript with zero framework dependencies.
 *
 * Rules:
 * - Valid-targets logic lives in the engine and is the ONLY authority.
 * - Full snapshot after every action (snapshot state sync). Granular events
 *   exist only for transient visuals (needle slams, lamp flashes).
 * - Cards emit GameAction objects; the ActionResolver applies them. No card
 *   executes raw code.
 * - Economy is FaB-style coins (approved: wiki:decisions:fab-coin-system):
 *   turns start at 0 coins, cards are SOLD for their coinValue (sell pile →
 *   bottom of deck at turn end), cards COST coins to play, credit to −5,
 *   end-of-turn interest damage = |debt|, coins reset each turn.
 */

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export const GRID_COLS = 9;
export const GRID_ROWS = 5;

export interface GridPos {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

export type Faction = 'player' | 'enemy';

export interface UnitTemplate {
  templateId: string;
  name: string;
  faction: Faction;
  maxHp: number;
  attack: number;
  movement: number;
}

export interface Unit {
  uid: string;
  templateId: string;
  name: string;
  faction: Faction;
  pos: GridPos;
  hp: number;
  maxHp: number;
  attack: number;
  movement: number;
  /** Temporary shield; absorbs damage before HP, expires at end of owner's turn. */
  armor: number;
  /** Damage-taken multiplier stacks (each = +1 damage taken); persist for unit lifetime. */
  debt: number;
  /** Boss-type units are immune to push/pull displacement (D17). */
  isBoss: boolean;
  /** Whether this unit still has its move action this turn. */
  canMove: boolean;
  /** Whether this unit still has its attack action this turn. */
  canAttack: boolean;
}

// ---------------------------------------------------------------------------
// Cards — effect command pattern, FaB action model
// ---------------------------------------------------------------------------

/** FaB pitch colors: red sells for 1, yellow for 2, blue for 3. */
export type PitchColor = 'red' | 'yellow' | 'blue';

/**
 * All playable cards are 'action' type (FaB model — approved:
 * wiki:decisions/fab-style-action-card-type). 'gear'/'ally' are reserved for
 * future content; the combat role comes from cost/coinValue/effect, not a
 * type label.
 */
export type CardType = 'action' | 'gear' | 'ally';

export interface CardDef {
  defId: string;
  name: string;
  type: CardType;
  /** Coins required to PLAY this card. */
  cost: number;
  /** Coins gained when this card is SOLD. */
  coinValue: number;
  pitch: PitchColor;
  /**
   * How this card's target is chosen at play time:
   * - 'none': resolves immediately on pick; `pos` passed to playCard is ignored.
   * - 'cell': must drop on a highlighted cell (e.g., Dart move cells).
   * - 'unit': must drop on a highlighted unit cell (e.g., Strike/Slam/Undercurrent/Harpoon).
   * Renderers need this BEFORE the card is active (it drives the drop affordance),
   * so it lives on the def, not in CardTargeting.
   */
  targetMode: TargetMode;
  description: string;
}

export type TargetMode = 'none' | 'cell' | 'unit';

export interface Card extends CardDef {
  /** Instance id (unique per card in deck/hand). */
  uid: string;
}

/** Actions cards resolve to; the engine's ActionResolver applies them. */
export type GameAction =
  | { type: 'damage_unit'; targetUid: string; amount: number }
  | { type: 'heal_unit'; targetUid: string; amount: number }
  | { type: 'gain_armor'; targetUid: string; amount: number }
  | { type: 'gain_coins'; amount: number }
  | { type: 'draw_cards'; amount: number }
  /**
   * Displacement: push away from or pull toward the unit identified by
   * `originUid` (the hero for Undercurrent/Harpoon). `tiles` is a MAXIMUM
   * distance, not exact: displacement stops at grid bounds, occupied cells,
   * or (for pull) adjacency to the origin. Boss-flagged targets no-op with
   * a desk-language log ("Boss holds ground").
   */
  | { type: 'move_unit'; targetUid: string; direction: 'push' | 'pull'; tiles: number; originUid: string }
  /**
   * Move a unit (e.g., Guppy via Dart) without consuming its move action.
   * The engine validates `to` against the card's validCells at playCard time;
   * the resolver trusts the action.
   */
  | { type: 'move_self'; unitUid: string; to: GridPos }
  | { type: 'apply_debt'; targetUid: string; amount: number };

export interface CardTargeting {
  /** Cells this card can legally target right now, given the current board. */
  validCells: GridPos[];
  /** For cards that target units: uids of legal unit targets. */
  validUnitUids: string[];
}

/** Outcome of playing a card. Rejection reasons use desk language ("Insufficient current"). */
export type PlayResult = { ok: true } | { ok: false; reason: string };

// ---------------------------------------------------------------------------
// Economy constants (FaB coin system — wiki:decisions:fab-coin-system)
// ---------------------------------------------------------------------------

export const COIN_START = 0;
export const CREDIT_LIMIT = -5;
export const HAND_LIMIT = 5;
/**
 * Escalating interest clock: from INTEREST_START_TURN onward, Guppy takes
 * clock damage at her turn start = turn − (INTEREST_START_TURN − 1)
 * (turn 9 → 1, turn 10 → 2, …). Off-by-one-safe: at INTEREST_START_TURN the
 * damage is 1, not 0.
 */
export const INTEREST_START_TURN = 9;
/** Turn 16 without victory → defeat "Foreclosure". */
export const FORECLOSURE_TURN = 16;

// ---------------------------------------------------------------------------
// Snapshot — authoritative state after every action
// ---------------------------------------------------------------------------

export type Phase = 'player' | 'enemy';

export interface GameSnapshot {
  turn: number;
  phase: Phase;
  /** Current coins. May be negative down to CREDIT_LIMIT. */
  coins: number;
  /**
   * Total pending damage Guppy will take at end of turn, as ONE number the
   * HUD can show: (coins < 0 ? |coins| : 0) debt interest + clock damage
   * (turn-based escalation, see INTEREST_START_TURN). 0 when nothing is owed.
   */
  interestDue: number;
  hand: Card[];
  /** Full deck card list (for pile expansion). */
  deck: Card[];
  /** Discard pile card list (newest last; for pile expansion). */
  discard: Card[];
  /** Sell pile card list in sell order (bottom-of-deck order at turn end). */
  sellPile: Card[];
  units: Unit[];
  heroUid: string;
  /** Currently selected unit uid (drives validMoves/validAttackTargets). */
  selectedUnitUid: string | null;
  validMoves: GridPos[];
  validAttackTargets: string[];
  /** The card currently being dragged/picked from the hand, or null. */
  activeCardUid: string | null;
  /** Valid targets for the active card, recomputed per emission. Null when no card is active. */
  activeCardTargets: CardTargeting | null;
  /** Desk-language log lines, newest last. Engine caps this (last 50). */
  log: string[];
  winner: Faction | null;
}

// ---------------------------------------------------------------------------
// Events — transient visuals only, never authoritative
// ---------------------------------------------------------------------------

export type EngineEvent =
  | { kind: 'unit-moved'; unitUid: string; from: GridPos; to: GridPos }
  | {
      kind: 'unit-attacked';
      attackerUid: string;
      targetUid: string;
      damage: number;
      counterDamage: number | null;
    }
  | { kind: 'unit-died'; unitUid: string }
  | { kind: 'card-played'; cardUid: string; pos: GridPos }
  | { kind: 'card-sold'; cardUid: string; coinValue: number };

// ---------------------------------------------------------------------------
// Controller — the one resync fan-out point
// ---------------------------------------------------------------------------

export interface EngineController {
  /**
   * Register a snapshot listener. Returns an unsubscribe fn.
   *
   * EMISSION CONTRACT: every mutating method emits EXACTLY ONE snapshot,
   * synchronously, after state settles. `start()` emits the initial snapshot.
   * `getSnapshot()` before `start()` is invalid. Renderers subscribe here —
   * this is the single resync fan-out point; renderers never subscribe
   * anywhere else.
   */
  subscribe(fn: (snap: GameSnapshot) => void): () => void;
  /** Register a transient visual-event listener. Returns an unsubscribe fn. */
  onEvent(fn: (ev: EngineEvent) => void): () => void;
  getSnapshot(): GameSnapshot;

  start(): void;

  // Selection + base actions
  /** Pass null to deselect (click empty ground / Esc). */
  selectUnit(unitUid: string | null): void;
  moveSelectedTo(pos: GridPos): void;
  attackTarget(unitUid: string): void;

  // Cards
  /** Set the card being dragged/picked from the hand (or null to drop). Emits a snapshot. */
  setActiveCard(cardUid: string | null): void;
  /**
   * Valid targets for a card. Returns empty arrays when the card is
   * unplayable (unaffordable, wrong phase, not in hand) — hover-target
   * preview depends on this.
   */
  validCardTargets(cardUid: string): CardTargeting;
  /** Play the active card at a cell. Clears activeCardUid on both outcomes. */
  playCard(cardUid: string, pos: GridPos): PlayResult;
  /** Sell a hand card for its coinValue (goes to sellPile). Clears activeCardUid. */
  sellCard(cardUid: string): PlayResult;

  endTurn(): void;
}
