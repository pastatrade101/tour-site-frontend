<script lang="ts">
  import { Camera, Compass, MapPin } from '@lucide/svelte';
  import { imgUrl } from '$lib/img';
  import { brand } from '$lib/brand';
  import { SAMPLE_GALLERY } from '$lib/data/sampleGallery';
  import GalleryViewer from '$lib/components/public/GalleryViewer.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  // Real published images ordered by sort_order; falls back to a sample set so
  // the page is never blank while the gallery is being populated.
  $: real = ((data.galleryItems ?? []) as Record<string, unknown>[])
    .filter((im) => typeof im.image_url === 'string' && im.image_url)
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
  $: images = real.length ? real : SAMPLE_GALLERY;
  $: isSample = real.length === 0;

  const destName = (im: Record<string, unknown>) => (im.destinations as { name?: string } | null)?.name || '';
  $: destinations = Array.from(new Set(images.map(destName).filter(Boolean)));
</script>

<svelte:head>
  <title>Safari Gallery — Real Moments from Tanzania | {brand.name}</title>
  <meta name="description" content="A gallery of real moments from Goldfinch Adventures safaris — Serengeti, Ngorongoro, the Great Migration and Zanzibar, captured in the field." />
</svelte:head>

<!-- header -->
<section class="relative isolate overflow-hidden bg-deep-green text-white">
  {#if images[0]}
    <img class="absolute inset-0 h-full w-full object-cover opacity-60" src={imgUrl(String(images[0].image_url), 1800)} alt="" aria-hidden="true" />
  {/if}
  <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,18,15,0.45)_0%,rgba(20,18,15,0.25)_45%,rgba(20,18,15,0.78)_100%)]"></div>
  <div class="container-shell relative py-16 [text-shadow:0_2px_16px_rgba(0,0,0,0.5)] md:py-20">
    <nav class="mb-6 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/55">
      <a class="transition hover:text-goldfinch-gold" href="/">Home</a><span>/</span><span class="text-white/80">Gallery</span>
    </nav>
    <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-goldfinch-gold">Travel Journal</p>
    <h1 class="mt-3 max-w-2xl font-serif text-[30px] font-light leading-[1.08] md:text-[46px]">Safari Moments,<br />Unedited.</h1>
    <p class="mt-4 max-w-xl text-[15px] font-medium leading-7 text-white/80 md:text-base">
      Every image tells the story of a real journey across Tanzania — from sunrise game drives in the Serengeti to quiet evenings overlooking the Ngorongoro Crater.
    </p>
    <div class="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2.5">
      <span class="inline-flex items-center gap-2 text-sm font-bold text-white/90">
        <Camera size={16} strokeWidth={2.2} class="text-goldfinch-gold" /> {images.length} Image{images.length === 1 ? '' : 's'}
      </span>
      {#if destinations.length}
        <span class="h-3.5 w-px bg-white/25" aria-hidden="true"></span>
        <span class="inline-flex items-center gap-2 text-sm font-bold text-white/90">
          <MapPin size={16} strokeWidth={2.2} class="text-goldfinch-gold" /> {destinations.length} Destination{destinations.length === 1 ? '' : 's'}
        </span>
        <span class="h-3.5 w-px bg-white/25" aria-hidden="true"></span>
        <span class="inline-flex min-w-0 items-center gap-2 text-[13px] font-semibold text-white/70">
          <Compass size={16} strokeWidth={2.2} class="shrink-0 text-goldfinch-gold" />
          <span class="truncate">{destinations.slice(0, 4).join(' • ')}{destinations.length > 4 ? ' …' : ''}</span>
        </span>
      {/if}
    </div>
  </div>
</section>

<section class="container-shell py-12 md:py-16">
  {#if isSample}
    <p class="mb-6 rounded-[8px] border border-goldfinch-gold/30 bg-goldfinch-gold/10 px-4 py-2.5 text-sm font-medium text-clay">
      Showing sample images. Publish your own in <span class="font-bold">Admin → Gallery</span> and they’ll replace these automatically.
    </p>
  {/if}
  <GalleryViewer {images} showFilters />
</section>
