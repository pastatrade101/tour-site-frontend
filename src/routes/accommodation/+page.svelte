<script lang="ts">
  /**
   * The stays index — deliberately an editorial index, not a card grid.
   *
   * The lodge data has no prices, no ratings and no featured flags, and two of
   * the ten have no photograph. What it does have is strong prose and a clean
   * taxonomy, so the page is built to be read: hairline-separated rows, large
   * serif names, and a thumbnail only where one genuinely exists.
   */
  import { ArrowRight, BedDouble, Gem, MapPin, Tent } from '@lucide/svelte';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
  import { imgUrl, sourceFor } from '$lib/img';
  import type { Lodge } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: lodges = (data.lodges ?? []) as Lodge[];

  const LEVEL: Record<string, string> = {
    budget: 'Budget',
    mid_range: 'Mid-range',
    luxury: 'Luxury',
    ultra_luxury: 'Ultra luxury'
  };
  const TYPE: Record<string, string> = {
    tented_camp: 'Tented camp',
    mobile_camp: 'Mobile camp',
    lodge: 'Lodge',
    hotel: 'Hotel',
    treehouse: 'Treehouse'
  };

  const levelLabel = (l: Lodge) => LEVEL[String(l.accommodation_level)] ?? '';
  const typeLabel = (l: Lodge) => TYPE[String(l.lodge_type)] ?? '';
  const placeOf = (l: Lodge) => l.destinations?.name ?? '';
  const blurbOf = (l: Lodge) => (l.why_we_recommend || l.description || '').trim();

  // Filters are built from the data, so an option never appears with nothing
  // behind it and every count is real.
  type Filter = { key: string; label: string; test: (l: Lodge) => boolean };

  $: filters = [
    { key: 'all', label: 'All stays', test: () => true },
    ...[...new Set(lodges.map((l) => String(l.lodge_type)).filter(Boolean))].sort().map((type) => ({
      key: `type:${type}`,
      label: TYPE[type] ?? type,
      test: (l: Lodge) => String(l.lodge_type) === type
    })),
    ...[...new Set(lodges.map((l) => String(l.accommodation_level)).filter(Boolean))].sort().map((level) => ({
      key: `level:${level}`,
      label: LEVEL[level] ?? level,
      test: (l: Lodge) => String(l.accommodation_level) === level
    }))
  ] as Filter[];

  let active = 'all';
  $: activeFilter = filters.find((f) => f.key === active) ?? filters[0];
  $: shown = lodges.filter((l) => activeFilter?.test(l) ?? true);
  const countFor = (filter: Filter) => lodges.filter(filter.test).length;

  // Backdrop borrowed from the first stay that actually has a photograph; falls
  // back to a deep-green field, since two of the ten have no image at all.
  $: heroImage = sourceFor(
    lodges.find((l) => l.hero_image_url || l.image_url),
    1920,
    'hero_image_url',
    'image_url'
  );

  // Hero stats, every one counted from the records on this page — no rounding up
  // and nothing shown when the count is zero.
  $: destinationCount = new Set(lodges.map((l) => l.destinations?.name).filter(Boolean)).size;
  $: luxuryCount = lodges.filter((l) => l.accommodation_level === 'luxury').length;
  $: campCount = lodges.filter((l) => l.lodge_type === 'tented_camp' || l.lodge_type === 'mobile_camp').length;
  $: heroStats = [
    { icon: BedDouble, value: lodges.length, label: lodges.length === 1 ? 'place to stay' : 'places to stay' },
    { icon: MapPin, value: destinationCount, label: destinationCount === 1 ? 'destination' : 'destinations' },
    { icon: Gem, value: luxuryCount, label: 'luxury stays' },
    { icon: Tent, value: campCount, label: campCount === 1 ? 'tented camp' : 'tented camps' }
  ].filter((stat) => stat.value > 0);

  // A different photograph from the hero so the page does not repeat itself.
  $: ctaImage = sourceFor(
    lodges.filter((l) => l.hero_image_url || l.image_url).at(-1),
    1600,
    'hero_image_url',
    'image_url'
  );

  const title = 'Where to stay — camps, lodges and hotels';
  const description =
    'The camps, lodges and hotels we book across Tanzania — chosen for where they sit, how they are run and who they suit.';
