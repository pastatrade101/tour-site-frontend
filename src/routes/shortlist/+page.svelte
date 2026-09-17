<script lang="ts">
  import { t } from '$lib/i18n/ui';
  import { ArrowRight, Heart, Trash2 } from '@lucide/svelte';
  import { revealHeading } from '$lib/animations';
  import Img from '$lib/components/public/Img.svelte';
  import { currency, formatUsd } from '$lib/currency';
  import { clearShortlist, removeShortlist, shortlist } from '$lib/shortlist';

  $: items = $shortlist;
</script>

<section class="container-shell py-12 md:py-16">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <p class="font-serif text-xl italic text-clay">{$t('ui.your_shortlist')}</p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-heading md:text-4xl" use:revealHeading>{$t('ui.saved_trips')}</h1>
      <p class="mt-2 text-ink/70">
        {items.length} saved {items.length === 1 ? 'trip' : 'trips'} · we'll keep these for your next visit.
      </p>
    </div>
    {#if items.length}
      <button class="text-sm font-semibold text-ink/70 transition hover:text-red-600" type="button" on:click={clearShortlist}>{$t('filter.clear_all')}</button>
    {/if}
  </div>

  {#if items.length}
    <div class="mt-8 grid gap-4">
      {#each items as item (item.slug)}
        <article class="flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-soft sm:flex-row">
          <a href={`/tours/${item.slug}`} class="aspect-[16/10] w-full shrink-0 overflow-hidden bg-skywash sm:aspect-auto sm:w-48">
            {#if item.image_url}
              <Img src={item.image_url} alt={item.title} width={420} sizes="(max-width: 640px) 92vw, 192px" className="h-full w-full object-cover" />
            {/if}
          </a>
          <div class="flex flex-1 flex-col p-5">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
              {#if item.destination}<span class="text-clay">{item.destination}</span>{/if}
              {#if item.duration_days}<span class="text-ink/70">{item.duration_days} days</span>{/if}
              {#if item.price_from}<span class="text-ink/70">from <span class="text-heading">{formatUsd(item.price_from, $currency)}</span></span>{/if}
            </div>
            <a href={`/tours/${item.slug}`} class="mt-1 text-lg font-extrabold text-heading hover:underline">{item.title}</a>
            <div class="mt-auto flex flex-wrap items-center gap-2.5 pt-4">
              <a class="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-goldfinch-gold px-4 text-sm font-bold text-heading transition hover:brightness-105" href={`/plan-my-trip?tour=${item.slug}`}>{$t('ui.plan_this_trip')}</a>
              <a class="inline-flex h-10 items-center justify-center rounded-xl border border-ink/15 bg-surface px-4 text-sm font-semibold text-ink/70 transition hover:bg-sand/60" href={`/tours/${item.slug}`}>{$t('filter.view_results')}</a>
              <button class="ml-auto grid h-10 w-10 place-items-center rounded-xl border border-red-200 bg-surface text-red-600 transition hover:bg-red-50" type="button" aria-label={$t('ui.remove_from_shortlist')} on:click={() => removeShortlist(item.slug)}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </article>
      {/each}
    </div>

    <div class="mt-8 rounded-2xl border border-forest/15 bg-forest/[0.04] p-6 text-center">
      <p class="text-lg font-bold text-heading">{$t('ui.ready_to_turn_these_into')}</p>
      <p class="mt-1 text-sm text-ink/70">{$t('ui.send_your_shortlist_to_a')}</p>
      <a class="mt-4 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-deep-green px-6 font-bold text-white transition hover:bg-forest" href="/plan-my-trip?from=shortlist">{$t('ui.plan_with_these_trips')}<ArrowRight size={18} />
      </a>
    </div>
  {:else}
    <div class="mt-8 rounded-2xl border border-dashed border-ink/15 bg-surface p-10 text-center">
      <span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-clay/10 text-clay"><Heart size={26} /></span>
      <p class="mt-4 text-lg font-bold text-heading">{$t('ui.no_saved_trips_yet')}</p>
      <p class="mt-1 text-sm text-ink/70">{$t('ui.tap_the_heart_on_any')}</p>
      <div class="mt-5 flex flex-wrap justify-center gap-3">
        <a class="inline-flex h-11 items-center gap-2 rounded-xl bg-goldfinch-gold px-5 font-bold text-heading" href="/tours">{$t('ui.browse_tours')}</a>
        <a class="inline-flex h-11 items-center gap-2 rounded-xl border border-ink/15 bg-surface px-5 font-semibold text-ink" href="/trip-finder">{$t('ui.try_the_trip_finder')}</a>
      </div>
    </div>
  {/if}
</section>
