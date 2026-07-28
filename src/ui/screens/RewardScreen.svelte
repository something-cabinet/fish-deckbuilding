<script lang="ts">
  import { gameState, setScreen, addToDeck, canAddToDeck, addGold } from '../../lib/state.svelte';
  import { getCard, CARD_DATA } from '../../game/cards/cardData';
  import { CardType } from '../../game/combat/CardTypes';

  interface Props {
    isVictory?: boolean;
  }

  let { isVictory = true }: Props = $props();

  // Reward cards from combat state
  let rewardCards = $derived(gameState.combat.rewardCards);
  let rewardGold = $derived(gameState.combat.rewardGold);

  let selectedCard = $state<string | null>(null);
  let claimed = $state(false);
  let goldAnimating = $state(false);
  let toastMessage = $state('');

  // Build fallback from actual available card IDs
  const allCardIds = $derived(Object.keys(CARD_DATA));
  function pickFallbackCards(count: number): string[] {
    const shuffled = [...allCardIds].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  const cardChoices = $derived(
    rewardCards.length >= 3
      ? rewardCards.slice(0, 3)
      : pickFallbackCards(3)
  );

  function getCardSprite(type: CardType): string {
    switch (type) {
      case CardType.Attack: return '/sprites/cards/card-attack.svg';
      case CardType.Armor: return '/sprites/cards/card-armor.svg';
      case CardType.Summon: return '/sprites/cards/card-summon.svg';
      default: return '/sprites/cards/card-attack.svg';
    }
  }

  function getTypeColor(type: CardType): string {
    switch (type) {
      case CardType.Attack: return 'var(--coral)';
      case CardType.Armor: return 'var(--unit-blue)';
      case CardType.Skill: return 'var(--stat-heal)';
      case CardType.Summon: return 'var(--spell-green)';
      case CardType.Passive: return 'var(--power-purple)';
      default: return 'var(--parchment-dim)';
    }
  }

  function claimCard(cardId: string) {
    if (claimed) return;
    // Check deck capacity before claiming
    if (!canAddToDeck(cardId)) {
      toastMessage = 'Deck full or max copies reached!';
      return;
    }
    selectedCard = cardId;
    goldAnimating = true;
    setTimeout(() => {
      addToDeck(cardId);
      // M1: RewardScreen owns the gold economy — bridge does NOT modify gold
      addGold(rewardGold);
      claimed = true;
      goldAnimating = false;
    }, 600);
  }

  function skipReward() {
    // No half-gold on skip — just go to map
    goToMap();
  }

  function goToMap() {
    setScreen('map');
  }
</script>

<div class="reward-screen" class:victory={isVictory} class:defeat={!isVictory}>
  <div class="reward-bg"></div>
  {#if toastMessage}
    <div class="reward-toast">{toastMessage}</div>
  {/if}

  <div class="reward-content">
    <div class="title-section">
      {#if isVictory}
        <h1 class="reward-title victory-title">VICTORY!</h1>
        <p class="reward-subtitle">The debt collectors have been repelled.</p>
      {:else}
        <h1 class="reward-title defeat-title">DEFEAT</h1>
        <p class="reward-subtitle">Better luck next time, Guppy.</p>
      {/if}
    </div>

    <div class="gold-section">
      <div class="gold-label">Gold Earned</div>
      <div class="gold-value" class:gold-pulse={goldAnimating}>
        <img src="/sprites/ui/mana-crystal.svg" alt="" class="gold-crystal" />
        <span class="gold-number">+{rewardGold}</span>
      </div>
    </div>

    {#if isVictory && !claimed}
      <div class="choice-label">Choose your reward:</div>
      <div class="cards-row">
        {#each cardChoices as cardId, i}
          {@const card = getCard(cardId)}
          {@const isSelected = selectedCard === cardId}
          {#if card}
            <button
              class="reward-card"
              class:selected={isSelected}
              onclick={() => claimCard(cardId)}
              style="animation-delay: {i * 0.15}s"
            >
              <div class="card-inner" style="border-color: {getTypeColor(card.type)}">
                <div class="card-header">
                  <span class="mana-cost">{card.manaCost}</span>
                  <span class="card-type" style="color: {getTypeColor(card.type)}">{card.type}</span>
                </div>
                <img src={getCardSprite(card.type)} alt={card.name} class="card-art" />
                <h3 class="card-name">{card.name}</h3>
                <p class="card-desc">{card.description}</p>
              </div>
            </button>
          {/if}
        {/each}
      </div>
    {:else if claimed}
      <div class="claimed-msg">
        <img src="/sprites/cards/card-attack.svg" alt="" class="claimed-icon" />
        <p>Added to your collection!</p>
      </div>
    {/if}

    <div class="reward-actions">
      {#if !claimed && isVictory}
        <button class="skip-btn" onclick={skipReward}>Skip Reward</button>
      {/if}
      <button class="continue-btn" onclick={goToMap}>
        {claimed || !isVictory ? 'CONTINUE' : 'TAKE GOLD & LEAVE'}
      </button>
    </div>
  </div>
</div>

<style>
  .reward-screen {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 100;
    overflow: hidden;
  }

  .reward-bg {
    position: absolute;
    inset: 0;
    background: var(--abyss);
    transition: background 0.5s ease;
  }

  .victory .reward-bg {
    background: linear-gradient(180deg, var(--abyss) 0%, rgba(26, 58, 92, 0.8) 100%);
  }

  .defeat .reward-bg {
    background: linear-gradient(180deg, var(--abyss) 0%, rgba(139, 0, 0, 0.3) 100%);
  }

  .reward-content {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem;
    max-width: 800px;
    width: 100%;
    animation: screen-fade 0.5s ease-out;
  }

  @keyframes screen-fade {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  .title-section {
    text-align: center;
    animation: title-drop 0.6s ease-out 0.1s both;
  }

  @keyframes title-drop {
    0% { opacity: 0; transform: translateY(-30px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .reward-title {
    font-family: 'Press Start 2P', monospace;
    font-size: 2.2rem;
    margin: 0;
    letter-spacing: 0.1em;
    text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }

  .victory-title {
    color: var(--gold);
    text-shadow:
      0 0 20px rgba(244, 196, 48, 0.4),
      0 4px 12px rgba(0, 0, 0, 0.5);
    animation: victory-pulse 2s ease-in-out infinite;
  }

  @keyframes victory-pulse {
    0%, 100% { text-shadow: 0 0 20px rgba(244, 196, 48, 0.4), 0 4px 12px rgba(0,0,0,0.5); }
    50% { text-shadow: 0 0 40px rgba(244, 196, 48, 0.7), 0 4px 12px rgba(0,0,0,0.5); }
  }

  .defeat-title {
    color: var(--coral);
    text-shadow: 0 0 20px rgba(232, 93, 78, 0.4), 0 4px 12px rgba(0,0,0,0.5);
  }

  .reward-toast {
    position: fixed;
    top: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    background: var(--deep);
    color: var(--coral);
    padding: 0.6rem 1.5rem;
    border: 1px solid var(--coral);
    border-radius: 6px;
    font-weight: 700;
    font-size: 0.9rem;
    z-index: 110;
    animation: toast-in 0.3s ease;
  }

  @keyframes toast-in {
    0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    100% { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  .reward-subtitle {
    font-family: 'VT323', monospace;
    font-size: 1.3rem;
    color: var(--parchment-dim);
    margin: 0.5rem 0 0;
    letter-spacing: 0.05em;
  }

  .gold-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    animation: gold-slide 0.5s ease-out 0.3s both;
  }

  @keyframes gold-slide {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .gold-label {
    font-family: 'VT323', monospace;
    font-size: 1rem;
    color: var(--parchment-dim);
    text-transform: uppercase;
    letter-spacing: 0.15em;
  }

  .gold-value {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(244, 196, 48, 0.1);
    padding: 0.5rem 1.5rem;
    border-radius: 8px;
    border: 1px solid rgba(244, 196, 48, 0.3);
  }

  .gold-crystal {
    width: 24px;
    height: 24px;
  }

  .gold-number {
    font-family: 'VT323', monospace;
    font-size: 2rem;
    color: var(--gold);
    font-weight: 700;
  }

  .gold-pulse {
    animation: gold-pop 0.4s ease;
  }

  @keyframes gold-pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.3); color: var(--coral-light); }
    100% { transform: scale(1); }
  }

  .choice-label {
    font-family: 'VT323', monospace;
    font-size: 1.2rem;
    color: var(--parchment);
    letter-spacing: 0.1em;
    animation: fade-in 0.5s ease-out 0.4s both;
  }

  .cards-row {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
    width: 100%;
  }

  .reward-card {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    width: 180px;
    animation: card-slide-up 0.5s ease-out both;
    transition: transform 0.2s ease;
  }

  @keyframes card-slide-up {
    0% { opacity: 0; transform: translateY(40px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .reward-card:hover {
    transform: translateY(-8px) scale(1.03);
  }

  .reward-card.selected {
    animation: card-claim 0.6s ease forwards;
  }

  @keyframes card-claim {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1) translateY(-20px); opacity: 0.8; }
    100% { transform: scale(0.5) translateY(-100px); opacity: 0; }
  }

  .card-inner {
    background: var(--deep);
    border: 2px solid;
    border-radius: 10px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mana-cost {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--unit-blue);
    border-radius: 50%;
    font-family: 'VT323', monospace;
    font-size: 1.1rem;
    color: white;
    font-weight: 700;
  }

  .card-type {
    font-family: 'VT323', monospace;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-art {
    width: 100%;
    height: 100px;
    object-fit: contain;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    padding: 0.5rem;
  }

  .card-name {
    font-family: 'VT323', monospace;
    font-size: 1.2rem;
    color: var(--parchment);
    margin: 0;
    text-align: center;
  }

  .card-desc {
    font-size: 0.8rem;
    color: var(--parchment-dim);
    margin: 0;
    line-height: 1.4;
    text-align: center;
  }

  .claimed-msg {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    animation: fade-in 0.5s ease;
  }

  .claimed-icon {
    width: 60px;
    height: 60px;
    opacity: 0.7;
  }

  .claimed-msg p {
    font-family: 'VT323', monospace;
    font-size: 1.3rem;
    color: var(--gold);
    margin: 0;
  }

  .reward-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    animation: fade-in 0.5s ease-out 0.6s both;
  }

  .skip-btn {
    padding: 0.75rem 1.5rem;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment-dim);
    font-family: 'VT323', monospace;
    font-size: 1.1rem;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .skip-btn:hover {
    background: var(--coral);
    color: var(--parchment);
    border-color: var(--coral);
  }

  .continue-btn {
    padding: 0.75rem 2rem;
    background: var(--coral);
    border: none;
    color: var(--parchment);
    font-family: 'VT323', monospace;
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
    box-shadow: 0 4px 16px rgba(232, 93, 78, 0.3);
  }

  .continue-btn:hover {
    background: var(--coral-light);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(232, 93, 78, 0.4);
  }

  @keyframes fade-in {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .reward-content,
    .title-section,
    .gold-section,
    .reward-card,
    .reward-actions,
    .claimed-msg {
      animation: none;
    }
    .victory-title {
      animation: none;
    }
  }

  @media (max-width: 640px) {
    .reward-title {
      font-size: 1.4rem;
    }
    .cards-row {
      flex-direction: column;
      align-items: center;
    }
    .reward-card {
      width: 160px;
    }
    .reward-actions {
      flex-direction: column;
      width: 100%;
      align-items: center;
    }
    .skip-btn,
    .continue-btn {
      width: 200px;
    }
  }
</style>
