<script lang="ts">
  import { page as pageStore } from '$app/stores';
  import Img from '$lib/components/public/Img.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import SafariPackageBlocks from '$lib/components/public/SafariPackageBlocks.svelte';
  import { SITE_URL } from '$lib/config/env';
  import { toMetaText } from '$lib/richText';
  import { breadcrumbLd, faqLd } from '$lib/seo';
  import type { Block } from '$lib/safariPackageBlocks';
  import type { FAQ, ItineraryDay, SafariPackage, Tour } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: record = data.package as SafariPackage;
  $: related = (data.related ?? []) as Tour[];
  $: moduleFaqs = (data.moduleFaqs ?? []) as FAQ[];
  $: blocks = ((record?.sections ?? []) as Block[]).filter((block) => block && typeof block.type === 'string');

  /** The linked tour's real days — what the itinerary block draws. */
  $: itineraryDays = [...((record?.tours?.itinerary_days ?? []) as ItineraryDay[])].sort(
    (a, b) => (a.day_number ?? 0) - (b.day_number ?? 0)
  );

  $: heroTitle = record?.hero_title?.trim() || record?.name || '';
  $: title = record?.meta_title?.trim() || record?.seo_title?.trim() || `${record?.name ?? ''} | Goldfinch Adventures`;
  $: description = toMetaText(record?.meta_description || record?.hero_subtitle || '', 160);
  $: canonical = `${SITE_URL || $pageStore.url.origin}/${record?.slug ?? ''}`;

  /**
   * Strictly `=== true`.
   *
   * A payload that omits the column, or a row written before it existed, must
   * read as "not indexable" rather than as truthy-enough. Getting this backwards
   * once would invite a crawler onto every unfinished page in the collection.
   */
  $: indexable = record?.indexable === true;

  /**
   * Structured data, assembled from what the page already holds rather than
   * typed a second time.
   *
   * These pages are meant to rank, so the rich-result markup has to be in the
   * server-rendered HTML — the tour pages have carried it for a while and these
   * were the odd ones out with none at all. Everything below is derived: no
   * invented ratings, no prices that are not on the linked tour.
   *
   * A noindex page emits none of it. Marking a page up for a rich result while
   * telling the crawler to ignore it is a contradiction worth avoiding.
   */
  $: origin = SITE_URL || $pageStore.url.origin;
  $: linkedTour = (record?.tours ?? null) as Tour | null;

  $: touristTripLd =
    record && indexable
      ? {
          '@type': 'TouristTrip',
          name: record.name,
          description: description || undefined,
          ...(record.hero_image_url ? { image: record.hero_image_url } : {}),
          url: canonical,
          ...(linkedTour?.price_from
            ? {
                offers: {
                  '@type': 'Offer',
                  price: linkedTour.price_from,
                  priceCurrency: linkedTour.currency ?? 'USD'
                }
              }
            : {}),
          ...(itineraryDays.length
            ? {
                itinerary: {
                  '@type': 'ItemList',
                  itemListElement: itineraryDays.map((day, i) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    name: day.title ?? `Day ${day.day_number ?? i + 1}`
                  }))
                }
              }
            : {}),
          provider: { '@type': 'TravelAgency', name: 'Goldfinch Adventures' }
        }
      : null;

  /** The questions actually on the page — the block's own, or the attached ones it fell back to. */
  $: faqPairs = (() => {
    const fromBlock = blocks
      .filter((block) => block.type === 'faq')
      .flatMap((block) => (Array.isArray(block.items) ? (block.items as Record<string, unknown>[]) : []))
      .map((item) => ({ q: String(item.question ?? '').trim(), a: String(item.answer ?? '').trim() }))
      .filter((pair) => pair.q && pair.a);
    if (fromBlock.length) return fromBlock;
    return moduleFaqs.map((faq) => ({ q: faq.question, a: faq.answer })).filter((pair) => pair.q && pair.a);
  })();

  $: faqStructured = indexable && faqPairs.length ? faqLd(faqPairs) : null;

  $: crumbs =
    record && indexable
      ? breadcrumbLd(origin, [
          { name: 'Home', path: '/' },
          { name: record.name, path: `/${record.slug ?? ''}` }
        ])
      : null;
</script>

<svelte:head>
  <title>{title}</title>
  {#if description}<meta name="description" content={description} />{/if}
  <link rel="canonical" href={canonical} />
  {#if !indexable}
    <!-- Paired with the sitemap, which drops the same rows. A noindex tag on a
         page the sitemap still advertises is worse than neither. -->
    <meta name="robots" content="noindex, nofollow" />
  {/if}
  {#if record?.og_image_url || record?.hero_image_url}
    <meta property="og:image" content={record.og_image_url || record.hero_image_url} />
  {/if}
  <meta property="og:title" content={title} />
  {#if description}<meta property="og:description" content={description} />{/if}
</svelte:head>

{#if touristTripLd}<JsonLd data={touristTripLd} />{/if}
{#if faqStructured}<JsonLd data={faqStructured} />{/if}
{#if crumbs}<JsonLd data={crumbs} />{/if}

{#if record}
  <section class="relative isolate overflow-hidden bg-deep-green text-white">
    {#if record.hero_image_url}
      <Img
        src={record.hero_image_url}
        alt={heroTitle}
        width={1800}
        sizes="100vw"
        eager
        className="absolute inset-0 h-full w-full object-cover"
      />
      <span class="absolute inset-0 bg-gradient-to-t from-deep-green via-deep-green/70 to-deep-green/35" aria-hidden="true"></span>
    {/if}
    <div class="container-shell relative py-16 md:py-24">
      <div class="max-w-[820px]">
        {#if record.hero_eyebrow}
          <p class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">{record.hero_eyebrow}</p>
        {/if}
        <h1 class="font-serif mt-3 text-3xl leading-[1.06] tracking-tight sm:text-4xl md:text-5xl">{heroTitle}</h1>
        {#if record.hero_subtitle}
          <p class="mt-4 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">{record.hero_subtitle}</p>
        {/if}
        <div class="mt-8 flex flex-wrap gap-3">
          <a
            href="#lead-form"
            class="inline-flex h-11 items-center justify-center rounded bg-goldfinch-gold px-5 text-sm font-semibold text-heading transition hover:brightness-105"
          >
            Plan this trip
          </a>
          {#if record.tours?.slug}
            <a
              href={`/tours/${record.tours.slug}`}
              class="inline-flex h-11 items-center justify-center rounded border border-white/30 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              See the full tour
            </a>
          {/if}
        </div>
      </div>
    </div>
  </section>

  <SafariPackageBlocks {blocks} {itineraryDays} {moduleFaqs} tours={related} />
{/if}
