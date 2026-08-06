<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { Check, ChevronDown, Search, SlidersHorizontal, X } from '@lucide/svelte';
  import RangeSlider from './RangeSlider.svelte';

  // Presentation only. Every value and callback is owned by the tours page, so
  // the existing filtering, URL params, sorting, pagination and analytics keep
  // working exactly as before — this just renders them compactly.
  type Option = { slug: string; name: string };
  type Tier = { key: string; label: string };

  export let destinationOptions: Option[] = [];
  export let categoryOptions: Option[] = [];
  export let tiers: Tier[] = [];
  export let personas: { key: string; label: string }[] = [];

  export let destSlug = '';
  export let selectedCategories: string[] = [];
  export let selectedTiers: string[] = [];
  export let persona = '';
  export let popularOnly = false;

  export let lenMin = 1;
  export let lenMax = 21;
  export let lengthLo = 1;
  export let lengthHi = 21;
  export let priceMin = 0;
  export let priceMax = 10000;
  export let priceLo = 0;
  export let priceHi = 10000;
  export let rangesReady = false;

  export let resultCount = 0;
  export let activeCount = 0;
  export let catCount: (slug: string) => number = () => 0;
  export let tierCount: (key: string) => number = () => 0;
  export let days: (n: number) => string = (n) => `${n}`;
  export let money: (n: number) => string = (n) => `$${n}`;
  export let currencyKey = 'USD';

  const dispatch = createEventDispatcher<{
    destination: string;
    category: string;
    tier: string;
    persona: string;
    popular: boolean;
    length: { lo: number; hi: number };
    price: { lo: number; hi: number };
    clear: void;
    apply: void;
  }>();

  let open: '' | 'dest' | 'len' | 'price' | 'comfort' | 'type' | 'more' = '';
  let sheetOpen = false;
  let destQuery = '';
  let rootEl: HTMLDivElement;

  const toggle = (key: typeof open) => (open = open === key ? '' : key);
  const close = () => (open = '');

  $: destLabel = destSlug ? (destinationOptions.find((d) => d.slug === destSlug)?.name ?? 'Destination') : 'All destinations';
  $: lengthActive = lengthLo > lenMin || lengthHi < lenMax;
  $: priceActive = priceLo > priceMin || priceHi < priceMax;
  $: lenLabel = lengthActive ? `${lengthLo}–${lengthHi} days` : 'Any length';
  $: priceLabel = currencyKey && priceActive ? `${money(priceLo)} — ${money(priceHi)}` : 'Any budget';
  $: comfortLabel = selectedTiers.length ? `${selectedTiers.length} selected` : 'Any comfort';
  $: typeLabel = selectedCategories.length ? `${selectedCategories.length} selected` : 'All types';
  $: moreCount = (persona ? 1 : 0) + (popularOnly ? 1 : 0);
  $: filteredDestinations = destQuery.trim()
    ? destinationOptions.filter((d) => d.name.toLowerCase().includes(destQuery.trim().toLowerCase()))
    : destinationOptions;

  // Quick duration shortcuts, clamped to the real data range.
  $: shortcuts = [
    { label: '1 day', lo: lenMin, hi: Math.min(1, lenMax) },
    { label: '2–4 days', lo: Math.max(lenMin, 2), hi: Math.min(4, lenMax) },
    { label: '5 days or less', lo: lenMin, hi: Math.min(5, lenMax) },
    { label: '6–10 days', lo: Math.max(lenMin, 6), hi: Math.min(10, lenMax) },
    { label: '10+ days', lo: Math.min(10, lenMax), hi: lenMax }
  ].filter((s) => s.hi >= s.lo);

  onMount(() => {
    const onClick = (e: MouseEvent) => {
      if (rootEl && !rootEl.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        sheetOpen = false;
      }
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  });

  const trigger =
    'flex h-full min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-[10px] px-4 py-2 text-left transition hover:bg-sand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/40';
  const panel =
    'absolute left-0 top-[calc(100%+8px)] z-40 w-[min(320px,calc(100vw-2rem))] rounded-[12px] border border-ink/10 bg-surface p-4 shadow-[0_18px_50px_rgba(57,61,50,0.18)]';
</script>

<div class="relative" bind:this={rootEl}>
  <!-- ── desktop / tablet bar ─────────────────────────────────────────────── -->
  <div class="hidden rounded-[14px] border border-ink/10 bg-surface p-2 shadow-[0_10px_30px_rgba(57,61,50,0.08)] md:block">
    <div class="flex items-stretch gap-1">
      <!-- Destination -->
      <div class="relative flex min-w-0 flex-1">
        <button type="button" class={trigger} aria-expanded={open === 'dest'} on:click|stopPropagation={() => toggle('dest')}>
          <span class="gf-label">Destination</span>
          <span class="flex items-center gap-1 truncate text-sm font-bold text-heading">{destLabel} <ChevronDown size={14} class="shrink-0 text-ink/40" /></span>
        </button>
        {#if open === 'dest'}
          <div class={panel}>
            <div class="flex h-10 items-center gap-2 rounded-[8px] border border-ink/15 px-2.5">
              <Search size={15} class="text-ink/40" />
              <input class="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search destinations" bind:value={destQuery} />
            </div>
            <div class="mt-2 max-h-64 overflow-y-auto">
              <button type="button" class="flex w-full items-center justify-between rounded-[8px] px-2 py-2 text-sm hover:bg-sand/60" on:click={() => { dispatch('destination', ''); close(); }}>
                All destinations {#if !destSlug}<Check size={15} class="text-goldfinch-gold" />{/if}
              </button>
              {#each filteredDestinations as d (d.slug)}
                <button type="button" class="flex w-full items-center justify-between gap-2 rounded-[8px] px-2 py-2 text-left text-sm hover:bg-sand/60" on:click={() => { dispatch('destination', d.slug); close(); }}>
                  <span class="truncate">{d.name}</span>
                  {#if destSlug === d.slug}<Check size={15} class="shrink-0 text-goldfinch-gold" />{/if}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <span class="my-2 w-px shrink-0 bg-ink/10" aria-hidden="true"></span>

      <!-- Duration -->
      <div class="relative flex min-w-0 flex-1">
        <button type="button" class={trigger} aria-expanded={open === 'len'} on:click|stopPropagation={() => toggle('len')}>
          <span class="gf-label">Duration</span>
          <span class="flex items-center gap-1 truncate text-sm font-bold text-heading">{lenLabel} <ChevronDown size={14} class="shrink-0 text-ink/40" /></span>
        </button>
        {#if open === 'len'}
          <div class={panel}>
            {#if rangesReady}
              <RangeSlider min={lenMin} max={lenMax} bind:lo={lengthLo} bind:hi={lengthHi} format={days} />
              <div class="mt-3 flex flex-wrap gap-1.5">
                {#each shortcuts as sc (sc.label)}
                  <button type="button" class="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-goldfinch-gold/60" on:click={() => dispatch('length', { lo: sc.lo, hi: sc.hi })}>
                    {sc.label}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <span class="my-2 w-px shrink-0 bg-ink/10" aria-hidden="true"></span>

      <!-- Budget -->
      <div class="relative flex min-w-0 flex-1">
        <button type="button" class={trigger} aria-expanded={open === 'price'} on:click|stopPropagation={() => toggle('price')}>
          <span class="gf-label">Budget</span>
          <span class="flex items-center gap-1 truncate text-sm font-bold text-heading">{priceLabel} <ChevronDown size={14} class="shrink-0 text-ink/40" /></span>
        </button>
        {#if open === 'price'}
          <div class={panel}>
            {#if rangesReady}
              <RangeSlider min={priceMin} max={priceMax} step={50} bind:lo={priceLo} bind:hi={priceHi} format={money} />
              <p class="mt-2 text-xs text-ink/55">Per person, excluding international flights.</p>
            {/if}
          </div>
        {/if}
      </div>

      <span class="my-2 w-px shrink-0 bg-ink/10" aria-hidden="true"></span>

      <!-- Comfort -->
      <div class="relative flex min-w-0 flex-1">
        <button type="button" class={trigger} aria-expanded={open === 'comfort'} on:click|stopPropagation={() => toggle('comfort')}>
          <span class="gf-label">Comfort</span>
          <span class="flex items-center gap-1 truncate text-sm font-bold text-heading">{comfortLabel} <ChevronDown size={14} class="shrink-0 text-ink/40" /></span>
        </button>
        {#if open === 'comfort'}
          <div class={panel}>
            {#each tiers as t (t.key)}
              <label class="flex cursor-pointer items-center justify-between gap-3 rounded-[8px] px-2 py-2 text-sm hover:bg-sand/60">
                <span class="flex items-center gap-2.5">
                  <input type="checkbox" class="h-4 w-4 accent-forest" checked={selectedTiers.includes(t.key)} on:change={() => dispatch('tier', t.key)} />
                  {t.label}
                </span>
                <span class="text-xs text-ink/45">({tierCount(t.key)})</span>
              </label>
            {/each}
          </div>
        {/if}
      </div>

      <span class="my-2 w-px shrink-0 bg-ink/10" aria-hidden="true"></span>

      <!-- Safari type -->
      <div class="relative flex min-w-0 flex-1">
        <button type="button" class={trigger} aria-expanded={open === 'type'} on:click|stopPropagation={() => toggle('type')}>
          <span class="gf-label">Safari type</span>
          <span class="flex items-center gap-1 truncate text-sm font-bold text-heading">{typeLabel} <ChevronDown size={14} class="shrink-0 text-ink/40" /></span>
        </button>
        {#if open === 'type'}
          <div class={panel}>
            <div class="max-h-64 overflow-y-auto">
              {#each categoryOptions as c (c.slug)}
                <label class="flex cursor-pointer items-center justify-between gap-3 rounded-[8px] px-2 py-2 text-sm hover:bg-sand/60">
                  <span class="flex min-w-0 items-center gap-2.5">
                    <input type="checkbox" class="h-4 w-4 shrink-0 accent-forest" checked={selectedCategories.includes(c.slug)} on:change={() => dispatch('category', c.slug)} />
                    <span class="truncate">{c.name}</span>
                  </span>
                  <span class="shrink-0 text-xs text-ink/45">({catCount(c.slug)})</span>
                </label>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <span class="my-2 w-px shrink-0 bg-ink/10" aria-hidden="true"></span>

      <!-- More -->
      <div class="relative flex shrink-0">
        <button type="button" class={`${trigger} !flex-none`} aria-expanded={open === 'more'} on:click|stopPropagation={() => toggle('more')}>
          <span class="gf-label">More</span>
          <span class="flex items-center gap-1 whitespace-nowrap text-sm font-bold text-heading">
            Filters{#if moreCount}<span class="ml-1 rounded-full bg-forest px-1.5 text-[11px] text-white">{moreCount}</span>{/if}
            <ChevronDown size={14} class="shrink-0 text-ink/40" />
          </span>
        </button>
        {#if open === 'more'}
          <div class={`${panel} left-auto right-0`}>
            <p class="gf-label">Travel type</p>
            <div class="mt-2 flex flex-wrap gap-1.5">
              {#each personas as p (p.key)}
                <button type="button" class={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${persona === p.key ? 'border-forest bg-forest text-white' : 'border-ink/15 text-ink/70 hover:border-goldfinch-gold/60'}`} on:click={() => dispatch('persona', p.key)}>
                  {p.label}
                </button>
              {/each}
            </div>
            <label class="mt-4 flex cursor-pointer items-center gap-2.5 border-t border-ink/10 pt-3 text-sm">
              <input type="checkbox" class="h-4 w-4 accent-forest" checked={popularOnly} on:change={() => dispatch('popular', !popularOnly)} />
              Best sellers only
            </label>
          </div>
        {/if}
      </div>

      <!-- Actions -->
      <div class="flex shrink-0 items-center gap-2 pl-1">
        {#if activeCount}
          <button type="button" class="whitespace-nowrap px-2 text-sm font-bold text-forest underline-offset-2 hover:underline" on:click={() => dispatch('clear')}>Clear all</button>
        {/if}
        <button type="button" class="gf-btn-primary whitespace-nowrap px-5" on:click={() => { close(); dispatch('apply'); }}>
          View {resultCount} tour{resultCount === 1 ? '' : 's'} →
        </button>
      </div>
    </div>
  </div>

  <!-- ── mobile bar ───────────────────────────────────────────────────────── -->
  <div class="grid gap-2 md:hidden">
    <button type="button" class="flex h-12 items-center justify-between rounded-[10px] border border-ink/15 bg-surface px-3.5 text-sm" on:click={() => (sheetOpen = true)}>
      <span class="truncate font-bold text-heading">{destLabel}</span>
      <ChevronDown size={16} class="text-ink/40" />
    </button>
    <div class="grid grid-cols-2 gap-2">
      <button type="button" class="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-ink/15 bg-surface text-sm font-bold text-ink" on:click={() => (sheetOpen = true)}>
        <SlidersHorizontal size={15} /> Filters{#if activeCount}<span class="rounded-full bg-forest px-1.5 text-xs text-white">{activeCount}</span>{/if}
      </button>
      <button type="button" class="gf-btn-primary" on:click={() => dispatch('apply')}>View {resultCount}</button>
    </div>
  </div>

  <!-- active chips -->
  {#if activeCount}
    <div class="mt-3 flex flex-wrap items-center gap-2">
      {#if destSlug}
        <button class="chip" type="button" on:click={() => dispatch('destination', '')}>{destLabel} <X size={13} /></button>
      {/if}
      {#each selectedCategories as slug (slug)}
        <button class="chip" type="button" on:click={() => dispatch('category', slug)}>
          {categoryOptions.find((c) => c.slug === slug)?.name ?? slug} <X size={13} />
        </button>
      {/each}
      {#each selectedTiers as key (key)}
        <button class="chip" type="button" on:click={() => dispatch('tier', key)}>{tiers.find((t) => t.key === key)?.label} <X size={13} /></button>
      {/each}
      {#if persona}
        <button class="chip" type="button" on:click={() => dispatch('persona', persona)}>{personas.find((p) => p.key === persona)?.label} <X size={13} /></button>
      {/if}
      {#if lengthActive}
        <button class="chip" type="button" on:click={() => dispatch('length', { lo: lenMin, hi: lenMax })}>{lenLabel} <X size={13} /></button>
      {/if}
      {#if priceActive}
        <button class="chip" type="button" on:click={() => dispatch('price', { lo: priceMin, hi: priceMax })}>{priceLabel} <X size={13} /></button>
      {/if}
      {#if popularOnly}
        <button class="chip" type="button" on:click={() => dispatch('popular', false)}>Best sellers <X size={13} /></button>
      {/if}
    </div>
  {/if}
</div>

<!-- ── mobile bottom sheet ─────────────────────────────────────────────────── -->
{#if sheetOpen}
  <button class="fixed inset-0 z-[60] bg-ink/45 backdrop-blur-sm md:hidden" type="button" aria-label="Close filters" on:click={() => (sheetOpen = false)}></button>
  <div class="fixed inset-x-0 bottom-0 z-[61] flex max-h-[88dvh] flex-col rounded-t-[16px] border border-ink/10 bg-surface md:hidden">
    <div class="flex items-center justify-between border-b border-ink/10 px-4 py-3">
      <p class="text-sm font-extrabold text-heading">Filters</p>
      <button class="grid h-9 w-9 place-items-center rounded-full border border-ink/10 text-ink/70" type="button" aria-label="Close" on:click={() => (sheetOpen = false)}><X size={17} /></button>
    </div>

    <div class="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
      <details open class="border-b border-ink/10 py-3">
        <summary class="cursor-pointer text-sm font-bold text-heading">Destination</summary>
        <div class="mt-2 max-h-56 overflow-y-auto">
          <button type="button" class="block w-full rounded-[8px] px-2 py-2 text-left text-sm hover:bg-sand/60" on:click={() => dispatch('destination', '')}>All destinations</button>
          {#each destinationOptions as d (d.slug)}
            <button type="button" class={`block w-full rounded-[8px] px-2 py-2 text-left text-sm hover:bg-sand/60 ${destSlug === d.slug ? 'font-bold text-forest' : ''}`} on:click={() => dispatch('destination', d.slug)}>{d.name}</button>
          {/each}
        </div>
      </details>

      {#if rangesReady}
        <details class="border-b border-ink/10 py-3">
          <summary class="cursor-pointer text-sm font-bold text-heading">Duration · {lenLabel}</summary>
          <div class="mt-3"><RangeSlider min={lenMin} max={lenMax} bind:lo={lengthLo} bind:hi={lengthHi} format={days} /></div>
        </details>
        <details class="border-b border-ink/10 py-3">
          <summary class="cursor-pointer text-sm font-bold text-heading">Budget · {priceLabel}</summary>
          <div class="mt-3"><RangeSlider min={priceMin} max={priceMax} step={50} bind:lo={priceLo} bind:hi={priceHi} format={money} /></div>
        </details>
      {/if}

      <details class="border-b border-ink/10 py-3">
        <summary class="cursor-pointer text-sm font-bold text-heading">Comfort</summary>
        <div class="mt-2">
          {#each tiers as t (t.key)}
            <label class="flex items-center justify-between py-2 text-sm">
              <span class="flex items-center gap-2.5"><input type="checkbox" class="h-4 w-4 accent-forest" checked={selectedTiers.includes(t.key)} on:change={() => dispatch('tier', t.key)} /> {t.label}</span>
              <span class="text-xs text-ink/45">({tierCount(t.key)})</span>
            </label>
          {/each}
        </div>
      </details>

      <details class="border-b border-ink/10 py-3">
        <summary class="cursor-pointer text-sm font-bold text-heading">Safari type</summary>
        <div class="mt-2">
          {#each categoryOptions as c (c.slug)}
            <label class="flex items-center justify-between py-2 text-sm">
              <span class="flex min-w-0 items-center gap-2.5"><input type="checkbox" class="h-4 w-4 shrink-0 accent-forest" checked={selectedCategories.includes(c.slug)} on:change={() => dispatch('category', c.slug)} /> <span class="truncate">{c.name}</span></span>
              <span class="shrink-0 text-xs text-ink/45">({catCount(c.slug)})</span>
            </label>
          {/each}
        </div>
      </details>

      <details class="py-3">
        <summary class="cursor-pointer text-sm font-bold text-heading">Travel type</summary>
        <div class="mt-2 flex flex-wrap gap-1.5">
          {#each personas as p (p.key)}
            <button type="button" class={`rounded-full border px-3 py-1.5 text-xs font-semibold ${persona === p.key ? 'border-forest bg-forest text-white' : 'border-ink/15 text-ink/70'}`} on:click={() => dispatch('persona', p.key)}>{p.label}</button>
          {/each}
        </div>
        <label class="mt-3 flex items-center gap-2.5 text-sm">
          <input type="checkbox" class="h-4 w-4 accent-forest" checked={popularOnly} on:change={() => dispatch('popular', !popularOnly)} /> Best sellers only
        </label>
      </details>
    </div>

    <div class="flex items-center gap-3 border-t border-ink/10 p-3" style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom));">
      <button type="button" class="gf-btn-ghost flex-1" on:click={() => dispatch('clear')}>Clear all</button>
      <button type="button" class="gf-btn-primary flex-1" on:click={() => (sheetOpen = false)}>Show {resultCount} tour{resultCount === 1 ? '' : 's'}</button>
    </div>
  </div>
{/if}
