<script lang="ts">
  import { ArrowRight, MapPin } from '@lucide/svelte';
  import { imgUrl, thumbUrl } from '$lib/img';
  import type { Destination } from '$lib/types';

  export let destination: Destination;
  export let href = `/destinations/${destination.slug}`;

  $: imageUrl = thumbUrl(destination, 'main_image_url', 'image_url', 'banner_image_url');
  $: summary = destination.short_description || destination.description || '';

  // "Great for" chips are DERIVED from the real score fields in the CMS — no
  // fabricated ratings, prices, durations or taglines. Show the strong
  // dimensions (>= 8); if none stand out, fall back to the single top one.
  const DIMENSIONS: { key: keyof Destination; label: string }[] = [
    { key: 'score_wildlife', label: 'Wildlife' },
    { key: 'score_photography', label: 'Photography' },
    { key: 'score_adventure', label: 'Adventure' },
    { key: 'score_family', label: 'Families' },
    { key: 'score_luxury', label: 'Luxury stays' }
  ];
  $: ranked = DIMENSIONS
    .map((d) => ({ label: d.label, val: Number(destination[d.key] ?? 0) }))
    .filter((d) => d.val > 0)
    .sort((a, b) => b.val - a.val);
  $: strengths = (() => {
    const strong = ranked.filter((d) => d.val >= 8).slice(0, 3);
    if (strong.length) return strong.map((d) => d.label);
    return ranked.slice(0, 1).filter((d) => d.val >= 7).map((d) => d.label);
  })();
</script>

<article class="group flex h-full flex-col overflow-hidden rounded-[14px] border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(57,61,50,0.07)] transition-shadow duration-300 hover:shadow-[0_26px_60px_rgba(57,61,50,0.16)]">
  <a {href} class="flex h-full flex-col">
    <!-- image -->
    <div class="relative aspect-[4/3] overflow-hidden bg-skywash">
      {#if imageUrl}
        <img class="h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-105" src={imgUrl(imageUrl, 800)} alt={destination.name} loading="lazy" decoding="async" />
      {:else}
        <div class="grid h-full w-full place-items-center bg-gradient-to-br from-sand to-savanna/50 text-forest/40"><MapPin size={30} /></div>
      {/if}
      {#if destination.country}
        <span class="absolute left-3 top-3 rounded-full bg-ink/75 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur">{destination.country}</span>
      {/if}
      <div class="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent"></div>
    </div>

    <!-- body -->
    <div class="flex flex-1 flex-col p-5">
      {#if destination.region}
        <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-clay">{destination.region}</p>
      {/if}
      <h3 class="mt-1.5 font-serif text-xl font-bold tracking-normal text-ink">{destination.name}</h3>
      {#if summary}
        <p class="mt-2 line-clamp-2 text-sm leading-6 text-ink/70">{summary}</p>
      {/if}

      {#if strengths.length}
        <div class="mt-3 flex flex-wrap items-center gap-1.5">
          <span class="text-[11px] font-semibold uppercase tracking-wide text-ink/40">Great for</span>
          {#each strengths as s}
            <span class="rounded-full bg-forest/[0.08] px-2.5 py-0.5 text-[11px] font-semibold text-forest">{s}</span>
          {/each}
        </div>
      {/if}

      <div class="mt-auto flex items-center justify-between gap-3 pt-5">
        {#if destination.score_budget_from}
          <p class="text-sm text-ink/60">From <span class="font-bold text-clay">USD {destination.score_budget_from.toLocaleString()}</span></p>
        {:else}
          <span aria-hidden="true"></span>
        {/if}
        <span class="inline-flex items-center gap-1.5 rounded-full bg-deep-green px-4 py-2 text-xs font-bold text-white transition group-hover:bg-forest">
          Explore details <ArrowRight size={14} strokeWidth={2.6} class="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </div>
  </a>
</article>
