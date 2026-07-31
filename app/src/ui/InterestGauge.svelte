<script lang="ts">
  import { FORECLOSURE_TURN, INTEREST_START_TURN } from '../engine/contract';
  import type { Faction } from '../engine/contract';
  type Props = { turn: number; interestDue: number; winner: Faction | null };
  let { turn, interestDue, winner }: Props = $props();
  const foreclosure = $derived(turn >= FORECLOSURE_TURN - 1 && !winner);
  const live = $derived(turn >= INTEREST_START_TURN);
</script>
<section class="interest" class:foreclosure aria-label={`Turn ${turn}, interest due ${interestDue}`}><div class="clock"><span class="hand" style={`--turn:${Math.min(turn, 16)}`}></span><b>{turn}</b></div><div><h2>INTEREST CLOCK</h2><p>{live ? `Interest due — Guppy pays ${interestDue}` : `Interest begins / turn ${INTEREST_START_TURN}`}</p><small>{foreclosure ? 'FORECLOSURE IMMINENT' : `FORECLOSURE / ${FORECLOSURE_TURN}`}</small></div></section>
<style>
  .interest { display: flex; align-items: center; gap: 10px; pointer-events: auto; color: var(--ivory-1); } .clock { position: relative; display: grid; place-items: center; width: 58px; height: 58px; border: 2px solid var(--steel-light); border-radius: 50%; background: var(--ivory-1); color: var(--ink); box-shadow: var(--shadow-lift), var(--shadow-inset); } .clock::before { content: ''; position: absolute; inset: 7px; border: 1px solid var(--ink-soft); border-radius: 50%; } .clock b { z-index: 1; font-size: 18px; letter-spacing: -.1em; } .hand { position: absolute; width: 2px; height: 18px; bottom: 28px; background: var(--ink); transform-origin: bottom; transform: rotate(calc(var(--turn) * 22.5deg)); transition: transform 300ms var(--needle-spring); } h2 { font-size: 9px; letter-spacing: .11em; } p { max-width: 165px; margin-top: 4px; color: var(--ivory-0); font-size: 10px; line-height: 1.25; } small { display: block; margin-top: 4px; color: var(--brass-light); font-size: 8px; letter-spacing: .07em; } .foreclosure p, .foreclosure small { color: var(--signal-red-light); }
</style>
