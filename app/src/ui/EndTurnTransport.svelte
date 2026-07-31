<script lang="ts">
  import type { Phase } from '../engine/contract';
  type Props = { phase: Phase; enabled: boolean; onPress: () => void };
  let { phase, enabled, onPress }: Props = $props();
  const armed = $derived(enabled && phase === 'player');
</script>
<section class="transport"><div class="transport-label">TURN TRANSPORT</div><button class:armed disabled={!armed} onclick={onPress}><span class="lamp"></span><strong>END<br/>TURN</strong><kbd>SPACE</kbd></button><small>{armed ? 'CHANNEL ARMED' : 'LINE HELD'}</small></section>
<style>
  .transport { pointer-events: auto; text-align: center; color: var(--ivory-1); } .transport-label, small { font-size: 8px; letter-spacing: .13em; } .transport-label { margin-bottom: 7px; } small { display: block; margin-top: 6px; color: var(--ivory-2); } button { position: relative; display: grid; grid-template-columns: 15px 1fr; align-items: center; column-gap: 8px; width: 120px; padding: 12px; border: 1px solid #5d241d; border-radius: 3px; background: #4b211c; color: #d9c6a9; box-shadow: 0 7px 0 #1b0d0b, var(--shadow-lift), inset 0 1px 0 rgb(255 255 255 / .16); cursor: not-allowed; text-align: left; } button.armed { background: linear-gradient(#7b4427, #512118); border-color: var(--amber); color: var(--ivory-0); cursor: pointer; } button.armed:hover { transform: translateY(-2px); box-shadow: 0 9px 0 #1b0d0b, var(--shadow-lift); } button.armed:active { transform: translateY(5px); box-shadow: 0 2px 0 #1b0d0b, var(--shadow-lift); } strong { font-size: 13px; line-height: .95; letter-spacing: -.08em; } kbd { grid-column: 2; margin-top: 3px; color: var(--brass-light); font-size: 7px; letter-spacing: .1em; } .lamp { width: 9px; height: 9px; border-radius: 50%; background: var(--signal-red); box-shadow: 0 0 5px var(--signal-red); } .armed .lamp { background: var(--amber); box-shadow: 0 0 8px var(--amber); animation: var(--lamp-flicker); }
</style>
