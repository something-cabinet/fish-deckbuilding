<script lang="ts">
  import type { GameSnapshot } from '../engine/contract';
  type Props = { coins: GameSnapshot['coins']; creditLimit: number };
  let { coins, creditLimit }: Props = $props();
  const safeLimit = $derived(Math.min(creditLimit, -1));
  const position = $derived(Math.max(0, Math.min(100, ((coins - safeLimit) / (9 - safeLimit)) * 100)));
  const debt = $derived(coins < 0);
</script>

<section class="coin-meter" aria-label={`Coin current: ${coins} coins`}>
  <div class="meter-caption">COIN CURRENT</div>
  <div class="meter-body" class:debt>
    <div class="scale positive"><span>+9</span><span>+6</span><span>+3</span></div>
    <div class="scale negative"><span>−1</span><span>−3</span><span>{safeLimit}</span></div>
    <div class="baseline"><span>0</span></div>
    <div class="needle" style={`bottom: ${position}%`} aria-hidden="true"><i></i></div>
  </div>
  <output class:debt>{coins > 0 ? `+${coins}` : coins}</output>
  <div class="sell-hint"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M9 12h6M12 9v6"/></svg>SELL → CURRENT</div>
</section>

<style>
  .coin-meter { width: 102px; color: var(--ink); text-align: center; pointer-events: auto; }
  .meter-caption { color: var(--ivory-1); font-size: 9px; letter-spacing: .13em; margin-bottom: 7px; }
  .meter-body { position: relative; height: min(41vh, 365px); overflow: hidden; border: 2px solid var(--steel-light); border-radius: 50px 50px 8px 8px; background: repeating-linear-gradient(90deg, transparent 0 17px, rgb(23 25 20 / .12) 18px 19px), var(--ivory-1); box-shadow: var(--shadow-lift), var(--shadow-inset); }
  .meter-body::after { content: ''; position: absolute; z-index: 1; inset: 0; background: linear-gradient(to bottom, transparent 0 70%, rgb(179 59 46 / .18) 70%); pointer-events: none; }
  .scale { position: absolute; z-index: 2; inset-inline: 8px; display: flex; flex-direction: column; justify-content: space-around; font-size: 9px; font-weight: 700; }
  .positive { top: 9px; bottom: 30%; } .negative { top: 73%; bottom: 7px; color: var(--signal-red); }
  .baseline { position: absolute; z-index: 2; top: 70%; left: 0; right: 0; border-top: 2px solid var(--ink); font-size: 10px; text-align: right; padding-right: 8px; }
  .needle { position: absolute; z-index: 3; left: 49%; width: 3px; height: 47%; transform-origin: bottom; transform: rotate(47deg); background: var(--ink); transition: bottom 300ms var(--needle-spring); box-shadow: 0 0 1px var(--ink); }
  .needle i { position: absolute; bottom: -5px; left: -4px; display: block; width: 11px; height: 11px; border: 2px solid var(--ink); border-radius: 50%; background: var(--brass); }
  .debt .needle { background: var(--signal-red); } output { display: block; color: var(--ivory-0); font-size: 24px; font-weight: 700; letter-spacing: -.08em; margin-top: 7px; } output.debt { color: var(--signal-red-light); }
  .sell-hint { display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 6px; color: var(--ivory-2); font-size: 8px; letter-spacing: .05em; } svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.8; }
</style>
