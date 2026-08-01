<script lang="ts">
  // Hand fan — StS/Duelyst arc geometry (D7): bottom-center pivot, ~90° arc for
  // 5 cards, radius ≈1.2× card width; hover zooms (1.2×, lift ~100px, 0.2s);
  // damped-lerp reflow via CSS transition (global reduced-motion kill-switch
  // handles the no-motion path). Fixed-positioned sibling of DeskFrame.
  import { cardDef } from '../engine/cards';
  import type { GameSnapshot } from '../engine/contract';

  let {
    snapshot,
    onSelectCard = () => {},
    onSellCard = () => {},
    onCardDragStart = () => {},
    onCardDragEnd = () => {},
  }: {
    snapshot: GameSnapshot | null;
    onSelectCard?: (uid: string) => void;
    onSellCard?: (uid: string) => void;
    onCardDragStart?: (uid: string) => void;
    onCardDragEnd?: (uid: string, e: { clientX: number; clientY: number }) => void;
  } = $props();

  let dragUid: string | null = null;
  let dragStartX = 0;
  let dragStartY = 0;
  const DRAG_THRESHOLD = 6;

  function onDown(uid: string, e: PointerEvent): void {
    dragUid = uid;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    onCardDragStart(uid);
  }

  function onUp(uid: string, e: PointerEvent): void {
    const dragged =
      dragUid === uid &&
      Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) > DRAG_THRESHOLD;
    dragUid = null;
    if (dragged) {
      onCardDragEnd(uid, { clientX: e.clientX, clientY: e.clientY });
    } else {
      onSelectCard(uid);
    }
  }

  // Flat hand row (fan removed 2026-08-01): cards sit upright in a straight
  // line, aligned on their bottom edge. Hover = quiet 16px lift + border/shadow
  // emphasis — nothing rotated, so the lift never fights geometry and the
  // click target stays under the cursor.
</script>

