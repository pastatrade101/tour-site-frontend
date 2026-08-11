<script lang="ts">
  import { onMount } from 'svelte';
  import { Check } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { toMetaText } from '$lib/richText';
  import Img from './Img.svelte';

  // Selectable cards for the REAL published tour categories. Multi-select by
  // default. If the categories endpoint is unavailable we fall back to the
  // caller's plain option list rendered as chips, so the field always works.
  export let selected: string[] = [];
  export let fallbackOptions: string[] = [];
  export let tone: 'dark' | 'light' = 'dark';
  export let compact = false;
  export let onToggle: (value: string) => void = () => {};

  type Card = { name: string; description: string; image: string; record?: Record<string, unknown> };
  let cards: Card[] = [];
  let loaded = false;

  onMount(async () => {
    try {
      const res = await api.categories.list({ status: 'published', limit: 9 });
      cards = (res.data.items ?? [])
        .map((c) => ({
          name: String(c.name ?? c.slug ?? ''),
          description: toMetaText(c.who_its_for ?? c.description ?? '', 140),
          image: String(c.image_url ?? ''),
          record: c as Record<string, unknown>
        }))
        .filter((c) => c.name);
    } catch {
      cards = [];
    } finally {
      loaded = true;
    }
  });

  $: isOn = (name: string) => selected.includes(name);
  $: chipIdle =
    tone === 'dark'
      ? 'border-white/20 bg-white/[0.04] text-white/75 hover:border-goldfinch-gold/50'
      : 'border-ink/12 bg-surface text-ink/70 hover:border-goldfinch-gold/50';
  $: cardBody = tone === 'dark' ? 'bg-white/[0.04]' : 'bg-surface';
  $: cardTitle = tone === 'dark' ? 'text-white' : 'text-heading';
</script>

{#if cards.length}
  <!-- inline, horizontally scrollable row — compact and tappable -->
  <div class:gf-compact={compact} class="gf-scroll -mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1">
    {#each cards as c (c.name)}
      {@const on = isOn(c.name)}
      <button
        type="button"
        class={`group relative w-[132px] shrink-0 snap-start overflow-hidden rounded-[10px] border text-left transition sm:w-[148px] ${
          on ? 'border-goldfinch-gold ring-2 ring-goldfinch-gold/30' : 'border-goldfinch-gold/25 hover:border-goldfinch-gold/60'
        }`}
        aria-pressed={on}
        on:click={() => onToggle(c.name)}
      >
        <div class="gf-card-media relative aspect-[4/3] w-full overflow-hidden bg-forest">
          {#if c.image}
            <Img
              record={c.record}
              fields={['image_url']}
              alt={c.name}
              width={320}
              sizes="148px"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          {:else}
            <div class="h-full w-full bg-gradient-to-br from-forest to-deep-green"></div>
          {/if}
          <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          {#if on}
            <span class="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-goldfinch-gold text-heading shadow">
              <Check size={12} strokeWidth={3} />
            </span>
          {/if}
        </div>
        <p class={`px-2.5 py-2 text-[12.5px] font-bold leading-tight ${cardTitle} ${cardBody}`}>{c.name}</p>
      </button>
    {/each}
  </div>
{:else if loaded && fallbackOptions.length}
  <!-- categories unavailable — keep the field usable as simple chips -->
  <div class:gf-compact={compact} class="gf-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
    {#each fallbackOptions as opt (opt)}
      <button
        type="button"
        class={`flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
          isOn(opt) ? 'border-goldfinch-gold bg-goldfinch-gold/15 font-semibold text-white' : chipIdle
        }`}
        aria-pressed={isOn(opt)}
        on:click={() => onToggle(opt)}
      >
        {opt}
      </button>
    {/each}
  </div>
{/if}

<style>
  .gf-scroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .gf-scroll::-webkit-scrollbar {
    display: none;
  }

  .gf-card-media :global(picture),
  .gf-card-media :global(img) {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .gf-compact {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.45rem;
    margin-inline: 0;
    overflow: visible;
    padding: 0;
    scroll-snap-type: none;
  }

  .gf-compact > :global(button) {
    width: auto;
    min-width: 0;
  }

  .gf-compact .gf-card-media {
    aspect-ratio: 16 / 10;
  }

  .gf-compact > :global(button > p) {
    overflow: hidden;
    padding: 0.4rem 0.45rem;
    font-size: 0.65rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (min-width: 520px) {
    .gf-compact {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
</style>
