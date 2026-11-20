<script lang="ts">
  import { t } from '$lib/i18n/ui';
  import { onMount } from 'svelte';
  import { ArrowRight } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { revealHeading, staggeredCardReveal, tilt } from '$lib/animations';
  import { KINDS } from '$lib/compare/kinds';
  import { COMPARE_KINDS, type CompareKind } from '$lib/compare/model';
  import { compareListHref, compareState } from '$lib/compare/store';
  import { COMPARISONS } from '$lib/data/comparisons';
  import { toMetaText } from '$lib/richText';
  import type { Comparison } from '$lib/types';

  type Card = { slug: string; eyebrow: string; title: string; intro: string };

  let items: Card[] = COMPARISONS.map((c) => ({ slug: c.slug, eyebrow: c.eyebrow, title: c.title, intro: c.intro }));

  // The side-by-side tool: one entry per category, opening on whatever the visitor has already picked in it.
  const TOOL_TEXT: Record<CompareKind, string> = {
    tours: 'compare.hub_tours_text',
    accommodation: 'compare.hub_accommodation_text',
    destinations: 'compare.hub_destinations_text',
    guides: 'compare.hub_guides_text'
  };

  onMount(async () => {
    try {
      const res = await api.comparisons.list({ status: 'published', limit: 100 });
      const rows = res.data.items as Comparison[];
      if (rows.length) items = rows.map((c) => ({ slug: c.slug, eyebrow: c.eyebrow ?? '', title: c.title, intro: toMetaText(c.intro ?? '', 170) }));
    } catch {
      // keep config fallback
    }
  });
</script>

<section class="relative overflow-hidden bg-gradient-to-br from-deep-green via-forest to-deep-green text-white">
  <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
  <div class="container-shell relative py-16 text-center md:py-20">
    <p class="font-serif text-xl italic text-savanna">{$t('ui.compare')}</p>
    <h1 class="mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-[1.1] tracking-tight md:text-[44px]" use:revealHeading>{$t('ui.honest_sidebyside_comparisons')}</h1>
    <p class="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-white/75 md:text-lg">{$t('ui.the_big_east_africa_decisions')}</p>
  </div>
</section>

<section class="container-shell pt-12 md:pt-16" aria-labelledby="compare-tool-title">
  <p class="font-serif text-lg italic text-clay">{$t('compare.hub_eyebrow')}</p>
  <h2 id="compare-tool-title" class="mt-1 text-2xl font-extrabold tracking-tight text-heading md:text-3xl">{$t('compare.hub_title')}</h2>
  <p class="mt-2 max-w-2xl text-[15px] leading-7 text-ink/70">{$t('compare.hub_text')}</p>
  <ul class="mt-7 grid border-y border-ink/10 sm:grid-cols-2 lg:grid-cols-4">
    {#each COMPARE_KINDS as kind (kind)}
      {@const picked = $compareState.lists[kind].length}
      <li class="border-ink/10 max-sm:[&:not(:first-child)]:border-t sm:max-lg:[&:nth-child(n+3)]:border-t sm:[&:nth-child(even)]:border-l lg:[&:not(:first-child)]:border-l">
        <a class="group flex h-full flex-col px-1 py-5 transition hover:bg-surface sm:px-5" href={compareListHref($compareState, kind)}>
          <span class="flex items-center gap-2 text-lg font-extrabold text-heading">
            {$t(KINDS[kind].nameKey)}
            {#if picked}<span class="grid h-5 min-w-[20px] place-items-center rounded-full bg-deep-green px-1.5 text-[11px] font-bold text-white">{picked}</span>{/if}
          </span>
          <span class="mt-1 flex-1 text-sm leading-6 text-ink/65">{$t(TOOL_TEXT[kind])}</span>
          <span class="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition group-hover:text-heading">{$t('compare.hub_start')}<ArrowRight size={16} /></span>
        </a>
      </li>
    {/each}
  </ul>
</section>

<section class="container-shell py-12 md:py-16">
  <h2 class="mb-6 text-2xl font-extrabold tracking-tight text-heading md:text-3xl">{$t('compare.hub_written')}</h2>
  <div class="grid gap-6 md:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.06 }}>
    {#each items as c (c.slug)}
      <a
        class="group flex flex-col rounded-[12px] border border-ink/10 bg-surface p-6 shadow-[0_14px_40px_rgba(57,61,50,0.07)] transition-shadow duration-300 hover:border-goldfinch-gold/40 hover:shadow-[0_26px_60px_rgba(57,61,50,0.16)]"
        href={`/compare/${c.slug}`}
        use:tilt={{ max: 5 }}
      >
        <p class="font-serif text-lg italic text-clay">{c.eyebrow}</p>
        <h2 class="mt-2 text-xl font-extrabold leading-snug text-heading">{c.title}</h2>
        <p class="mt-2 flex-1 text-sm leading-6 text-ink/65">{c.intro}</p>
        <span class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition group-hover:text-heading">{$t('ui.see_the_comparison')}<ArrowRight size={16} />
        </span>
      </a>
    {/each}
  </div>
</section>
