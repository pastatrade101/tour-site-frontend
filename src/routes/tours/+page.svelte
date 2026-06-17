<script lang="ts">
  import { browser } from '$app/environment';
  import { Check, X } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { EXPERIENCE_TO_CATEGORY, PERSONA_ORDER, PERSONAS } from '$lib/data/personas';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { placeholderTours } from '$lib/data/placeholders';
  import type { Destination, Tour } from '$lib/types';

  let tours: Tour[] = [];
  let loading = true;
  let error = '';

  // slug -> { id, name } lookups, fetched once to resolve filters + label chips.
  const destLookup = new Map<string, { id: string; name: string }>();
  const catLookup = new Map<string, { id: string; name: string }>();
  let lookupsReady = false;

  let activeDestination: { slug: string; name: string } | null = null;
  let activeCategory: { slug: string; name: string } | null = null;

  $: params = $page.url.searchParams;
  $: searchTerm = params.get('search')?.trim() ?? '';
  $: destSlug = params.get('destination')?.trim() ?? '';
  $: persona = params.get('persona')?.trim() ?? '';
  $: experience = params.get('experience')?.trim() ?? '';
  // ?experience= maps onto a category for filtering; an explicit ?category= wins.
  $: catSlug = params.get('category')?.trim() || (experience ? EXPERIENCE_TO_CATEGORY[experience] ?? '' : '');

  $: personaCfg = persona ? PERSONAS[persona] : null;
  $: hasFilters = Boolean(searchTerm || destSlug || catSlug || persona || experience);

  const ensureLookups = async () => {
    if (lookupsReady) return;
    try {
      const [dest, cat] = await Promise.all([
        api.destinations.list({ status: 'published', limit: 100 }),
        api.categories.list({ status: 'published', limit: 100 })
      ]);
      for (const item of dest.data.items as Destination[]) {
        if (item.slug) destLookup.set(item.slug, { id: item.id, name: item.name });
      }
      for (const item of cat.data.items as Array<Record<string, unknown>>) {
        if (item.slug) catLookup.set(String(item.slug), { id: String(item.id), name: String(item.name ?? item.slug) });
      }
    } catch {
      // resolution falls back to no filter
    }
    lookupsReady = true;
  };

  const load = async (search: string, dSlug: string, cSlug: string) => {
    loading = true;
    error = '';
    if (dSlug || cSlug) await ensureLookups();

    const dest = dSlug ? destLookup.get(dSlug) : undefined;
    const cat = cSlug ? catLookup.get(cSlug) : undefined;
    activeDestination = dest ? { slug: dSlug, name: dest.name } : null;
    activeCategory = cat ? { slug: cSlug, name: cat.name } : null;

    const query: Record<string, string | number> = { limit: 24 };
    if (search) query.search = search;
    if (dest) query.destination_id = dest.id;
    if (cat) query.category_id = cat.id;

    const filtered = Boolean(search || dest || cat);
    try {
      const response = await api.tours.list(query);
      const items = response.data.items;
      tours = items.length ? items : filtered ? [] : placeholderTours;
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load tours.';
      tours = filtered ? [] : placeholderTours;
    } finally {
      loading = false;
    }
  };

  // Re-run whenever any filter changes.
  $: if (browser) void load(searchTerm, destSlug, catSlug);

  // Persona = soft ordering (not a hard filter, so results never go empty): tours
  // whose persona_tags include the persona float to the top.
  const personaTags = (t: Tour) => (t as unknown as { persona_tags?: string[] }).persona_tags ?? [];
  $: displayTours = persona
    ? [...tours].sort((a, b) => Number(personaTags(b).includes(persona)) - Number(personaTags(a).includes(persona)))
    : tours;

  const withParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams($page.url.searchParams);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    return `/tours${next.toString() ? `?${next}` : ''}`;
  };
  const removeFilter = (key: string) => void goto(withParams({ [key]: null }));
  const clearAll = () => void goto('/tours');
</script>

