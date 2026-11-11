<script lang="ts">
  import { locale, t } from '$lib/i18n/ui';
  /**
   * What a tour costs — one renderer, wherever a price is shown.
   *
   * A tour can be priced two ways in the CMS, and the pages have to agree on
   * which one wins: a seasonal matrix (season × party size) if the tour has
   * active pricing seasons, otherwise the published rate rows. Only if it has
   * neither does the "from" price stand alone.
   *
   * This was inline in the tour page, and the safari-package routes panel
   * printed one "From $X per person" line beside a few bullets — the same tour,
   * quoted two different ways depending on which page a traveller landed on.
   *
   * Tables only. The heading, the intro and whatever CTA follows belong to the
   * page, because a tour page and a landing page introduce the same rates with
   * different words.
   */
  import { ChevronDown, User, Users } from '@lucide/svelte';
  import { currency, formatUsd } from '$lib/currency';
  import type { Tour, TourPricingSeason } from '$lib/types';

  export let tour: Tour | null = null;
  /** The line under the tables. Off where the page says it itself. */
  export let showFootnote = true;
  /** Rate cards also fit narrow desktop sidebars without hiding any values. */
  export let compact = false;

  /** Dictionary keys, not words: what a rate type is called is the reader's language. */
  const PRICE_TYPE_KEYS: Record<string, string> = {
    per_person: 'ui.price_per_person',
    per_group: 'ui.price_per_group',
    per_child: 'ui.price_per_child',
    single_supplement: 'ui.single_supplement',
    upgrade: 'ui.upgrade',
    discount: 'ui.discount'
  };
  $: priceType = (type: string) => (PRICE_TYPE_KEYS[type] ? $t(PRICE_TYPE_KEYS[type]) : '');

  const normaliseLabel = (value: string | null | undefined): string =>
    String(value ?? '')
      .replace(/[_-]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());

  /**
   * Published rates are quoted in the currency they were published in — the
   * site-wide currency switcher converts the indicative "from" price, but a
   * contracted rate is not ours to restate in another currency.
   */
  const formatPublishedRate = (amount: number, currencyCode: string): string => {
    const code = String(currencyCode || 'USD').trim().toUpperCase();
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: Number.isInteger(amount) ? 0 : 2
      }).format(amount);
    } catch {
      return `${code} ${Number(amount).toLocaleString()}`;
    }
  };

  const groupKey = (price: { minimum_travelers: number; maximum_travelers?: number | null }) =>
    `${price.minimum_travelers}:${price.maximum_travelers ?? ''}`;

  // Reactive so the column and cell labels follow the dictionary.
  $: groupLabel = (price: { minimum_travelers: number; maximum_travelers?: number | null }) =>
    price.minimum_travelers === 1 && price.maximum_travelers === 1
      ? $t('ui.solo')
      : price.maximum_travelers === null || price.maximum_travelers === undefined
        ? $t('ui.n_plus_people').replace('{n}', String(price.minimum_travelers))
        : $t('ui.n_people').replace('{n}', String(price.minimum_travelers));

  $: groupRate = (season: TourPricingSeason, key: string) => {
    const price = season.group_prices.find((item) => groupKey(item) === key);
    if (!price || price.price_status === 'NOT_AVAILABLE') return { label: $t('ui.not_available'), amount: '' };
    if (price.price_status === 'ON_REQUEST' || price.price == null) return { label: $t('ui.on_request'), amount: '' };
    return { label: $t('label.from'), amount: formatPublishedRate(Number(price.price), season.currency) };
  };

  /**
   * The indicative "from" price follows the site-wide currency switcher, the
   * way it does in the hero and the sticky bar. Published rates above do not:
   * a contracted rate is quoted in the currency it was contracted in.
   */
  $: fromAmount = tour?.price_from ? formatUsd(tour.price_from, $currency) : '';
  $: fromLabel = fromAmount ? $t('ui.from_amount_per_person').replace('{amount}', fromAmount) : $t('ui.on_request');

  $: publishedOptions = [...(tour?.tour_price_options ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  $: rows = publishedOptions.length
    ? publishedOptions.map((option) => ({
        label: option.title || option.label || priceType(option.price_type) || $t('ui.rate'),
        value: formatPublishedRate(option.price, option.currency || tour?.currency || 'USD'),
        note: [priceType(option.price_type) || normaliseLabel(option.price_type), option.description]
          .filter(Boolean)
          .join(' - ')
      }))
    : [
        {
          label: $t('ui.starting_price'),
          value: fromLabel,
          note: tour?.price_from ? $t('ui.final_pricing_depends_on_dates') : $t('ui.your_specialist_will_quote_this')
        }
      ];

  $: seasons = [...(tour?.tour_pricing_seasons ?? [])]
    .filter((season) => season.status === 'ACTIVE')
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((season) => ({
      ...season,
      group_prices: [...(season.group_prices ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    }));

  /** A season's bookable rates as numbers — what "lowest" is measured over. */
  const bookable = (season: TourPricingSeason): number[] =>
    season.group_prices
      .filter((price) => price.price_status !== 'NOT_AVAILABLE' && price.price_status !== 'ON_REQUEST' && price.price != null)
      .map((price) => Number(price.price))
      .filter((amount) => Number.isFinite(amount) && amount > 0);

  /** A season's cheapest bookable rate — shown beside its name while it is folded on a phone. */
  const lowestRate = (season: TourPricingSeason): string => {
    const amounts = bookable(season);
    return amounts.length ? formatPublishedRate(Math.min(...amounts), season.currency) : '';
  };

  /**
   * The party size that pays least in a season. Only when there is something
   * to compare: one price on its own is not "the lowest", and a tie has no
   * single winner to point at.
   */
  const lowestKey = (season: TourPricingSeason): string => {
    const amounts = bookable(season);
    if (amounts.length < 2) return '';
    const min = Math.min(...amounts);
    const winners = season.group_prices.filter(
      (price) => price.price_status !== 'NOT_AVAILABLE' && price.price_status !== 'ON_REQUEST' && price.price != null && Number(price.price) === min
    );
    return winners.length === 1 ? groupKey(winners[0]) : '';
  };

  /**
   * On a phone only the first season starts unfolded — several seasons of
   * cards is a long scroll, and the folded ones show their lowest price so it
   * is clear they hold more. Wide screens show every season regardless.
   */
  let unfolded: Record<number, boolean> = { 0: true };
  const toggleSeason = (index: number) => (unfolded = { ...unfolded, [index]: !unfolded[index] });

  /** "1 Jun – 31 Oct" when the season has dates, in the reader's language. */
  $: seasonDates = (season: TourPricingSeason): string => {
    if (!season.start_date || !season.end_date) return '';
    try {
      const format = new Intl.DateTimeFormat($locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
      return `${format.format(new Date(season.start_date))} – ${format.format(new Date(season.end_date))}`;
    } catch {
      return '';
    }
  };

  /** One column per party size across every season, smallest party first. */
  $: groupColumns = [
    ...new Map(seasons.flatMap((season) => season.group_prices).map((price) => [groupKey(price), price])).values()
  ].sort((a, b) => a.minimum_travelers - b.minimum_travelers);
  /** Up to seven cards across; more party sizes than that wrap to a second row. */
  $: rateColumns = Math.min(Math.max(groupColumns.length, 1), 7);
</script>

{#if seasons.length}
  {#if compact}
    <div class="compact-seasons">
      {#each seasons as season, index}
        <details class="compact-season" open={index === 0}>
          <summary>{season.season_name}</summary>
          <dl>
            {#each groupColumns as group}
              {@const rate = groupRate(season, groupKey(group))}
              <div><dt>{groupLabel(group)}</dt><dd>{rate.label}{#if rate.amount} <strong>{rate.amount}</strong>{/if}</dd></div>
            {/each}
          </dl>
        </details>
      {/each}
    </div>
  {:else}
  <!-- One card per party size, the price the largest thing in it. A season is
       a row of cards; a second season is a second row in the same layout. -->
  <div class="mt-6 grid gap-7">
    {#each seasons as season, index}
      {@const lowest = lowestRate(season)}
      {@const best = lowestKey(season)}
      {@const dates = seasonDates(season)}
      {@const basis = $t(season.pricing_basis === 'PER_GROUP' ? 'ui.basis_per_group' : 'ui.basis_per_person')}
      {@const foldable = seasons.length > 1}
      <section class="rate-season" class:is-folded={foldable && !unfolded[index]}>
        <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div class="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <h3 class="rounded-full bg-deep-green px-3 py-1.5 font-sans text-[11.5px] font-bold uppercase leading-none tracking-[0.08em] text-goldfinch-gold">{season.season_name}</h3>
            {#if dates}<span class="text-[13px] text-ink/60">{dates}</span>{/if}
          </div>
          {#if foldable}
            <button
              type="button"
              class="rate-fold inline-flex items-center gap-2 rounded-full px-1 py-1 text-[13px] text-ink/65 xl:hidden"
              aria-expanded={Boolean(unfolded[index])}
              on:click={() => toggleSeason(index)}
            >
              {#if lowest}<span>{$t('label.from')} <strong class="text-[15px] font-extrabold text-forest">{lowest}</strong></span>{/if}
              <ChevronDown size={16} class="rate-chevron" aria-hidden="true" />
            </button>
          {/if}
        </div>

        <div class="rate-grid mt-4" style={`--rate-cols:${rateColumns}`}>
          {#each groupColumns as group}
            {@const key = groupKey(group)}
            {@const rate = groupRate(season, key)}
            {@const isBest = Boolean(best) && key === best}
            <div class="rate-card" class:rate-best={isBest} class:rate-ask={!rate.amount}>
              {#if isBest}<span class="rate-flag">{$t('ui.lowest_price')}</span>{/if}
              <span class="rate-who">
                {#if group.minimum_travelers === 1 && group.maximum_travelers === 1}<User size={15} strokeWidth={2} aria-hidden="true" />{:else}<Users size={15} strokeWidth={2} aria-hidden="true" />{/if}
                {groupLabel(group)}
              </span>
              {#if rate.amount}
                <span class="rate-from">{rate.label}</span>
                <span class="rate-amount font-serif">{rate.amount}</span>
                <span class="rate-basis">{basis}</span>
              {:else}
                <span class="rate-amount rate-amount-ask font-serif">{rate.label}</span>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/each}
  </div>
  {/if}
  <!-- The page's call to action, on the same row as the small print and to
       its right; on a phone it drops below and takes the full width. -->
  {#if showFootnote || $$slots.action}
    <div class="rate-foot mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
      {#if showFootnote}
        <p class="min-w-0 max-w-[60ch] flex-1 basis-[280px] text-[13px] leading-6 text-ink/60">
          {$t('ui.prices_are_basis_in_currency')
            .replace('{basis}', $t(seasons[0].pricing_basis === 'PER_GROUP' ? 'ui.basis_per_group' : 'ui.basis_per_person'))
            .replace('{currency}', seasons[0].currency)}
        </p>
      {/if}
      <slot name="action" />
    </div>
  {/if}
{:else}
  <!-- One card per rate on a phone: a three-column table at 375px is a
       horizontal scroll for three words. -->
  <div class={`tour-rates-mobile mt-5 grid gap-2.5 ${compact ? '' : 'md:hidden'}`}>
    {#each rows as row}
      <article class="rounded-[8px] border border-ink/10 bg-surface p-4">
        <div class="flex min-w-0 items-start justify-between gap-4">
          <h3 class="min-w-0 text-[13px] font-semibold leading-snug text-heading">{row.label}</h3>
          <p class="max-w-[58%] break-words text-right text-[14px] font-extrabold leading-snug text-forest">{row.value}</p>
        </div>
        {#if row.note}
          <p class="mt-2 border-t border-ink/8 pt-2 text-[11.5px] leading-5 text-ink/60">{row.note}</p>
        {/if}
      </article>
    {/each}
  </div>

  {#if !compact}
  <div class="tour-rates-table mt-6 hidden overflow-hidden rounded-t-[10px] border border-ink/10 md:block">
    <table class="w-full border-collapse text-[14px]">
      <thead>
        <tr class="bg-deep-green text-left text-white">
          <th class="px-4 py-3 font-semibold">{$t('ui.item')}</th>
          <th class="px-4 py-3 font-semibold">{$t('ui.detail')}</th>
          <th class="hidden px-4 py-3 font-semibold md:table-cell">{$t('ui.note')}</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row, index}
          <tr class={index % 2 === 0 ? 'bg-surface' : 'bg-canvas'}>
            <td class="border-t border-ink/5 px-4 py-3 align-top font-semibold text-heading">{row.label}</td>
            <td class="border-t border-ink/5 px-4 py-3 align-top text-ink/75">{row.value}</td>
            <td class="hidden border-t border-ink/5 px-4 py-3 align-top text-ink/60 md:table-cell">{row.note}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  {/if}
  {#if $$slots.action}<div class="rate-foot mt-5 flex"><slot name="action" /></div>{/if}
{/if}

<style>
  .rate-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    /* Room for the "lowest price" tag, which sits half out of its card. */
    padding-top: 10px;
  }

  .rate-card {
    position: relative;
    container-type: inline-size;
    display: grid;
    align-content: start;
    justify-items: center;
    gap: 4px;
    min-width: 0;
    border: 1px solid rgb(var(--c-ink) / 0.1);
    border-radius: 16px;
    background: rgb(var(--c-surface));
    padding: 14px 10px;
    text-align: center;
    box-shadow: 0 8px 18px -16px rgb(57 61 50 / 0.7);
  }

  .rate-who {
    display: inline-flex;
    max-width: 100%;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: #8d691d;
    color: color-mix(in srgb, rgb(var(--c-goldfinch-gold)) 62%, #000);
    font-size: 12px;
    font-size: clamp(10px, 10.5cqw, 12px);
    font-weight: 700;
    letter-spacing: 0.05em;
    line-height: 1.25;
    text-transform: uppercase;
  }

  .rate-who :global(svg) { flex: none; }

  /* Seven cards across leave about 100px each. "2 PERSONNES" beside a full
     icon does not fit that, and a label broken after its number reads badly,
     so on a narrow card the icon and the spacing tighten. */
  @container (max-width: 112px) {
    .rate-who { gap: 4px; font-size: 10px; letter-spacing: 0.03em; }
    .rate-who :global(svg) { height: 13px; width: 13px; }
  }

  .rate-from,
  .rate-basis {
    color: rgb(var(--c-ink) / 0.6);
    font-size: 11.5px;
    line-height: 1.3;
  }

  /* Sized from the card's own width, so a five-figure price still fits when
     seven cards share a row. */
  .rate-amount {
    max-width: 100%;
    color: rgb(var(--c-forest));
    font-size: 24px;
    font-size: clamp(18px, 22cqw, 27px);
    font-weight: 700;
    line-height: 1.08;
    overflow-wrap: anywhere;
  }

  .rate-best {
    border-color: rgb(var(--c-deep-green));
    background: rgb(var(--c-deep-green));
  }

  .rate-best .rate-who { color: rgb(var(--c-goldfinch-gold)); }
  .rate-best .rate-from,
  .rate-best .rate-basis { color: rgb(255 255 255 / 0.78); }
  .rate-best .rate-amount { color: #fff; font-size: clamp(19px, 24cqw, 30px); }

  .rate-flag {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 999px;
    background: rgb(var(--c-goldfinch-gold));
    padding: 3px 9px;
    color: rgb(var(--c-deep-green));
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    line-height: 1.3;
    text-transform: uppercase;
    white-space: nowrap;
  }

  /* "On request" is an answer, not a price: quieter, so the priced cards lead. */
  .rate-ask {
    align-content: center;
    border-style: dashed;
    border-color: rgb(var(--c-ink) / 0.22);
    background: rgb(var(--c-canvas));
    box-shadow: none;
  }

  .rate-amount-ask {
    color: rgb(var(--c-heading));
    font-size: clamp(15px, 15cqw, 19px);
  }

  .rate-fold :global(.rate-chevron) { transition: transform 0.2s ease; }
  .rate-fold[aria-expanded='true'] :global(.rate-chevron) { transform: rotate(180deg); }
  .rate-fold:focus-visible { outline: 2px solid rgb(var(--c-goldfinch-gold)); outline-offset: 2px; }

  .rate-foot :global(button),
  .rate-foot :global(a) { flex: none; }

  @media (max-width: 1279px) {
    .rate-season.is-folded .rate-grid { display: none; }
  }

  @media (max-width: 639px) {
    .rate-foot :global(button),
    .rate-foot :global(a) { width: 100%; }
  }

  @media (min-width: 640px) {
    .rate-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }

  @media (min-width: 1280px) {
    .rate-grid { grid-template-columns: repeat(var(--rate-cols, 4), minmax(0, 1fr)); }
  }

  @media (prefers-reduced-motion: reduce) { .rate-fold :global(.rate-chevron) { transition: none; } }
  .compact-seasons { display:grid; gap:10px; margin-top:20px; }
  .compact-season { overflow:hidden; border:1px solid rgb(var(--c-ink)/.1); border-radius:8px; background:rgb(var(--c-surface)); }
  .compact-season summary { padding:13px 15px; cursor:pointer; background:rgb(var(--c-deep-green)); color:rgb(var(--c-surface)); font-size:12px; font-weight:600; line-height:1.5; }
  .compact-season dl { padding:4px 15px; }
  .compact-season dl > div { display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px; padding:10px 0; font-size:12px; line-height:1.5; }
  .compact-season dl > div + div { border-top:1px solid rgb(var(--c-ink)/.08); }
  .compact-season dt { font-weight:600; color:rgb(var(--c-heading)); }
  .compact-season dd { display:flex; flex-wrap:wrap; gap:4px; color:rgb(var(--c-ink)/.65); }
  .compact-season dd strong { color:rgb(var(--c-forest)); font-size:14px; }
  .compact-season summary:focus-visible { outline:2px solid rgb(var(--c-goldfinch-gold)); outline-offset:-3px; }
</style>
