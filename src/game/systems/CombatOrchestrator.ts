/**
 * CombatOrchestrator — bridges BattleScene UI / Svelte $state with the pure-function CombatEngine.
 *
 * Owns a CombatState instance. All mutations go through CombatEngine pure functions.
 * Emits 'state:changed' on every mutation so the bridge can sync to Svelte.
 * Emits 'combat:victory' / 'combat:defeat' when battle ends.
 */
import {
  initBattle,
  playCard,
  baseAttack as engineBaseAttack,
  moveUnit as engineMoveUnit,
  endPlayerTurn,
  replaceCard,
  checkBattleEnd,
  getPlayableCards,
  getValidTargets,
} from '../combat/CombatEngine';
import { heroBaseAttack } from '../combat/BaseAttack';
import { replaceCardFromHand } from '../combat/DrawSystem';
import { getMovementRange } from '../grid/GridMovement';
import { getAttackableTargets } from '../grid/GridAttack';
import type { CombatState, UIBattleState, RunState, EnemyInstance, CombatCard } from '../combat/CardTypes';
import { TurnPhase, CardType } from '../combat/CardTypes';
import type { GridPosition } from '../grid/GridTypes';
import { getCard } from '../cards/cardData';
import { eventBus } from '../events';
import { getEncounter } from '../enemies/encounterData';

export class CombatOrchestrator {
  private state: CombatState | null = null;
  private encounterId = '';
  private rewardGold = 0;
  private rewardCards: string[] = [];

  /**
   * Initialize a battle from run state + encounter data.
   * Converts EnemyInstance[] + RunState.deck into the CombatEngine format.
   */
  startBattle(
    runState: RunState,
    encounterEnemies: EnemyInstance[],
    encounterId: string,
    rewardGold: number,
    rewardCards: string[],
  ): void {
    this.encounterId = encounterId;
    this.rewardGold = rewardGold;
    this.rewardCards = rewardCards || [];

    // Build hero config from run state
    const heroConfig = {
      id: 'hero',
      maxHp: runState.heroMaxHp,
      baseAttack: 2,
    };

    // Resolve aiStrategy from encounter definition
    const encounterDef = getEncounter(encounterId);
    const aiStrategy: 'aggressive' | 'balanced' | 'defensive' = encounterDef?.aiStrategy ?? 'balanced';

    // Build enemy configs from encounter data
    const enemyConfigs = encounterEnemies.map(e => ({
      id: e.id,
      name: e.name,
      hp: e.hp,
      maxHp: e.maxHp,
      attack: e.attack,
      defense: e.defense,
      aiStrategy,
      hasProvoke: false,
      moveRange: 2,
      attackRange: 1,
    }));

    // Build deck definitions from runState.deck (card IDs)
    const deckDefs = runState.deck
      .map(cardId => getCard(cardId))
      .filter((c): c is NonNullable<typeof c> => c !== undefined);

    if (deckDefs.length === 0) {
      console.error('CombatOrchestrator: empty deck');
      return;
    }

    // Init hero HP from run state
    this.state = initBattle(
      { ...heroConfig, maxHp: runState.heroMaxHp, id: 'hero' },
      enemyConfigs,
      deckDefs,
      runState.seed,
    );

    // Override hero HP to match run state
    this.state = {
      ...this.state,
      hero: { ...this.state.hero, hp: runState.heroHp },
    };

    this.emitStateChanged();
    eventBus.emit('combat:started', {
      encounterId,
      hand: this.state.hand.map(c => c.instanceId),
      enemies: this.state.enemies.length,
    });
  }

  /**
   * Play a card from hand by instanceId — with optional target position.
   * Attack/Summon cards REQUIRE a target; Armor/Skill/Passive don't.
   */
  playCard(cardInstanceId: string, target?: { x: number; y: number }): void {
    if (!this.state) return;
    const card = this.state.hand.find(c => c.instanceId === cardInstanceId);
    if (card) {
      const cardType = card.definition.type;
      // Attack and Summon cards need a target — if none provided, pick first valid
      if (!target && (cardType === CardType.Attack || cardType === CardType.Summon)) {
        const validTargets = getValidTargets(this.state, card);
        if (validTargets.length > 0) {
          target = validTargets[0];
        }
      }
      eventBus.emit('anim:cardPlayed', { cardName: card.definition.name });
    }
    this.state = playCard(this.state, cardInstanceId, target);
    this.emitStateChanged();
    this.checkEnd();
  }

  /**
   * Play a card from hand by index with an optional target position.
   */
  playCardByIndex(handIndex: number, target?: { x: number; y: number }): void {
    if (!this.state || handIndex < 0 || handIndex >= this.state.hand.length) return;
    this.playCard(this.state.hand[handIndex].instanceId, target);
  }

  /**
   * Hero base attack on an enemy (requires adjacency).
   */
  baseAttack(enemyId: string): void {
    if (!this.state) return;
    this.state = engineBaseAttack(this.state, enemyId);
    this.emitStateChanged();
    this.checkEnd();
  }

  /**
   * Move a grid unit to a new position.
   * wraps CombatEngine.moveUnit for validation.
   */
  moveUnit(unitId: string, to: GridPosition): void {
    if (!this.state) return;
    this.state = engineMoveUnit(this.state, unitId, to);
    this.emitStateChanged();
  }

