<script lang="ts">
  import { t, locale } from '$lib/i18n/ui';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { CalendarDays, Clock, Compass, MapPin, Search, Tag, Users } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { revealHeading, staggeredCardReveal, tilt } from '$lib/animations';
  import { currency, formatUsd } from '$lib/currency';
  import Button from '$lib/components/public/Button.svelte';
  import Img from '$lib/components/public/Img.svelte';
  import SelectInput from '$lib/components/public/SelectInput.svelte';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  type Departure = {
    available_slots: number | null;
    category_name: string;
    category_slug: string;
    currency: string;
    destination_name: string;
    destination_slug: string;
    duration_days: number | null;
    end_date: string | null;
    id: string;
    banner_image_url?: string | null;
    banner_image_url_variants?: unknown;
    main_image_url: string | null;
    main_image_url_variants?: unknown;
    notes: string | null;
    price: number | null;
    start_date: string;
    status: string;
    tour_id: string;
    tour_slug: string;
    tour_title: string;
  };

  type Option = { label: string; value: string };

  let departures: Departure[] = [];
  let loading = true;
  // A dictionary key, never the API's own message.
  let errorKey = '';

  // Initial filters can arrive from the homepage hero search (?destination=&month=).
  let search = '';
  let destination = $page.url.searchParams.get('destination') ?? 'all';
  let category = 'all';
  let month = $page.url.searchParams.get('month') ?? 'all';
  let status = 'all';
  let sort = 'start_date';

  // Destination / category names come from the CMS; only the "all" entry is translated.
  let destinationItems: Option[] = [];
  let categoryItems: Option[] = [];
  $: destinationOptions = [{ label: $t('label.all_destinations'), value: 'all' }, ...destinationItems];
  $: categoryOptions = [{ label: $t('pg_departures.all_categories'), value: 'all' }, ...categoryItems];

  $: statusOptions = [
    { label: $t('pg_departures.all_statuses'), value: 'all' },
    { label: $t('pg_departures.status_available'), value: 'available' },
    { label: $t('pg_departures.status_limited'), value: 'limited' }
  ];
  $: sortOptions = [
    { label: $t('pg_departures.sort_soonest'), value: 'start_date' },
    { label: $t('pg_departures.sort_lowest_price'), value: 'price' }
  ];

  $: monthOptions = (() => {
    const out: Option[] = [{ label: $t('pg_departures.any_month'), value: 'all' }];
    const fmt = new Intl.DateTimeFormat($locale, { month: 'long', year: 'numeric' });
    const now = new Date();
    for (let i = 0; i < 12; i += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      // fr/es/it write month names in lower case; a list entry starts with a capital.
      const label = fmt.format(d);
      out.push({ value, label: label.charAt(0).toLocaleUpperCase($locale) + label.slice(1) });
    }
    return out;
  })();

  $: dateFormat = new Intl.DateTimeFormat($locale, { day: '2-digit', month: 'short', year: 'numeric' });
  $: fmtDate = (value: string | null) => (value ? dateFormat.format(new Date(value)) : '');
  $: fmtMoney = (amount: number | null) =>
    amount == null ? $t('ui.on_request') : formatUsd(amount, $currency);

  // Singular or plural the way the active language counts (French treats 0 as singular).
  $: pluralRules = new Intl.PluralRules($locale);
  $: count = (n: number, oneKey: string, otherKey: string) =>
    $t(pluralRules.select(n) === 'one' ? oneKey : otherKey).replace('{n}', String(n));

  // Status pills: translated label per API status, the raw value if a new one appears.
  $: statusLabel = (value: string) => {
    const key = `pg_departures.status_${value}`;
    const label = $t(key);
    return label === key ? value : label;
  };

  // Group departures by tour so the same tour shows once with a list of dates.
  let expanded = new Set<string>();
  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expanded = next;
  };

  $: grouped = (() => {
    const map = new Map<string, Departure[]>();
    for (const d of departures) {
      const list = map.get(d.tour_id) ?? [];
      list.push(d);
      map.set(d.tour_id, list);
    }
    return [...map.values()].map((dates) => {
      const prices = dates.map((x) => x.price).filter((p): p is number => p != null);
      return { tour: dates[0], dates, minPrice: prices.length ? Math.min(...prices) : null, currency: dates[0].currency };
    });
  })();

  const load = async () => {
    loading = true;
    errorKey = '';
    try {
      const res = await api.departures.list({
        search,
        destination,
        category,
        month: month === 'all' ? undefined : month,
        status,
        sort,
        limit: 60
      });
      departures = res.data as unknown as Departure[];
    } catch {
      errorKey = 'pg_departures.load_error';
    } finally {
      loading = false;
    }
  };

  const clearFilters = () => {
    search = '';
    destination = 'all';
    category = 'all';
    month = 'all';
    status = 'all';
    sort = 'start_date';
    load();
  };

  // Reload automatically when a dropdown filter changes (search uses the button).
  $: filterKey = `${destination}|${category}|${month}|${status}|${sort}`;
  let lastKey = '';
  $: if (browser && filterKey !== lastKey) {
    lastKey = filterKey;
    load();
  }

  onMount(async () => {
    try {
      const [dest, cat] = await Promise.all([
        api.destinations.list({ status: 'published', limit: 100 }),
        api.categories.list({ status: 'published', limit: 100 })
      ]);
      destinationItems = dest.data.items.map((d) => ({ label: String(d.name ?? d.slug), value: String(d.slug) }));
      categoryItems = cat.data.items.map((c) => ({ label: String(c.name ?? c.slug), value: String(c.slug) }));
    } catch {
      // filters still work via fallback "all"
    }
  });
