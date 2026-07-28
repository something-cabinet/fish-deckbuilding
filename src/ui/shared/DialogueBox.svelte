<script lang="ts">
  import { gameState, DIALOGUES, advanceDialogue, endDialogue } from '../../lib/state.svelte';

  // Derive current scene and line from global dialogue state
  const dialogueState = $derived(gameState.activeDialogue);
  const scene = $derived(dialogueState ? DIALOGUES[dialogueState.sceneId] : null);
  const currentLine = $derived(
    scene && dialogueState ? scene.lines[dialogueState.lineIndex] : null,
  );
  const isLastLine = $derived(
    dialogueState && scene ? dialogueState.lineIndex >= scene.lines.length - 1 : false,
  );
  const hasChoices = $derived(scene && scene.choices && scene.choices.length > 0);

  let displayedChars = $state(0);
  let typewriterDone = $state(false);

  const displayText = $derived(
    currentLine ? currentLine.text.slice(0, displayedChars) : '',
  );

  // Typewriter effect — resets when line changes
  $effect(() => {
    if (!currentLine) return;
    displayedChars = 0;
    typewriterDone = false;
    const text = currentLine.text;
    const interval = setInterval(() => {
      if (displayedChars < text.length) {
        displayedChars++;
      } else {
        clearInterval(interval);
        typewriterDone = true;
      }
    }, 30);
    return () => clearInterval(interval);
  });

  function handleAdvance() {
    if (!dialogueState || !scene || !currentLine) return;

    // If typewriter still running, skip to end
    if (!typewriterDone) {
      displayedChars = currentLine.text.length;
      typewriterDone = true;
      return;
    }

    // If we have choices at the last line, wait for button click
    if (isLastLine && hasChoices) return;

    // Advance to next line or end dialogue
    if (!isLastLine) {
      advanceDialogue();
    } else {
      endDialogue();
    }
  }

  function handleChoice() {
    // For now, any choice ends the dialogue
    endDialogue();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAdvance();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      endDialogue();
    }
  }
</script>

{#if currentLine && scene}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="dialogue-overlay"
    role="button"
    tabindex="0"
    onclick={handleAdvance}
    onkeydown={handleKeydown}
  >
    <div
      class="dialogue-box"
      role="dialog"
      aria-modal="true"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="dialogue-portrait">
        <img
          src={currentLine.portrait ?? '/sprites/hero/guppy-idle.svg'}
          alt={currentLine.speaker}
          class="portrait-img"
        />
        <span class="speaker-name">{currentLine.speaker}</span>
      </div>

      <div class="dialogue-content">
        <p class="dialogue-text">
          {displayText}<span class="cursor" class:blink={typewriterDone}></span>
        </p>

        {#if typewriterDone && isLastLine && hasChoices}
          <div class="choice-list">
            {#each scene.choices ?? [] as choice}
              <button class="choice-btn" onclick={handleChoice}>
                {choice.text}
              </button>
            {/each}
          </div>
        {:else if typewriterDone && !hasChoices}
          <div class="continue-hint">
            <span class="hint-text">Click to continue</span>
            <span class="hint-arrow">▶</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .dialogue-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 2rem;
    background: rgba(10, 22, 40, 0.3);
    animation: fade-in 0.3s ease;
    cursor: pointer;
  }

  @keyframes fade-in {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  .dialogue-box {
    display: flex;
    gap: 1rem;
    background: var(--dialogue-bg, rgba(10, 22, 40, 0.92));
    border: 2px solid var(--panel-border);
    border-radius: 12px;
    padding: 1.25rem;
    max-width: 800px;
    width: 100%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    animation: box-slide 0.4s ease-out;
    cursor: default;
  }

  @keyframes box-slide {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .dialogue-portrait {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .portrait-img {
    width: 80px;
    height: 80px;
    border-radius: 8px;
    border: 2px solid var(--gold);
    background: var(--deep);
    padding: 4px;
    object-fit: contain;
  }

  .speaker-name {
    font-family: 'VT323', monospace;
    font-size: 1rem;
    color: var(--gold);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .dialogue-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 100px;
  }

  .dialogue-text {
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 1.1rem;
    line-height: 1.6;
    color: var(--parchment);
    margin: 0;
    min-height: 3.2em;
  }

  .cursor {
    display: inline-block;
    width: 2px;
    height: 1.1em;
    background: var(--gold);
    margin-left: 2px;
    vertical-align: text-bottom;
  }

  .cursor.blink {
    animation: cursor-blink 1s step-end infinite;
  }

  @keyframes cursor-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  .continue-hint {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
    animation: hint-pulse 1.5s ease-in-out infinite;
  }

  @keyframes hint-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  .hint-text {
    font-family: 'VT323', monospace;
    font-size: 0.9rem;
    color: var(--parchment-dim);
    letter-spacing: 0.05em;
  }

  .hint-arrow {
    font-size: 0.7rem;
    color: var(--gold);
    animation: arrow-bob 1s ease-in-out infinite;
  }

  @keyframes arrow-bob {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(4px); }
  }

  .choice-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.75rem;
    animation: choices-in 0.3s ease;
  }

  @keyframes choices-in {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .choice-btn {
    padding: 0.6rem 1.25rem;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
    font-family: 'VT323', monospace;
    font-size: 1.1rem;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .choice-btn:hover {
    background: var(--coral);
    border-color: var(--coral);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(232, 93, 78, 0.3);
  }

  @media (prefers-reduced-motion: reduce) {
    .dialogue-overlay,
    .dialogue-box,
    .continue-hint,
    .hint-arrow,
    .choice-list,
    .cursor.blink {
      animation: none;
    }
  }

  @media (max-width: 640px) {
    .dialogue-overlay {
      padding: 0.75rem;
    }
    .dialogue-box {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .dialogue-portrait {
      flex-direction: row;
      gap: 0.75rem;
    }
    .portrait-img {
      width: 48px;
      height: 48px;
    }
    .dialogue-text {
      font-size: 1rem;
    }
    .choice-list {
      justify-content: center;
    }
  }
</style>
