import { Scene, Color } from 'excalibur';
import { CombatOrchestrator } from '../systems/CombatOrchestrator';
import { eventBus } from '../events';
import { setCurrentOrchestrator } from '../bridge';

/**
 * BattleScene — owns the CombatOrchestrator for the current battle.
 * Created/destroyed per combat encounter.
 */
export class BattleScene extends Scene {
  /** The combat orchestrator for this battle. */
  orchestrator: CombatOrchestrator | null = null;

  onInitialize() {
    this.backgroundColor = Color.fromHex('#162a40');
  }

  /**
   * Start a new battle with the given encounter.
   * Called from the map scene transition.
   */
  startBattle(
    runState: Parameters<CombatOrchestrator['startBattle']>[0],
    encounterEnemies: Parameters<CombatOrchestrator['startBattle']>[1],
    encounterId: string,
    rewardGold: number,
    rewardCards: string[],
  ): void {
    // Create fresh orchestrator and register with bridge
    this.orchestrator = new CombatOrchestrator();
    setCurrentOrchestrator(this.orchestrator);
    this.orchestrator.startBattle(runState, encounterEnemies, encounterId, rewardGold, rewardCards);
  }

  /**
   * End the current battle and clean up.
   */
  endBattle(): void {
    if (this.orchestrator) {
      this.orchestrator.destroy();
      this.orchestrator = null;
      setCurrentOrchestrator(null);
    }
  }

  onDeactivate(): void {
    this.endBattle();
  }
}
