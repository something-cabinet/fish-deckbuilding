/** A single data-driven effect a card applies at resolution (D1/D5/D11). */
export type CardEffect =
  | { kind: "damage"; amount: number }
  | { kind: "heal"; amount: number; target: "caster" | "cast-target" }
  | { kind: "drawCards"; amount: number }
  | { kind: "gainCoin"; amount: number }
  | { kind: "buffAtk"; amount: number } // signed
  | { kind: "summon"; unit: string } // SummonDef id; unknown/missing id falls back to the default
  | { kind: "custom"; handlerId: string } // D11 escape hatch — registered handler
