<script lang="ts">
  import { setScreen } from '../../lib/state.svelte';

  let masterVolume = $state(80);
  let sfxVolume = $state(70);
  let musicVolume = $state(60);
  let isFullscreen = $state(false);

  function goBack() {
    setScreen('menu');
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      isFullscreen = true;
    } else {
      document.exitFullscreen().catch(() => {});
      isFullscreen = false;
    }
  }

  function formatPercent(value: number): string {
    return `${value}%`;
  }
</script>

<div class="settings-screen">
  <div class="settings-header">
    <button class="back-btn" onclick={goBack}>← BACK</button>
    <h1 class="settings-title">SETTINGS</h1>
    <div class="settings-spacer"></div>
  </div>

  <div class="settings-content">
    <div class="settings-panel">
      <h2 class="panel-label">AUDIO</h2>

      <div class="setting-row">
        <label class="setting-label" for="master">Master Volume</label>
        <div class="slider-group">
          <input
            id="master"
            type="range"
            min="0"
            max="100"
            bind:value={masterVolume}
            class="slider"
          />
          <span class="slider-value">{formatPercent(masterVolume)}</span>
        </div>
      </div>

      <div class="setting-row">
        <label class="setting-label" for="sfx">SFX Volume</label>
        <div class="slider-group">
          <input
            id="sfx"
            type="range"
            min="0"
            max="100"
            bind:value={sfxVolume}
            class="slider"
          />
          <span class="slider-value">{formatPercent(sfxVolume)}</span>
        </div>
      </div>

      <div class="setting-row">
        <label class="setting-label" for="music">Music Volume</label>
        <div class="slider-group">
          <input
            id="music"
            type="range"
            min="0"
            max="100"
            bind:value={musicVolume}
            class="slider"
          />
          <span class="slider-value">{formatPercent(musicVolume)}</span>
        </div>
      </div>
    </div>

    <div class="settings-panel">
      <h2 class="panel-label">DISPLAY</h2>

      <div class="setting-row toggle-row">
        <span class="setting-label">Fullscreen</span>
        <button
          class="toggle-btn"
          class:active={isFullscreen}
          onclick={toggleFullscreen}
          aria-label="Toggle fullscreen mode"
        >
          <span class="toggle-knob"></span>
        </button>
      </div>
    </div>

    <div class="settings-footer">
      <p class="version-info">Fish Debt Tactical RPG — v0.2.0</p>
    </div>
  </div>
</div>

<style>
  .settings-screen {
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

  .settings-header {
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

  .settings-title {
    font-family: 'Press Start 2P', monospace;
    font-size: 1.1rem;
    color: var(--gold);
    margin: 0;
    text-align: center;
    flex: 1;
    letter-spacing: 0.05em;
  }

  .settings-spacer {
    width: 80px;
  }

  .settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .settings-panel {
    width: 100%;
    max-width: 500px;
    background: var(--bg-panel);
    border: 1px solid var(--border-panel);
    border-radius: 8px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .panel-label {
    font-family: 'VT323', monospace;
    font-size: 1rem;
    color: var(--parchment-dim);
    letter-spacing: 0.2em;
    margin: 0 0 0.25rem;
    border-bottom: 1px solid var(--border-panel);
    padding-bottom: 0.5rem;
  }

  .setting-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .setting-row.toggle-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .setting-label {
    font-family: 'VT323', monospace;
    font-size: 1.1rem;
    color: var(--parchment);
  }

  .slider-group {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .slider {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    background: var(--shallow);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: var(--coral);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(232, 93, 78, 0.4);
    transition: transform 0.15s ease;
  }

  .slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    background: var(--coral-light);
  }

  .slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: var(--coral);
    border-radius: 50%;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 6px rgba(232, 93, 78, 0.4);
  }

  .slider-value {
    font-family: 'VT323', monospace;
    font-size: 1.1rem;
    color: var(--gold);
    min-width: 3ch;
    text-align: right;
  }

  .toggle-btn {
    width: 48px;
    height: 26px;
    background: var(--shallow);
    border: 2px solid var(--panel-border);
    border-radius: 13px;
    cursor: pointer;
    position: relative;
    transition: all 0.2s ease;
    padding: 0;
  }

  .toggle-btn.active {
    background: var(--coral);
    border-color: var(--coral);
  }

  .toggle-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    background: var(--parchment);
    border-radius: 50%;
    transition: transform 0.2s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }

  .toggle-btn.active .toggle-knob {
    transform: translateX(22px);
  }

  .settings-footer {
    margin-top: 1rem;
    text-align: center;
  }

  .version-info {
    font-family: 'VT323', monospace;
    font-size: 0.9rem;
    color: var(--parchment-dim);
    opacity: 0.5;
    letter-spacing: 0.1em;
  }

  @media (prefers-reduced-motion: reduce) {
    .settings-screen,
    .slider::-webkit-slider-thumb,
    .toggle-knob,
    .toggle-btn {
      animation: none;
      transition: none;
    }
  }

  @media (max-width: 640px) {
    .settings-header {
      padding: 0.75rem 1rem;
    }
    .settings-title {
      font-size: 0.75rem;
    }
    .settings-spacer {
      width: 60px;
    }
    .settings-content {
      padding: 1rem;
    }
    .settings-panel {
      padding: 1rem;
    }
  }
</style>