<section class="container-shell py-14">
  {#if personaCfg}
    <!-- persona-tailored intro (SRS v2.0 §4.3) -->
    <div class="overflow-hidden rounded-[28px] border border-goldfinch-gold/20 bg-gradient-to-br from-sand via-sand to-savanna/40 p-7 md:p-9">
      <p class="text-sm font-semibold uppercase tracking-[0.16em] text-clay">For {personaCfg.label}</p>
      <h1 class="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-deep-green md:text-4xl">{personaCfg.headline}</h1>
      <p class="mt-3 max-w-2xl text-base leading-7 text-ink/70">{personaCfg.sub}</p>
      <div class="mt-5 flex flex-wrap gap-2.5">
        {#each personaCfg.concerns as concern}
          <span class="inline-flex items-center gap-1.5 rounded-full border border-forest/15 bg-white/70 px-3 py-1.5 text-sm font-medium text-ink/70">
            <span class="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-forest/10 text-forest"><Check size={11} strokeWidth={3} /></span>
            {concern}
          </span>
        {/each}
      </div>
    </div>
  {:else}
    <SectionHeader
      eyebrow="Tours"
      title={hasFilters ? 'Matching tours' : 'Tour Packages'}
      description={hasFilters
        ? 'Trips that match your search — adjust the filters below to refine.'
        : 'Explore trusted East Africa tour packages — safaris, Kilimanjaro, gorilla trekking and beaches.'}
    />
  {/if}

  <!-- persona switcher -->
  <div class="mt-6 flex flex-wrap items-center gap-2">
    <span class="text-sm font-medium text-ink/50">Who's travelling?</span>
    {#each PERSONA_ORDER as key}
      <a
        class={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
          persona === key ? 'border-forest bg-forest text-white' : 'border-ink/15 bg-white text-ink/65 hover:border-forest/40'
        }`}
        href={withParams({ persona: persona === key ? null : key })}
      >
        {PERSONAS[key].label}
      </a>
    {/each}
  </div>

  {#if hasFilters}
    <div class="mt-4 flex flex-wrap items-center gap-2">
      <span class="text-sm font-medium text-ink/50">Filters:</span>
      {#if persona && personaCfg}
        <button class="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-forest/5 px-3 py-1 text-sm font-semibold text-forest transition hover:bg-forest/10" type="button" on:click={() => removeFilter('persona')}>
          {personaCfg.label} <X size={13} />
        </button>
      {/if}
      {#if destSlug}
        <button class="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-forest/5 px-3 py-1 text-sm font-semibold text-forest transition hover:bg-forest/10" type="button" on:click={() => removeFilter('destination')}>
          {activeDestination?.name ?? destSlug} <X size={13} />
        </button>
      {/if}
      {#if catSlug}
        <button class="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-forest/5 px-3 py-1 text-sm font-semibold text-forest transition hover:bg-forest/10" type="button" on:click={() => goto(withParams({ category: null, experience: null }))}>
          {activeCategory?.name ?? catSlug} <X size={13} />
        </button>
      {/if}
      {#if searchTerm}
        <button class="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-forest/5 px-3 py-1 text-sm font-semibold text-forest transition hover:bg-forest/10" type="button" on:click={() => removeFilter('search')}>
          “{searchTerm}” <X size={13} />
        </button>
      {/if}
      <button class="text-sm font-semibold text-forest underline-offset-2 hover:underline" type="button" on:click={clearAll}>Clear all</button>
    </div>
  {/if}

  <div class="mt-8">
    {#if loading}
      <LoadingState message="Loading tours..." />
    {:else if error && tours.length === 0}
      <ErrorState message={error} />
    {:else if displayTours.length === 0}
      <EmptyState
        title="No tours match your filters"
        message="Try a different destination or experience — or plan a custom trip and we'll tailor it to you."
      />
    {:else}
      <div class="grid gap-6 md:grid-cols-3">
        {#each displayTours as tour (tour.slug)}
          <TourCard {tour} />
        {/each}
      </div>
    {/if}
  </div>
</section>
