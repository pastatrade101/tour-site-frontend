<script lang="ts">
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { Cookie } from '@lucide/svelte';
  import { consent, setConsent } from '$lib/consent';

  let mounted = false;
  onMount(() => {
    mounted = true;
  });
</script>

{#if mounted && $consent === null}
  <div
    class="fixed bottom-3 left-3 right-3 z-[80] overflow-hidden rounded-[8px] border border-ink/10 bg-surface p-2.5 shadow-[0_18px_50px_rgba(57,61,50,0.22)] sm:left-4 sm:right-4 sm:p-3 md:left-6 md:right-auto md:w-[min(620px,calc(100vw-3rem))]"
    role="dialog"
    aria-label="Cookie consent"
    transition:fly={{ y: 18, duration: 220 }}
  >
    <div class="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex min-w-0 items-start gap-3">
        <span class="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-forest/10 text-forest dark:text-goldfinch-gold sm:h-9 sm:w-9"><Cookie size={17} /></span>
        <p class="min-w-0 break-words text-[13px] leading-5 text-ink/75 sm:text-sm sm:leading-6">
          We use analytics to improve trip planning.
          <a class="font-semibold text-forest underline dark:text-goldfinch-gold" href="/privacy">Privacy</a>.
        </p>
      </div>
      <div class="grid w-full min-w-0 gap-2 sm:w-auto sm:shrink-0 sm:grid-cols-2 md:flex">
        <button
          type="button"
          class="h-10 min-w-0 rounded-[8px] border border-ink/15 px-3 text-sm font-semibold text-ink/70 transition hover:bg-sand sm:px-4"
          on:click={() => setConsent('denied')}
        >
          Decline
        </button>
        <button
          type="button"
          class="h-10 min-w-0 rounded-[8px] bg-deep-green px-3 text-sm font-bold text-white transition hover:bg-forest sm:px-5"
          on:click={() => setConsent('granted')}
        >
          Accept
        </button>
      </div>
    </div>
  </div>
{/if}
