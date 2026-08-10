<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import DestinationsHero from '$lib/components/public/destinations/DestinationsHero.svelte';
  import DestinationSearchBar from '$lib/components/public/destinations/DestinationSearchBar.svelte';
  import ExperienceTiles from '$lib/components/public/destinations/ExperienceTiles.svelte';
  import FeaturedRail from '$lib/components/public/destinations/FeaturedRail.svelte';
  import DiscoveryRail from '$lib/components/public/destinations/DiscoveryRail.svelte';
  import DestinationCardPremium from '$lib/components/public/destinations/DestinationCardPremium.svelte';
  import DestinationsCTA from '$lib/components/public/destinations/DestinationsCTA.svelte';
  import { brand } from '$lib/brand';
  import { publicSettings, settingText } from '$lib/settings';
  import { sourceFor, thumbUrl } from '$lib/img';
  import { breadcrumbLd } from '$lib/seo';
  import {
    buildFacetGroups,
    collectionsOf,
    countFor,
    matchesFacet,
    matchesSearch,
    regionOf
  } from '$lib/destinationFacets';
  import type { Destination } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: destinations = (data.destinations ?? []) as Destination[];

  // ── filter state, mirrored into the URL so a filtered view is shareable ────
  let search = '';
  let activeGroup = '';
  let activeFacet = '';
  let hydrated = false;

  // Seed once from the URL; after that the UI is the source of truth.
  $: if (!hydrated && $page.url) {
    search = $page.url.searchParams.get('q') ?? '';
    activeGroup = $page.url.searchParams.get('group') ?? '';
    activeFacet = $page.url.searchParams.get('facet') ?? '';
    hydrated = true;
  }

  // SvelteKit's router is not initialised during hydration, and replaceState
  // throws if called before it is — so URL syncing only starts after mount.
  let routerReady = false;
  onMount(() => { routerReady = true; });

  const syncUrl = () => {
    if (!routerReady) return;
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (activeGroup && activeFacet) {
      params.set('group', activeGroup);
      params.set('facet', activeFacet);
    }
    const query = params.toString();
    // history.replaceState rather than SvelteKit's: this only needs to keep the
    // address bar shareable, not re-run the loader, and it works regardless of
    // router state.
    history.replaceState(history.state, '', `${location.pathname}${query ? `?${query}` : ''}`);
  };

  const onGroup = (event: CustomEvent<string>) => {
    activeGroup = event.detail;
    activeFacet = '';
    syncUrl();
  };
  const onFacet = (event: CustomEvent<string>) => {
    activeFacet = event.detail;
    syncUrl();
  };
  const onFacetPair = (event: CustomEvent<{ group: string; facet: string }>) => {
    activeGroup = event.detail.group;
    activeFacet = event.detail.facet;
    syncUrl();
  };
  const onExperience = (event: CustomEvent<string>) => {
    activeGroup = 'experience';
    activeFacet = event.detail;
    syncUrl();
  };

  const clearAll = () => {
    search = '';
    activeGroup = '';
    activeFacet = '';
    syncUrl();
  };

  $: search, routerReady && syncUrl();

  // ── derived data — all of it from real CMS fields ─────────────────────────
  $: groups = buildFacetGroups(destinations);
  $: if (groups.length && !activeGroup) activeGroup = groups[0].key;

  $: counts = Object.fromEntries(
    groups.flatMap((group) =>
      group.facets.map((facet) => [`${group.key}:${facet.key}`, countFor(destinations, group.key, facet.key)])
    )
  ) as Record<string, number>;

  $: filtered = destinations
    .filter((destination) => matchesSearch(destination, search))
    .filter((destination) => (activeFacet ? matchesFacet(destination, activeGroup, activeFacet) : true));

  $: isFiltering = Boolean(search.trim() || activeFacet);
  $: featured = destinations.filter((destination) => destination.is_featured);
  $: collections = collectionsOf(destinations);
  $: regions = [...new Set(destinations.map(regionOf).filter(Boolean))].sort();
  // full-bleed hero: never the 600px thumbnail, which would be upscaled
  $: heroDestination = destinations.find((destination) => thumbUrl(destination, 'banner_image_url', 'main_image_url', 'image_url'));
  $: heroImage = sourceFor(
    heroDestination,
    1920,
    'banner_image_url',
    'main_image_url',
    'image_url'
  );
  $: experienceFacets = groups.find((group) => group.key === 'experience')?.facets ?? [];
  $: experienceCounts = Object.fromEntries(
    experienceFacets.map((facet) => [facet.key, countFor(destinations, 'experience', facet.key)])
  ) as Record<string, number>;
  $: popular = featured.slice(0, 6).map((destination) => ({ label: destination.name, href: `/destinations/${destination.slug}` }));
  // Same source the footer uses, so the number stays managed in settings.
  $: waDigits = (settingText($publicSettings, 'whatsapp_number') || settingText($publicSettings, 'contact_phone')).replace(/[^0-9]/g, '');
  $: whatsapp = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`Hello ${brand.name}, I would like help choosing a destination.`)}`
    : '';

  // ── SEO ───────────────────────────────────────────────────────────────────
  $: origin = $page.url.origin;
  $: title = 'Destinations in Tanzania & East Africa';
  $: description =
    'Explore every destination we plan — national parks, the Serengeti ecosystem, the Southern Circuit and the Zanzibar coast — with guidance from a local Tanzania team.';
  $: destinationListSchema = {
    '@type': 'ItemList',
    name: 'Goldfinch Adventures destinations',
    itemListElement: filtered.map((destination, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: destination.name,
      url: `${origin}/destinations/${destination.slug}`
    }))
  };
</script>

<svelte:head>
  <title>{title} | Goldfinch Adventures</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={`${origin}/destinations`} />
</svelte:head>

<JsonLd data={breadcrumbLd(origin, [{ name: 'Home', path: '/' }, { name: 'Destinations', path: '/destinations' }])} />
{#if filtered.length}
  <JsonLd data={destinationListSchema} />
{/if}

<DestinationsHero {heroImage} heroRecord={heroDestination} total={destinations.length} {regions} />

<!-- Sits below the hero on its own ground rather than straddling the seam. -->
<section class="destinations-filter-section bg-canvas pt-8 md:pt-10">
  <div class="container-shell">
    <DestinationSearchBar
      bind:value={search}
      {groups}
      {activeGroup}
      {activeFacet}
      resultCount={filtered.length}
      {popular}
      on:facet={onFacetPair}
      on:clear={clearAll}
    />
  </div>
</section>

<section class="destinations-experience-section bg-canvas pt-8 md:pt-10">
  <div class="container-shell">
    <ExperienceTiles
      facets={experienceFacets}
      counts={experienceCounts}
      activeFacet={activeGroup === 'experience' ? activeFacet : ''}
      on:facet={onExperience}
    />
  </div>
</section>

{#if featured.length && !isFiltering}
  <section class="destinations-featured-section bg-canvas pt-8 md:pt-12">
    <div class="container-shell">
      <FeaturedRail destinations={featured} />
    </div>
  </section>
{/if}

{#if !isFiltering}
  {#each collections as collection (collection.key)}
    <section class="destinations-collection-section bg-canvas pt-0 md:pt-2">
      <div class="destinations-collection-shell container-shell">
        <DiscoveryRail title={collection.title} blurb={collection.blurb} destinations={collection.items} />
      </div>
    </section>
  {/each}
{/if}

<section id="all-destinations" class="destinations-all-section scroll-mt-28 mt-6 bg-sand/35 py-10 md:mt-8 md:py-14">
  <div class="destinations-all-shell container-shell">
    <div class="destinations-all-heading flex flex-wrap items-end justify-between gap-4" use:fadeUpOnScroll={{ y: 14 }}>
      <div class="max-w-2xl">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">Every destination</p>
        <h2 class="mt-3 font-serif text-3xl font-bold leading-tight text-heading md:text-[42px]">
          {isFiltering ? 'Matching destinations' : 'Choose where your trip begins'}
        </h2>
      </div>
      <p class="destinations-result-count text-sm font-semibold text-ink/50" aria-live="polite">
        {filtered.length} of {destinations.length}
      </p>
    </div>

    {#if filtered.length}
      <div class="destinations-grid mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.04 }}>
        {#each filtered as destination, index (destination.id)}
          <DestinationCardPremium {destination} eager={index < 3} />
        {/each}
      </div>
    {:else}
      <!-- Never an empty grid: explain, offer a reset, and still show real places. -->
      <div class="mt-10 rounded-[10px] bg-surface px-6 py-14 text-center shadow-card">
        <p class="font-serif text-2xl font-bold text-heading">Nothing matches that yet</p>
        <p class="mx-auto mt-3 max-w-md text-sm leading-7 text-ink/60">
          Try a different filter or search for a park, island or region — or start from the places our specialists
          recommend most.
        </p>
        <button
          type="button"
          class="mt-6 inline-flex h-11 items-center rounded-full bg-forest px-6 text-sm font-bold text-white transition hover:bg-deep-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
          on:click={clearAll}
        >
          Clear filters
        </button>
      </div>

      {#if featured.length}
        <div class="mt-12">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">You might start here</p>
          <div class="destinations-grid mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {#each featured.slice(0, 3) as destination (destination.id)}
              <DestinationCardPremium {destination} />
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</section>

<DestinationsCTA image={heroImage} imageRecord={heroDestination} {whatsapp} total={destinations.length} />

<style>
  @media (max-width: 767px) {
    .destinations-filter-section {
      padding-top: 1rem;
    }

    .destinations-experience-section {
      padding-top: 1.05rem;
    }

    .destinations-featured-section {
      padding-top: 1.4rem;
    }

    .destinations-collection-section {
      padding-top: 1.15rem;
    }

    .destinations-collection-shell {
      width: 100%;
      max-width: none;
    }

    .destinations-all-section {
      margin-top: 2rem;
      padding-block: 2.5rem;
      scroll-margin-top: 7rem;
    }

    .destinations-all-heading {
      align-items: flex-start;
      gap: 0.65rem;
    }

    .destinations-all-heading h2 {
      margin-top: 0.55rem;
      font-size: clamp(1.8rem, 7.6vw, 2.2rem);
      line-height: 1.08;
      letter-spacing: 0;
    }

    .destinations-result-count {
      border-radius: 999px;
      background: rgb(var(--c-surface));
      padding: 0.35rem 0.7rem;
      font-size: 0.75rem;
      box-shadow: 0 8px 20px rgb(57 61 50 / 0.05);
    }

    .destinations-grid {
      margin-top: 1.15rem;
      gap: 0.8rem;
    }
  }

  @media (min-width: 480px) and (max-width: 767px) {
    .destinations-all-shell {
      width: calc(100vw - 48px);
      max-width: none;
    }
  }

  @media (min-width: 640px) and (max-width: 767px) {
    .destinations-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.9rem;
    }
  }
</style>
