<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import { page } from '$app/stores';
  import { t } from '$lib/i18n/ui';
  import { localeFromPath, localizeHref } from '$lib/i18n';
  import { publicSettings, settingText } from '$lib/settings';
  import { consentChoice, consentDialogOpen, saveConsentChoice, type ConsentChoice } from '$lib/consent';

  /*
   * The cookie choice, as a centred dialog. "Accept all" and "Essential only"
   * sit side by side at the same size — declining is exactly as easy as
   * accepting, and nothing optional is pre-ticked. Closing without choosing
   * changes nothing (everything optional stays off) and the dialog returns on
   * the next visit. Enquiry forms work whatever is chosen.
   *
   * Native <dialog> + showModal(): focus stays inside, Escape closes, and the
   * page behind is inert while it is open.
   */

  let dialog: HTMLDialogElement;
  let panel: 'intro' | 'settings' = 'intro';
  let analytics = false;
  let marketing = false;
  let toast = '';
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let titleEl: HTMLElement | undefined;
  let returnFocus: Element | null = null;

  $: locale = localeFromPath($page.url.pathname);
  $: privacyHref = settingText($publicSettings, 'privacy_policy_url') || localizeHref('/privacy', locale);

  const open = async (start: 'intro' | 'settings') => {
    if (!dialog) return;
    // Show what is saved, not what an abandoned earlier edit left behind.
    analytics = $consentChoice?.analytics ?? false;
    marketing = $consentChoice?.marketing ?? false;
    panel = start;
    toast = '';
    if (!dialog.open) {
      returnFocus = document.activeElement;
      dialog.showModal();
      document.documentElement.style.overflow = 'hidden';
    }
    await tick();
    titleEl?.focus({ preventScroll: true });
  };

  const close = () => {
    if (dialog?.open) dialog.close();
  };

  const onClosed = () => {
    document.documentElement.style.overflow = '';
    consentDialogOpen.set(false);
    if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
  };

  const save = (choice: ConsentChoice) => {
    saveConsentChoice(choice);
    close();
    toast = choice.analytics || choice.marketing ? $t('consent.toast_some') : $t('consent.toast_essential');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = ''), 7000);
  };

  const showSettings = async () => {
    panel = 'settings';
    await tick();
    titleEl?.focus({ preventScroll: true });
  };
  const showIntro = async () => {
    panel = 'intro';
    await tick();
    titleEl?.focus({ preventScroll: true });
  };

  // The footer's "Cookie settings" link.
  const unsubscribe = consentDialogOpen.subscribe((wanted) => {
    if (wanted && dialog && !dialog.open) void open('settings');
  });

  onMount(() => {
    // First visit (or the saved choice has expired): ask, once the page has painted.
    if ($consentChoice === null) {
      const timer = setTimeout(() => void open('intro'), 700);
      return () => clearTimeout(timer);
    }
  });

  onDestroy(() => {
    unsubscribe();
    clearTimeout(toastTimer);
    if (typeof document !== 'undefined') document.documentElement.style.overflow = '';
  });

  const btn = 'min-h-[48px] rounded-[8px] px-3 py-2.5 text-sm font-bold leading-snug transition focus:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2';
  const primary = `${btn} bg-deep-green text-white hover:bg-forest`;
  const secondary = `${btn} border border-deep-green text-deep-green hover:bg-canvas dark:border-white/30 dark:text-white`;
</script>

<dialog
  bind:this={dialog}
  class="consent-dialog m-auto w-[min(856px,calc(100%-24px))] max-h-[calc(100dvh-24px)] overflow-auto rounded-[18px] border-0 bg-surface p-0 text-ink shadow-[0_28px_100px_rgba(21,37,30,0.28)] md:rounded-[22px]"
  aria-labelledby="consent-title"
  aria-describedby="consent-description"
  on:close={onClosed}
  on:cancel|preventDefault={close}
