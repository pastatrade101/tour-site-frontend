<script lang="ts">
  import { t } from '$lib/i18n/ui';
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
  <!-- Centred and lifted off the bottom edge so it is seen, without covering the
       middle of the page. The strip itself lets clicks through beside the card. -->
  <div
    class="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex justify-center px-4 sm:bottom-[9vh] lg:bottom-[12vh]"
    transition:fly={{ y: 24, duration: 240 }}
  >
    <div
      class="pointer-events-auto w-full max-w-[680px] overflow-hidden rounded-[12px] border border-ink/10 bg-surface p-4 shadow-[0_24px_70px_rgba(57,61,50,0.28)] sm:p-6"
      role="dialog"
      aria-label={$t('ui.cookie_consent')}
    >
      <div class="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div class="flex min-w-0 items-start gap-3.5">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-forest/10 text-forest dark:text-goldfinch-gold sm:h-12 sm:w-12"><Cookie size={22} /></span>
          <p class="min-w-0 break-words text-sm leading-6 text-ink/80 sm:text-[15px] sm:leading-7">{$t('ui.we_use_analytics_to_improve')} <a class="font-semibold text-forest underline dark:text-goldfinch-gold" href="/privacy">{$t('ui.privacy')}</a>.
          </p>
        </div>
        <div class="grid w-full min-w-0 grid-cols-2 gap-2.5 sm:flex sm:w-auto sm:shrink-0">
          <button
            type="button"
            class="h-11 min-w-0 rounded-[8px] border border-ink/15 px-4 text-sm font-semibold text-ink/70 transition hover:bg-canvas sm:px-5"
            on:click={() => setConsent('denied')}
          >{$t('ui.decline')}</button>
          <button
            type="button"
            class="h-11 min-w-0 rounded-[8px] bg-deep-green px-4 text-sm font-bold text-white transition hover:bg-forest sm:px-6"
            on:click={() => setConsent('granted')}
          >{$t('ui.accept')}</button>
        </div>
      </div>
    </div>
  </div>
{/if}
