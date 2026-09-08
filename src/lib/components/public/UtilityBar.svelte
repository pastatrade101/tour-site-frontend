<script lang="ts">
  /**
   * The strip above the header: proof in the middle, switches on the right.
   *
   * The review line is the real summary — the rating is the average of the
   * approved reviews and the platforms are the ones those reviews actually came
   * from. Nothing is hardcoded, so naming a platform here always means there is
   * at least one review from it, and the whole line is absent until the summary
   * arrives (or stays absent if there are no reviews at all).
   */
  import { onMount } from 'svelte';
  import { ArrowDownToLine, CircleHelp, MessageCircle, Star } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { trackEvent } from '$lib/analytics';
  import { canInstall, promptInstall } from '$lib/pwa';
  import { DEFAULT_LOCALE } from '$lib/i18n';
  import CurrencySelector from './CurrencySelector.svelte';
  import LanguageSwitcher from './LanguageSwitcher.svelte';

  export let waHref = '';
  export let waLabel = 'WhatsApp';

  type Summary = { count: number; average: number; by_platform?: { platform: string; count: number }[] };

  let summary: Summary | null = null;

  onMount(async () => {
    try {
      const result = await api.reviews.summary();
      const data = result.data as Summary | null;
      if (data && Number(data.count) > 0) summary = data;
    } catch {
      // A missing summary costs the line, not the bar.
    }
  });

  /** "TripAdvisor, SafariBookings and Google" — however many there really are. */
  $: platforms = (summary?.by_platform ?? [])
    .map((entry) => String(entry.platform ?? '').trim())
    .filter(Boolean);
  $: platformText =
    platforms.length > 1
      ? `${platforms.slice(0, -1).join(', ')} and ${platforms[platforms.length - 1]}`
      : platforms[0] ?? '';
  $: rating = summary ? Math.round(Number(summary.average) * 10) / 10 : 0;
  /** Width of the gold overlay: 4.7 of 5 fills 94% of the row, not five stars. */
  $: fillPct = summary ? Math.max(0, Math.min(100, (Number(summary.average) / 5) * 100)) : 0;
</script>

<div class="w-full text-canvas">
  <div class="mx-auto grid h-8 w-full max-w-[1500px] grid-cols-[1fr_auto] items-center gap-4 px-4 text-[12px] lg:grid-cols-[1fr_auto_1fr]">
    <div class="hidden lg:block" aria-hidden="true"></div>

    <div class="flex min-w-0 items-center justify-start gap-2 lg:justify-center">
      {#if summary}
        <span class="relative inline-flex shrink-0 items-center" aria-hidden="true">
          <span class="inline-flex items-center gap-0.5 text-white/25">
            {#each Array(5) as _, i (i)}<Star size={12} class="fill-current" />{/each}
          </span>
          <!-- The partial star is a clipped copy of the same row, so a 4.7 looks
               like a 4.7 rather than being rounded up to a perfect score. -->
          <span class="absolute inset-y-0 left-0 overflow-hidden" style={`width:${fillPct}%`}>
            <span class="inline-flex items-center gap-0.5 text-goldfinch-gold">
              {#each Array(5) as _, i (i)}<Star size={12} class="fill-current" />{/each}
            </span>
          </span>
        </span>
        <span class="truncate">
          <span class="font-semibold">{rating}</span>
          {#if platformText}
            <!-- On the narrowest screens the rating stands alone: the short
                 label truncated against the switches and read as broken. -->
            <span class="hidden md:inline"> · Verified reviews across {platformText}</span>
            <span class="hidden sm:inline md:hidden"> · Verified reviews</span>
          {:else}
            <span> · {summary.count} verified review{summary.count === 1 ? '' : 's'}</span>
          {/if}
        </span>
      {/if}
    </div>

    <div class="flex items-center justify-end gap-3 whitespace-nowrap sm:gap-4">
      <LanguageSwitcher
        bare
        languages={($page.data as { languages?: never[] })?.languages ?? []}
        current={($page.data as { locale?: typeof DEFAULT_LOCALE })?.locale ?? DEFAULT_LOCALE}
        availableLocales={($page.data as { availableLocales?: string[] })?.availableLocales ?? null}
      />
      <span class="h-3 w-px bg-white/25" aria-hidden="true"></span>
      <CurrencySelector bare compact />

      <span class="hidden h-3 w-px bg-white/25 md:inline-block" aria-hidden="true"></span>
      <a class="hidden items-center gap-1.5 transition hover:text-white md:inline-flex" href="/contact">
        <CircleHelp size={13} />
        Need help?
      </a>

      {#if waHref}
        <span class="hidden h-3 w-px bg-white/25 md:inline-block" aria-hidden="true"></span>
        <a
          class="hidden items-center gap-1.5 transition hover:text-white md:inline-flex"
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={waLabel}
          on:click={() => trackEvent('whatsapp_click', { cta_location: 'utility_bar' })}
        >
          <MessageCircle size={13} />
          WhatsApp
        </a>
      {/if}

      {#if $canInstall}
        <span class="hidden h-3 w-px bg-white/25 lg:inline-block" aria-hidden="true"></span>
        <button
          type="button"
          class="hidden items-center gap-1.5 transition hover:text-white lg:inline-flex"
          on:click={() => promptInstall()}
        >
          <ArrowDownToLine size={13} /> Install app
        </button>
      {/if}
    </div>
  </div>
</div>