>
  <div class="grid md:grid-cols-[258px_minmax(0,1fr)]">
    <!-- Real photography from the site; decorative, so hidden from screen readers. -->
    <aside class="relative hidden min-h-[500px] overflow-hidden bg-deep-green md:block" aria-hidden="true">
      <img src="/images/og-default.jpg" alt="" class="absolute inset-0 h-full w-full object-cover object-[20%_center]" />
      <div class="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/70"></div>
      <div class="relative flex items-center gap-2.5 p-6">
        <img src="/favicon1.png" alt="" class="h-8 w-8 object-contain" />
        <span class="font-serif text-lg font-semibold text-white">Goldfinch Adventures</span>
      </div>
      <p class="absolute inset-x-6 bottom-7 font-serif text-[26px] leading-tight text-white">{$t('consent.art_caption')}</p>
    </aside>

    <div class="relative min-w-0 px-6 pb-6 pt-8 sm:px-9 sm:pt-9">
      <button
        type="button"
        class="absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-full text-ink/55 transition hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
        aria-label={$t('consent.close')}
        on:click={close}
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>

      <p class="flex items-center gap-2 pr-8 text-[10px] font-bold uppercase tracking-[0.18em] text-forest dark:text-goldfinch-gold">
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></svg>
        {$t('consent.kicker')}
      </p>

      {#if panel === 'intro'}
        <section in:fly={{ y: 8, duration: 200 }}>
          <h2 id="consent-title" bind:this={titleEl} tabindex="-1" class="mt-5 font-serif text-[30px] leading-[1.12] text-heading outline-none sm:text-[36px]">{$t('consent.title')}</h2>
          <p id="consent-description" class="mt-4 text-sm leading-7 text-ink/70">{$t('consent.description')}</p>
          <p class="mt-5 flex items-center gap-2 text-[13px] font-semibold text-forest dark:text-goldfinch-gold">
            <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>
            {$t('consent.benefit')}
          </p>
          <div class="mt-6 grid grid-cols-2 gap-2.5">
            <button type="button" class={primary} on:click={() => save({ analytics: true, marketing: true })}>{$t('consent.accept_all')}</button>
            <button type="button" class={secondary} on:click={() => save({ analytics: false, marketing: false })}>{$t('consent.essential_only')}</button>
          </div>
          <button type="button" class="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 text-[13px] font-semibold text-forest underline-offset-4 hover:underline dark:text-goldfinch-gold" on:click={showSettings}>
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            {$t('consent.choose')}
          </button>
        </section>
      {:else}
        <section in:fly={{ y: 8, duration: 200 }}>
          <button type="button" class="inline-flex min-h-[28px] items-center gap-1 text-xs text-ink/60 hover:text-ink" on:click={showIntro}>
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
            {$t('consent.back')}
          </button>
          <h2 id="consent-title" bind:this={titleEl} tabindex="-1" class="mt-3 font-serif text-[28px] leading-[1.12] text-heading outline-none sm:text-[31px]">{$t('consent.settings_title')}</h2>
          <p id="consent-description" class="mt-3 text-[13px] leading-6 text-ink/70">{$t('consent.settings_intro')}</p>

          <div class="mt-5 divide-y divide-ink/10">
            <label class="grid cursor-default grid-cols-[22px_minmax(0,1fr)] gap-3 pb-4">
              <input type="checkbox" checked disabled class="mt-0.5 h-[18px] w-[18px] accent-[rgb(var(--c-deep-green))]" />
              <span>
                <span class="flex items-baseline justify-between gap-3"><strong class="text-sm text-heading">{$t('consent.essential')}</strong><span class="whitespace-nowrap text-[10px] font-semibold text-forest">{$t('consent.always_on')}</span></span>
                <span class="mt-1 block text-xs leading-5 text-ink/65">{$t('consent.essential_detail')}</span>
              </span>
            </label>
            <label class="grid cursor-pointer grid-cols-[22px_minmax(0,1fr)] gap-3 py-4">
              <input type="checkbox" bind:checked={analytics} class="mt-0.5 h-[18px] w-[18px] cursor-pointer accent-[rgb(var(--c-deep-green))]" />
              <span>
                <strong class="text-sm text-heading">{$t('consent.analytics')}</strong>
                <span class="mt-1 block text-xs leading-5 text-ink/65">{$t('consent.analytics_detail')}</span>
              </span>
            </label>
            <label class="grid cursor-pointer grid-cols-[22px_minmax(0,1fr)] gap-3 pt-4">
              <input type="checkbox" bind:checked={marketing} class="mt-0.5 h-[18px] w-[18px] cursor-pointer accent-[rgb(var(--c-deep-green))]" />
              <span>
                <strong class="text-sm text-heading">{$t('consent.marketing')}</strong>
                <span class="mt-1 block text-xs leading-5 text-ink/65">{$t('consent.marketing_detail')}</span>
              </span>
            </label>
          </div>
          <p class="mt-4 rounded-[8px] bg-canvas px-3.5 py-2.5 text-[11px] leading-5 text-ink/65">{$t('consent.without_consent')}</p>

          <div class="mt-5 grid grid-cols-2 gap-2.5">
            <button type="button" class={primary} on:click={() => save({ analytics, marketing })}>{$t('consent.save')}</button>
            <button type="button" class={secondary} on:click={() => save({ analytics: true, marketing: true })}>{$t('consent.accept_all')}</button>
          </div>
        </section>
      {/if}

      <div class="mt-5 flex flex-wrap justify-between gap-3 border-t border-ink/10 pt-4 text-[11px] leading-5 text-ink/55">
        <span>{$t('consent.change_anytime')}</span>
        <a class="font-semibold text-forest underline underline-offset-2 dark:text-goldfinch-gold" href={privacyHref} on:click={close}>{$t('consent.privacy_link')}</a>
      </div>
    </div>
  </div>
</dialog>

{#if toast}
  <div
    class="fixed bottom-5 left-1/2 z-[90] flex w-[min(560px,calc(100%-32px))] -translate-x-1/2 items-center gap-3 rounded-[14px] border border-ink/10 bg-surface py-4 pl-4 pr-11 shadow-[0_12px_55px_rgba(21,51,32,0.18)]"
    transition:fly={{ y: 16, duration: 220 }}
  >
    <svg viewBox="0 0 24 24" class="h-6 w-6 shrink-0 text-forest" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>
    <div class="min-w-0 flex-1" role="status" aria-live="polite">
      <strong class="block text-[13px] text-heading">{$t('consent.toast_title')}</strong>
      <p class="mt-0.5 text-xs leading-5 text-ink/65">{toast}</p>
    </div>
    <button type="button" class="shrink-0 rounded-[6px] bg-canvas px-3 py-2 text-xs font-semibold text-forest" on:click={() => open('settings')}>{$t('consent.review')}</button>
    <button type="button" class="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center text-ink/50" aria-label={$t('consent.dismiss')} on:click={() => (toast = '')}>
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
    </button>
  </div>
{/if}

<style>
  .consent-dialog::backdrop {
    background: rgb(24 44 36 / 0.42);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }
  .consent-dialog[open] {
    animation: consent-enter 0.22s ease-out;
  }
  @keyframes consent-enter {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .consent-dialog[open] {
      animation: none;
    }
  }
</style>
