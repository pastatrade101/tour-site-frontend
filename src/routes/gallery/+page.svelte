<script lang="ts">
  import { ArrowRight, Filter, Image as ImageIcon, Search, X } from '@lucide/svelte';
  import GalleryGrid from '$lib/components/public/GalleryGrid.svelte';
  import { imgUrl } from '$lib/img';
  import type { GalleryCardItem } from '$lib/components/public/GalleryCard.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  type Option = { label: string; value: string };

  const items = (data.galleryItems ?? []) as GalleryCardItem[];
  const relationLabel = (item: GalleryCardItem, key: 'destination' | 'tour') =>
    key === 'destination' ? item.destinations?.name?.trim() || '' : item.tours?.title?.trim() || '';
  const relationSlug = (item: GalleryCardItem, key: 'destination' | 'tour') =>
    key === 'destination' ? item.destinations?.slug?.trim() || '' : item.tours?.slug?.trim() || '';
  const optionList = (key: 'destination' | 'tour'): Option[] => {
    const seen = new Map<string, string>();
    for (const item of items) {
      const slug = relationSlug(item, key);
      const label = relationLabel(item, key);
      if (slug && label) seen.set(slug, label);
    }
    return [...seen.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  let search = '';
  let mediaType = 'all';
  let destination = 'all';
  let tour = 'all';

  $: destinationOptions = optionList('destination');
  $: tourOptions = optionList('tour');
  $: heroItem = items.find((item) => item.image_url) ?? null;
  $: destinationCount = destinationOptions.length;
  $: tourCount = tourOptions.length;
  $: mediaFilters = [
    { label: 'All', value: 'all', count: items.length },
    { label: 'Photos', value: 'image', count: items.filter((item) => (item.media_type || 'image') === 'image').length },
    { label: 'Videos', value: 'video', count: items.filter((item) => item.media_type === 'video').length },
    { label: 'Documents', value: 'document', count: items.filter((item) => item.media_type === 'document').length }
  ].filter((filter) => filter.value === 'all' || filter.count > 0);
  $: query = search.trim().toLowerCase();
  $: filtered = items.filter((item) => {
    const typeMatch = mediaType === 'all' || (item.media_type || 'image') === mediaType;
    const destinationMatch = destination === 'all' || relationSlug(item, 'destination') === destination;
    const tourMatch = tour === 'all' || relationSlug(item, 'tour') === tour;
    const haystack = [
      item.title,
      item.caption,
      item.alt_text,
      relationLabel(item, 'destination'),
      relationLabel(item, 'tour'),
      item.media_type
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return typeMatch && destinationMatch && tourMatch && (!query || haystack.includes(query));
  });
  $: hasFilters = Boolean(query || mediaType !== 'all' || destination !== 'all' || tour !== 'all');

  const clearFilters = () => {
    search = '';
    mediaType = 'all';
    destination = 'all';
    tour = 'all';
  };
</script>

<svelte:head>
  <title>Gallery | Goldfinch Adventures</title>
  {#if heroItem?.image_url}
    <link rel="preload" as="image" href={imgUrl(heroItem.image_url, 1600, 72)} fetchpriority="high" />
  {/if}
</svelte:head>

<section class="relative isolate z-0 overflow-hidden bg-deep-green text-white">
  {#if heroItem?.image_url}
    <img class="absolute inset-0 h-full w-full object-cover" src={imgUrl(heroItem.image_url, 1800)} alt="" />
  {/if}
  <div class="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/30"></div>
  <div class="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-canvas to-transparent"></div>

  <div class="container-shell relative grid min-h-[480px] items-end pb-16 pt-32 md:min-h-[560px] md:pb-20">
    <div class="max-w-3xl">
      <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-goldfinch-gold">Gallery</p>
      <h1 class="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-normal md:text-6xl">
        Moments from the journeys we plan
      </h1>
      <p class="mt-5 max-w-2xl text-[15px] leading-8 text-white/85 md:text-lg">
        Browse published safari, mountain, coast and lodge visuals from the gallery CMS.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <span class="rounded-[8px] bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/25 backdrop-blur">{items.length} media item{items.length === 1 ? '' : 's'}</span>
        {#if destinationCount}<span class="rounded-[8px] bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/25 backdrop-blur">{destinationCount} destination{destinationCount === 1 ? '' : 's'}</span>{/if}
        {#if tourCount}<span class="rounded-[8px] bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/25 backdrop-blur">{tourCount} tour link{tourCount === 1 ? '' : 's'}</span>{/if}
      </div>
    </div>
  </div>
</section>

<section class="relative z-10 bg-canvas py-10 md:py-14">
  <div class="container-shell">
    <div class="relative z-10 -mt-24 rounded-[10px] border border-ink/10 bg-surface p-4 shadow-[0_28px_80px_rgba(57,61,50,0.18)] md:p-5">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <label class="grid gap-2 text-sm font-semibold text-ink">
          <span>Search gallery</span>
          <span class="flex h-11 items-center gap-2 rounded-[8px] border border-ink/20 bg-canvas px-3 transition focus-within:border-forest/40 focus-within:ring-2 focus-within:ring-forest/12">
            <Search size={16} class="shrink-0 text-ink/45" />
            <input class="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/40" bind:value={search} placeholder="Search title, caption..." />
          </span>
        </label>

        <label class="grid gap-2 text-sm font-semibold text-ink">
          <span>Media</span>
          <select class="h-11 w-full rounded-[8px] border border-ink/20 bg-canvas px-3 text-sm text-ink outline-none transition focus:border-forest/40 focus:ring-2 focus:ring-forest/12" bind:value={mediaType}>
            {#each mediaFilters as filter}
              <option value={filter.value}>{filter.label} ({filter.count})</option>
            {/each}
          </select>
        </label>

        <label class="grid gap-2 text-sm font-semibold text-ink">
          <span>Destination</span>
          <select class="h-11 w-full rounded-[8px] border border-ink/20 bg-canvas px-3 text-sm text-ink outline-none transition focus:border-forest/40 focus:ring-2 focus:ring-forest/12" bind:value={destination}>
            <option value="all">All destinations</option>
            {#each destinationOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </label>

        <label class="grid gap-2 text-sm font-semibold text-ink">
          <span>Tour</span>
          <select class="h-11 w-full rounded-[8px] border border-ink/20 bg-canvas px-3 text-sm text-ink outline-none transition focus:border-forest/40 focus:ring-2 focus:ring-forest/12" bind:value={tour}>
            <option value="all">All tours</option>
            {#each tourOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </label>

        <button class="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-ink/15 bg-surface px-4 text-sm font-bold text-ink shadow-sm transition hover:border-forest/25 hover:bg-sand/40 disabled:opacity-40 sm:col-span-2 lg:col-span-1" type="button" disabled={!hasFilters} on:click={clearFilters}>
          <X size={15} /> Clear
        </button>
      </div>
    </div>

    <div class="mt-8 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-clay"><Filter size={14} /> Filtered results</p>
        <h2 class="mt-2 text-2xl font-extrabold text-heading md:text-3xl">{filtered.length} item{filtered.length === 1 ? '' : 's'} shown</h2>
      </div>
      {#if hasFilters}
        <button class="inline-flex h-10 items-center gap-2 rounded-[8px] bg-deep-green px-4 text-sm font-bold text-white shadow-sm transition hover:bg-forest" type="button" on:click={clearFilters}>
          Reset view <ArrowRight size={15} />
        </button>
      {/if}
    </div>

    {#if filtered.length}
      <div class="mt-8">
        <GalleryGrid images={filtered} />
      </div>
    {:else if items.length}
      <div class="mt-8 grid min-h-[260px] place-items-center rounded-[8px] border border-dashed border-ink/15 bg-surface p-8 text-center">
        <div>
          <ImageIcon class="mx-auto text-ink/30" size={34} />
          <h2 class="mt-4 text-xl font-extrabold text-heading">No gallery items match these filters</h2>
          <p class="mt-2 text-sm leading-6 text-ink/55">Clear the filters or try a broader search.</p>
        </div>
      </div>
    {:else}
      <div class="mt-8 grid min-h-[300px] place-items-center rounded-[8px] border border-dashed border-ink/15 bg-surface p-8 text-center">
        <div>
          <ImageIcon class="mx-auto text-ink/30" size={36} />
          <h2 class="mt-4 text-xl font-extrabold text-heading">No published gallery items yet</h2>
          <p class="mt-2 text-sm leading-6 text-ink/55">Add published items in Admin → Gallery to populate this page.</p>
        </div>
      </div>
    {/if}
  </div>
</section>
