import type { EnemyInstance, EnemyAction } from './CardTypes';

/**
 * Compute actions for all alive enemies based on the encounter's AI strategy.
 *
 * Strategy determines which enemies attack vs defend:
 *   - aggressive: all alive enemies attack
 *   - balanced:   even-indexed enemies attack, odd-indexed defend (~50/50 split)
 *   - defensive:  even-indexed enemies defend, odd-indexed attack (~50/50 split favors defend)
 *
 * Dead enemies (hp <= 0) produce no actions.
 *
 * @param enemies - The flat array of enemy instances (may include dead enemies)
 * @param strategy - The AI strategy for this encounter
 * @returns An array of EnemyAction for each alive enemy
 */
export function computeEnemyActions(
  enemies: EnemyInstance[],
  strategy: 'aggressive' | 'balanced' | 'defensive'
): EnemyAction[] {
  const actions: EnemyAction[] = [];

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy.hp <= 0) continue;

    let shouldAttack: boolean;

    switch (strategy) {
      case 'aggressive':
        shouldAttack = true;
        break;
      case 'balanced':
        // Even-indexed enemies attack, odd-indexed defend (~50/50)
        shouldAttack = i % 2 === 0;
        break;
      case 'defensive':
        // Even-indexed enemies defend, odd-indexed attack (~50/50 favors defend)
        shouldAttack = i % 2 === 1;
        break;
      default:
        shouldAttack = true;
    }

    if (shouldAttack) {
      actions.push({
        enemyIndex: i,
        type: 'attack',
        damage: enemy.attack,
        target: 'hero',
      });
    } else {
      actions.push({
        enemyIndex: i,
        type: 'defend',
        block: enemy.defense,
        target: 'hero',
      });
    }
  }

  return actions;
}
