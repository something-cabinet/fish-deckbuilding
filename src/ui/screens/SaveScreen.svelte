<script lang="ts">
  import { gameState, setScreen } from '../../lib/state.svelte';
  import { saveGameState, loadGameState, deleteSave, getAllSaveSlots } from '../../lib/persistence';
  import type { SaveData } from '../../lib/persistence';

  let saveSlots = $state<(SaveData | null)[]>([]);
  let deleteConfirmId = $state<number | null>(null);
  let saveMessage = $state('');

  // Load save slots on mount
  $effect(() => {
    saveSlots = getAllSaveSlots();
  });

  const autoSaveTime = $derived(
    gameState.run.act > 1 || gameState.run.gold > 0
      ? new Date().toLocaleString()
      : null
  );

  function formatChapter(act: number): string {
    const numerals = ['I', 'II', 'III', 'IV', 'V'];
    return `Chapter ${numerals[act - 1] ?? act}`;
  }

  function isOccupied(slot: SaveData | null): slot is SaveData {
    return slot !== null;
  }

  function saveToSlot(slotId: number) {
    saveGameState(slotId, gameState);
    saveSlots = getAllSaveSlots();
    saveMessage = `Saved to Slot ${slotId + 1}`;
    setTimeout(() => saveMessage = '', 2000);
  }

  function loadSlot(slotData: SaveData) {
    const saved = loadGameState(slotData.slot);
    if (!saved) return;
    Object.assign(gameState.run, saved.run);
    Object.assign(gameState.map, saved.map);
    saveMessage = `Loaded Slot ${slotData.slot + 1}`;
    setTimeout(() => {
      saveMessage = '';
      setScreen('map');
    }, 800);
  }

  function confirmDelete(slotId: number) {
    deleteConfirmId = slotId;
  }

  function deleteSlot(slotId: number) {
    deleteSave(slotId);
    saveSlots = getAllSaveSlots();
    deleteConfirmId = null;
    saveMessage = `Deleted Slot ${slotId + 1}`;
    setTimeout(() => saveMessage = '', 2000);
  }

  function cancelDelete() {
    deleteConfirmId = null;
  }

  function goBack() {
    setScreen('menu');
  }
</script>

