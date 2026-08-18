<script lang="ts">
  import { ArrowRight, Check, Sparkles } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { getExperienceInfo } from '$lib/data/experiences';
  import Img from '$lib/components/public/Img.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import EnquiryForm from '$lib/components/public/enquiry/EnquiryForm.svelte';
  import { configFor } from '$lib/enquiry/configs';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { breadcrumbLd } from '$lib/seo';
  import { toMetaText } from '$lib/richText';
  import type { Tour } from '$lib/types';

  $: origin = $page.url.origin;

  // The experience IS the category here, so the form opens already knowing it.
  let enquiryOpen = false;
  $: enquiryContext = {
    category: exp ? { id: String(exp.id ?? ''), name: String(exp.name ?? ''), slug: String(exp.slug ?? '') } : undefined
  };
  $: enquiryConfig = configFor('category_enquiry', enquiryContext);

  let exp: Record<string, unknown> | null = null;
  let tours: Tour[] = [];
  let loading = true;

  const load = async (slug: string) => {
    loading = true;
    exp = null;
    tours = [];
    try {
      const res = await api.categories.get(slug);
      exp = res.data;
      if (exp?.id) {
        const t = await api.tours.list({ category_id: String(exp.id), status: 'published', limit: 6 });
        tours = t.data.items ?? [];
      }
    } catch {
      exp = null;
    } finally {
      loading = false;
    }
  };

  $: slug = $page.params.slug ?? '';
  $: if (browser && slug) void load(slug);

  const FITNESS_LABELS: Record<string, string> = {
    easy: 'Easy',
    moderate: 'Moderate',
    active: 'Active',
    challenging: 'Challenging',
    strenuous: 'Strenuous'
  };
  const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Prefer CMS-managed enrichment on the category; fall back to static config.
  $: info = (() => {
    const w = exp?.who_its_for;
    // The structured level wins; the legacy free text keeps working for
    // categories that have not been re-saved with the new form yet.
    const level = typeof exp?.fitness_level === 'string' ? FITNESS_LABELS[exp.fitness_level] : undefined;
    const f = level ?? (exp?.fitness ? String(exp.fitness) : undefined);
    const h = exp?.highlights;
    if (w || (Array.isArray(h) && h.length)) {
      return {
        whoItsFor: w ? String(w) : '',
        fitness: f,
        highlights: Array.isArray(h) ? h.map(String) : []
      };
    }
    return getExperienceInfo(slug);
  })();

  // "3–10 days", or a graceful single-ended version when only one is set.
  $: durationText = (() => {
    const min = typeof exp?.min_days === 'number' ? exp.min_days : null;
    const max = typeof exp?.max_days === 'number' ? exp.max_days : null;
    if (min && max) return min === max ? `${min} day${min === 1 ? '' : 's'}` : `${min}–${max} days`;
    if (min) return `From ${min} day${min === 1 ? '' : 's'}`;
    if (max) return `Up to ${max} day${max === 1 ? '' : 's'}`;
    return '';
  })();

  $: bestMonths = Array.isArray(exp?.best_months)
    ? (exp.best_months as unknown[]).map(Number).filter((m) => m >= 1 && m <= 12).map((m) => MONTH_SHORT[m - 1])
    : [];

  $: name = exp ? String(exp.name ?? slug) : slug;
  $: image = exp ? String(exp.image_url ?? '') : '';

  // SEO with the documented fallback chain: explicit SEO fields first, then
  // the content fields that best stand in for them.
  //
  // An explicit meta_title is used verbatim — admins often write the brand
  // into it ("… | Goldfinch Adventures"), and appending it again doubled the
  // suffix. Only the name fallback gets the brand added.
  $: metaTitle = exp && String(exp.meta_title ?? '').trim()
    ? String(exp.meta_title).trim()
    : `${name} | Goldfinch Adventures`;
  $: metaDescription = exp
    ? toMetaText(String(exp.meta_description || exp.short_description || exp.description || ''), 160)
    : '';
  $: ogImage = exp ? String(exp.seo_image_url || exp.image_url || '') : '';
</script>

