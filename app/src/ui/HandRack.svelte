<script lang="ts">
  import type { Card, PlayResult } from '../engine/contract';
  import { canAfford } from '../engine/economy';
  export const isAffordable = (card: Card, coins: number) => canAfford(card.cost, coins);
  type Props = { hand: Card[]; coins: number; activeCardUid: string | null; dropResult?: PlayResult | null; onPick: (uid: string | null) => void; onSell: (uid: string) => void; onHover: (uid: string | null) => void };
  let { hand, coins, activeCardUid, dropResult = null, onPick, onSell, onHover }: Props = $props();
  let ghost = $state<Card | null>(null);
  let ghostX = $state(0);
  let ghostY = $state(0);
  const startGhost = (card: Card, event: PointerEvent) => { ghost = card; ghostX = event.clientX; ghostY = event.clientY; };
  $effect(() => {
    const follow = (event: PointerEvent) => { ghostX = event.clientX; ghostY = event.clientY; };
    const release = () => { ghost = null; };
    window.addEventListener('pointermove', follow);
    window.addEventListener('pointerup', release);
    return () => { window.removeEventListener('pointermove', follow); window.removeEventListener('pointerup', release); };
  });
  const effectKind = (card: Card) => card.targetMode === 'cell' ? 'MOVE' : card.targetMode === 'unit' ? 'ATTACK' : 'DIRECT';
</script>

<section class="hand-rack" aria-label="Hand channel rack">
  <div class="rack-label"><span>HAND / {hand.length}</span><span>CHANNEL STRIPS</span></div>
  {#if hand.length}
    <div class="cards">
      {#each hand as card, index (card.uid)}
        <article class:active={activeCardUid === card.uid} class:unplayable={!isAffordable(card, coins)} class="channel-card" style={`--delay:${index * 55}ms`} onmouseenter={() => onHover(card.uid)} onmouseleave={() => onHover(null)}>
          <button class="card-main" aria-pressed={activeCardUid === card.uid} aria-label={`Pick ${card.name}`} onpointerdown={(event) => startGhost(card, event)} onclick={() => onPick(activeCardUid === card.uid ? null : card.uid)}>
            <span class="cost">{card.cost}</span><span class={`pitch ${card.pitch}`}></span>
            <span class="card-name">{card.name}</span><span class="effect"><b>{effectKind(card)}</b>{card.description}</span>
            <span class="arc" aria-hidden="true"></span>
            <span class="ghost">PICK / DRAG</span>
          </button>
          <button class="sell" aria-label={`Sell ${card.name} for ${card.coinValue} coins`} onclick={() => onSell(card.uid)}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/></svg><span>{card.coinValue}</span><kbd>S</kbd></button>
        </article>
      {/each}
    </div>
  {:else}<div class="empty-hand">NO CHANNELS IN HAND — DRAW AT TURN CLOSE</div>{/if}
  {#if dropResult && !dropResult.ok}<p class="drop-failure">DROP REJECTED — {dropResult.reason}</p>{/if}
  {#if ghost}<div class="card-ghost" style={`left:${ghostX + 16}px;top:${ghostY + 16}px`} aria-hidden="true"><span>{ghost.cost}</span>{ghost.name}<small>CHANNEL OPEN</small></div>{/if}
</section>

<style>
  .hand-rack { pointer-events: auto; min-width: 580px; } .rack-label { display: flex; justify-content: space-between; color: var(--ivory-2); font-size: 9px; letter-spacing: .15em; padding: 0 5px 7px; } .cards { display: flex; gap: 8px; align-items: end; }
  .channel-card { position: relative; width: clamp(108px, 10.6vw, 156px); height: 158px; border: 1px solid var(--steel); background: var(--walnut-deep); box-shadow: var(--shadow-lift); animation: card-arrive 380ms both; animation-delay: var(--delay); transition: transform 160ms ease, opacity 160ms ease; }
  .card-main { position: relative; display: grid; width: 100%; height: 100%; border: 0; overflow: hidden; background: linear-gradient(100deg, #e1d5bd, var(--ivory-0) 48%, #c8b99e); color: var(--ink); cursor: grab; text-align: left; } .card-main:active { cursor: grabbing; }
  .channel-card:hover, .channel-card.active { transform: translateY(-18px); z-index: 2; } .channel-card.active { outline: 2px solid var(--amber); outline-offset: 3px; } .channel-card.unplayable { opacity: .44; filter: saturate(.55); } .channel-card.unplayable .card-main { cursor: not-allowed; }
  .cost { position: absolute; left: 10px; top: 4px; font-size: 30px; font-weight: 800; letter-spacing: -.13em; } .pitch { position: absolute; top: 12px; right: 10px; width: 8px; height: 8px; border: 1px solid var(--ink); border-radius: 50%; } .pitch.red { background: var(--signal-red); } .pitch.yellow { background: var(--amber); } .pitch.blue { background: var(--move); }
  .card-name { align-self: end; z-index: 1; padding: 6px 10px; border-top: 1px solid var(--ink); border-bottom: 1px solid var(--ink); background: var(--ivory-0); font-size: 12px; font-weight: 700; letter-spacing: -.04em; } .effect { align-self: end; min-height: 40px; padding: 6px 10px; font-size: 8px; line-height: 1.35; } .effect b { display: block; color: var(--ink-soft); font-size: 7px; letter-spacing: .09em; } .arc { position: absolute; left: 19%; top: 35px; width: 78%; height: 54px; border-top: 2px solid var(--ink); border-radius: 50%; transform: rotate(-9deg); opacity: .75; }
  .ghost { position: absolute; top: 60px; left: 10px; font-size: 7px; letter-spacing: .12em; opacity: 0; transition: opacity 160ms ease; } .channel-card:hover .ghost { opacity: .75; }
  .sell { position: absolute; right: 5px; bottom: 5px; display: flex; align-items: center; gap: 2px; padding: 2px 3px; border: 1px solid var(--ink); background: var(--brass-light); color: var(--ink); cursor: pointer; font-size: 9px; } .sell svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2; } .sell kbd { margin-left: 2px; padding: 0 2px; border: 1px solid var(--ink-soft); font: inherit; font-size: 7px; }
  .empty-hand { min-height: 112px; display: grid; place-items: center; border: 1px dashed var(--steel); color: var(--ivory-2); font-size: 10px; letter-spacing: .08em; }
  .drop-failure { position: absolute; right: 0; top: -24px; padding: 4px 7px; border: 1px solid var(--signal-red); background: var(--walnut-deep); color: var(--signal-red-light); font-size: 8px; letter-spacing: .05em; }
  .card-ghost { position: fixed; z-index: 30; width: 126px; padding: 8px; border: 1px solid var(--steel-light); background: var(--ivory-1); color: var(--ink); box-shadow: var(--shadow-lift); font-size: 10px; font-weight: 700; pointer-events: none; transform: rotate(3deg); } .card-ghost span { display: inline-block; margin-right: 7px; font-size: 18px; } .card-ghost small { display: block; margin-top: 5px; color: var(--ink-soft); font-size: 7px; letter-spacing: .1em; }
</style>
