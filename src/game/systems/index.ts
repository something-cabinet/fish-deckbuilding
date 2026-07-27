/**
 * Game systems index.
 *
 * For this turn-based game, the primary orchestration is handled by
 * CombatOrchestrator (event-driven, called by UI/bridge).
 * Excalibur Systems (per-frame) can be added later for visual effects,
 * animations, or continuous behaviors.
 */

export { CombatOrchestrator } from './CombatOrchestrator';
