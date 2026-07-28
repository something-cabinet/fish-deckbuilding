/**
 * Combat system index — exports the new pure-function CombatEngine API.
 *
 * The old combat system (TurnFlow, CoinSystem, CombatController, etc.) has been removed.
 * Use CombatEngine functions for all combat logic.
 */
export {
  initBattle,
  startPlayerTurn,
  playCard,
  baseAttack,
  moveUnit,
  endPlayerTurn,
  replaceCard,
  checkBattleEnd,
  getPlayableCards,
  getValidTargets,
  resetCardInstanceCounter,
} from './CombatEngine';
export {
  getManaForTurn,
  canPlayCard,
  spendMana,
} from './ManaSystem';
export {
  shuffleDeck,
  drawCards,
  replaceCardFromHand,
  canReplace,
} from './DrawSystem';
export {
  resolveAttackCard,
  resolveArmorCard,
  resolveSkillCard,
  resolveSummonCard,
  resolvePassiveCard,
} from './CardEffects';
export { heroBaseAttack } from './BaseAttack';
export { executeEnemyTurn, getEnemyMoveTarget, getEnemyAttackTarget } from './EnemyAI';
export { applyArmor, tickArmor, damageWithArmor } from './ArmorSystem';
export type {
  CombatState,
  CombatHero,
  CombatEnemy,
  CombatCard,
  CombatSummon,
  PassiveEffect,
  CardDefinition,
  UIBattleState,
  EnemyInstance,
  RunState,
  Screen,
  AIStrategy,
  EnemyAction,
} from './CardTypes';
export {
  CardType,
  TurnPhase,
  MoveType,
  HERO_STARTING_HP,
} from './CardTypes';