  /**
   * End the current player turn → enemy turn → start next player turn.
   */
  endPlayerTurn(): void {
    if (!this.state) return;
    this.state = endPlayerTurn(this.state);
    this.emitStateChanged();
    this.checkEnd();
  }

  /**
   * Replace a card from hand (shuffle back, draw one).
   */
  replaceCard(handIndex: number): void {
    if (!this.state) return;
    this.state = replaceCard(this.state, handIndex);
    this.emitStateChanged();
  }

  /**
   * Get the movement range for the hero on the current turn.
   */
  getMovementRangeForHero(): Set<string> {
    if (!this.state) return new Set();
    return getMovementRange(this.state.grid, this.state.hero.unitId);
  }

  /**
   * Get attackable targets for the hero on the current turn.
   */
  getAttackRangeForHero(): string[] {
    if (!this.state) return [];
    return getAttackableTargets(this.state.grid, this.state.hero.unitId);
  }

  /**
   * Get valid target positions for a specific card.
   */
  getValidTargetsForCard(card: CombatCard): GridPosition[] {
    if (!this.state) return [];
    return getValidTargets(this.state, card);
  }

  /**
   * Get the current CombatState for bridge → Svelte sync.
   * Includes full grid/unit/position data for the Svelte UI.
   */
  getStateSnapshot(): Partial<UIBattleState> {
    if (!this.state) return {};

    const s = this.state;
    const heroUnit = s.grid.units.get(s.hero.unitId);
    const heroPos = heroUnit?.position;

    // Serialize tiles for Svelte
    const tiles = s.grid.tiles.map(row =>
      row.map(t => ({ type: t.type, occupiedBy: t.occupiedBy }))
    );

    // Serialize unit positions
    const unitPositions: Record<string, { x: number; y: number; type: string; faction: string; isAlive: boolean }> = {};
    for (const [, unit] of s.grid.units) {
      unitPositions[unit.id] = {
        x: unit.position.x,
        y: unit.position.y,
        type: unit.type,
        faction: unit.faction,
        isAlive: unit.isAlive,
      };
    }

    // Enemies with positions
    const enemyPositions = s.enemies.map(e => ({
      id: e.id,
      name: e.name,
      hp: e.hp,
      maxHp: e.maxHp,
      attack: e.attack,
      defense: e.defense,
      intent: 'attack' as const,
      isBoss: false,
      position: s.grid.units.get(e.unitId)?.position,
    }));

    // Summons with positions
    const summonPositions = s.summons.map(sum => ({
      id: sum.id,
      unitId: sum.unitId,
      hp: sum.hp,
      maxHp: sum.maxHp,
      position: s.grid.units.get(sum.unitId)?.position,
    }));

    // Movement range for current turn
    const canMove = heroUnit && !heroUnit.hasMoved;
    const movementRange: string[] = [];
    if (canMove && s.turnPhase === TurnPhase.PlayerAction) {
      const range = getMovementRange(s.grid, s.hero.unitId);
      movementRange.push(...range);
    }

    // Attack range for current turn
    const canAttack = heroUnit && !heroUnit.hasAttacked;
    const attackRange: string[] = [];
    if (canAttack && s.turnPhase === TurnPhase.PlayerAction) {
      attackRange.push(...getAttackableTargets(s.grid, s.hero.unitId));
    }

    // Playable cards
    const playableCards = getPlayableCards(s);
    const playableCardInstanceIds = playableCards.map(c => c.instanceId);

    return {
      hand: s.hand.map(c => c.instanceId),
      battleDeck: s.deck.map(c => c.instanceId),
      battleDiscard: s.discard.map(c => c.instanceId),
      mana: s.mana,
      heroHp: s.hero.hp,
      heroMaxHp: s.hero.maxHp,
      turnPhase: s.turnPhase,
      turnNumber: s.turnNumber,
      enemies: s.enemies.map(e => ({
        id: e.id,
        name: e.name,
        hp: e.hp,
        maxHp: e.maxHp,
        attack: e.attack,
        defense: e.defense,
        intent: 'attack' as const,
        isBoss: false,
      })),
      // Grid data for UI
      tiles,
      unitPositions,
      heroPosition: heroPos ? { x: heroPos.x, y: heroPos.y } : undefined,
      enemyPositions,
      summonPositions,
      movementRange: movementRange.length > 0 ? movementRange : undefined,
      attackRange: attackRange.length > 0 ? attackRange : undefined,
      playableCardInstanceIds,
      heroHasMoved: heroUnit?.hasMoved ?? false,
      heroHasAttacked: heroUnit?.hasAttacked ?? false,
      canReplace: s.canReplace,
      // Misc
      encounterId: this.encounterId,
      rewardGold: this.rewardGold,
      rewardCards: this.rewardCards,
      incomingDamage: 0,
      enemyActions: [],
    };
  }

  /**
   * Check if battle has ended and emit appropriate events.
   */
  private checkEnd(): void {
    if (!this.state) return;
    const result = this.state.battleResult;
    if (result === 'victory') {
      eventBus.emit('combat:victory', {
        rewardGold: this.rewardGold,
        rewardCards: this.rewardCards,
      });
    } else if (result === 'defeat') {
      eventBus.emit('combat:defeat', {});
    }
  }

  /**
   * Emit state:changed so the bridge syncs to Svelte $state.
   */
  private emitStateChanged(): void {
    eventBus.emit('state:changed', {});
  }

  destroy(): void {
    this.state = null;
  }
}
