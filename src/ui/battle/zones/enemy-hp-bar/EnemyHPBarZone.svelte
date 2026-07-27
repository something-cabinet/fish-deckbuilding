<script lang="ts">
  import EnemyHPBar from '../../../battle/EnemyHPBar.svelte';
</script>

<div class="enemy-hp-bar-zone">
  <EnemyHPBar />
</div>

<style>
  .enemy-hp-bar-zone {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 1rem;
  }
</style>
