import { Component } from 'excalibur';
import type { EnemyInstance, TurnPhase, AIStrategy, CardDef } from '../combat/CardTypes';

// ───── Tag Components (mark entities by role) ─────

/** Marks the hero/player entity. Only one. */
export class PlayerComponent extends Component {}

/** Marks an enemy entity. */
export class EnemyTagComponent extends Component {
  constructor(
    public enemyIndex: number,
    public def: EnemyInstance,
  ) {
    super();
  }
}

// ───── Data Components ─────

/** Health for hero or enemies. */
export class HealthComponent extends Component {
  constructor(
    public current: number,
    public max: number,
  ) {
    super();
  }
}

/** Coin state (hero only). */
export class CoinComponent extends Component {
  constructor(
    public coins: number = 0,
    public creditUsed: number = 0,
    public creditLimit: number = 5,
  ) {
    super();
  }
}

/** Turn state for combat. */
export class TurnComponent extends Component {
  constructor(
    public phase: TurnPhase = 'draw',
    public turnNumber: number = 1,
  ) {
    super();
  }
}

/** Deck/card state during combat. */
export class DeckStateComponent extends Component {
  constructor(
    public hand: string[] = [],
    public battleDeck: string[] = [],
    public battleDiscard: string[] = [],
    public sellPile: string[] = [],
  ) {
    super();
  }
}

/** Enemy AI state. */
export class EnemyAIComponent extends Component {
  constructor(
    public strategy: AIStrategy = 'aggressive',
    public actions: { enemyIndex: number; type: 'attack' | 'defend'; damage?: number; block?: number }[] = [],
  ) {
    super();
  }
}

/** Relic ownership & state. */
export class RelicComponent extends Component {
  constructor(
    public relicIds: string[] = [],
    public combatStartFired: boolean = false,
  ) {
    super();
  }
}

/** Combat reward info. */
export class RewardComponent extends Component {
  constructor(
    public encounterId: string = '',
    public rewardGold: number = 0,
    public rewardCards: string[] = [],
  ) {
    super();
  }
}

/** Run-level persistent state. */
export class RunStateComponent extends Component {
  constructor(
    public gold: number = 0,
    public seed: number = Date.now(),
    public act: number = 1,
    public battleIndex: number = 0,
    public currentNodeId: string = '',
  ) {
    super();
  }
}
