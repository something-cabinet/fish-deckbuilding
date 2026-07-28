import { Scene, Color } from 'excalibur';
import { CombatOrchestrator } from '../systems/CombatOrchestrator';
import { eventBus } from '../events';
import { setCurrentOrchestrator } from '../bridge';

/**
 * BattleScene — Excalibur Scene that owns the CombatOrchestrator for the current battle.
 *
 * Renders the 9×5 grid with tile sprites, units, and handles click interactions.
 * Communicates with CombatOrchestrator for state transitions.
 */
export class BattleScene extends Scene {
  orchestrator: CombatOrchestrator | null = null;

  onInitialize() {
    this.backgroundColor = Color.fromHex('#162a40');
  }

  onActivate() {
    // Re-sync state on activation (e.g., when returning from a Svelte overlay)
    if (this.orchestrator) {
      eventBus.emit('state:changed', {});
    }
  }

  onDeactivate(): void {
    // Don't destroy the orchestrator on deactivation — it's still valid
  }

  /**
   * Start a new battle with the given encounter.
   * Called from MapOverlay's confirmBattle.
   */
  startBattle(
    runState: Parameters<CombatOrchestrator['startBattle']>[0],
    encounterEnemies: Parameters<CombatOrchestrator['startBattle']>[1],
    encounterId: string,
    rewardGold: number,
    rewardCards: string[],
  ): void {
    // Clean up any previous orchestrator
    if (this.orchestrator) {
      this.orchestrator.destroy();
    }

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
}