<div class="save-screen">
  <div class="save-header">
    <button class="back-btn" onclick={goBack}>← BACK</button>
    <h1 class="save-title">SAVE / LOAD</h1>
    <div class="save-spacer"></div>
  </div>

  {#if saveMessage}
    <div class="save-toast">{saveMessage}</div>
  {/if}

  <div class="save-content">
    {#if autoSaveTime}
      <div class="autosave-indicator">
        <span class="autosave-dot"></span>
        <span class="autosave-text">Session started: {autoSaveTime}</span>
      </div>
    {/if}

    <div class="slots-list">
      {#each saveSlots as slot, i}
        <div class="slot-card" class:occupied={isOccupied(slot)}>
          <div class="slot-number">SLOT {i + 1}</div>

          {#if isOccupied(slot)}
            <div class="slot-details">
              <div class="slot-chapter">{formatChapter(slot.chapter)}</div>
              <div class="slot-stats">
                <span class="stat">
                  <img src="/sprites/ui/intent-attack.svg" alt="HP" class="stat-icon" />
                  {slot.heroHp}/{slot.heroMaxHp} HP
                </span>
                <span class="stat">
                  <img src="/sprites/ui/mana-crystal.svg" alt="Gold" class="stat-icon" />
                  {slot.gold}G
                </span>
                <span class="stat">{slot.deck.length} cards</span>
                <span class="stat zone">{slot.zone}</span>
              </div>
              <div class="slot-timestamp">{new Date(slot.timestamp).toLocaleString()}</div>
            </div>
            <div class="slot-actions">
              <button class="slot-btn load" onclick={() => loadSlot(slot)}>LOAD</button>
              <button class="slot-btn save" onclick={() => saveToSlot(slot.slot)}>OVERWRITE</button>
              {#if deleteConfirmId === slot.slot}
                <div class="delete-confirm">
                  <span>Are you sure?</span>
                  <button class="confirm-yes" onclick={() => deleteSlot(slot.slot)}>YES</button>
                  <button class="confirm-no" onclick={cancelDelete}>NO</button>
                </div>
              {:else}
                <button class="slot-btn delete" onclick={() => confirmDelete(slot.slot)}>DELETE</button>
              {/if}
            </div>
          {:else}
            <div class="slot-empty">
              <span class="empty-label">Empty</span>
              <button class="slot-btn save" onclick={() => saveToSlot(i)}>SAVE</button>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .save-screen {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: var(--abyss);
    z-index: 100;
    animation: screen-fade 0.3s ease;
  }

  @keyframes screen-fade {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  .save-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 2rem;
    background: var(--bg-panel);
    border-bottom: 1px solid var(--border-panel);
    gap: 1rem;
  }

  .back-btn {
    padding: 0.5rem 1rem;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
    font-family: 'VT323', monospace;
    font-size: 1.1rem;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .back-btn:hover {
    background: var(--coral);
    border-color: var(--coral);
  }

  .save-title {
    font-family: 'Press Start 2P', monospace;
    font-size: 1.1rem;
    color: var(--gold);
    margin: 0;
    text-align: center;
    flex: 1;
    letter-spacing: 0.05em;
  }

  .save-spacer {
    width: 80px;
  }

  .save-toast {
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.75rem 1.5rem;
    background: var(--deep);
    border: 1px solid var(--gold);
    border-radius: 6px;
    color: var(--gold);
    font-family: 'VT323', monospace;
    font-size: 1.2rem;
    z-index: 300;
    animation: toast-in 0.3s ease;
  }

  @keyframes toast-in {
    0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    100% { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  .save-content {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .autosave-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 6px;
  }

  .autosave-dot {
    width: 8px;
    height: 8px;
    background: var(--stat-def);
    border-radius: 50%;
    animation: dot-pulse 2s ease-in-out infinite;
  }

  @keyframes dot-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  .autosave-text {
    font-family: 'VT323', monospace;
    font-size: 0.9rem;
    color: var(--stat-def);
  }

  .slots-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    max-width: 600px;
  }

  .slot-card {
    background: var(--deep);
    border: 2px solid var(--panel-border);
    border-radius: 8px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transition: all 0.2s ease;
  }

  .slot-card.occupied {
    border-left: 4px solid var(--gold);
  }

  .slot-card:hover {
    transform: translateX(4px);
    border-color: var(--coral);
  }

  .slot-number {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.75rem;
    color: var(--parchment-dim);
    letter-spacing: 0.1em;
  }

  .slot-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .slot-chapter {
    font-family: 'VT323', monospace;
    font-size: 1.2rem;
    color: var(--parchment);
    font-weight: 700;
  }

  .slot-stats {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-family: 'VT323', monospace;
    font-size: 1rem;
    color: var(--parchment-dim);
  }

  .stat-icon {
    width: 16px;
    height: 16px;
    opacity: 0.7;
  }

  .stat.zone {
    color: var(--gold);
  }

  .slot-timestamp {
    font-size: 0.75rem;
    color: var(--parchment-dim);
    opacity: 0.5;
  }

  .slot-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .slot-btn {
    padding: 0.4rem 1rem;
    font-family: 'VT323', monospace;
    font-size: 1rem;
    cursor: pointer;
    border-radius: 4px;
    border: none;
    transition: all 0.2s ease;
  }

  .slot-btn.load {
    background: var(--unit-blue);
    color: white;
  }

  .slot-btn.load:hover {
    background: var(--unit-blue-dark);
    transform: translateY(-1px);
  }

  .slot-btn.save {
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
  }

  .slot-btn.save:hover {
    background: var(--coral);
    border-color: var(--coral);
    color: var(--parchment);
  }

  .slot-btn.delete {
    background: transparent;
    border: 1px solid var(--coral);
    color: var(--coral);
  }

  .slot-btn.delete:hover {
    background: var(--coral);
    color: var(--parchment);
  }

  .slot-empty {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .empty-label {
    font-family: 'VT323', monospace;
    font-size: 1.2rem;
    color: var(--parchment-dim);
    font-style: italic;
  }

  .delete-confirm {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'VT323', monospace;
    font-size: 1rem;
    color: var(--coral);
    animation: confirm-in 0.2s ease;
  }

  @keyframes confirm-in {
    0% { opacity: 0; transform: scale(0.9); }
    100% { opacity: 1; transform: scale(1); }
  }

  .confirm-yes,
  .confirm-no {
    padding: 0.25rem 0.6rem;
    font-family: 'VT323', monospace;
    font-size: 0.9rem;
    cursor: pointer;
    border-radius: 4px;
    border: none;
    transition: all 0.15s ease;
  }

  .confirm-yes {
    background: var(--coral);
    color: var(--parchment);
  }

  .confirm-no {
    background: var(--shallow);
    color: var(--parchment);
    border: 1px solid var(--panel-border);
  }

  .confirm-yes:hover,
  .confirm-no:hover {
    transform: translateY(-1px);
  }

  @media (prefers-reduced-motion: reduce) {
    .save-screen,
    .save-toast,
    .autosave-dot,
    .delete-confirm,
    .slot-card {
      animation: none;
      transition: none;
    }
  }

  @media (max-width: 640px) {
    .save-header {
      padding: 0.75rem 1rem;
    }
    .save-title {
      font-size: 0.75rem;
    }
    .save-spacer {
      width: 60px;
    }
    .slot-stats {
      gap: 0.5rem;
    }
    .slot-actions {
      flex-direction: column;
      align-items: stretch;
    }
    .slot-btn {
      width: 100%;
    }
  }
</style>
