<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  // Generic ApexCharts wrapper. Loaded only in the browser (the lib touches window).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export let options: Record<string, any> = {};

  let el: HTMLDivElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chart: any = null;
  let mounted = false;

  onMount(async () => {
    const ApexCharts = (await import('apexcharts')).default;
    chart = new ApexCharts(el, options);
    await chart.render();
    mounted = true;
  });

  onDestroy(() => {
    try { chart?.destroy?.(); } catch { /* ignore */ }
  });

  // Re-render when options (incl. series) change after the first paint.
  $: if (mounted && chart && options) {
    try { chart.updateOptions(options, false, true); } catch { /* ignore */ }
  }
</script>

<div bind:this={el}></div>