</script>

<svelte:head>
  <title>{title} | Goldfinch Adventures</title>
  <meta name="description" content={description} />
  {#if heroImage}
    <link rel="preload" as="image" href={imgUrl(heroImage, 1920, 72)} fetchpriority="high" />
  {/if}
</svelte:head>

<!-- ── cinematic hero ───────────────────────────────────────────────────── -->
<section class="relative flex min-h-[62vh] items-end overflow-hidden bg-deep-green text-white md:min-h-[74vh]">
  {#if heroImage}
    <img
      class="absolute inset-0 h-full w-full object-cover"
      src={imgUrl(heroImage, 1920, 72)}
      alt=""
      fetchpriority="high"
      decoding="async"
    />
    <span class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" aria-hidden="true"></span>
  {:else}
    <span class="absolute inset-0 bg-gradient-to-br from-deep-green via-forest to-deep-green" aria-hidden="true"></span>
  {/if}
  <span class="pointer-events-none absolute inset-0 shadow-[inset_0_0_180px_60px_rgba(0,0,0,0.55)]" aria-hidden="true"></span>

  <div class="container-shell relative z-10 pb-14 pt-28 md:pb-20">
    <div class="max-w-3xl" use:fadeUpOnScroll={{ y: 16 }}>
      <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-goldfinch-gold">Accommodation</p>
      <h1 class="mt-4 font-serif text-4xl font-semibold leading-[1.05] md:text-[62px]">
        Where you sleep shapes the whole trip
      </h1>
      <p class="mt-5 max-w-2xl text-base leading-8 text-white/80 md:text-lg">
        {description}
      </p>
      {#if heroStats.length}
        <dl class="mt-9 flex flex-wrap items-center gap-x-10 gap-y-5 border-t border-white/15 pt-6">
          {#each heroStats as stat}
            <div class="flex items-center gap-3">
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-goldfinch-gold ring-1 ring-white/15" aria-hidden="true">
                <svelte:component this={stat.icon} size={17} />
              </span>
              <div>
                <dt class="sr-only">{stat.label}</dt>
                <dd>
                  <span class="block font-serif text-2xl font-semibold leading-none text-white">{stat.value}</span>
                  <span class="mt-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">{stat.label}</span>
                </dd>
              </div>
            </div>
          {/each}
        </dl>
      {/if}
    </div>
  </div>
</section>

{#if lodges.length}
  <!-- Filters as plain text toggles on a hairline, not pills in boxes. -->
  <section class="border-y border-ink/10 bg-canvas">
    <div class="container-shell">
      <div class="-mx-4 flex gap-6 overflow-x-auto px-4 py-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        {#each filters as filter (filter.key)}
          {@const count = countFor(filter)}
          <button
            type="button"
            class={`group shrink-0 whitespace-nowrap border-b-2 pb-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold ${
              active === filter.key
                ? 'border-goldfinch-gold font-extrabold text-heading'
                : 'border-transparent font-semibold text-ink/50 hover:text-heading'
            }`}
            aria-pressed={active === filter.key}
            on:click={() => (active = filter.key)}
          >
            {filter.label}
            <span class="ml-1.5 text-xs font-semibold text-ink/35">{count}</span>
          </button>
        {/each}
      </div>
    </div>
  </section>

  <section class="bg-canvas pb-20 md:pb-28">
    <div class="container-shell">
      <!-- Mixed rhythm rather than one repeating row: every fifth stay leads as a
           full-width feature, the next two sit as a pair, and the last two are
           compact rows. Mobile-first — one column by default, the pattern only
           appears once there is width for it. -->
      <ul class="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6" use:staggeredCardReveal={{ y: 14, stagger: 0.03 }}>
        {#each shown as lodge, index (lodge.id)}
          {@const variant = index % 5 === 0 ? 'feature' : index % 5 <= 2 ? 'card' : 'row'}
          {@const image = sourceFor(lodge, variant === 'feature' ? 1400 : 800, 'image_url', 'hero_image_url')}
          <li class={variant === 'card' ? 'sm:col-span-1' : 'sm:col-span-2'}>
            {#if variant === 'row'}
              <!-- compact hairline row -->
              <a
                class="group flex items-center gap-4 border-t border-ink/10 py-5 transition hover:bg-sand/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold sm:gap-6 sm:py-6"
                href={`/accommodation/${lodge.slug}`}
                data-sveltekit-preload-data="hover"
              >
                <span class="hidden w-8 shrink-0 font-serif text-sm italic text-ink/30 sm:block">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {#if image}
                  <span class="h-16 w-20 shrink-0 overflow-hidden rounded-[8px] bg-sand sm:h-20 sm:w-28">
                    <img class="h-full w-full object-cover transition duration-700 group-hover:scale-105" src={imgUrl(image, 320, 72)} alt="" loading="lazy" decoding="async" />
                  </span>
                {/if}
                <span class="min-w-0 flex-1">
                  {#if placeOf(lodge)}
                    <span class="block text-[10px] font-bold uppercase tracking-[0.16em] text-clay">{placeOf(lodge)}</span>
                  {/if}
                  <span class="mt-0.5 block font-serif text-lg font-semibold leading-tight text-heading transition group-hover:text-forest sm:text-xl">
                    {lodge.name}
                  </span>
                  <span class="mt-1 block text-xs font-semibold text-ink/45">
                    {[levelLabel(lodge), typeLabel(lodge)].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span class="shrink-0 text-ink/25 transition group-hover:translate-x-1 group-hover:text-goldfinch-gold">
                  <ArrowRight size={18} />
                </span>
              </a>
            {:else}
              <!-- feature and card share one anchor; the feature simply gets a
                   wider frame and larger type -->
              <a
                class="group flex h-full flex-col overflow-hidden rounded-[12px] border border-ink/10 bg-surface shadow-card transition duration-300 hover:-translate-y-1 hover:border-goldfinch-gold/40 hover:shadow-[0_22px_50px_rgba(57,61,50,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
                href={`/accommodation/${lodge.slug}`}
                data-sveltekit-preload-data="hover"
              >
                <span class={`relative block w-full overflow-hidden bg-forest ${variant === 'feature' ? 'aspect-[16/10] sm:aspect-[21/9]' : 'aspect-[4/3]'}`}>
                  {#if image}
                    <img
                      class="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.05]"
                      src={imgUrl(image, variant === 'feature' ? 1400 : 800, 72)}
                      alt=""
                      loading={index < 2 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                  {:else}
                    <!-- two of the ten have no photograph; the frame still reads -->
                    <span class="absolute inset-0 bg-gradient-to-br from-deep-green via-forest to-deep-green" aria-hidden="true"></span>
                    <span class="absolute inset-0 grid place-items-center font-serif text-6xl text-white/12" aria-hidden="true">
                      {lodge.name.charAt(0)}
                    </span>
                  {/if}
                  <span class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true"></span>
                  <span class="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    {#if placeOf(lodge)}
                      <span class="block text-[10px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">{placeOf(lodge)}</span>
                    {/if}
                    <span class={`mt-1 block font-serif font-semibold leading-tight text-white ${variant === 'feature' ? 'text-2xl sm:text-4xl' : 'text-xl'}`}>
                      {lodge.name}
                    </span>
                  </span>
                </span>

                <span class="flex flex-1 flex-col p-4 sm:p-5">
                  {#if blurbOf(lodge)}
                    <span class={`text-sm leading-7 text-ink/65 ${variant === 'feature' ? 'sm:text-base sm:leading-8' : 'line-clamp-3'}`}>
                      {blurbOf(lodge)}
                    </span>
                  {/if}
                  <span class="mt-4 flex items-center justify-between gap-3 border-t border-ink/10 pt-3 text-xs font-semibold text-ink/45">
                    <span class="min-w-0 truncate">
                      {[levelLabel(lodge), typeLabel(lodge)].filter(Boolean).join(' · ')}
                      {#if variant === 'feature' && lodge.best_for?.length}
                        <span class="text-ink/35"> — best for {lodge.best_for.join(', ').toLowerCase()}</span>
                      {/if}
                    </span>
                    <span class="shrink-0 text-ink/25 transition group-hover:translate-x-0.5 group-hover:text-goldfinch-gold">
                      <ArrowRight size={16} />
                    </span>
                  </span>
                </span>
              </a>
            {/if}
          </li>
        {/each}
      </ul>

      {#if !shown.length}
        <p class="border-t border-ink/10 py-14 text-center text-sm text-ink/55">
          Nothing under that filter yet.
          <button class="font-bold text-clay underline-offset-2 hover:underline" type="button" on:click={() => (active = 'all')}>
            Show all stays
          </button>
        </p>
      {/if}
    </div>
  </section>

  <!-- ── closing band ──────────────────────────────────────────────────── -->
  <section class="relative overflow-hidden bg-deep-green text-white">
    {#if ctaImage}
      <img class="absolute inset-0 h-full w-full object-cover opacity-25" src={imgUrl(ctaImage, 1600, 70)} alt="" loading="lazy" decoding="async" />
    {/if}
    <span class="absolute inset-0 bg-gradient-to-br from-deep-green/95 via-deep-green/85 to-forest/90" aria-hidden="true"></span>
    <span class="pointer-events-none absolute inset-0 shadow-[inset_0_0_160px_50px_rgba(0,0,0,0.45)]" aria-hidden="true"></span>

    <div class="container-shell relative z-10 py-20 md:py-28">
      <div class="max-w-3xl" use:fadeUpOnScroll={{ y: 16 }}>
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-goldfinch-gold">Planning together</p>
        <h2 class="mt-5 font-serif text-3xl font-semibold leading-[1.12] md:text-[46px]">
          We match the stay to the route,<br class="hidden sm:block" /> not the other way round.
        </h2>
        <p class="mt-5 max-w-xl text-base leading-8 text-white/70">
          Tell us how you want to travel and we will put the right camps and lodges in the right order — with the
          driving, flying and pacing already worked out.
        </p>

        <div class="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            class="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-goldfinch-gold px-8 py-3.5 text-sm font-extrabold text-heading transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green"
            href="/plan-my-trip"
          >
            Plan my trip <ArrowRight size={16} />
          </a>
          <a
            class="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-8 py-3.5 text-sm font-bold text-white transition hover:border-white/60 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
            href="/contact"
          >
            Talk to a specialist
          </a>
        </div>

        {#if heroStats.length}
          <dl class="mt-12 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 border-t border-white/15 pt-8 sm:grid-cols-4">
            {#each heroStats as stat}
              <div>
                <dt class="sr-only">{stat.label}</dt>
                <dd>
                  <span class="block font-serif text-3xl font-semibold leading-none text-white">{stat.value}</span>
                  <span class="mt-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">{stat.label}</span>
                </dd>
              </div>
            {/each}
          </dl>
        {/if}
      </div>
    </div>
  </section>
{:else}
  <!-- Every lodge is currently a draft in the CMS, so this is the live state. -->
  <section class="bg-canvas pb-24 pt-4">
    <div class="container-shell">
      <div class="max-w-xl border-t border-ink/10 pt-10">
        <p class="font-serif text-2xl leading-snug text-heading">We are still adding our stays here.</p>
        <p class="mt-3 text-sm leading-7 text-ink/60">
          In the meantime, tell us how you want to travel and we will suggest the camps and lodges that fit your route.
        </p>
        <a
          class="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-goldfinch-gold px-7 text-sm font-extrabold text-heading transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
          href="/plan-my-trip"
        >
          Plan my trip <ArrowRight size={16} />
        </a>
      </div>
    </div>
  </section>
{/if}
