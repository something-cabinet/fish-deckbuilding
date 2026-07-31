<script lang="ts">
  import type { Card, Unit } from '../engine/contract';
  export type HoverContent = { kind: 'unit'; unit: Unit } | { kind: 'card'; card: Card };
  type Props = { content: HoverContent | null; position: 'left' | 'right' | 'top' | 'bottom' };
  let { content, position }: Props = $props();
  let pinned = $state<HoverContent | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Gate 4 fix: do NOT read `pinned` inside this effect — writing it would
  // re-trigger the effect (Svelte update-depth loop). Use a $derived for the
  // pinned copy and let the effect only manage the fade timer.
  const displayContent = $derived(content ?? pinned);
  $effect(() => {
    if (content) {
      pinned = content;
      if (timer) clearTimeout(timer);
    } else if (pinned) {
      timer = setTimeout(() => { pinned = null; }, 520);
    }
    return () => { if (timer) clearTimeout(timer); };
  });
</script>
{#if displayContent}<aside class={`hover-panel ${position}`} aria-live="polite">{#if displayContent.kind === 'unit'}<header><span class="faction">{displayContent.unit.faction}</span><b>{displayContent.unit.name}</b></header><div class="stats"><span>HP <strong>{displayContent.unit.hp}/{displayContent.unit.maxHp}</strong></span><span>ATK <strong>{displayContent.unit.attack}</strong></span><span>ARM <strong>{displayContent.unit.armor}</strong></span><span class:debt={displayContent.unit.debt > 0}>DEBT <strong>{displayContent.unit.debt}</strong></span></div><p>MOVE: {displayContent.unit.canMove ? displayContent.unit.movement : 0} REMAINING · RANGE: ADJACENT</p>{:else}<header><span class="faction">CHANNEL</span><b>{displayContent.card.name}</b></header><div class="stats"><span>COST <strong>{displayContent.card.cost}</strong></span><span>SELL <strong>+{displayContent.card.coinValue}</strong></span></div><p>{displayContent.card.description}</p>{/if}</aside>{/if}
<style>.hover-panel { width: 230px; padding: 10px; border: 1px solid var(--steel-light); background: rgb(232 224 207 / .96); color: var(--ink); box-shadow: var(--shadow-lift); pointer-events: none; } header { display: flex; gap: 8px; align-items: baseline; padding-bottom: 7px; border-bottom: 1px solid var(--ink); } .faction { color: var(--ink-soft); font-size: 8px; letter-spacing: .11em; text-transform: uppercase; } b { font-size: 13px; letter-spacing: -.05em; } .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; padding: 8px 0; } .stats span { display: flex; justify-content: space-between; border-bottom: 1px dotted var(--steel); font-size: 9px; } .stats strong { letter-spacing: -.06em; } .debt, .debt strong { color: var(--signal-red); } p { font-size: 9px; line-height: 1.4; }</style>
