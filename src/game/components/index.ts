// ECS Component stubs

export interface Component {
  type: string;
}

export class HealthComponent implements Component {
  type = 'health';
  constructor(public current: number, public max: number) {}
}

export class AttackComponent implements Component {
  type = 'attack';
  constructor(public value: number) {}
}

export class PositionComponent implements Component {
  type = 'position';
  constructor(public row: number, public col: number) {}
}

export class CardComponent implements Component {
  type = 'card';
  constructor(public cardId: string) {}
}