<svelte:head>
  {#if exp}
    <title>{metaTitle}</title>
    {#if metaDescription}<meta name="description" content={metaDescription} />{/if}
    <meta property="og:title" content={metaTitle} />
    {#if metaDescription}<meta property="og:description" content={metaDescription} />{/if}
    {#if ogImage}<meta property="og:image" content={ogImage} />{/if}
  {/if}
</svelte:head>

{#if loading}
  <section class="container-shell py-20"><LoadingState message="Loading experience..." /></section>
{:else if exp}
  <JsonLd data={breadcrumbLd(origin, [{ name: 'Home', path: '/' }, { name: 'Experiences', path: '/experiences' }, { name, path: `/experiences/${slug}` }])} />
  <section class="relative overflow-hidden bg-deep-green text-white">
    {#if image}
      <Img
        record={exp}
        fields={['image_url']}
        alt={name}
        width={1600}
        sizes="100vw"
        eager
        className="absolute inset-0 h-full w-full object-cover opacity-45"
      />
    {/if}
    <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-deep-green/80 to-deep-green/40"></div>
    <div class="container-shell relative py-14 md:py-20">
      <nav class="mb-5 flex items-center gap-2 text-sm text-white/70">
        <a class="font-medium transition hover:text-white" href="/experiences">Experiences</a>
        <span class="text-white/30">/</span>
        <span class="font-medium text-white">{name}</span>
      </nav>
      <h1 class="max-w-3xl text-3xl font-extrabold leading-[1.08] tracking-tight md:text-5xl">{name}</h1>
      {#if exp.description}<RichText value={String(exp.description)} className="rich-on-dark mt-4 max-w-2xl text-[15px] leading-7 text-white/85 md:text-base" />{/if}
      <div class="mt-6 flex flex-wrap gap-3">
        <button class="inline-flex h-12 items-center gap-2 rounded-xl bg-goldfinch-gold px-6 font-bold text-heading transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" type="button" on:click={() => (enquiryOpen = true)}>
          <Sparkles size={18} /> Plan a {name} trip
        </button>
        <a class="inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 px-6 font-semibold text-white transition hover:bg-surface/10" href={`/tours?experience=${slug}`}>
          See {name} tours <ArrowRight size={18} />
        </a>
      </div>
    </div>
  </section>

  <section class="container-shell py-12 md:py-16">
    {#if info}
      <div class="grid gap-6 md:grid-cols-[1fr_1fr]">
        <div class="rounded-2xl border border-ink/10 bg-surface p-6 shadow-soft">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">Who it's for</p>
          <p class="mt-2 text-base leading-7 text-ink/75">{info.whoItsFor}</p>
          {#if info.fitness || durationText}
            <div class="mt-4 flex flex-wrap gap-2">
              {#if info.fitness}
                <p class="inline-flex items-center gap-2 rounded-full bg-sand/60 px-3 py-1.5 text-sm font-semibold text-heading">Fitness: {info.fitness}</p>
              {/if}
              {#if durationText}
                <p class="inline-flex items-center gap-2 rounded-full bg-sand/60 px-3 py-1.5 text-sm font-semibold text-heading">Recommended: {durationText}</p>
              {/if}
            </div>
          {/if}
          {#if bestMonths.length}
            <div class="mt-4">
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">Best months</p>
              <div class="mt-2 flex flex-wrap gap-1.5">
                {#each bestMonths as month}
                  <span class="rounded-full border border-forest/20 bg-forest/5 px-2.5 py-1 text-xs font-bold text-forest">{month}</span>
                {/each}
              </div>
            </div>
          {/if}
        </div>
        <div class="rounded-2xl border border-ink/10 bg-surface p-6 shadow-soft">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">Highlights</p>
          <div class="mt-3 grid gap-2.5">
            {#each info.highlights as h}
              <div class="flex items-start gap-2 text-sm font-medium text-ink/75">
                <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest/10 text-forest"><Check size={12} strokeWidth={3} /></span>
                <RichText value={h} className="min-w-0 text-sm font-medium text-ink/75" />
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    {#if tours.length}
      <div class="mt-12">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <h2 class="text-2xl font-bold text-heading md:text-3xl">{name} trips</h2>
          <a class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading" href={`/tours?experience=${slug}`}>
            See all <ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {#each tours as tour (tour.slug)}
            <TourCard {tour} />
          {/each}
        </div>
      </div>
    {/if}
  </section>
{:else}
  <section class="container-shell py-20 text-center">
    <h1 class="text-2xl font-bold text-heading">Experience not found</h1>
    <a class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:text-heading" href="/experiences">All experiences <ArrowRight size={16} /></a>
  </section>
{/if}

<EnquiryForm open={enquiryOpen} config={enquiryConfig} context={enquiryContext} on:close={() => (enquiryOpen = false)} />
