<script lang="ts">
  import { ArrowRight, Check, Compass, Gauge, Search, Sparkles, Users } from '@lucide/svelte';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import { fadeUpOnScroll, revealHeading, staggeredCardReveal, tilt } from '$lib/animations';
  import { imgUrl, thumbUrl } from '$lib/img';
  import type { TourCategory } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  let query = '';
  $: categories = (data.categories ?? []) as TourCategory[];
  $: heroImage = thumbUrl(categories.find((category) => category.image_url), 'image_url');
  $: filtered = categories.filter((category) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [category.name, category.description, category.who_its_for, category.fitness, ...(category.highlights ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });
</script>

<svelte:head>
  <title>Safari Styles | Goldfinch Adventures</title>
  <meta
    name="description"
    content="Browse Goldfinch safari styles from the live tour-category library and choose the way you want to travel."
  />
  {#if heroImage}
    <link rel="preload" as="image" href={imgUrl(heroImage, 1600, 72)} fetchpriority="high" />
  {/if}
</svelte:head>

<section class="relative overflow-hidden bg-deep-green text-white">
  {#if heroImage}
    <img class="absolute inset-0 h-full w-full object-cover" src={imgUrl(heroImage, 1800, 72)} alt="" fetchpriority="high" />
    <div class="absolute inset-0 bg-gradient-to-r from-deep-green via-deep-green/78 to-deep-green/30"></div>
    <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-transparent to-deep-green/25"></div>
  {:else}
    <div class="absolute inset-0 bg-deep-green"></div>
    <div class="pointer-events-none absolute inset-0 opacity-[0.08]" style="background-image: radial-gradient(circle, #ffffff 1px, transparent 1.6px); background-size: 28px 28px;"></div>
  {/if}

  <div class="container-shell relative py-16 md:py-24">
    <nav class="mb-7 flex items-center gap-2 text-sm font-medium text-white/70">
      <a class="transition hover:text-white" href="/">Home</a>
      <span class="text-white/35">/</span>
      <span class="text-white">Safari Styles</span>
    </nav>

    <div class="grid items-end gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <p class="inline-flex items-center gap-2 rounded-[8px] border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-goldfinch-gold backdrop-blur">
          <Sparkles size={13} fill="currentColor" />
          Safari Styles
        </p>
        <h1 class="mt-5 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-normal md:text-6xl" use:revealHeading>
          Choose the way you want to travel.
        </h1>
        <p class="mt-5 max-w-2xl text-base font-medium leading-8 text-white/82 md:text-lg">
          Browse live tour categories from Goldfinch and start with the style that fits your trip: safari pace, comfort level, interests and travel goals.
        </p>
      </div>

      <div class="rounded-[8px] border border-white/15 bg-white/10 p-4 backdrop-blur" use:fadeUpOnScroll={{ y: 16 }}>
        <p class="text-sm font-bold text-white">Find a style faster</p>
        <label class="mt-3 flex h-12 items-center gap-2 rounded-[8px] bg-surface px-3 text-heading">
          <Search size={18} class="shrink-0 text-forest" />
          <input class="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-ink/35" placeholder="Search safari, family, luxury..." bind:value={query} />
        </label>
        <p class="mt-3 text-xs font-medium text-white/65">{filtered.length} style{filtered.length === 1 ? '' : 's'} available</p>
      </div>
    </div>
  </div>
</section>

<section class="relative overflow-hidden bg-canvas py-14 md:py-20">
  <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-goldfinch-gold/30 to-transparent" aria-hidden="true"></div>
  <div class="container-shell">
    {#if categories.length === 0}
      <EmptyState title="Safari styles coming soon" message="Published tour categories will appear here once they are added in the backend." />
    {:else if filtered.length === 0}
      <EmptyState title="No matching safari styles" message="Try another search term or view all styles again." />
    {:else}
      <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.05 }}>
        {#each filtered as category (category.slug)}
          <a
            class="group flex h-full flex-col overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-forest/25 hover:shadow-card-hover"
            href={`/safari-styles/${category.slug}`}
            use:tilt={{ max: 3 }}
          >
            <div class="relative aspect-[16/10] overflow-hidden bg-skywash">
              {#if category.image_url}
                <img class="h-full w-full object-cover transition duration-700 group-hover:scale-105" src={imgUrl(category.image_url, 820)} alt={category.name} loading="lazy" decoding="async" />
              {:else}
                <div class="grid h-full w-full place-items-center bg-gradient-to-br from-sand to-savanna/50 text-forest/40">
                  <Compass size={34} />
                </div>
              {/if}
              <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-deep-green/65 to-transparent"></div>
            </div>

            <div class="flex flex-1 flex-col p-5">
              <h2 class="text-xl font-extrabold tracking-normal text-heading">{category.name}</h2>
              {#if category.description}
                <p class="mt-2 line-clamp-3 text-sm leading-6 text-ink/68">{category.description}</p>
              {/if}

              <div class="mt-4 grid gap-2">
                {#if category.who_its_for}
                  <span class="inline-flex items-start gap-2 text-sm leading-5 text-ink/65">
                    <Users size={15} class="mt-0.5 shrink-0 text-forest" />
                    <span class="line-clamp-2">{category.who_its_for}</span>
                  </span>
                {/if}
                {#if category.fitness}
                  <span class="inline-flex items-center gap-2 text-sm font-semibold text-forest">
                    <Gauge size={15} />
                    {category.fitness}
                  </span>
                {/if}
              </div>

              {#if category.highlights?.length}
                <div class="mt-4 grid gap-1.5">
                  {#each category.highlights.slice(0, 3) as highlight}
                    <span class="inline-flex items-start gap-2 text-xs font-medium leading-5 text-ink/62">
                      <Check size={13} strokeWidth={2.8} class="mt-0.5 shrink-0 text-goldfinch-gold" />
                      {highlight}
                    </span>
                  {/each}
                </div>
              {/if}

              <span class="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-deep-green px-4 text-sm font-bold text-white transition group-hover:bg-forest">
                View style <ArrowRight size={15} strokeWidth={2.6} class="transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</section>
