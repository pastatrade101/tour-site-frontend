<script lang="ts">
  import { onDestroy } from 'svelte';
  import { fly } from 'svelte/transition';
  import { ArrowUp } from '@lucide/svelte';

  // Show once the visitor has scrolled well past the hero.
  const THRESHOLD = 600;
  const IDLE_DELAY = 2200;
  let visible = false;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  const cancelHide = () => {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = undefined;
  };

  const scheduleHide = () => {
    cancelHide();
    hideTimer = setTimeout(() => (visible = false), IDLE_DELAY);
  };

  const onScroll = () => {
    if (window.scrollY <= THRESHOLD) {
      visible = false;
      cancelHide();
      return;
    }
    visible = true;
    scheduleHide();
  };

  const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  onDestroy(cancelHide);
</script>

<svelte:window on:scroll={onScroll} />

{#if visible}
  <button
    type="button"
    class="group fixed bottom-5 right-4 z-50 grid h-12 w-12 place-items-center rounded-full bg-goldfinch-gold text-heading shadow-[0_12px_34px_rgba(57,61,50,0.30)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 md:bottom-6 md:right-6"
    style="margin-bottom: env(safe-area-inset-bottom);"
    aria-label="Back to top"
    title="Back to top"
    transition:fly={{ y: 14, duration: 180 }}
    on:pointerenter={cancelHide}
    on:pointerleave={scheduleHide}
    on:focus={cancelHide}
    on:blur={scheduleHide}
    on:click={toTop}
  >
    <span class="relative grid h-full w-full place-items-center rounded-full bg-goldfinch-gold">
      <ArrowUp size={20} strokeWidth={2.8} class="transition-transform group-hover:-translate-y-0.5" />
    </span>
  </button>
{/if}
