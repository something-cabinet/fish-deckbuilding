// ECS System stubs

import type { Engine, Actor } from 'excalibur';

export interface System {
  update(engine: Engine, delta: number): void;
}

export class CombatSystem implements System {
  update(_engine: Engine, _delta: number) {
    // Stub: combat resolution logic
  }
}

export class GridSystem implements System {
  update(_engine: Engine, _delta: number) {
    // Stub: grid placement and movement logic
  }
}

export class TurnSystem implements System {
  update(_engine: Engine, _delta: number) {
    // Stub: turn phase management
  }
}
