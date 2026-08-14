<script lang="ts">
  /**
   * A single stay. Editorial rather than commercial: the lodge data carries no
   * price, no rating and no availability, so the page leads with the one thing
   * it does have — why we recommend the place — and omits any section whose
   * field is empty rather than showing a heading over nothing.
   */
  import { ArrowRight, ArrowUpRight, Award, Binoculars, Building2, CalendarDays, ChevronRight, Gem, Heart, MapPin, Plane, Sparkles, Users } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
  import { imgUrl, sourceFor, srcsetFor, variantSrc, variantsOf } from '$lib/img';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import Img from '$lib/components/public/Img.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import LodgeGallery from '$lib/components/public/LodgeGallery.svelte';
  import LodgeAmenities from '$lib/components/public/LodgeAmenities.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import { toMetaText } from '$lib/richText';
  import { breadcrumbLd } from '$lib/seo';
  import type { Amenity, Lodge, LodgeImage, Tour } from '$lib/types';
  import type { PageData } from './$types';
  import { enumLabel } from '$lib/accommodationEnums';

  export let data: PageData;

  $: lodge = data.lodge as Lodge;
  $: allRelated = (data.related ?? []) as Lodge[];
  $: images = (lodge?.images ?? []) as LodgeImage[];
  $: amenities = (lodge?.amenities ?? []) as Amenity[];
  // Trips that genuinely stay here, from the itinerary link. The same-area list
  // is only a fallback for properties nothing points at yet.
  $: featuredIn = (lodge?.featured_in_tours ?? []) as Tour[];
  $: areaTours = (data.safaris ?? []) as Tour[];
  $: tourList = featuredIn.length ? featuredIn : areaTours;
  $: toursAreReal = featuredIn.length > 0;
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
    BUDGET: 'Budget', MID_RANGE: 'Mid-range', LUXURY: 'Luxury', PREMIUM_LUXURY: 'Premium luxury',
    budget: 'Budget',
    mid_range: 'Mid-range',
    luxury: 'Luxury',
    ultra_luxury: 'Ultra luxury'
  };
  const TYPE: Record<string, string> = {
    HOTEL:'Hotel', SAFARI_LODGE:'Safari lodge', TENTED_CAMP:'Tented camp', MOBILE_CAMP:'Mobile camp', BEACH_RESORT:'Beach resort', VILLA:'Villa', GUEST_HOUSE:'Guest house', ECO_LODGE:'Eco lodge', BOUTIQUE_HOTEL:'Boutique hotel',
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

  // The gallery cover leads when one is set; otherwise the existing image
  // fields carry the hero exactly as before.
  $: coverRecord = images.find((image) => image.is_cover) ?? images[0];
  $: coverImage = coverRecord?.image_url ?? '';
  $: heroRecord = coverRecord || lodge;
  $: heroFields = coverRecord ? ['image_url'] : ['hero_image_url', 'image_url', 'cover_image_url'];
  $: heroImage = coverImage || sourceFor(lodge, 1920, 'hero_image_url', 'image_url', 'cover_image_url');
  $: heroVariants = variantsOf(heroRecord, ...heroFields);
  $: heroPreloadType = heroVariants?.avif ? 'image/avif' : heroVariants ? 'image/webp' : undefined;
  $: heroPreloadSrcset = heroVariants ? srcsetFor(heroVariants, heroVariants.avif ? 'avif' : 'webp') : '';
  $: heroPreloadHref =
    variantSrc(heroVariants, 1920, heroVariants?.avif ? 'avif' : 'webp') || imgUrl(heroImage, 1920, 72);
  // Deliberately from a sibling stay, so the band does not repeat the hero.
  $: ctaLodge = allRelated.find((l) => l.hero_image_url || l.image_url);
  $: ctaImage = sourceFor(
    ctaLodge,
    1600,
    'hero_image_url',
    'image_url'
  );
  $: place = lodge?.destinations?.name ?? '';
  $: facts = [
    place ? { icon: MapPin, label: 'Destination', value: place } : null,
    lodge?.lodge_type ? { icon: Building2, label: 'Property type', value: TYPE[String(lodge.lodge_type)] ?? enumLabel(lodge.lodge_type) } : null,
    lodge?.accommodation_level ? { icon: Award, label: 'Travel style', value: LEVEL[String(lodge.accommodation_level)] ?? enumLabel(lodge.accommodation_level) } : null,
    lodge?.recommended_nights ? { icon: CalendarDays, label: 'Recommended stay', value: `${lodge.recommended_nights} night${lodge.recommended_nights === 1 ? '' : 's'}` } : null
  ].filter(Boolean) as { icon: typeof MapPin; label: string; value: string }[];
  $: logistics = [
    ['Setting', lodge?.settings?.length ? lodge.settings.map((x) => x.replaceAll('_', ' ').toLowerCase()).join(', ') : ''],
    ['Recommended stay', lodge?.recommended_nights ? `${lodge.recommended_nights} night${lodge.recommended_nights === 1 ? '' : 's'}` : ''],
    ['Nearest airstrip', lodge?.nearest_airport || ''], ['Transfer time', lodge?.transfer_time || ''],
    ['From airstrip', lodge?.distance_airstrip || ''], ['From park gate', lodge?.distance_park_gate || '']
  ].filter((row) => row[1]);
  $: included = (lodge?.inclusions ?? []).filter((item) => item.is_included);
  $: excluded = (lodge?.inclusions ?? []).filter((item) => !item.is_included);
  $: travelInfo = [
    ['Children', lodge?.children_allowed === false ? 'Adults only' : lodge?.minimum_child_age != null ? `Allowed from age ${lodge.minimum_child_age}` : ''],
    ['Accessibility', lodge?.accessibility || ''], ['Electricity', lodge?.electricity_availability || ''],
    ['Wi-Fi', lodge?.wifi_availability?.replaceAll('_',' ').toLowerCase() || ''], ['Mobile network', lodge?.mobile_networks?.map((x)=>x.replaceAll('_',' ').toLowerCase()).join(', ') || ''],
    ['Road access', lodge?.road_accessibility || '']
  ].filter((row) => row[1]);

  $: origin = $page.url.origin;
  $: title = lodge?.seo_title || lodge?.meta_title || lodge?.name || 'Stay';
  $: description = toMetaText(lodge?.meta_description || lodge?.why_we_recommend || lodge?.description || '', 170);
  $: whySnippet = toMetaText(lodge?.why_we_recommend || '', 240);
  $: planHref = `/plan-my-trip?${new URLSearchParams({
    stay: lodge?.slug ?? '',
    stay_name: lodge?.name ?? '',
    stay_id: lodge?.id ?? '',
    stay_type: lodge?.lodge_type ?? '',
    ...(place ? { place } : {})
  }).toString()}`;
</script>

<svelte:head>
  <title>{title} | Goldfinch Adventures</title>
  {#if description}<meta name="description" content={description} />{/if}
  <link rel="canonical" href={`${origin}/accommodation/${lodge?.slug ?? ''}`} />
  {#if lodge?.indexable === false}<meta name="robots" content="noindex, nofollow" />{/if}
  {#if heroImage}
    <meta property="og:image" content={imgUrl(heroImage, 1200, 72)} />
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

<JsonLd
  data={breadcrumbLd(origin, [
    { name: 'Home', path: '/' },
    { name: 'Accommodation', path: '/accommodation' },
    { name: lodge?.name ?? 'Stay', path: `/accommodation/${lodge?.slug ?? ''}` }
  ])}
/>

<!-- ── hero ─────────────────────────────────────────────────────────────── -->
<section data-hero class="relative flex min-h-[70svh] items-end overflow-hidden bg-deep-green text-white md:min-h-[78vh]">
  {#if heroImage}
    <Img
      record={heroRecord}
      fields={heroFields}
      alt=""
      width={1920}
      sizes="100vw"
      eager
      className="absolute inset-0 h-full w-full object-cover"
    />
    <span class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" aria-hidden="true"></span>
  {:else}
    <!-- Two of the ten stays have no photograph; the hero has to carry itself. -->
    <span class="absolute inset-0 bg-gradient-to-br from-deep-green via-forest to-deep-green" aria-hidden="true"></span>
  {/if}
  <span class="pointer-events-none absolute inset-0 shadow-[inset_0_0_180px_60px_rgba(0,0,0,0.55)]" aria-hidden="true"></span>

  <div class="container-shell relative z-10 pb-14 pt-28 md:pb-20">
    <nav class="mb-8 hidden flex-wrap items-center gap-1.5 text-xs font-semibold text-white/65 sm:flex md:mb-12" aria-label="Breadcrumb">
      <a href="/" class="transition hover:text-goldfinch-gold">Home</a><ChevronRight size={13}/><a href="/accommodation" class="transition hover:text-goldfinch-gold">Accommodation</a><ChevronRight size={13}/><span class="text-white/90">{lodge?.name}</span>
    </nav>
    <div class="max-w-3xl" use:fadeUpOnScroll={{ y: 16 }}>
      <div class="flex flex-wrap items-center gap-2">{#if lodge?.is_featured}<span class="inline-flex items-center gap-1 bg-goldfinch-gold px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-heading"><Sparkles size={11}/> Goldfinch recommended</span>{/if}{#if lodge?.lodge_type}<span class="border border-white/25 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur">{TYPE[String(lodge.lodge_type)] ?? enumLabel(lodge.lodge_type)}</span>{/if}</div>
      <h1 class="mt-4 font-serif text-4xl font-semibold leading-[1.05] md:text-[62px]">{lodge?.name}</h1>
      {#if place}<p class="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white/80"><MapPin size={15} class="text-goldfinch-gold"/>{place}{#if lodge?.accommodation_level}<span> · {LEVEL[String(lodge.accommodation_level)] ?? enumLabel(lodge.accommodation_level)}</span>{/if}</p>{/if}
      {#if whySnippet}
        <p class="mt-5 max-w-2xl text-base leading-8 text-white/80 md:text-lg">{whySnippet}</p>
      {/if}

      {#if lodge?.best_for?.length}
        <div class="mt-5 border-t border-white/15 pt-4 md:mt-6 md:pt-5">
          <p class="text-[9px] font-bold uppercase tracking-[0.16em] text-white/55">Best for</p>
          <ul class="mt-2 flex flex-wrap divide-x divide-white/20 text-xs font-semibold text-white/85">
            {#each lodge.best_for as item}
              <li class="inline-flex items-center gap-1.5 px-2.5 py-1 first:pl-0">
                <svelte:component this={bestForIcon(item)} size={13} class="shrink-0 text-goldfinch-gold" aria-hidden="true" />
                {enumLabel(item)}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
      <div class="mt-7 flex flex-col gap-3 sm:flex-row">
        {#if tourList.length}
          <a class="inline-flex h-12 w-full items-center justify-center gap-2 bg-goldfinch-gold px-7 text-sm font-extrabold text-heading transition hover:brightness-95 sm:w-auto" href="#safari-itineraries">See safari itineraries <ArrowRight size={16}/></a>
        {:else}
          <a class="inline-flex h-12 w-full items-center justify-center gap-2 bg-goldfinch-gold px-7 text-sm font-extrabold text-heading transition hover:brightness-95 sm:w-auto" href="/tours">Explore safari itineraries <ArrowRight size={16}/></a>
        {/if}
        <a class="inline-flex h-12 w-full items-center justify-center border border-white/30 px-7 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/10 sm:w-auto" href={planHref}>Build a trip around this stay</a>
      </div>
    </div>
  </div>
</section>

<!-- ── fact strip: text on hairlines, not badges ─────────────────────────── -->
{#if facts.length}
  <section class="border-b border-ink/10 bg-sand/35"><div class="container-shell grid grid-cols-2 gap-5 py-7 md:flex md:flex-wrap md:justify-between md:py-8">{#each facts as fact}<div class="flex min-w-0 items-center gap-3"><span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-forest/10 text-forest"><svelte:component this={fact.icon} size={18}/></span><div class="min-w-0"><p class="text-[9px] font-bold uppercase tracking-[0.14em] text-ink/40">{fact.label}</p><p class="mt-0.5 truncate text-sm font-semibold text-heading">{fact.value}</p></div></div>{/each}</div></section>
{/if}

<section class="bg-canvas py-16 md:py-24">
  <div class="container-shell grid gap-14 lg:grid-cols-[1fr_320px] lg:items-start lg:gap-20">
    <!-- ── body ─────────────────────────────────────────────────────────── -->
    <div class="max-w-[68ch]">
      {#if lodge?.why_we_recommend}
        <div use:fadeUpOnScroll={{ y: 14 }}>
          <span class="block h-px w-16 bg-goldfinch-gold" aria-hidden="true"></span>
          <p class="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-clay">Why we recommend it</p>
          <RichText value={lodge.why_we_recommend} className="mt-4 font-serif text-2xl leading-[1.5] text-heading md:text-[30px] md:leading-[1.45]" />
        </div>
      {/if}

      {#if lodge?.description}
        <div use:fadeUpOnScroll={{ y: 14 }}>
          <RichText value={lodge.description} className="mt-12 text-base leading-8 text-ink/70" />
        </div>
      {/if}

      {#if images.length}
        <div class="mt-12" use:fadeUpOnScroll={{ y: 14 }}>
          <span class="block h-px w-16 bg-goldfinch-gold" aria-hidden="true"></span>
          <p class="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-clay">The property</p>
          <div class="mt-5">
            <LodgeGallery {images} propertyName={lodge?.name ?? ''} />
          </div>
        </div>
      {/if}

      {#if amenities.length}
        <div class="mt-12" use:fadeUpOnScroll={{ y: 14 }}>
          <span class="block h-px w-16 bg-goldfinch-gold" aria-hidden="true"></span>
          <p class="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-clay">What's here</p>
          <div class="mt-5">
            <LodgeAmenities {amenities} />
          </div>
        </div>
      {/if}

      {#if lodge?.highlights?.length}
        <div class="mt-12" use:fadeUpOnScroll={{ y: 14 }}><span class="block h-px w-16 bg-goldfinch-gold"></span><p class="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-clay">Property highlights</p><div class="mt-5 grid gap-3 sm:grid-cols-2">{#each lodge.highlights as item}<div class="border-l-2 border-goldfinch-gold bg-sand/35 px-4 py-3 text-sm font-semibold leading-6 text-heading">{item.title}</div>{/each}</div></div>
      {/if}

      {#if logistics.length || lodge?.best_months?.length}
        <div class="mt-12" use:fadeUpOnScroll={{ y: 14 }}><span class="block h-px w-16 bg-goldfinch-gold"></span><p class="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-clay">Location & logistics</p><dl class="mt-5 grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-2">{#each logistics as row}<div class="bg-surface p-4"><dt class="text-[10px] font-bold uppercase tracking-wider text-ink/45">{row[0]}</dt><dd class="mt-1 capitalize text-sm font-semibold text-heading">{row[1]}</dd></div>{/each}</dl>{#if lodge?.best_months?.length}<p class="mt-4 text-sm leading-6 text-ink/65"><b class="text-heading">Best months:</b> {lodge.best_months.join(', ')}</p>{/if}</div>
      {/if}

      {#if lodge?.rooms?.length}
        <div class="mt-12" use:fadeUpOnScroll={{ y: 14 }}>
          <span class="block h-px w-16 bg-goldfinch-gold"></span>
          <p class="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-clay">Rooms & suites</p>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-ink/60">See the room styles available at {lodge.name}, including the details that matter when we match your stay to the route.</p>
          <div class="mt-5 grid gap-5">
            {#each lodge.rooms as room}
              <article class="overflow-hidden rounded-xl border border-ink/10 bg-surface shadow-[0_10px_30px_rgb(57_61_50_/_0.05)]">
                {#if room.lodge_room_images?.length}
                  <div class="bg-sand/45 p-2 sm:p-3">
                    <LodgeGallery images={room.lodge_room_images} propertyName={`${lodge.name} — ${room.name}`} />
                  </div>
                {/if}
                <div class="p-4 sm:p-5">
                  <div class="flex flex-wrap items-start justify-between gap-2"><h3 class="font-serif text-xl font-semibold text-heading">{room.name}</h3>{#if room.max_guests}<span class="text-xs font-bold text-clay">Up to {room.max_guests} guests</span>{/if}</div>
                  {#if room.short_description}<p class="mt-2 text-sm leading-6 text-ink/65">{room.short_description}</p>{/if}
                  <p class="mt-3 text-xs text-ink/55">{[room.bed_configuration,room.view,room.unit_count?`${room.unit_count} units`:null].filter(Boolean).join(' · ')}</p>
                  {#if room.amenities?.length}<div class="mt-3 flex flex-wrap divide-x divide-ink/15 text-[11px] font-semibold text-ink/60">{#each room.amenities as amenity}<span class="px-2 first:pl-0">{amenity}</span>{/each}</div>{/if}
                </div>
              </article>
            {/each}
          </div>
        </div>
      {/if}

      {#if lodge?.show_rates_publicly && lodge?.rates?.length}
        <div class="mt-12" use:fadeUpOnScroll={{ y: 14 }}><span class="block h-px w-16 bg-goldfinch-gold"></span><p class="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-clay">Seasonal guide rates</p><p class="mt-2 text-sm leading-6 text-ink/60">Indicative property rates only. Your safari quote combines the stay with transport, guiding, park fees and activities.</p><div class="mt-5 overflow-hidden rounded-xl border border-ink/10">{#each lodge.rates as rate}<div class="grid gap-3 border-b border-ink/10 bg-surface p-4 last:border-0 sm:grid-cols-[1fr_auto] sm:items-center"><div><h3 class="font-bold text-heading">{rate.season_name || enumLabel((rate as any).season_type || '')}</h3><p class="mt-1 text-xs text-ink/50">{rate.valid_from} – {rate.valid_until} · {enumLabel(rate.meal_plan)}</p></div><p class="text-sm font-extrabold text-forest">{rate.currency} {rate.double_rate ?? rate.rack_rate ?? rate.single_rate ?? 'On request'} <span class="font-medium text-ink/45">· {enumLabel(rate.pricing_basis)}</span></p></div>{/each}</div></div>
      {/if}

      {#if lodge?.experiences?.length}
        <div class="mt-12" use:fadeUpOnScroll={{ y: 14 }}><span class="block h-px w-16 bg-goldfinch-gold"></span><p class="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-clay">Experiences</p><div class="mt-4 grid gap-px overflow-hidden border border-ink/10 bg-ink/10 sm:grid-cols-2">{#each lodge.experiences as experience}<span class="bg-surface px-4 py-3 text-sm font-semibold text-forest">{experience.name}</span>{/each}</div></div>
      {/if}

      {#if included.length || excluded.length}
        <div class="mt-12 grid gap-5 sm:grid-cols-2" use:fadeUpOnScroll={{ y: 14 }}>{#if included.length}<div class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5"><h3 class="font-serif text-xl font-semibold text-heading">Included</h3><ul class="mt-3 space-y-2">{#each included as item}<li class="text-sm leading-6 text-ink/70">✓ {item.title}</li>{/each}</ul></div>{/if}{#if excluded.length}<div class="rounded-xl border border-ink/10 bg-sand/30 p-5"><h3 class="font-serif text-xl font-semibold text-heading">Not included</h3><ul class="mt-3 space-y-2">{#each excluded as item}<li class="text-sm leading-6 text-ink/70">— {item.title}</li>{/each}</ul></div>{/if}</div>
      {/if}

      {#if travelInfo.length || lodge?.arrival_instructions || lodge?.traveler_notes}
        <div class="mt-12" use:fadeUpOnScroll={{ y: 14 }}><span class="block h-px w-16 bg-goldfinch-gold"></span><p class="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-clay">Important travel information</p><dl class="mt-5 grid gap-4 sm:grid-cols-2">{#each travelInfo as row}<div><dt class="text-xs font-bold text-heading">{row[0]}</dt><dd class="mt-1 text-sm leading-6 text-ink/65">{row[1]}</dd></div>{/each}</dl>{#if lodge?.arrival_instructions}<p class="mt-5 rounded-lg bg-sand/35 p-4 text-sm leading-6 text-ink/70"><b>Arrival:</b> {lodge.arrival_instructions}</p>{/if}{#if lodge?.traveler_notes}<p class="mt-3 text-sm leading-6 text-ink/65">{lodge.traveler_notes}</p>{/if}</div>
      {/if}

    </div>

    <!-- ── aside ────────────────────────────────────────────────────────── -->
    <aside class="lg:sticky lg:top-28">
      <div class="rounded-xl bg-deep-green p-6 text-white shadow-[0_20px_50px_rgba(28,46,39,0.2)]">
        <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">Build your safari</p>
        <p class="mt-2 font-serif text-2xl font-semibold leading-tight text-white">Stay at {lodge?.name}</p>
        {#if place}
          <p class="mt-1 text-sm text-white/55">{place}</p>
        {/if}
        <p class="mt-5 text-sm leading-7 text-white/70">
          This stay works best as part of a well-paced safari route. Start with an itinerary, then we will confirm the right room, dates and transfers.
        </p>

        <a
          class="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-goldfinch-gold px-6 text-sm font-extrabold text-heading transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
          href={tourList.length ? '#safari-itineraries' : '/tours'}
        >
          {tourList.length ? 'View safari itineraries' : 'Explore tours'} <ArrowRight size={16} />
        </a>

        <a class="mt-3 inline-flex h-12 w-full items-center justify-center rounded-full border border-white/25 px-6 text-sm font-bold text-white transition hover:border-goldfinch-gold hover:text-goldfinch-gold" href={planHref}>Ask us to include this stay</a>

        {#if lodge?.website_url}
          <a
            class="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/15 px-6 text-sm font-bold text-white/70 transition hover:border-goldfinch-gold hover:text-goldfinch-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
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

<!-- ── safaris in this area ────────────────────────────────────────────────
     Trips that visit this property's destination. Deliberately worded as an
     area relationship: no itinerary records which property it stays at, so
     claiming "this tour uses this lodge" would be inventing a fact. -->
{#if tourList.length}
  <section id="safari-itineraries" class="scroll-mt-28 border-t border-ink/10 bg-deep-green py-16 text-white md:py-24">
    <div class="container-shell">
      <div class="max-w-2xl" use:fadeUpOnScroll={{ y: 14 }}>
        <span class="block h-px w-16 bg-goldfinch-gold" aria-hidden="true"></span>
        <p class="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-clay">
          {toursAreReal ? 'Featured in these safaris' : 'Safaris in this area'}
        </p>
        <h2 class="mt-3 font-serif text-3xl font-semibold leading-tight text-white md:text-[42px]">
          {#if toursAreReal}
            Trips that stay at {lodge?.name}
          {:else}
            {place ? `Trips that travel through ${place}` : 'Trips that travel through here'}
          {/if}
        </h2>
        <p class="mt-3 text-[15px] leading-7 text-white/70">
          {#if toursAreReal}
            Every one of these itineraries includes a night here. Each is private and can be reshaped around your dates.
          {:else}
            Each one is private and tailor-made — tell us you would like to stay at {lodge?.name} and we will build it in.
          {/if}
        </p>
      </div>
      <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.05 }}>
        {#each tourList as tour (tour.id)}
          <TourCard {tour} />
        {/each}
      </div>
      <div class="mt-9"><a class="inline-flex h-12 items-center gap-2 rounded-full bg-goldfinch-gold px-7 text-sm font-extrabold text-heading" href={planHref}>Tailor one of these trips <ArrowRight size={16}/></a></div>
    </div>
  </section>
{/if}

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
          {@const image = sourceFor(item, 800, 'image_url', 'hero_image_url', 'cover_image_url')}
          <a
            class="group flex flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-surface shadow-card transition duration-300 hover:-translate-y-1 hover:border-goldfinch-gold/40 hover:shadow-[0_20px_46px_rgba(57,61,50,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
            href={`/accommodation/${item.slug}`}
            data-sveltekit-preload-data="hover"
          >
            <span class="relative block aspect-[4/3] w-full overflow-hidden bg-forest">
              {#if image}
                <Img
                  record={item}
                  fields={['image_url', 'hero_image_url', 'cover_image_url']}
                  alt=""
                  width={800}
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 33vw"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.05]"
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
                  {toMetaText(item.why_we_recommend || item.description || '', 150)}
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
    <Img
      record={ctaLodge}
      fields={['hero_image_url', 'image_url', 'cover_image_url']}
      alt=""
      width={1600}
      sizes="100vw"
      className="absolute inset-0 h-full w-full object-cover opacity-25"
    />
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
