import { Actor, Vector } from 'excalibur';
import {
  PlayerComponent,
  HealthComponent,
  CoinComponent,
  TurnComponent,
  DeckStateComponent,
  RelicComponent,
  RewardComponent,
  EnemyTagComponent,
  EnemyAIComponent,
  RunStateComponent,
} from './components';
import { HERO_STARTING_HP, HERO_MAX_HAND, DEFAULT_CREDIT_LIMIT } from './combat/CardTypes';
import type { EnemyInstance, RunState } from './combat/CardTypes';

/**
 * Create the hero entity with all combat-relevant components.
 * One hero entity per battle scene.
 */
export function createHeroEntity(
  heroHp?: number,
  heroMaxHp?: number,
  creditLimit?: number,
): Actor {
  const hero = new Actor({
    name: 'hero',
    x: 0,
    y: 0, // Off-screen — hero is abstract, UI renders stats
  });

  hero.addComponent(new PlayerComponent());
  hero.addComponent(new HealthComponent(heroHp ?? HERO_STARTING_HP, heroMaxHp ?? HERO_STARTING_HP));
  hero.addComponent(new CoinComponent(0, 0, creditLimit ?? DEFAULT_CREDIT_LIMIT));
  hero.addComponent(new TurnComponent('draw', 1));
  hero.addComponent(new DeckStateComponent());
  hero.addComponent(new RelicComponent());
  hero.addComponent(new RewardComponent());

  return hero;
}

/**
 * Create an enemy entity from an EnemyInstance definition.
 */
export function createEnemyEntity(
  enemy: EnemyInstance,
  index: number,
  x: number,
  y: number,
): Actor {
  const actor = new Actor({
    name: `enemy-${index}`,
    x,
    y,
  });

  actor.addComponent(new EnemyTagComponent(index, enemy));
  actor.addComponent(new HealthComponent(enemy.hp, enemy.maxHp));

  return actor;
}

/**
 * Create the run-state entity (persistent across scenes).
 */
export function createRunEntity(runState: RunState): Actor {
  const entity = new Actor({
    name: 'run-state',
    x: 0,
    y: 0,
  });

  entity.addComponent(new RunStateComponent(
    runState.gold,
    runState.seed,
    runState.act,
    runState.battleIndex,
    runState.currentNodeId,
  ));
  entity.addComponent(new HealthComponent(runState.heroHp, runState.heroMaxHp));
  entity.addComponent(new RelicComponent(runState.relics));

  return entity;
}

/**
 * Copy run-level data from a RunEntity's components onto a combat hero entity.
 */
export function applyRunToHero(hero: Actor, runEntity: Actor): void {
  const runHealth = runEntity.get(HealthComponent);
  const runRelic = runEntity.get(RelicComponent);
  const runState = runEntity.get(RunStateComponent);

  if (runHealth) {
    const heroHealth = hero.get(HealthComponent);
    if (heroHealth) {
      heroHealth.current = runHealth.current;
      heroHealth.max = runHealth.max;
    }
  }

  if (runRelic) {
    const heroRelic = hero.get(RelicComponent);
    if (heroRelic) {
      heroRelic.relicIds = [...runRelic.relicIds];
    }
  }
}

/**
 * After combat ends, copy combat results back to the run entity.
 */
export function applyCombatResultToRun(hero: Actor, runEntity: Actor): void {
  const heroHealth = hero.get(HealthComponent);
  const runHealth = runEntity.get(HealthComponent);
  if (heroHealth && runHealth) {
    runHealth.current = heroHealth.current;
  }
}
