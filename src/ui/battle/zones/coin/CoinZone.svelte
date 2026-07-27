<script lang="ts">
  import CoinDisplay from '../../../battle/CoinDisplay.svelte';
</script>

<div class="coin-zone">
  <CoinDisplay />
</div>

<style>
  .coin-zone {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 160px;
    max-width: 200px;
  }
</style>
