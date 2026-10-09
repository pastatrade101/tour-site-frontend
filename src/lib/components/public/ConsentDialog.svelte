<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import { page } from '$app/stores';
  import { t } from '$lib/i18n/ui';
  import { localeFromPath, localizeHref } from '$lib/i18n';
  import { publicSettings, settingText } from '$lib/settings';
  import {
    consentChoice,
    consentDialogOpen,
    consentRegion,
    hasSavedChoice,
    saveConsentChoice,
    type ConsentChoice
  } from '$lib/consent';

  /*
   * The cookie dialog, shown on a first visit until a choice is saved.
   *
   * First screen: what the site uses cookies for, then "Manage settings" and
   * "Allow all". In the EU/EEA, the UK and Switzerland — where the law requires
   * refusing to be as easy as accepting — a "Continue without accepting" link
   * sits at the top as well, and nothing optional runs until a choice is made.
   * Elsewhere analytics and ad measurement are on by default and "Manage
   * settings" (or "Cookie settings" in the footer) switches them off.
   * Enquiry forms work whatever is chosen.
   *
   * Native <dialog> + showModal(): focus stays inside, Escape closes, and the
   * page behind is inert while it is open.
   */

  let dialog: HTMLDialogElement;
  let panel: 'intro' | 'settings' = 'intro';
  // Opened from the footer link rather than on arrival: a plain close is offered.
  let fromLink = false;
  let analytics = false;
  let marketing = false;
  let toast = '';
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let titleEl: HTMLElement | undefined;
  let returnFocus: Element | null = null;

  const optIn = consentRegion() === 'opt_in';
  $: locale = localeFromPath($page.url.pathname);
  $: privacyHref = settingText($publicSettings, 'privacy_policy_url') || localizeHref('/privacy', locale);
  // There is no separate cookie policy page: the cookie section lives in the
  // privacy policy, unless a cookie_policy_url setting says otherwise.
  $: cookieHref = settingText($publicSettings, 'cookie_policy_url') || privacyHref;

  /** Copy with {allow}/{manage}/{privacy}/{cookie} slots, as text and slot parts. */
  const parts = (copy: string): Array<{ text: string; slot?: string }> =>
    copy
      .split(/(\{[a-z]+\})/g)
      .filter(Boolean)
      .map((segment) => (/^\{[a-z]+\}$/.test(segment) ? { text: '', slot: segment.slice(1, -1) } : { text: segment }));

  const open = async (start: 'intro' | 'settings', viaLink = false) => {
    if (!dialog) return;
    // Show what is in force now, not what an abandoned earlier edit left behind.
    analytics = $consentChoice?.analytics ?? false;
    marketing = $consentChoice?.marketing ?? false;
    panel = start;
    fromLink = viaLink;
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

  const goTo = async (next: 'intro' | 'settings') => {
    panel = next;
    await tick();
    titleEl?.focus({ preventScroll: true });
  };

  // The footer's "Cookie settings" link.
  const unsubscribe = consentDialogOpen.subscribe((wanted) => {
    if (wanted && dialog && !dialog.open) void open('settings', true);
  });

  onMount(() => {
    // Until a choice is saved (or after it expires), ask once the page has painted.
    if (!hasSavedChoice()) {
      const timer = setTimeout(() => void open('intro'), 700);
      return () => clearTimeout(timer);
    }
  });

  onDestroy(() => {
    unsubscribe();
    clearTimeout(toastTimer);
    if (typeof document !== 'undefined') document.documentElement.style.overflow = '';
  });

  const pill =
    'inline-flex min-h-[50px] items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2';
  const outline = `${pill} border-2 border-deep-green text-deep-green hover:bg-canvas dark:border-white/40 dark:text-white`;
  const filled = `${pill} bg-deep-green text-white hover:bg-forest`;
</script>

<dialog
  bind:this={dialog}
  class="consent-dialog m-auto w-[min(640px,calc(100%-24px))] max-h-[calc(100dvh-24px)] overflow-auto rounded-[18px] border-0 bg-surface p-0 text-ink shadow-[0_24px_80px_rgba(21,37,30,0.30)]"
  aria-labelledby="consent-title"
  aria-describedby="consent-description"
  on:close={onClosed}
  on:cancel|preventDefault={close}
>
  <!-- Brand header, as the rest of the site shows it. -->
  <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-5 sm:px-8">
    <span class="flex items-center gap-3">
      <img src="/favicon1.png" alt="" class="h-10 w-10 object-contain sm:h-11 sm:w-11" />
      <span class="whitespace-nowrap font-serif text-lg font-semibold leading-tight text-heading sm:text-xl">Goldfinch Adventures</span>
    </span>
    {#if fromLink}
      <button
        type="button"
        class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink/55 transition hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
        aria-label={$t('consent.close')}
        on:click={close}
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    {:else if optIn && panel === 'intro'}
      <button
        type="button"
        class="ml-auto shrink-0 text-right text-[12px] font-semibold text-ink/60 underline underline-offset-4 transition hover:text-ink"
        on:click={() => save({ analytics: false, marketing: false })}
      >
        {$t('consent.continue_without')}
      </button>
    {/if}
  </div>
  <div class="h-px bg-ink/10"></div>

  {#if panel === 'intro'}
    <section class="px-6 py-6 sm:px-8" in:fly={{ y: 8, duration: 200 }}>
      <h2 id="consent-title" bind:this={titleEl} tabindex="-1" class="text-[19px] font-bold text-heading outline-none sm:text-xl">{$t('consent.banner_title')}</h2>
      <p id="consent-description" class="mt-2 text-[15px] leading-7 text-ink/80">{$t('consent.banner_text')}</p>
      <p class="mt-3 text-[15px] leading-7 text-ink/80">
        {#each parts($t('consent.banner_select')) as part}{#if part.slot === 'allow'}<strong class="font-semibold text-heading">{$t('consent.allow_all')}</strong>{:else if part.slot === 'manage'}<strong class="font-semibold text-heading">{$t('consent.manage')}</strong>{:else}{part.text}{/if}{/each}
      </p>
    </section>
    <div class="h-px bg-ink/10"></div>
    <div class="flex flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <button type="button" class={outline} on:click={() => goTo('settings')}>
        {$t('consent.manage')}
        <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
      </button>
      <button type="button" class={filled} on:click={() => save({ analytics: true, marketing: true })}>
        {$t('consent.allow_all')}
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
      </button>
    </div>
  {:else}
    <section class="px-6 py-5 sm:px-8" in:fly={{ y: 8, duration: 200 }}>
      {#if !fromLink}
        <button type="button" class="inline-flex min-h-[28px] items-center gap-1 text-xs text-ink/60 hover:text-ink" on:click={() => goTo('intro')}>
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
          {$t('consent.back')}
        </button>
      {/if}
      <h2 id="consent-title" bind:this={titleEl} tabindex="-1" class="mt-2 text-[19px] font-bold text-heading outline-none sm:text-xl">{$t('consent.settings_title')}</h2>
      <div id="consent-description" class="mt-3 grid gap-3 text-[14px] leading-6 text-ink/75">
        {#each ['consent.settings_p1', 'consent.settings_p2', 'consent.settings_p3', 'consent.settings_p4', 'consent.settings_p5'] as key}
          <p>{$t(key)}</p>
        {/each}
        <p>
          {#each parts($t('consent.settings_p6')) as part}{#if part.slot === 'privacy'}<a class="font-semibold text-forest underline underline-offset-2 dark:text-goldfinch-gold" href={privacyHref} on:click={close}>{$t('consent.privacy_policy')}</a>{:else if part.slot === 'cookie'}<a class="font-semibold text-forest underline underline-offset-2 dark:text-goldfinch-gold" href={cookieHref} on:click={close}>{$t('consent.cookie_policy')}</a>{:else}{part.text}{/if}{/each}
        </p>
      </div>

      <h3 class="mt-6 text-[15px] font-bold text-heading">{$t('consent.choose_title')}</h3>
      <div class="mt-3 divide-y divide-ink/10">
        <label class="grid cursor-default grid-cols-[22px_minmax(0,1fr)] gap-3 pb-4">
          <input type="checkbox" checked disabled class="mt-0.5 h-[18px] w-[18px] accent-[rgb(var(--c-deep-green))]" />
          <span>
            <span class="flex items-baseline justify-between gap-3"><strong class="text-sm text-heading">{$t('consent.essential')}</strong><span class="whitespace-nowrap text-[11px] font-semibold text-forest">{$t('consent.always_on')}</span></span>
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
    </section>
    <div class="h-px bg-ink/10"></div>
    <div class="flex flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <button type="button" class={outline} on:click={() => save({ analytics, marketing })}>{$t('consent.save')}</button>
      <button type="button" class={filled} on:click={() => save({ analytics: true, marketing: true })}>
        {$t('consent.allow_all')}
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
      </button>
    </div>
  {/if}
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
    <button type="button" class="shrink-0 rounded-[6px] bg-canvas px-3 py-2 text-xs font-semibold text-forest" on:click={() => open('settings', true)}>{$t('consent.review')}</button>
    <button type="button" class="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center text-ink/50" aria-label={$t('consent.dismiss')} on:click={() => (toast = '')}>
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
    </button>
  </div>
{/if}

<style>
  .consent-dialog::backdrop {
    background: rgb(24 44 36 / 0.42);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
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
