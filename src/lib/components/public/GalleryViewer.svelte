<script lang="ts">
  import { onMount } from 'svelte';
  import { ChevronLeft, ChevronRight, MapPin, Route, X } from '@lucide/svelte';
  import Img from './Img.svelte';
  import { staggeredCardReveal } from '$lib/animations';
  import type { ImageVariantMap } from '$lib/img';

  type Item = Record<string, unknown>;
  export let images: Item[] = [];
  export let showFilters = false;
  export let dark = false; // dark section (homepage) vs light page
  export let mosaic = false; // varied bento tiles vs uniform squares
  export let imageVariants: ImageVariantMap = {};

  // Bento span pattern (applied md+), cycling every 8 tiles for visual rhythm.
  const mosaicSpan = (i: number) => {
    const m = i % 8;
    if (m === 0) return 'md:col-span-2 md:row-span-2';
    if (m === 5) return 'md:col-span-2';
    if (m === 3) return 'md:row-span-2';
    return '';
  };

  const destOf = (im: Item) => (im.destinations as { name?: string; slug?: string } | null) ?? null;
  const tourOf = (im: Item) => (im.tours as { title?: string; slug?: string } | null) ?? null;
  const cap = (im: Item) =>
    (typeof im.title === 'string' && im.title.trim()) || (typeof im.caption === 'string' && im.caption.trim()) || '';

  $: valid = (images ?? []).filter((im) => typeof im.image_url === 'string' && im.image_url);

  $: destinations = Array.from(new Set(valid.map((im) => destOf(im)?.name).filter((n): n is string => Boolean(n)))).sort();
  let activeDest = 'All';
  $: filtered = activeDest === 'All' ? valid : valid.filter((im) => destOf(im)?.name === activeDest);
  const setDest = (d: string) => { activeDest = d; index = -1; };

  // Lightbox — index-based navigable viewer.
  let index = -1;
  $: active = index >= 0 && index < filtered.length ? filtered[index] : null;
  const open = (i: number) => (index = i);
  const close = () => (index = -1);
  const prev = () => (index = (index - 1 + filtered.length) % filtered.length);
  const next = () => (index = (index + 1) % filtered.length);

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (index < 0) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  $: chip = (on: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] transition ${
      on
        ? 'border-goldfinch-gold bg-goldfinch-gold text-heading'
        : dark
          ? 'border-white/20 bg-white/5 text-white/70 hover:border-goldfinch-gold/60'
          : 'border-ink/12 bg-surface text-ink/60 hover:border-goldfinch-gold/50'
    }`;
</script>

{#if showFilters && destinations.length > 1}
  <div class="hide-scroll -mx-1 mb-8 flex gap-2 overflow-x-auto px-1 pb-1">
    <button type="button" class={chip(activeDest === 'All')} on:click={() => setDest('All')}>All</button>
    {#each destinations as d}
      <button type="button" class={chip(activeDest === d)} on:click={() => setDest(d)}>{d}</button>
    {/each}
  </div>
{/if}

{#key activeDest}
  <div class={`grid grid-cols-2 gap-3 ${mosaic ? 'md:grid-cols-4 md:auto-rows-[190px] md:grid-flow-dense' : 'sm:grid-cols-3 lg:grid-cols-4'}`} use:staggeredCardReveal>
    {#each filtered as im, i (im.id ?? i)}
      {@const c = cap(im)}
      {@const d = destOf(im)}
      {@const t = tourOf(im)}
      {@const largeTile = mosaic && (i % 8 === 0 || i % 8 === 5)}
      <button
        type="button"
        class={`group relative aspect-square overflow-hidden rounded-[10px] bg-deep-green ring-1 ring-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold ${mosaic ? `md:aspect-auto ${mosaicSpan(i)}` : ''}`}
        on:click={() => open(i)}
        aria-label={c || 'View photo'}
      >
        <Img
          record={im}
          fields={['image_url']}
          variantsMap={imageVariants}
          width={largeTile ? 1100 : 640}
          sizes={largeTile ? '(max-width: 767px) 50vw, 50vw' : '(max-width: 767px) 50vw, 25vw'}
          alt={String(im.alt_text ?? im.title ?? 'Safari gallery image')}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
        />
        <span class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,rgba(15,26,24,0.86))] opacity-85 transition group-hover:opacity-100"></span>
        {#if d?.name}
          <span class="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-[6px] bg-black/45 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white ring-1 ring-white/15 backdrop-blur">
            <MapPin size={9} strokeWidth={2.6} /> {d.name}
          </span>
        {/if}
        <div class="absolute inset-x-0 bottom-0 p-3 text-left">
          {#if c}<p class="line-clamp-2 text-[13px] font-bold leading-tight text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.55)]">{c}</p>{/if}
          {#if t?.title}<span class="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-goldfinch-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100"><Route size={11} strokeWidth={2.4} /> <span class="truncate">{t.title}</span></span>{/if}
        </div>
      </button>
    {/each}
  </div>
{/key}

<!-- lightbox -->
{#if active}
  {@const c = cap(active)}
  {@const d = destOf(active)}
  {@const t = tourOf(active)}
  <div class="fixed inset-0 z-[100] flex flex-col backdrop-blur-sm" style="background-color: rgba(9, 11, 8, 0.94);" role="dialog" aria-modal="true" aria-label={c || 'Gallery image'}>
    <button type="button" class="absolute inset-0 cursor-default" aria-label="Close viewer" on:click={close}></button>

    <div class="relative z-10 flex items-center justify-between px-4 py-3 text-white/80 sm:px-6">
      <span class="text-xs font-bold uppercase tracking-[0.14em]">{index + 1} / {filtered.length}</span>
      <button type="button" class="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20" on:click={close} aria-label="Close">
        <X size={20} />
      </button>
    </div>

    <div class="pointer-events-none relative z-10 flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16">
      {#if filtered.length > 1}
        <button type="button" class="pointer-events-auto absolute left-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-4" on:click={prev} aria-label="Previous">
          <ChevronLeft size={22} />
        </button>
      {/if}
      <Img
        record={active}
        fields={['image_url']}
        variantsMap={imageVariants}
        width={1600}
        sizes="100vw"
        alt={String(active.alt_text ?? active.title ?? 'Safari gallery image')}
        className="pointer-events-auto max-h-full max-w-full rounded-[6px] object-contain"
      />
      {#if filtered.length > 1}
        <button type="button" class="pointer-events-auto absolute right-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-4" on:click={next} aria-label="Next">
          <ChevronRight size={22} />
        </button>
      {/if}
    </div>

    <div class="relative z-10 px-5 py-4 text-center text-white sm:px-6">
      {#if c}<p class="font-serif text-lg font-light md:text-xl">{c}</p>{/if}
      <div class="mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] font-semibold text-white/70">
        {#if d?.name}<a class="inline-flex items-center gap-1 transition hover:text-goldfinch-gold" href={d.slug ? `/destinations/${d.slug}` : '/destinations'}><MapPin size={13} /> {d.name}</a>{/if}
        {#if t?.slug}<a class="inline-flex items-center gap-1 transition hover:text-goldfinch-gold" href={`/tours/${t.slug}`}><Route size={13} /> {t.title ?? 'View safari'}</a>{/if}
      </div>
      <button type="button" class="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white/10" on:click={close}>
        <X size={14} /> Back to gallery
      </button>
    </div>
  </div>
{/if}

<style>
  .hide-scroll { scrollbar-width: none; -ms-overflow-style: none; }
  .hide-scroll::-webkit-scrollbar { display: none; }
</style>
