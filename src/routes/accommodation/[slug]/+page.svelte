<script lang="ts">
  /**
   * A single stay. Editorial rather than commercial: the lodge data carries no
   * price, no rating and no availability, so the page leads with the one thing
   * it does have — why we recommend the place — and omits any section whose
   * field is empty rather than showing a heading over nothing.
   */
  import { ArrowRight, ArrowUpRight, Binoculars, Gem, Heart, Plane, Sparkles, Users } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { fadeUpOnScroll } from '$lib/animations';
  import { imgUrl, sourceFor } from '$lib/img';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import { breadcrumbLd } from '$lib/seo';
  import type { Lodge } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: lodge = data.lodge as Lodge;
  $: allRelated = (data.related ?? []) as Lodge[];
  // Suggestions built from real relationships, not a random slice: same place
  // first, then the same style of stay, then anything else — de-duplicated so a
  // lodge never appears twice.
  $: samePlace = allRelated.filter((l) => l.destination_id && l.destination_id === lodge?.destination_id);
  $: sameStyle = allRelated.filter(
    (l) =>
      !samePlace.includes(l) &&
      (l.accommodation_level === lodge?.accommodation_level || l.lodge_type === lodge?.lodge_type)
  );
  $: suggestions = [...samePlace, ...sameStyle, ...allRelated.filter((l) => !samePlace.includes(l) && !sameStyle.includes(l))].slice(0, 6);
  $: suggestionsTitle = samePlace.length ? `More places to stay in ${place}` : 'Other places to stay';

  const LEVEL: Record<string, string> = {
    budget: 'Budget',
    mid_range: 'Mid-range',
    luxury: 'Luxury',
    ultra_luxury: 'Ultra luxury'
  };
  const TYPE: Record<string, string> = {
    tented_camp: 'Tented camp',
    mobile_camp: 'Mobile camp',
    lodge: 'Lodge',
    hotel: 'Hotel',
    treehouse: 'Treehouse'
  };

  // best_for is free text from the CMS, so the icon is matched on what the value
  // actually says and falls back to a neutral mark rather than guessing.
  const bestForIcon = (value: string) => {
    const v = value.toLowerCase();
    if (/honeymoon|couple|romantic/.test(v)) return Heart;
    if (/family|families|multi-gen/.test(v)) return Users;
    if (/wildlife|nature|birding|safari travellers/.test(v)) return Binoculars;
    if (/luxury/.test(v)) return Gem;
    if (/pre-safari|transit|airport|stopover/.test(v)) return Plane;
    return Sparkles;
  };

  $: heroImage = sourceFor(lodge, 1920, 'hero_image_url', 'image_url');
  // Deliberately from a sibling stay, so the band does not repeat the hero.
  $: ctaImage = sourceFor(
    allRelated.find((l) => l.hero_image_url || l.image_url),
    1600,
    'hero_image_url',
    'image_url'
  );
  $: place = lodge?.destinations?.name ?? '';
  $: facts = [LEVEL[String(lodge?.accommodation_level)], TYPE[String(lodge?.lodge_type)], place].filter(Boolean);

  $: origin = $page.url.origin;
  $: title = lodge?.seo_title || lodge?.meta_title || lodge?.name || 'Stay';
  $: description = lodge?.meta_description || lodge?.why_we_recommend || lodge?.description || '';
</script>

