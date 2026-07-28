<script lang="ts">
  import { TileType } from '../../game/grid/GridTypes';

  interface Props {
    x: number;
    y: number;
    /** Tile type string from GridState */
    tileType?: string;
    /** Unit occupying this tile */
    occupiedBy?: {
      id: string;
      type: string;
      faction: string;
      isAlive: boolean;
    } | null;
    /** Highlight overlay kind */
    highlight?: 'movement' | 'attackable' | 'target' | 'selected' | 'threat';
    /** Click handler */
    onclick?: () => void;
  }

  let {
    x,
    y,
    tileType = 'floor',
    occupiedBy = null,
    highlight = undefined,
    onclick,
  }: Props = $props();

  let tileColor = $derived(() => {
    // Determine tile color from type
    switch (tileType) {
      case 'wall': return '#1a1a2e';
      case 'water': return '#1e3a5f';
      case 'sand': return '#c2a55b';
      case 'stone': return '#4a5568';
      default: return '#2a3a4a'; // floor
    }
  });

  let isMovableHighlight = $derived(highlight === 'movement');
  let isAttackableHighlight = $derived(highlight === 'attackable');
  let isTargetHighlight = $derived(highlight === 'target');

  let unitLabel = $derived(() => {
    if (!occupiedBy || !occupiedBy.isAlive) return null;
    if (occupiedBy.type === 'hero') return '🧜';
    if (occupiedBy.type === 'enemy') return '👾';
    if (occupiedBy.type === 'summon') return '🐟';
    return null;
  });

  let unitColor = $derived(() => {
    if (!occupiedBy || !occupiedBy.isAlive) return null;
    if (occupiedBy.faction === 'player') return '#22c55e';
    return '#e85d4e';
  });

  let isDead = $derived(occupiedBy && !occupiedBy.isAlive);
</script>

<button
  class="grid-tile"
  class:movable={isMovableHighlight}
  class:attackable={isAttackableHighlight}
  class:targetable={isTargetHighlight}
  class:dead={isDead}
  class:occupied={!!occupiedBy && occupiedBy.isAlive}
  class:enemy-unit={occupiedBy?.faction === 'enemy' && occupiedBy?.isAlive}
  class:hero-unit={occupiedBy?.type === 'hero' && occupiedBy?.isAlive}
  class:summon-unit={occupiedBy?.type === 'summon' && occupiedBy?.isAlive}
  style="--tile-color: {tileColor()}"
  onclick={onclick}
  aria-label="Tile ({x},{y}){occupiedBy ? ` occupied by ${occupiedBy.type}` : ''}"
  tabindex="0"
>
  {#if occupiedBy && occupiedBy.isAlive}
    <div class="unit-icon" style="--unit-color: {unitColor()}" role="img">
      {#if occupiedBy.type === 'hero'}
        <span class="hero-sprite">⬡</span>
      {:else if occupiedBy.type === 'enemy'}
        <span class="enemy-sprite">⬢</span>
      {:else if occupiedBy.type === 'summon'}
        <span class="summon-sprite">⬥</span>
      {/if}
    </div>
  {/if}

  {#if isMovableHighlight}
    <div class="highlight-overlay movement-indicator">
      <div class="corner-brackets">
        <span class="bracket tl"></span>
        <span class="bracket tr"></span>
        <span class="bracket bl"></span>
        <span class="bracket br"></span>
      </div>
    </div>
  {/if}

  {#if isAttackableHighlight || isTargetHighlight}
    <div class="highlight-overlay" class:attack-highlight={isAttackableHighlight} class:target-highlight={isTargetHighlight}>
      {#if isAttackableHighlight}
        <div class="attack-indicator">✕</div>
      {:else if isTargetHighlight}
        <div class="target-indicator">◉</div>
      {/if}
    </div>
  {/if}
</button>

<style>
  .grid-tile {
    position: relative;
    width: 100%;
    height: 100%;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: var(--tile-color, #2a3a4a);
    cursor: default;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, transform 0.1s ease;
    outline: none;
    border-radius: 2px;
    box-sizing: border-box;
  }

  .grid-tile:hover {
    filter: brightness(1.15);
    z-index: 2;
  }

  .grid-tile:focus-visible {
    box-shadow: 0 0 0 2px rgba(244, 196, 48, 0.5);
  }

  .grid-tile.occupied {
    border-color: rgba(255, 255, 255, 0.12);
  }

  .grid-tile.enemy-unit {
    border-color: rgba(232, 93, 78, 0.25);
  }

  .grid-tile.hero-unit {
    border-color: rgba(34, 197, 94, 0.25);
  }

  .grid-tile.dead {
    opacity: 0.35;
  }

  /* ── Highlight states ── */

  .grid-tile.movable {
    cursor: pointer;
  }

  .grid-tile.movable:hover {
    background: rgba(34, 197, 94, 0.15);
    border-color: rgba(34, 197, 94, 0.4);
  }

  .grid-tile.attackable {
    cursor: pointer;
  }

  .grid-tile.attackable:hover {
    background: rgba(232, 93, 78, 0.15);
    border-color: rgba(232, 93, 78, 0.4);
  }

  .grid-tile.targetable {
    cursor: pointer;
  }

  .grid-tile.targetable:hover {
    background: rgba(244, 196, 48, 0.12);
    border-color: rgba(244, 196, 48, 0.4);
  }

  /* ── Unit rendering ── */

  .unit-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    z-index: 3;
    position: relative;
    color: var(--unit-color);
  }

  .hero-sprite {
    font-size: 1.6rem;
    line-height: 1;
    filter: drop-shadow(0 0 6px rgba(34, 197, 94, 0.4));
  }

  .enemy-sprite {
    font-size: 1.5rem;
    line-height: 1;
    filter: drop-shadow(0 0 6px rgba(232, 93, 78, 0.4));
    animation: enemy-pulse 2s ease-in-out infinite;
  }

  .summon-sprite {
    font-size: 1.3rem;
    line-height: 1;
    filter: drop-shadow(0 0 4px rgba(96, 165, 250, 0.4));
    color: #60a5fa;
  }

  @keyframes enemy-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }

  /* ── Highlight overlays ── */

  .highlight-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 4;
  }

  .movement-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .corner-brackets {
    position: absolute;
    inset: 0;
  }

  .bracket {
    position: absolute;
    width: 8px;
    height: 8px;
    border-color: rgba(34, 197, 94, 0.5);
    border-style: solid;
  }

  .bracket.tl { top: 3px; left: 3px; border-width: 2px 0 0 2px; }
  .bracket.tr { top: 3px; right: 3px; border-width: 2px 2px 0 0; }
  .bracket.bl { bottom: 3px; left: 3px; border-width: 0 0 2px 2px; }
  .bracket.br { bottom: 3px; right: 3px; border-width: 0 2px 2px 0; }

  .attack-highlight {
    background: rgba(232, 93, 78, 0.12);
  }

  .target-highlight {
    background: rgba(244, 196, 48, 0.12);
    animation: target-pulse 1s ease-in-out infinite;
  }

  @keyframes target-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.9; }
  }

  .attack-indicator {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: rgba(232, 93, 78, 0.5);
    font-weight: 900;
  }

  .target-indicator {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    color: rgba(244, 196, 48, 0.6);
  }
</style>
