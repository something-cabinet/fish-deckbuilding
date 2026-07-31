/**
 * Ballistic needle — pure view-state spring integrator.
 *
 * Chases the LATEST target value (retargets, never queues swings) with a
 * spring + damping so HP changes land with instrument mass. Under
 * prefers-reduced-motion it steps directly to the target. Never enters the
 * engine snapshot; the engine never reads it back.
 */
export class BallisticNeedle {
  private _value: number;
  private _target: number;
  private velocity = 0;
  private readonly spring: number;
  private readonly damping: number;

  constructor(initial = 0, spring = 45, damping = 11) {
    this._value = initial;
    this._target = initial;
    this.spring = spring;
    this.damping = damping;
  }

  get value(): number {
    return this._value;
  }

  get target(): number {
    return this._target;
  }

  /** Retarget to the latest desired value. */
  setTarget(t: number): void {
    this._target = t;
  }

  /** Jump to a value instantly (spawn-in, reset). */
  snapTo(t: number): void {
    this._value = t;
    this._target = t;
    this.velocity = 0;
  }

  /** Advance the spring by dtMs (capped at 50ms/frame). */
  update(dtMs: number, reducedMotion: boolean): void {
    if (reducedMotion) {
      this._value = this._target;
      this.velocity = 0;
      return;
    }
    const dt = Math.min(dtMs, 50) / 1000;
    const accel = this.spring * (this._target - this._value) - this.damping * this.velocity;
    this.velocity += accel * dt;
    this._value += this.velocity * dt;
  }

  /** True when the needle has settled on its target (or is stepping under reduced motion). */
  settled(): boolean {
    return Math.abs(this._target - this._value) < 0.001 && Math.abs(this.velocity) < 0.001;
  }
}
