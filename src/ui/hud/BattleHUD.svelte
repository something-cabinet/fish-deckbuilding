<script lang="ts">
  import { gameState, endCombat } from '../../lib/state.svelte';
  import { getCurrentOrchestrator } from '../../game/bridge';
  import { getCard } from '../../game/cards/cardData';
  import HeroHPZone from '../battle/zones/hero-hp/HeroHPZone.svelte';
  import TurnInfoZone from '../battle/zones/turn-info/TurnInfoZone.svelte';
  import EnemyHPBarZone from '../battle/zones/enemy-hp-bar/EnemyHPBarZone.svelte';
  import InterestFlashZone from '../battle/zones/interest-flash/InterestFlashZone.svelte';
  import CoinZone from '../battle/zones/coin/CoinZone.svelte';
  import EnemyRowZone from '../battle/zones/enemy-row/EnemyRowZone.svelte';
  import DeckZone from '../battle/zones/deck/DeckZone.svelte';
  import HandZone from '../battle/zones/hand/HandZone.svelte';
  import ActionBarZone from '../battle/zones/action-bar/ActionBarZone.svelte';
  import ModalHost from '../battle/ModalHost.svelte';
  import CardTooltip from '../battle/CardTooltip.svelte';
  import CombatFeedbackZone from '../battle/zones/combat-feedback/CombatFeedbackZone.svelte';

  let selectedCardIndex = $state<number | null>(null);
  let selectedCardId = $state<string | null>(null);
  let hoveredCardId = $state<string | null>(null);
  let mousePos = $state({ x: 0, y: 0 });

  let targetingMode = $derived(
    selectedCardIndex !== null && gameState.combat.turnPhase === 'play'
  );

  function handleSellCard(cardIndex: number) {
    getCurrentOrchestrator()?.sellCard(cardIndex);
    if (selectedCardIndex === cardIndex) cancelTargeting();
  }

  function handleSelectCard(index: number) {
    const cardId = gameState.combat.hand[index];
    if (!cardId) return;
    const card = getCard(cardId);
    if (!card || card.attack <= 0) return;
    selectedCardIndex = index;
    selectedCardId = cardId;
  }

  function cancelTargeting() {
    selectedCardIndex = null;
    selectedCardId = null;
  }

  function handlePlayCard(cardIndex: number) {
    const card = getCard(gameState.combat.hand[cardIndex]);
    if (card && card.attack > 0) handleSelectCard(cardIndex);
  }

  function handleEnemyClick(enemyIndex: number) {
    if (selectedCardIndex === null || selectedCardId === null) return;
    const card = getCard(selectedCardId);
    if (!card) return;
    const enemy = gameState.combat.enemies[enemyIndex];
    if (!enemy || enemy.hp <= 0) return;

    getCurrentOrchestrator()?.playCard(selectedCardIndex, enemyIndex);

    const result = getCurrentOrchestrator()?.checkBattleEnd();
    if (result === 'victory') { cancelTargeting(); return; }
    if (result === 'defeat') { cancelTargeting(); endCombat(); return; }
    cancelTargeting();
  }

  function handleEndTurn() {
    getCurrentOrchestrator()?.endPlayerTurn();
  }

  function handleCardHover(cardId: string, event: MouseEvent) {
    hoveredCardId = cardId;
    mousePos = { x: event.clientX, y: event.clientY };
  }

  function handleCardLeave() {
    hoveredCardId = null;
  }
</script>

<div class="battle-layout">
  <div class="zone hero-hp"><HeroHPZone /></div>
  <div class="zone turn-info"><TurnInfoZone /></div>
  <div class="zone enemy-hp"><EnemyHPBarZone /></div>
  <div class="zone interest-flash"><InterestFlashZone /></div>
  <div class="zone coin"><CoinZone /></div>
  <div class="zone enemy-row">
    <EnemyRowZone
      {selectedCardIndex}
      {selectedCardId}
      onEnemyClick={handleEnemyClick}
      onCancelTargeting={cancelTargeting}
    />
  </div>
  <div class="zone deck"><DeckZone /></div>
  <div class="zone hand">
    <HandZone
      selectedIndex={selectedCardIndex}
      onHover={handleCardHover}
      onLeave={handleCardLeave}
      onSellCard={handleSellCard}
      onPlayCard={handlePlayCard}
      onSelectCard={handleSelectCard}
      onBlockCard={undefined}
    />
  </div>
  <div class="zone actions">
    <ActionBarZone
      {targetingMode}
      onEndTurn={handleEndTurn}
      onCancelTargeting={cancelTargeting}
    />
  </div>
</div>

{#if hoveredCardId}
  <div class="tooltip-wrapper" style="left: {mousePos.x + 16}px; top: {mousePos.y + 16}px;">
    <CardTooltip cardId={hoveredCardId} />
  </div>
{/if}

<CombatFeedbackZone />
<ModalHost />

<style>
  .battle-layout {
    display: grid;
    width: 100%;
    height: 100%;
    grid-template-columns: 160px 1fr 160px;
    grid-template-rows: auto auto 1fr auto auto;
    grid-template-areas:
      "hero-hp   turn-info  enemy-hp"
      "interest  interest   interest"
      "coin      enemy-row  deck"
      "hand      hand       hand"
      "actions   actions    actions";
    gap: 0;
    background: var(--abyss);
    pointer-events: none;
  }
  .battle-layout > * { pointer-events: auto; }
  .zone { padding: 0.75rem; }

  .hero-hp, .turn-info, .enemy-hp {
    display: flex;
    align-items: center;
    background: var(--panel-bg);
    border-bottom: 1px solid var(--panel-border);
  }
  .hero-hp { grid-area: hero-hp; }
  .turn-info { grid-area: turn-info; justify-content: center; }
  .enemy-hp { grid-area: enemy-hp; justify-content: flex-end; }
  .interest-flash { grid-area: interest; padding: 0; }
  .coin { grid-area: coin; }
  .enemy-row { grid-area: enemy-row; padding-top: 2rem; }
  .deck { grid-area: deck; justify-content: flex-end; }
  .hand, .actions {
    grid-area: hand;
    background: var(--panel-bg);
    border-top: 1px solid var(--panel-border);
    padding: 0.75rem 1.5rem;
  }
  .actions { grid-area: actions; }
  .tooltip-wrapper { position: fixed; z-index: 200; pointer-events: none; }

  @media (max-width: 1023px) {
    .battle-layout {
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        "hero-hp    turn-info"
        "interest   interest"
        "enemy-row  enemy-row"
        "hand       hand"
        "actions    actions";
    }
    .coin, .deck { display: none; }
  }

  @media (max-width: 767px) {
    .battle-layout {
      grid-template-columns: 1fr;
      grid-template-areas:
        "hero-hp"
        "turn-info"
        "interest"
        "enemy-row"
        "hand"
        "actions";
    }
    .enemy-hp { display: none; }
  }
</style>