<svelte:head>
  <title>{title} | Goldfinch Adventures</title>
  {#if description}<meta name="description" content={description} />{/if}
  <link rel="canonical" href={`${origin}/accommodation/${lodge?.slug ?? ''}`} />
  {#if heroImage}
    <meta property="og:image" content={imgUrl(heroImage, 1200, 72)} />
    <link rel="preload" as="image" href={imgUrl(heroImage, 1920, 72)} fetchpriority="high" />
  {/if}
</svelte:head>

<JsonLd
  data={breadcrumbLd(origin, [
    { name: 'Home', path: '/' },
    { name: 'Accommodation', path: '/accommodation' },
    { name: lodge?.name ?? 'Stay', path: `/accommodation/${lodge?.slug ?? ''}` }
  ])}
/>

<!-- ── hero ─────────────────────────────────────────────────────────────── -->
<section class="relative flex min-h-[64vh] items-end overflow-hidden bg-deep-green text-white md:min-h-[78vh]">
  {#if heroImage}
    <img class="absolute inset-0 h-full w-full object-cover" src={imgUrl(heroImage, 1920, 72)} alt="" fetchpriority="high" decoding="async" />
    <span class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" aria-hidden="true"></span>
  {:else}
    <!-- Two of the ten stays have no photograph; the hero has to carry itself. -->
    <span class="absolute inset-0 bg-gradient-to-br from-deep-green via-forest to-deep-green" aria-hidden="true"></span>
  {/if}
  <span class="pointer-events-none absolute inset-0 shadow-[inset_0_0_180px_60px_rgba(0,0,0,0.55)]" aria-hidden="true"></span>

  <div class="container-shell relative z-10 pb-14 pt-28 md:pb-20">
    <div class="max-w-3xl" use:fadeUpOnScroll={{ y: 16 }}>
      {#if place}
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-goldfinch-gold">{place}</p>
      {/if}
      <h1 class="mt-4 font-serif text-4xl font-semibold leading-[1.05] md:text-[62px]">{lodge?.name}</h1>
      {#if lodge?.why_we_recommend}
        <p class="mt-5 max-w-2xl text-base leading-8 text-white/80 md:text-lg">{lodge.why_we_recommend}</p>
      {/if}

      {#if lodge?.best_for?.length}
        <div class="mt-8 border-t border-white/15 pt-6">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Best for</p>
          <ul class="mt-3 flex flex-wrap gap-2.5">
            {#each lodge.best_for as item}
              <li class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur-sm">
                <svelte:component this={bestForIcon(item)} size={15} class="shrink-0 text-goldfinch-gold" aria-hidden="true" />
                {item}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  </div>
</section>

<!-- ── fact strip: text on hairlines, not badges ─────────────────────────── -->
{#if facts.length}
  <section class="border-b border-ink/10 bg-canvas">
    <div class="container-shell">
      <div class="flex flex-wrap items-center gap-x-8 gap-y-2 py-5 text-sm">
        {#each facts as fact, index}
          {#if index > 0}<span class="hidden h-4 w-px bg-ink/15 sm:block" aria-hidden="true"></span>{/if}
          <span class="font-semibold text-ink/70">{fact}</span>
        {/each}
      </div>
    </div>
  </section>
{/if}

<section class="bg-canvas py-16 md:py-24">
  <div class="container-shell grid gap-14 lg:grid-cols-[1fr_320px] lg:items-start lg:gap-20">
    <!-- ── body ─────────────────────────────────────────────────────────── -->
    <div class="max-w-[68ch]">
      {#if lodge?.why_we_recommend}
        <div use:fadeUpOnScroll={{ y: 14 }}>
          <span class="block h-px w-16 bg-goldfinch-gold" aria-hidden="true"></span>
          <p class="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-clay">Why we recommend it</p>
          <p class="mt-4 font-serif text-2xl leading-[1.5] text-heading md:text-[30px] md:leading-[1.45]">
            {lodge.why_we_recommend}
          </p>
        </div>
      {/if}

      {#if lodge?.description}
        <div class="mt-12 space-y-5 text-base leading-8 text-ink/70" use:fadeUpOnScroll={{ y: 14 }}>
          {#each lodge.description.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) as paragraph}
            <p>{paragraph}</p>
          {/each}
        </div>
      {/if}

    </div>

    <!-- ── aside ────────────────────────────────────────────────────────── -->
    <aside class="lg:sticky lg:top-28">
      <div class="border-t border-ink/15 pt-7">
        <p class="font-serif text-xl font-semibold leading-tight text-heading">{lodge?.name}</p>
        {#if place}
          <p class="mt-1 text-sm text-ink/55">{place}</p>
        {/if}
        <p class="mt-5 text-sm leading-7 text-ink/60">
          Tell us your dates and we will build a route around this stay, or suggest something closer to what you want.
        </p>

        <a
          class="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-goldfinch-gold px-6 text-sm font-extrabold text-heading transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
          href="/plan-my-trip"
        >
          Plan a trip here <ArrowRight size={16} />
        </a>

        {#if lodge?.website_url}
          <a
            class="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-ink/15 px-6 text-sm font-bold text-ink/75 transition hover:border-goldfinch-gold hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
            href={lodge.website_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit the property site <ArrowUpRight size={15} />
          </a>
        {/if}
      </div>
    </aside>
  </div>
</section>

<!-- ── other stays: cards here, so the end of the page is a place to browse ─ -->
{#if suggestions.length}
  <section class="border-t border-ink/10 bg-sand/25 py-16 md:py-20">
    <div class="container-shell">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-clay">Keep looking</p>
          <h2 class="mt-3 font-serif text-2xl font-semibold leading-tight text-heading md:text-[32px]">
            {suggestionsTitle}
          </h2>
        </div>
        <a
          class="inline-flex items-center gap-1.5 text-sm font-bold text-ink/60 transition hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
          href="/accommodation"
        >
          All stays <ArrowRight size={15} />
        </a>
      </div>

      <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {#each suggestions as item (item.id)}
          {@const image = sourceFor(item, 800, 'image_url', 'hero_image_url')}
          <a
            class="group flex flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-surface shadow-card transition duration-300 hover:-translate-y-1 hover:border-goldfinch-gold/40 hover:shadow-[0_20px_46px_rgba(57,61,50,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
            href={`/accommodation/${item.slug}`}
            data-sveltekit-preload-data="hover"
          >
            <span class="relative block aspect-[4/3] w-full overflow-hidden bg-forest">
              {#if image}
                <img
                  class="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.05]"
                  src={imgUrl(image, 800, 72)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              {:else}
                <!-- keeps the grid even for the stays with no photograph -->
                <span class="absolute inset-0 bg-gradient-to-br from-deep-green via-forest to-deep-green" aria-hidden="true"></span>
                <span class="absolute inset-0 grid place-items-center font-serif text-5xl text-white/12" aria-hidden="true">
                  {item.name.charAt(0)}
                </span>
              {/if}
            </span>

            <span class="flex flex-1 flex-col p-5">
              {#if item.destinations?.name}
                <span class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">{item.destinations.name}</span>
              {/if}
              <span class="mt-1.5 font-serif text-xl font-semibold leading-tight text-heading transition group-hover:text-forest">
                {item.name}
              </span>
              {#if item.why_we_recommend || item.description}
                <span class="mt-2 line-clamp-2 text-sm leading-6 text-ink/60">
                  {item.why_we_recommend || item.description}
                </span>
              {/if}
              <span class="mt-4 flex items-center justify-between gap-3 border-t border-ink/10 pt-3 text-xs font-semibold text-ink/45">
                {[LEVEL[String(item.accommodation_level)], TYPE[String(item.lodge_type)]].filter(Boolean).join(' · ')}
                <span class="text-ink/25 transition group-hover:translate-x-0.5 group-hover:text-goldfinch-gold">
                  <ArrowRight size={16} />
                </span>
              </span>
            </span>
          </a>
        {/each}
      </div>
    </div>
  </section>
{/if}


<!-- ── closing band: matches the stays index so both pages end alike ─────── -->
<section class="relative overflow-hidden bg-deep-green text-white">
  {#if ctaImage}
    <img class="absolute inset-0 h-full w-full object-cover opacity-25" src={imgUrl(ctaImage, 1600, 70)} alt="" loading="lazy" decoding="async" />
  {/if}
  <span class="absolute inset-0 bg-gradient-to-br from-deep-green/95 via-deep-green/85 to-forest/90" aria-hidden="true"></span>
  <span class="pointer-events-none absolute inset-0 shadow-[inset_0_0_160px_50px_rgba(0,0,0,0.45)]" aria-hidden="true"></span>

  <div class="container-shell relative z-10 py-20 md:py-28">
    <div class="max-w-3xl" use:fadeUpOnScroll={{ y: 16 }}>
      <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-goldfinch-gold">Planning together</p>
      <h2 class="mt-5 font-serif text-3xl font-semibold leading-[1.12] md:text-[46px]">
        Not sure {lodge?.name ? 'if this is the one' : 'which one fits'}?<br class="hidden sm:block" />
        We will match the stay to your route.
      </h2>
      <p class="mt-5 max-w-xl text-base leading-8 text-white/70">
        Tell us how you want to travel and we will put the right camps and lodges in the right order — with the
        driving, flying and pacing already worked out.
      </p>

      <div class="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          class="inline-flex items-center justify-center gap-2 rounded-full bg-goldfinch-gold px-8 py-3.5 text-sm font-extrabold text-heading shadow-[0_2px_10px_rgba(212,175,55,0.35)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(212,175,55,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green"
          href="/plan-my-trip"
        >
          Plan my trip <ArrowRight size={16} />
        </a>
        <a
          class="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-8 py-3.5 text-sm font-bold text-white transition hover:border-white/60 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
          href="/accommodation"
        >
          Browse all stays
        </a>
      </div>
    </div>
  </div>
</section>