<section class="hand-rack" aria-label={`Hand: ${snapshot?.hand.length ?? 0} cards`}>
  {#each snapshot?.hand ?? [] as card, i}
    {@const def = cardDef(card.cardUid)}
    {@const playable = (snapshot?.mana ?? 0) >= def.cost}
    {@const armed = snapshot?.activeCardUid === card.uid}
    <div class="hand-card" class:armed class:playable>
      <button
        type="button"
        class="hand-card-main"
        aria-label={`Card ${i + 1}: ${def.name} (${def.cost} mana, ${def.type})`}
        aria-pressed={armed}
        onpointerdown={(e) => onDown(card.uid, e)}
        onpointerup={(e) => onUp(card.uid, e)}
      >
        <span class="card-index">{i + 1}</span>
        <span class="cost-strip" class:cost-2={def.cost === 2} class:cost-3={def.cost >= 3} aria-hidden="true"></span>
        <span class="card-cost">{def.cost}</span>
        <span class="card-type">{def.type}</span>
        <span class="card-name">{def.name}</span>
        <span class="card-text">{def.text}</span>
      </button>
      <button
        type="button"
        class="hand-card-sell"
        aria-label={`Sell ${def.name} for 1 gold`}
        onclick={() => onSellCard(card.uid)}
      >
        SELL
      </button>
    </div>
  {/each}
  {#if !(snapshot?.hand.length)}<p class="hand-rack-empty">DRAWING RECORDS…</p>{/if}
</section>

<style>
  .hand-rack {
    position: fixed;
    z-index: 4;
    inset: auto auto clamp(0.5rem, 1.5vh, 1rem) 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: flex-end;
    gap: clamp(0.3rem, 0.6vw, 0.6rem);
    padding: 1.1rem clamp(0.4rem, 1vw, 1.2rem) 0.4rem;
    pointer-events: none;
  }
  .hand-card {
    --card-w: clamp(7.4rem, 11vw, 9.5rem);
    position: relative;
    flex: 0 0 var(--card-w);
    width: var(--card-w);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    transition: transform 140ms ease-out, filter 140ms ease-out, opacity 140ms ease-out;
    pointer-events: auto;
  }
  .hand-card:hover { z-index: 5; transform: translateY(-16px); }
  .hand-card-main {
    position: relative;
    width: 100%;
    min-height: 4.4rem;
    display: grid;
    grid-template-columns: 1.5rem 1fr auto;
    grid-template-rows: auto auto 1fr;
    gap: 0.2rem 0.35rem;
    align-items: start;
    padding: 0.5rem;
    color: var(--ink);
    background: linear-gradient(150deg, var(--ivory), var(--ivory-deep));
    border: 1px solid var(--steel);
    border-radius: var(--radius-tight);
    box-shadow: var(--shadow-panel);
    text-align: left;
    cursor: grab;
    transition: border-color 120ms ease-out, box-shadow 120ms ease-out, filter 120ms ease-out;
  }
  .hand-card.playable .hand-card-main { border-color: var(--action); }
  .hand-card.armed .hand-card-main { border-color: var(--action-light); box-shadow: 0 0 0 2px var(--action), var(--shadow-panel); }
  .hand-card:not(.playable) .hand-card-main { filter: saturate(0.35) brightness(0.82); }
  .hand-card:hover .hand-card-main { border-color: var(--action-light); box-shadow: 0 10px 18px rgb(0 0 0 / 0.35); }
  .card-index {
    grid-row: 1 / 3;
    display: grid;
    place-items: center;
    width: 1.35rem;
    height: 1.35rem;
    color: var(--ink);
    background: var(--action);
    border-radius: 50%;
    font: 700 0.65rem var(--font-readout);
  }
  .cost-strip {
    grid-column: 1 / -1;
    grid-row: 1;
    height: 0.28rem;
    border-radius: 2px;
    background: var(--steel);
  }
  .cost-strip.cost-2 { background: var(--move); }
  .cost-strip.cost-3 { background: var(--action); }
  .card-cost {
    grid-column: 3;
    grid-row: 1 / 3;
    min-width: 1.3rem;
    display: grid;
    place-items: center;
    padding: 0.1rem;
    color: var(--ink);
    background: var(--ivory);
    border: 1px solid var(--action);
    border-radius: 50%;
    font: 700 0.7rem var(--font-readout);
  }
  .card-type {
    grid-column: 1 / -1;
    grid-row: 2;
    color: var(--panel-steel);
    font: 700 0.55rem var(--font-readout);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .card-name {
    grid-column: 1 / -1;
    grid-row: 3;
    font: 700 0.72rem/1.15 var(--font-display);
    text-transform: uppercase;
  }
  .card-text {
    grid-column: 1 / -1;
    grid-row: 4;
    color: var(--panel-steel);
    font: 0.62rem/1.3 var(--font-readout);
  }
  /* Sell: always visible, full-width foot strip — findable and hittable. */
  .hand-card-sell {
    width: 100%;
    min-height: 1.6rem;
    padding: 0.2rem 0.5rem;
    color: var(--ivory-muted);
    background: var(--panel-ink);
    border: 1px solid var(--line-quiet);
    border-radius: var(--radius-tight);
    font: 700 0.6rem var(--font-readout);
    letter-spacing: 0.08em;
    transition: color 120ms ease-out, background 120ms ease-out, border-color 120ms ease-out;
  }
  .hand-card-sell:hover { color: var(--ivory); background: var(--panel-steel); border-color: var(--steel); }
  .hand-rack-empty { color: var(--ivory-muted); font: italic 0.75rem var(--font-readout); }
  @media (max-width: 520px) {
    .hand-rack { inset: auto 0.4rem 0.4rem; transform: none; gap: 0.2rem; }
    .hand-card-main { min-height: 3.4rem; }
    .hand-card-sell { min-height: 1.4rem; }
  }
</style>


