<script lang="ts">
  import {
    gameState,
    setScreen,
    setCurrentNode,
    setMapNodes,
    markNodeCleared,
  } from '../../lib/state.svelte';
  import type { MapNode, NodeType } from '../../lib/state.svelte';
  import { generateMap } from '../../game/map/mapGenerator';
  import { getRandomEncounter } from '../../game/enemies/encounterData';
  import { createAndRegisterOrchestrator } from '../../game/bridge';

  // Generate map if none exists
  if (gameState.run.mapNodes.length === 0) {
    setMapNodes(generateMap(gameState.run.seed));
    setCurrentNode('node-0-0');
  }

  function getNodeColor(type: NodeType): string {
    switch (type) {
      case 'combat':
        return '#e85d4e';
      case 'elite':
        return '#a855f7';
      case 'shop':
        return '#f4c430';
      case 'rest':
        return '#22c55e';
      case 'boss':
        return '#ef4444';
      case 'start':
        return '#3b82f6';
      default:
        return '#888';
    }
  }

  function getNodeLabel(type: NodeType): string {
    switch (type) {
      case 'combat':
        return 'Fight';
      case 'elite':
        return 'Elite';
      case 'shop':
        return 'Shop';
      case 'rest':
        return 'Rest';
      case 'boss':
        return 'Boss';
      case 'start':
        return 'Start';
      default:
        return '?';
    }
  }

  function handleNodeClick(node: MapNode) {
    if (!canVisit(node)) return;
    setCurrentNode(node.id);

    switch (node.type) {
      case 'combat':
      case 'elite':
      case 'boss': {
        // P0-1: Load encounter and start battle before screen transition
        const encounter = getRandomEncounter(node.type, gameState.run.act);
        if (!encounter) {
          console.error('No encounter found for node type:', node.type);
          return;
        }

        // Kick off the battle scene orchestrator (creates ECS entities, starts turn 1)
        createAndRegisterOrchestrator(
          gameState.run,
          encounter.enemies,
          encounter.id,
          encounter.rewardGold,
          encounter.rewardCards || [],
        );

        // Navigate to battle screen
        setScreen('battle');
        break;
      }
      case 'shop':
        setScreen('shop');
        break;
      case 'rest':
        setScreen('rest');
        break;
    }
  }

  function canVisit(node: MapNode): boolean {
    // Cannot re-enter cleared nodes
    if (node.cleared) return false;
    if (node.id === gameState.run.currentNodeId) return true;
    const current = gameState.run.mapNodes.find(
      (n) => n.id === gameState.run.currentNodeId
    );
    return current?.children.includes(node.id) ?? false;
  }

  let hoveredNode = $state<string | null>(null);
</script>

<div class="map-overlay">
  <div class="map-panel">
    <h2 class="map-title">THE DEEP CITY</h2>
    <div class="map-canvas">
      <svg class="map-lines" viewBox="0 0 400 600">
        {#each gameState.run.mapNodes as node}
          {#each node.children as childId}
            {@const child = gameState.run.mapNodes.find(
              (n) => n.id === childId
            )}
            {#if child}
              <line
                x1={node.x}
                y1={node.y}
                x2={child.x}
                y2={child.y}
                class="connection"
                class:active={node.visited && canVisit(child)}
              />
            {/if}
          {/each}
        {/each}
      </svg>

      <div class="map-nodes">
        {#each gameState.run.mapNodes as node}
          <button
            class="map-node"
            class:visited={node.visited}
            class:cleared={node.cleared}
            class:current={node.id === gameState.run.currentNodeId}
            class:reachable={canVisit(node)}
            style="left: {node.x}px; top: {node.y}px; --node-color: {getNodeColor(node.type)}"
            onclick={() => handleNodeClick(node)}
            onmouseenter={() => (hoveredNode = node.id)}
            onmouseleave={() => (hoveredNode = null)}
          >
            <div
              class="node-shape"
              style="background: {getNodeColor(node.type)}"
            ></div>
            {#if hoveredNode === node.id}
              <div class="node-tooltip">
                {getNodeLabel(node.type)}
              </div>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <div class="map-legend">
      <div class="legend-item">
        <span class="legend-dot" style="background: #e85d4e"></span> Combat
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #a855f7"></span> Elite
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #f4c430"></span> Shop
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #22c55e"></span> Rest
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #ef4444"></span> Boss
      </div>
    </div>
    <div class="map-info">
      <span class="hp-stat"
        >HP: {gameState.run.heroHp}/{gameState.run.heroMaxHp}</span
      >
      <span class="gold-stat">GOLD: {gameState.run.gold}</span>
    </div>
  </div>
</div>

<style>
  .map-overlay {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--abyss);
  }

  .map-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
  }

  .map-title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: var(--gold);
    margin: 0;
  }

  .map-canvas {
    position: relative;
    width: 400px;
    height: 600px;
    background: var(--deep);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    overflow: hidden;
  }

  .map-lines {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .connection {
    stroke: rgba(255, 255, 255, 0.08);
    stroke-width: 2;
  }

  .connection.active {
    stroke: rgba(255, 255, 255, 0.2);
  }

  .map-nodes {
    position: absolute;
    inset: 0;
  }

  .map-node {
    position: absolute;
    transform: translate(-50%, -50%);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .node-shape {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .map-node:hover .node-shape {
    transform: scale(1.3);
    box-shadow: 0 0 16px var(--node-color);
    border-color: var(--parchment);
  }

  .map-node.current .node-shape {
    border-color: var(--gold);
    box-shadow: 0 0 12px rgba(244, 196, 48, 0.5);
    animation: pulse 2s infinite;
  }

  .map-node.visited .node-shape {
    opacity: 0.6;
  }

  .map-node.cleared .node-shape {
    opacity: 0.3;
    filter: grayscale(1);
  }

  .map-node:not(.reachable) {
    opacity: 0.3;
    cursor: not-allowed;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.15);
    }
  }

  .node-tooltip {
    position: absolute;
    top: -28px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--deep);
    border: 1px solid var(--panel-border);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--parchment);
    white-space: nowrap;
    pointer-events: none;
    z-index: 10;
  }

  .map-legend {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    color: var(--parchment-dim);
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .map-info {
    display: flex;
    gap: 2rem;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--parchment-dim);
  }
</style>
