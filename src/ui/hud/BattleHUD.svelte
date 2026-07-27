<script lang="ts">
  import { gameState, setScreen, markNodeCleared, incrementBattleIndex, endCombat, addToDeck } from '../../lib/state';
  import { canPlayCard } from '../../game/combat';
  import { getCurrentOrchestrator, syncCombatResultToRun } from '../../game/bridge';
  import { getCard } from '../../game/cards/cardData';
  import { getRelic } from '../../game/relics/relicData';
  import type { CombatState } from '../../game/combat';
  import EnemyRow from '../battle/EnemyRow.svelte';
  import HandViewer from '../battle/HandViewer.svelte';
  import DeckViewer from '../battle/DeckViewer.svelte';
  import CardTooltip from '../battle/CardTooltip.svelte';
  import CoinDisplay from '../battle/CoinDisplay.svelte';
  import EnemyHPBar from '../battle/EnemyHPBar.svelte';
  import DefensePrompt from '../battle/DefensePrompt.svelte';
  import SellOrderPrompt from '../battle/SellOrderPrompt.svelte';
  import CardReward from '../battle/CardReward.svelte';

  let showDeck = $state(false);
  let hoveredCardId = $state<string | null>(null);
  let mousePos = $state({ x: 0, y: 0 });
  let showDefensePrompt = $state(false);
  let pendingEnemyDamage = $state(0);
  let pendingEnemyAttacks = $state<{ enemyId: string; damage: number }[]>([]);

  // Targeting state
  let selectedCardIndex = $state<number | null>(null);
  let selectedCardId = $state<string | null>(null);

  // Card reward state
  let showCardReward = $state(false);
  let rewardCards: string[] = $state([]);

  // Interest display
  let interestFlash = $state(0);

  // React to interest due (set by bridge via interest:due event)
  $effect(() => {
    const interest = gameState.combat.interestDue;
    if (interest > 0) {
      interestFlash = interest;
      setTimeout(() => { interestFlash = 0; }, 2000);
    }
  });

  // Detect defense phase from state sync — open defense prompt automatically
  $effect(() => {
    if (gameState.combat.turnPhase === 'defense' && gameState.combat.incomingDamage != null) {
      pendingEnemyDamage = gameState.combat.incomingDamage;
      pendingEnemyAttacks = gameState.combat.enemyActions.map(a => ({
        enemyId: gameState.combat.enemies[a.enemyIndex]?.id ?? '',
        damage: a.damage ?? 0,
      }));
      showDefensePrompt = true;
    }
  });

  // Reset defense prompt when leaving defense phase
  $effect(() => {
    if (gameState.combat.turnPhase !== 'defense') {
      showDefensePrompt = false;
    }
  });

  // Derived state
  let currentPhase = $derived(gameState.combat.turnPhase);
  let isPlayerPhase = $derived(
    currentPhase === 'draw' || currentPhase === 'play'
  );

  let targetingMode = $derived(selectedCardIndex !== null && currentPhase === 'play');

  let canAffordSelected = $derived.by(() => {
    if (selectedCardId === null) return false;
    const card = getCard(selectedCardId);
    if (!card) return false;
    return canPlayCard(card, gameState.combat.coins, gameState.run.creditLimit);
  });

  // Relic display
  let ownedRelics = $derived(
    gameState.run.relics.map(id => getRelic(id)).filter((r): r is NonNullable<typeof r> => r != null)
  );

  /** Apply combat state changes back to the reactive $state object */
  function applyState(newState: CombatState) {
    Object.assign(gameState.combat, newState);
  }

  /**
   * After applying state, check for battle end.
   * Returns true if battle ended.
   */
  function checkAndHandleBattleEnd(): boolean {
    const end = getCurrentOrchestrator()?.checkBattleEnd() ?? null;
    if (end === 'victory') {
      handleVictory();
      return true;
    } else if (end === 'defeat') {
      handleDefeat();
      return true;
    }
    return false;
  }

  /** Sell a card from hand for coins */
  function handleSellCard(cardIndex: number) {
    getCurrentOrchestrator()?.sellCard(cardIndex);

    // If we just sold the selected card, clear selection
    if (selectedCardIndex === cardIndex) {
      cancelTargeting();
    }
  }

  /** Select a card for targeting mode */
  function handleSelectCard(index: number) {
    const cardId = gameState.combat.hand[index];
    if (!cardId) return;
    const card = getCard(cardId);
    if (!card || card.attack <= 0) return;
    selectedCardIndex = index;
    selectedCardId = cardId;
  }

  /** Cancel targeting mode */
  function cancelTargeting() {
    selectedCardIndex = null;
    selectedCardId = null;
  }

  /** Play the attack card directly against a target (from Play button in HandViewer) */
  function handlePlayCard(cardIndex: number) {
    const cardId = gameState.combat.hand[cardIndex];
    const card = getCard(cardId);
    if (!card) return;

    if (card.attack > 0) {
      // Enter targeting mode
      handleSelectCard(cardIndex);
    }
  }

  /** Handle clicking on an enemy for targeting */
  function handleEnemyClick(enemyIndex: number) {
    if (selectedCardIndex === null || selectedCardId === null) return;

    const card = getCard(selectedCardId);
    if (!card) return;

    // Check if the enemy is alive
    const enemy = gameState.combat.enemies[enemyIndex];
    if (!enemy || enemy.hp <= 0) return;

    // Play the attack card (relic triggers handled inside orchestrator)
    getCurrentOrchestrator()?.playCard(selectedCardIndex, enemyIndex);

    // Check for battle end after playing card
    const battleResult = getCurrentOrchestrator()?.checkBattleEnd();
    if (battleResult === 'victory') {
      cancelTargeting();
      handleVictory();
      return;
    } else if (battleResult === 'defeat') {
      cancelTargeting();
      handleDefeat();
      return;
    }

    // Clear targeting
    cancelTargeting();
  }

  function doStartPlayerTurn() {
    getCurrentOrchestrator()?.startPlayerTurn();
  }

  /** End player turn */
  function handleEndTurn() {
    getCurrentOrchestrator()?.endPlayerTurn();
  }

  /** Confirm sell order after player rearranges sold cards */
  function handleConfirmSellOrder(orderedCards: string[]) {
    getCurrentOrchestrator()?.confirmSellOrder(orderedCards);
  }

  /** Confirm block in defense prompt */
  function handleConfirmBlock(blockedIndices: number[]) {
    getCurrentOrchestrator()?.defend(blockedIndices, pendingEnemyDamage);

    showDefensePrompt = false;
    pendingEnemyDamage = 0;

    // Advance to next turn
    getCurrentOrchestrator()?.startPlayerTurn();
  }

  /** Take damage without blocking */
  function handleTakeDamage() {
    getCurrentOrchestrator()?.defend([], pendingEnemyDamage);

    showDefensePrompt = false;
    pendingEnemyDamage = 0;

    // Advance to next turn
    getCurrentOrchestrator()?.startPlayerTurn();
  }

  /** Handle victory — show card reward */
  function handleVictory() {
    syncCombatResultToRun();
    rewardCards = [...gameState.combat.rewardCards];
    showCardReward = true;
  }

  /** Handle card reward selection */
  function handleRewardSelect(cardId: string) {
    addToDeck(cardId);
    finishAfterVictory();
  }

  /** Handle card reward skip */
  function handleRewardSkip() {
    finishAfterVictory();
  }

  /** Finish up after victory */
  function finishAfterVictory() {
    // Sync hero HP from combat state to run state
    gameState.run.heroHp = gameState.combat.heroHp;

    // Add gold reward
    gameState.run.gold += gameState.combat.rewardGold;

    // Mark node cleared
    markNodeCleared(gameState.run.currentNodeId);

    // Increment battle index
    incrementBattleIndex();

    // Check if this was the boss encounter — route to victory screen
    const isBoss = gameState.combat.encounterId === 'boss_leviathan';

    // End combat
    endCombat();

    showCardReward = false;

    if (isBoss) {
      setScreen('victory');
    } else {
      setScreen('map');
    }
  }

  /** Handle defeat */
  function handleDefeat() {
    endCombat();
    // Screen transition to 'death' is handled by the bridge via combat:defeat event
  }

  /** End combat and return to map (for testing/debug) */
  function endCombatAndReturn() {
    endCombat();
    setScreen('map');
  }

  function handleCardHover(cardId: string, event: MouseEvent) {
    hoveredCardId = cardId;
    mousePos = { x: event.clientX, y: event.clientY };
  }

  function handleCardLeave() {
    hoveredCardId = null;
  }

