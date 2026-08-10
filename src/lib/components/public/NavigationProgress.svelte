<script lang="ts">
  /**
   * A thin progress bar across the top of the page while a navigation is in
   * flight.
   *
   * Destination and safari-style pages load through the server, and their
   * loaders may need several API calls before the new page can render. Until that
   * finished, a click on a mega-menu link produced no visible change at all —
   * so people clicked again, assuming the first one had missed.
   *
   * The navbar also preloads route data on hover/tap; this bar covers the cases
   * where a slow SSR loader still has real work to finish after the click.
   */
  import { onDestroy } from 'svelte';
  import { navigating } from '$app/stores';

  let visible = false;
  let finishing = false;
  let finishTimer: ReturnType<typeof setTimeout> | undefined;

  $: {
    clearTimeout(finishTimer);
    if ($navigating) {
      visible = true;
      finishing = false;
    } else if (visible) {
      finishing = true;
      finishTimer = setTimeout(() => {
        visible = false;
        finishing = false;
      }, 220);
    }
  }

  onDestroy(() => clearTimeout(finishTimer));
</script>

{#if visible}
  <div
    class:finishing
    class="progress pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px] overflow-hidden bg-transparent"
    role="status"
    aria-live="polite"
    aria-label="Loading the next page"
  >
    <span class="bar block h-full w-full bg-goldfinch-gold"></span>
  </div>
{/if}

<style>
  /* Creeps forward without ever reaching the end — it cannot know how long the
     load will take, and a bar that completes early then waits is worse than one
     that keeps moving. */
  .bar {
    transform-origin: 0 50%;
    animation: creep 7s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
    box-shadow: 0 0 16px rgb(var(--c-goldfinch-gold) / 0.55);
  }

  .progress.finishing {
    opacity: 0;
    transition: opacity 180ms ease-out 40ms;
  }

  .progress.finishing .bar {
    animation: none;
    transform: scaleX(1);
    transition: transform 160ms ease-out;
  }

  @keyframes creep {
    0% {
      transform: scaleX(0);
    }
    20% {
      transform: scaleX(0.35);
    }
    50% {
      transform: scaleX(0.7);
    }
    100% {
      transform: scaleX(0.94);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bar {
      animation: none;
      transform: scaleX(0.5);
    }
  }
</style>