</script>

<!-- ── hero ─────────────────────────────────────────────────────────────── -->
<section class="relative overflow-hidden bg-gradient-to-br from-deep-green via-forest to-deep-green text-white">
  <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
  <div class="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-savanna/15 blur-3xl"></div>
  <div class="container-shell relative py-16 text-center md:py-20">
    <p class="font-serif text-xl italic text-savanna">{$t('ui.scheduled_departures')}</p>
    <h1 class="mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-[1.1] tracking-normal md:text-[44px]" use:revealHeading>{$t('ui.confirmed_east_africa_departure_dates')}</h1>
    <p class="mx-auto mt-4 max-w-2xl text-[15px] font-medium leading-7 text-white/75 md:text-lg">
      {$t('pg_departures.hero_body')}
    </p>
  </div>
</section>

<section class="bg-canvas py-12 md:py-16">
  <div class="container-shell">
    <!-- ── filter bar ──────────────────────────────────────────────────── -->
    <div class="rounded-[8px] border border-ink/10 bg-surface p-4 shadow-[0_14px_44px_rgba(57,61,50,0.06)] sm:p-5">
      <div class="grid gap-3 lg:grid-cols-[1.4fr_repeat(4,1fr)_auto] lg:items-end">
        <label class="grid gap-2 text-sm font-medium text-ink">
          <span>{$t('cta.search')}</span>
          <span class="flex h-11 items-center gap-2 rounded-xl border border-ink/15 bg-surface px-3 shadow-sm transition focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/15">
            <Search size={16} class="text-ink/70" />
            <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder={$t('ui.search_by_tour')} on:keydown={(e) => e.key === 'Enter' && load()} />
          </span>
        </label>
        <SelectInput label={$t('filter.destination')} name="destination" bind:value={destination} options={destinationOptions} />
        <SelectInput label={$t('ui.category')} name="category" bind:value={category} options={categoryOptions} />
        <SelectInput label={$t('ui.month')} name="month" bind:value={month} options={monthOptions} />
        <SelectInput label={$t('ui.status')} name="status" bind:value={status} options={statusOptions} />
        <div class="flex gap-2">
          <button class="inline-flex h-11 items-center rounded-xl bg-forest px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-deep-green" type="button" on:click={load}>{$t('cta.search')}</button>
          <button class="inline-flex h-11 items-center rounded-xl border border-ink/15 bg-surface px-4 text-sm font-semibold text-ink/70 transition hover:bg-canvas" type="button" on:click={clearFilters}>{$t('filter.clear')}</button>
        </div>
      </div>
      <div class="mt-3 flex items-center justify-end gap-2 border-t border-ink/10 pt-3">
        <span class="text-xs font-medium text-ink/70">{$t('label.sort')}</span>
        <div class="w-44"><SelectInput label="" name="sort" bind:value={sort} options={sortOptions} /></div>
      </div>
    </div>

    <!-- ── results ─────────────────────────────────────────────────────── -->
    <div class="mt-8">
      {#if loading}
        <LoadingState message={$t('pg_departures.loading')} />
      {:else if errorKey}
        <ErrorState message={$t(errorKey)} />
      {:else if departures.length === 0}
        <EmptyState title={$t('ui.no_departures_match_your_filters')} message={$t('pg_departures.empty_body')} />
        <div class="mt-5 flex justify-center">
          <Button href="/plan-my-trip">{$t('cta.plan_my_trip')}</Button>
        </div>
      {:else}
        <p class="mb-5 text-sm font-medium text-ink/70">{count(grouped.length, 'pg_departures.tours_one', 'pg_departures.tours_other')} · {count(departures.length, 'pg_departures.departures_one', 'pg_departures.departures_other')}</p>
        <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.05 }}>
          {#each grouped as g (g.tour.tour_id)}
            {@const dates = expanded.has(g.tour.tour_id) ? g.dates : g.dates.slice(0, 3)}
            <article class="group flex flex-col overflow-hidden rounded-[12px] border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(57,61,50,0.07)] transition-shadow duration-300 hover:shadow-[0_26px_60px_rgba(57,61,50,0.16)]" use:tilt={{ max: 5 }}>
              <div class="relative aspect-[16/10] overflow-hidden bg-skywash">
                {#if g.tour.main_image_url}
                  <Img
                    record={g.tour}
                    fields={['main_image_url', 'banner_image_url']}
                    alt={g.tour.tour_title}
                    width={760}
                    sizes="(max-width: 768px) 92vw, (max-width: 1280px) 45vw, 31vw"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                {:else}
                  <div class="grid h-full w-full place-items-center text-forest/30"><Compass size={36} /></div>
                {/if}
                <span class="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-deep-green/85 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                  <CalendarDays size={11} />{count(g.dates.length, 'pg_departures.dates_one', 'pg_departures.dates_other')}
                </span>
                {#if g.tour.category_name}
                  <span class="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-heading backdrop-blur">
                    <Tag size={11} />{g.tour.category_name}
                  </span>
                {/if}
              </div>

              <div class="flex flex-1 flex-col p-5">
                <h3 class="text-lg font-extrabold leading-snug tracking-normal text-heading">{g.tour.tour_title}</h3>
                <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  {#if g.tour.destination_name}<span class="inline-flex items-center gap-1.5 font-semibold text-clay"><MapPin size={14} />{g.tour.destination_name}</span>{/if}
                  {#if g.tour.duration_days}<span class="inline-flex items-center gap-1.5 text-ink/70"><Clock size={14} class="text-forest" />{count(g.tour.duration_days, 'pg_destinations_slug.n_day', 'pg_destinations_slug.n_days')}</span>{/if}
                </div>

                <div class="mt-3 flex items-baseline gap-1.5">
                  <span class="text-[11px] font-semibold uppercase tracking-wide text-ink/70">{$t('label.from')}</span>
                  <span class="text-xl font-extrabold text-heading">{fmtMoney(g.minPrice)}</span>
                </div>

                <p class="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-forest/70">{$t('ui.upcoming_departures')}</p>
                <div class="mt-2 divide-y divide-ink/10 overflow-hidden rounded-xl border border-ink/10">
                  {#each dates as dt (dt.id)}
                    <div class="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-ink">{fmtDate(dt.start_date)}{#if dt.end_date} <span class="font-normal text-ink/40">→ {fmtDate(dt.end_date)}</span>{/if}</p>
                        <p class="mt-0.5 flex items-center gap-2 text-xs">
                          {#if dt.available_slots != null}<span class="inline-flex items-center gap-1 text-ink/70"><Users size={11} />{count(dt.available_slots, 'pg_departures.seats_left_one', 'pg_departures.seats_left_other')}</span>{/if}
                          <span class={`font-semibold ${dt.status === 'limited' ? 'text-amber-600' : 'text-emerald-600'}`}>{statusLabel(dt.status)}</span>
                        </p>
                      </div>
                      <a class="shrink-0 rounded-lg bg-forest px-3 py-1.5 text-xs font-bold text-white transition hover:bg-deep-green" href={`/booking/${g.tour.tour_slug}?departureId=${dt.id}`}>{$t('ui.book')}</a>
                    </div>
                  {/each}
                </div>
                {#if g.dates.length > 3}
                  <button class="mt-2 inline-flex items-center gap-1 self-start text-xs font-semibold text-forest transition hover:text-heading" type="button" on:click={() => toggleExpand(g.tour.tour_id)}>
                    {expanded.has(g.tour.tour_id) ? $t('pg_departures.show_fewer_dates') : count(g.dates.length - 3, 'pg_departures.more_dates_one', 'pg_departures.more_dates_other')}
                  </button>
                {/if}

                <div class="mt-4 grid grid-cols-2 gap-2 border-t border-ink/10 pt-4">
                  <Button href={`/tours/${g.tour.tour_slug}`} variant="secondary">{$t('cta.view_tour')}</Button>
                  <Button href={`/plan-my-trip?tour=${g.tour.tour_slug}&month=${(g.tour.start_date ?? '').slice(0, 7)}`}>{$t('ui.request')}</Button>
                </div>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</section>