</script>

<div class="battle-hud">
  <!-- Top Bar -->
  <div class="top-bar">
    <div class="top-left">
      <!-- Hero HP Bar -->
      <div class="hp-section">
        <span class="hp-label">GUPPY</span>
        <div class="hp-bar-bg">
          <div
            class="hp-bar-fill"
            style="width: {(gameState.combat.heroHp / Math.max(1, gameState.combat.heroMaxHp)) * 100}%"
          ></div>
        </div>
        <span class="hp-text"
          >{gameState.combat.heroHp} / {gameState.combat.heroMaxHp}</span
        >
      </div>

      <!-- Relic Display -->
      {#if ownedRelics.length > 0}
        <div class="relic-bar">
          {#each ownedRelics as relic}
            <div class="relic-icon" style="background: {relic.color}40; border-color: {relic.color}" title={relic.description}>
              <span class="relic-abbr">{relic.name.split(' ').map(w => w[0]).join('').slice(0, 3)}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="top-center">
      <div class="combat-info">
        <span class="turn-badge">TURN {gameState.combat.turnNumber}</span>
        <span class="phase-badge">{currentPhase.toUpperCase()}</span>
      </div>
      <div class="gold-display">
        <span class="gold-icon">G</span>
        <span class="gold-value">{gameState.run.gold}</span>
      </div>
    </div>

    <div class="top-right">
      <EnemyHPBar />
    </div>
  </div>

  <!-- Interest Flash -->
  {#if interestFlash > 0}
    <div class="interest-flash">
      INTEREST DAMAGE: {interestFlash}
    </div>
  {/if}

  <!-- Main Battle Area -->
  <div class="battle-main">
    <!-- Coin Display (left sidebar) -->
    <div class="battle-sidebar">
      <CoinDisplay />
    </div>

    <!-- Enemy Row Area (center) -->
    <div class="enemy-area">
      <EnemyRow
        selectedTargetIndex={selectedCardIndex ?? -1}
        targetingMode={targetingMode}
        onEnemyClick={handleEnemyClick}
      />
      {#if targetingMode}
        <div class="targeting-hint">
          Click an enemy to target with {getCard(selectedCardId ?? '')?.name ?? 'attack'}
          <button class="cancel-btn" onclick={cancelTargeting}>CANCEL</button>
        </div>
      {/if}
    </div>

    <!-- Right sidebar (deck info) -->
    <div class="battle-sidebar">
      <div class="deck-info-box">
        <div class="deck-count">Deck: {gameState.combat.battleDeck.length}</div>
        <button class="deck-view-btn" onclick={() => (showDeck = !showDeck)}
          >VIEW DECK</button
        >
      </div>
    </div>
  </div>

  <!-- Bottom Bar -->
  <div class="bottom-bar">
    <HandViewer
      onHover={handleCardHover}
      onLeave={handleCardLeave}
      onSellCard={handleSellCard}
      onPlayCard={handlePlayCard}
      onBlockCard={undefined}
      selectedIndex={selectedCardIndex}
      onSelectCard={handleSelectCard}
      phase={currentPhase === 'defense' ? 'defense' : 'play'}
    />

    <div class="action-bar">
      {#if targetingMode}
        <button class="end-turn-btn cancel-btn-action" onclick={cancelTargeting}>CANCEL</button>
      {:else if currentPhase === 'play'}
        <button class="end-turn-btn" onclick={handleEndTurn}>END TURN</button>
      {:else if currentPhase === 'defense'}
        <div class="waiting-indicator">BLOCK PHASE</div>
      {/if}
    </div>
  </div>

  <!-- Sell Order Prompt Modal -->
  {#if currentPhase === 'sellOrder'}
    <div class="modal-overlay">
      <SellOrderPrompt
        sellPile={gameState.combat.sellPile}
        onConfirm={handleConfirmSellOrder}
      />
    </div>
  {/if}

  <!-- Defense Prompt Modal -->
  {#if showDefensePrompt}
    <div class="modal-overlay">
      <DefensePrompt
        incomingDamage={pendingEnemyDamage}
        enemyAttacks={pendingEnemyAttacks}
        onConfirmBlock={handleConfirmBlock}
        onTakeDamage={handleTakeDamage}
      />
    </div>
  {/if}

  <!-- Card Reward Modal -->
  {#if showCardReward}
    <CardReward
      rewardCards={rewardCards}
      onSelect={handleRewardSelect}
      onSkip={handleRewardSkip}
    />
  {/if}

  <!-- Deck Viewer Modal -->
  {#if showDeck}
    <div
      class="modal-overlay"
      role="button"
      tabindex="0"
      onclick={() => (showDeck = false)}
      onkeydown={(e) => e.key === 'Escape' && (showDeck = false)}
    >
      <div
        class="modal-content"
        role="dialog"
        tabindex="-1"
        onclick={(e) => e.stopPropagation()}
      >
        <DeckViewer />
        <button class="close-btn" onclick={() => (showDeck = false)}
          >CLOSE</button
        >
      </div>
    </div>
  {/if}

  <!-- Card Tooltip -->
  {#if hoveredCardId}
    <div
      class="tooltip-wrapper"
      style="left: {mousePos.x + 16}px; top: {mousePos.y + 16}px;"
    >
      <CardTooltip cardId={hoveredCardId} />
    </div>
  {/if}
</div>

<style>
  .battle-hud {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    pointer-events: none;
  }

  .battle-hud > * {
    pointer-events: auto;
  }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.5rem;
    background: var(--panel-bg);
    border-bottom: 1px solid var(--panel-border);
    gap: 1rem;
  }

  .top-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .top-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
  }

  .top-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .hp-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .hp-label {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--coral);
    letter-spacing: 0.1em;
  }

  .hp-bar-bg {
    width: 140px;
    height: 12px;
    background: var(--hp-bar-bg);
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .hp-bar-fill {
    height: 100%;
    background: var(--hp-bar);
    border-radius: 6px;
    transition: width 0.3s ease;
  }

  .hp-text {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--parchment);
    min-width: 60px;
    font-family: ui-monospace, monospace;
  }

  .relic-bar {
    display: flex;
    gap: 0.3rem;
    align-items: center;
  }

  .relic-icon {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: help;
    font-size: 0.55rem;
    font-weight: 700;
    color: var(--parchment);
  }

  .relic-abbr {
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .interest-flash {
    text-align: center;
    padding: 0.5rem;
    background: rgba(232, 93, 78, 0.2);
    border: 1px solid var(--coral);
    color: var(--coral-light);
    font-weight: 700;
    font-size: 0.9rem;
    letter-spacing: 0.15em;
    animation: flash-fade 2s ease-out forwards;
  }

  @keyframes flash-fade {
    0% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
  }

  .combat-info {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .turn-badge,
  .phase-badge {
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
  }

  .phase-badge {
    color: var(--coral);
  }

  .gold-display {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 700;
  }

  .gold-icon {
    color: var(--gold);
    font-size: 0.9rem;
  }

  .gold-value {
    color: var(--parchment);
    font-size: 0.85rem;
  }

  .battle-main {
    flex: 1;
    display: flex;
    gap: 1rem;
    padding: 0.75rem;
    align-items: flex-start;
    justify-content: center;
  }

  .battle-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 160px;
    max-width: 200px;
  }

  .enemy-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    flex: 1;
    gap: 0.5rem;
    padding-top: 2rem;
  }

  .targeting-hint {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem;
    background: rgba(244, 196, 48, 0.1);
    border: 1px solid var(--gold);
    border-radius: 4px;
    font-size: 0.8rem;
    color: var(--gold);
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .cancel-btn {
    padding: 0.3rem 0.8rem;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
    border-radius: 4px;
    letter-spacing: 0.05em;
  }

  .cancel-btn:hover {
    background: var(--coral);
    border-color: var(--coral);
  }

  .deck-info-box {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--ink-light);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    align-items: center;
  }

  .deck-count {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--parchment-dim);
    letter-spacing: 0.1em;
  }

  .deck-view-btn {
    padding: 0.4rem 0.8rem;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
    border-radius: 4px;
    letter-spacing: 0.05em;
    transition: all 0.2s ease;
  }

  .deck-view-btn:hover {
    background: var(--coral);
    border-color: var(--coral);
  }

  .bottom-bar {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--panel-bg);
    border-top: 1px solid var(--panel-border);
  }

  .action-bar {
    display: flex;
    justify-content: flex-end;
  }

  .end-turn-btn {
    padding: 0.6rem 1.5rem;
    background: var(--coral);
    border: none;
    color: var(--parchment);
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
    text-transform: uppercase;
  }

  .end-turn-btn:hover {
    background: var(--coral-light);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(232, 93, 78, 0.3);
  }

  .cancel-btn-action {
    background: var(--shallow);
    border: 1px solid var(--panel-border);
  }

  .cancel-btn-action:hover {
    background: var(--coral-light);
  }

  .waiting-indicator {
    padding: 0.6rem 1.5rem;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--parchment-dim);
    animation: pulse-text 1.5s ease-in-out infinite;
  }

  @keyframes pulse-text {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 22, 40, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    pointer-events: auto;
  }

  .modal-content {
    background: var(--deep);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .close-btn {
    padding: 0.5rem 1rem;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
    font-weight: 700;
    cursor: pointer;
    border-radius: 4px;
    align-self: center;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: var(--coral);
    border-color: var(--coral);
  }

  .tooltip-wrapper {
    position: fixed;
    z-index: 200;
    pointer-events: none;
  }
</style>
