<script lang="ts">
  import { ArrowRight, Check, Compass, Gauge, Sparkles, Users } from '@lucide/svelte';
  import { page } from '$app/stores';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import EnquiryForm from '$lib/components/public/enquiry/EnquiryForm.svelte';
  import { configFor } from '$lib/enquiry/configs';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { fadeUpOnScroll, revealHeading, staggeredCardReveal } from '$lib/animations';
  import { imgUrl, srcsetFor, variantSrc, variantsOf } from '$lib/img';
  import { toMetaText } from '$lib/richText';
  import { breadcrumbLd } from '$lib/seo';
  import Img from '$lib/components/public/Img.svelte';
  import type { Tour, TourCategory } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: category = data.category as TourCategory | null;
  $: tours = (data.tours ?? []) as Tour[];
  $: origin = $page.url.origin;
  $: title = category?.meta_title || (category ? `${category.name} Safari Style` : 'Safari Style');
  $: description = toMetaText(category?.meta_description || category?.description || 'Explore this Goldfinch safari style and matching tours.', 170);
  $: heroVariants = variantsOf(category, 'image_url');
  $: heroPreloadType = heroVariants?.avif ? 'image/avif' : heroVariants ? 'image/webp' : undefined;
  $: heroPreloadSrcset = heroVariants ? srcsetFor(heroVariants, heroVariants.avif ? 'avif' : 'webp') : '';
  $: heroPreloadHref =
    variantSrc(heroVariants, 1800, heroVariants?.avif ? 'avif' : 'webp') || imgUrl(category?.image_url, 1600, 72);

  // The visitor already chose this category, so the form never asks again.
  let enquiryOpen = false;
  $: enquiryContext = { category: category ? { id: category.id, name: category.name, slug: category.slug } : undefined };
  $: enquiryConfig = configFor('category_enquiry', enquiryContext);
</script>

<svelte:head>
  <title>{title} | Goldfinch Adventures</title>
  <meta name="description" content={description} />
  {#if category?.image_url}
    <link
      rel="preload"
      as="image"
      href={heroPreloadHref}
      imagesrcset={heroPreloadSrcset || undefined}
      imagesizes="100vw"
      type={heroPreloadType}
      fetchpriority="high"
    />
  {/if}
</svelte:head>

{#if category}
  <JsonLd
    data={breadcrumbLd(origin, [
      { name: 'Home', path: '/' },
      { name: 'Safari Styles', path: '/safari-styles' },
      { name: category.name, path: `/safari-styles/${category.slug}` }
    ])}
  />

  <section class="relative overflow-hidden bg-deep-green text-white">
    {#if category.image_url}
      <Img
        record={category}
        fields={['image_url']}
        alt=""
        width={1800}
        sizes="100vw"
        eager
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-r from-deep-green via-deep-green/80 to-deep-green/30"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-transparent to-deep-green/20"></div>
    {:else}
      <div class="absolute inset-0 bg-deep-green"></div>
      <div class="pointer-events-none absolute inset-0 opacity-[0.08]" style="background-image: radial-gradient(circle, #ffffff 1px, transparent 1.6px); background-size: 28px 28px;"></div>
    {/if}

    <div class="container-shell relative py-14 md:py-20">
      <nav class="mb-7 flex items-center gap-2 text-sm font-medium text-white/70">
        <a class="transition hover:text-white" href="/">Home</a>
        <span class="text-white/35">/</span>
        <a class="transition hover:text-white" href="/safari-styles">Safari Styles</a>
        <span class="text-white/35">/</span>
        <span class="text-white">{category.name}</span>
      </nav>

      <div class="grid items-end gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <p class="inline-flex items-center gap-2 rounded-[8px] border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-goldfinch-gold backdrop-blur">
            <Compass size={13} />
            Safari Style
          </p>
          <h1 class="mt-5 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-normal md:text-6xl" use:revealHeading>
            {category.name}
          </h1>
          {#if category.description}
            <RichText value={category.description} className="rich-on-dark mt-5 max-w-2xl text-base font-medium leading-8 text-white/84 md:text-lg" />
          {/if}
          <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button class="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-goldfinch-gold px-6 text-sm font-bold text-heading shadow-lg shadow-black/10 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" type="button" on:click={() => (enquiryOpen = true)}>
              <Sparkles size={17} />
              Plan this style
            </button>
            <a class="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-white/35 bg-white/8 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15" href={`/tours?category=${category.slug}`}>
              See matching tours <ArrowRight size={17} />
            </a>
          </div>
        </div>

        <div class="rounded-[8px] border border-white/15 bg-white/10 p-5 backdrop-blur" use:fadeUpOnScroll={{ y: 16 }}>
          <p class="text-sm font-bold text-white">Style snapshot</p>
          <div class="mt-4 grid gap-3">
            {#if category.who_its_for}
              <div class="flex gap-3 rounded-[8px] bg-white/10 p-3">
                <Users size={18} class="mt-0.5 shrink-0 text-goldfinch-gold" />
                <p class="whitespace-pre-line text-sm leading-6 text-white/78">{category.who_its_for}</p>
              </div>
            {/if}
            {#if category.fitness}
              <div class="flex items-center gap-3 rounded-[8px] bg-white/10 p-3">
                <Gauge size={18} class="shrink-0 text-goldfinch-gold" />
                <p class="text-sm font-semibold text-white">{category.fitness}</p>
              </div>
            {/if}
            {#if category.highlights?.length}
              <div class="grid gap-2 rounded-[8px] bg-white/10 p-3">
                {#each category.highlights.slice(0, 4) as highlight}
                  <div class="flex items-start gap-2 text-sm leading-6 text-white/78">
                    <Check size={14} strokeWidth={2.8} class="mt-1 shrink-0 text-goldfinch-gold" />
                    <RichText value={highlight} className="min-w-0 text-sm leading-6 text-white/78" />
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="relative overflow-hidden bg-canvas py-14 md:py-20">
    <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-goldfinch-gold/30 to-transparent" aria-hidden="true"></div>
    <div class="container-shell">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="max-w-2xl">
          <p class="text-sm font-bold uppercase tracking-[0.14em] text-goldfinch-gold">Matching tours</p>
          <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[38px]">{category.name} trips</h2>
        </div>
        <a class="inline-flex h-11 items-center gap-2 rounded-[8px] border border-ink/10 bg-surface px-5 text-sm font-bold text-forest shadow-sm transition hover:border-forest/25 hover:text-heading" href={`/tours?category=${category.slug}`}>
          View all tours <ArrowRight size={15} />
        </a>
      </div>

      {#if tours.length}
        <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.05 }}>
          {#each tours as tour (tour.slug)}
            <TourCard {tour} />
          {/each}
        </div>
      {:else}
        <div class="mt-8">
          <EmptyState title="No published tours for this style yet" message="A local advisor can still shape this type of trip around your dates and budget." />
        </div>
      {/if}
    </div>
  </section>
{:else}
  <section class="container-shell py-20 text-center">
    <h1 class="text-2xl font-bold text-heading">Safari style not found</h1>
    <a class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:text-heading" href="/safari-styles">All safari styles <ArrowRight size={16} /></a>
  </section>
{/if}

<EnquiryForm open={enquiryOpen} config={enquiryConfig} context={enquiryContext} on:close={() => (enquiryOpen = false)} />
