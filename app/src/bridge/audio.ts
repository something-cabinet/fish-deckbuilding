/**
 * AudioService — desk SFX with a mute toggle.
 *
 * Kenney CC0 assets are the target source (user note: kenney.nl/assets for
 * prototyping); until the files land, this synthesizes short desk-like tones
 * via WebAudio (coin ping, card thump, attack impact, transport clunk) so the
 * slice is fully functional with zero asset downloads.
 *
 * Mute is INDEPENDENT of reduced-motion (Gate 4 P2): `userMuted` is the
 * player's explicit choice; `reducedMotion` is the OS media query. Audio
 * plays only when neither is active. Context initializes on the first user
 * gesture (autoplay policy); close() releases it for HMR/teardown.
 */

export type SfxCue =
  | 'pick' // card picked
  | 'sell' // card sold
  | 'play' // card played
  | 'impact' // damage dealt (diff-driven)
  | 'coin' // coins gained
  | 'endturn' // transport pressed
  | 'victory'
  | 'defeat'
  | 'reject'; // invalid drop

export class AudioService {
  private ctx: AudioContext | null = null;
  private userMuted = false;
  private reducedMotion = false;

  /** Must be called from a user gesture (first click/keydown). */
  unlock(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m: boolean): void {
    this.userMuted = m;
  }

  isMuted(): boolean {
    return this.userMuted || this.reducedMotion;
  }

  /** prefers-reduced-motion: audio suppressed per spec (FR-17). Independent of mute. */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  /** Release the AudioContext (HMR / teardown). */
  close(): void {
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }

  play(cue: SfxCue): void {
    if (this.isMuted() || !this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.connect(g);
    g.connect(this.ctx.destination);
    const base = this.freq(cue);
    const dur = this.dur(cue);
    o.frequency.setValueAtTime(base, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, base * this.glide(cue)), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(this.vol(cue), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private freq(cue: SfxCue): number {
    switch (cue) {
      case 'pick': return 880;
      case 'sell': return 660;
      case 'play': return 520;
      case 'impact': return 220;
      case 'coin': return 1180;
      case 'endturn': return 330;
      case 'victory': return 520;
      case 'defeat': return 180;
      case 'reject': return 130;
    }
  }

  private glide(cue: SfxCue): number {
    switch (cue) {
      case 'coin': case 'victory': return 1.9;
      case 'defeat': case 'impact': return 0.4;
      default: return 0.9;
    }
  }

  private dur(cue: SfxCue): number {
    switch (cue) {
      case 'victory': return 0.5;
      case 'defeat': return 0.6;
      case 'impact': return 0.22;
      default: return 0.14;
    }
  }

  private vol(cue: SfxCue): number {
    switch (cue) {
      case 'impact': return 0.28;
      case 'defeat': return 0.24;
      default: return 0.12;
    }
  }
}
