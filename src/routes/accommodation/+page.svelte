<script lang="ts">
  /**
   * The stays index — deliberately an editorial index, not a card grid.
   *
   * The lodge data has no prices, no ratings and no featured flags, and two of
   * the ten have no photograph. What it does have is strong prose and a clean
   * taxonomy, so the page is built to be read: hairline-separated rows, large
   * serif names, and a thumbnail only where one genuinely exists.
   */
  import { ArrowRight } from '@lucide/svelte';
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

  const title = 'Where to stay — camps, lodges and hotels';
  const description =
    'The camps, lodges and hotels we book across Tanzania — chosen for where they sit, how they are run and who they suit.';
</script>

<svelte:head>
  <title>{title} | Goldfinch Adventures</title>
  <meta name="description" content={description} />
</svelte:head>

<section class="bg-canvas pb-10 pt-14 md:pb-14 md:pt-20">
  <div class="container-shell">
    <div class="max-w-3xl" use:fadeUpOnScroll={{ y: 14 }}>
      <p class="text-xs font-bold uppercase tracking-[0.2em] text-clay">Accommodation</p>
      <h1 class="mt-4 font-serif text-4xl font-semibold leading-[1.08] text-heading md:text-[56px]">
        Where you sleep shapes the whole trip
      </h1>
      <p class="mt-5 max-w-2xl text-base leading-8 text-ink/65 md:text-lg">
        {description}
      </p>
      {#if lodges.length}
        <p class="mt-6 text-sm font-semibold text-ink/45">
          {lodges.length} {lodges.length === 1 ? 'place' : 'places'} we book and return to
        </p>
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
      <ul class="mt-2" use:staggeredCardReveal={{ y: 14, stagger: 0.03 }}>
        {#each shown as lodge, index (lodge.id)}
          {@const image = sourceFor(lodge, 320, 'image_url', 'hero_image_url')}
          <li class="border-t border-ink/10 last:border-b">
            <a
              class="group grid grid-cols-[auto_1fr_auto] items-center gap-5 py-7 transition hover:bg-sand/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold md:gap-8 md:py-9"
              href={`/accommodation/${lodge.slug}`}
              data-sveltekit-preload-data="hover"
            >
              <!-- index number always present, so a row without a photograph is
                   still anchored on the left and never leaves a hole -->
              <span class="w-8 shrink-0 pl-1 font-serif text-sm italic text-ink/30 md:w-10">
                {String(index + 1).padStart(2, '0')}
              </span>

              <span class="flex min-w-0 items-center gap-5">
                {#if image}
                  <span class="hidden h-[86px] w-[114px] shrink-0 overflow-hidden rounded-[8px] bg-sand sm:block">
                    <img
                      class="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
                      src={imgUrl(image, 320, 72)}
                      alt=""
                      width="114"
                      height="86"
                      loading={index < 3 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                  </span>
                {/if}

                <span class="min-w-0">
                  {#if placeOf(lodge)}
                    <span class="block text-[11px] font-bold uppercase tracking-[0.16em] text-clay">{placeOf(lodge)}</span>
                  {/if}
                  <span class="mt-1 block font-serif text-2xl font-semibold leading-tight text-heading transition group-hover:text-forest md:text-[30px]">
                    {lodge.name}
                  </span>
                  {#if blurbOf(lodge)}
                    <span class="mt-2 block max-w-2xl text-sm leading-7 text-ink/60">{blurbOf(lodge)}</span>
                  {/if}
                  <span class="mt-3 block text-xs font-semibold text-ink/45">
                    {[levelLabel(lodge), typeLabel(lodge)].filter(Boolean).join(' · ')}
                    {#if lodge.best_for?.length}
                      <span class="text-ink/35"> — best for {lodge.best_for.join(', ').toLowerCase()}</span>
                    {/if}
                  </span>
                </span>
              </span>

              <span class="shrink-0 pr-1 text-ink/25 transition duration-300 group-hover:translate-x-1 group-hover:text-goldfinch-gold">
                <ArrowRight size={20} />
              </span>
            </a>
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

      <div class="mt-16 border-t border-ink/10 pt-10">
        <p class="max-w-xl font-serif text-2xl leading-snug text-heading md:text-3xl">
          We match the stay to the route, not the other way round.
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
