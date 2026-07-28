<script lang="ts">
  import { gameState } from '../../../../lib/state.svelte';
  import HandViewer from '../../../battle/HandViewer.svelte';

  interface Props {
    selectedIndex: number | null;
    onHover: (cardId: string, event: MouseEvent) => void;
    onLeave: () => void;
    onSellCard?: (cardIndex: number) => void;
    onPlayCard: (cardIndex: number) => void;
    onSelectCard: (index: number) => void;
    onBlockCard?: (cardIndex: number) => void;
  }

  let {
    selectedIndex,
    onHover,
    onLeave,
    onSellCard,
    onPlayCard,
    onSelectCard,
    onBlockCard,
  }: Props = $props();

  let currentPhase = $derived(gameState.combat.turnPhase);
</script>

<div class="hand-zone">
  <HandViewer
    {onHover}
    {onLeave}
    onSellCard={onSellCard ?? (() => {})}
    {onPlayCard}
    onBlockCard={onBlockCard}
    {selectedIndex}
    {onSelectCard}
    phase={currentPhase === 'defense' ? 'defense' : 'play'}
  />
</div>

<style>
  .hand-zone {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
</style>
