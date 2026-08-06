<script lang="ts">
  /**
   * DestinationsHero — one cinematic full-bleed frame.
   *
   * Deliberately NOT a collage: the old index stacked four floating photo tiles,
   * which meant the page opened with whichever four destinations happened to own
   * an image rather than with a point of view. Only 6 of 19 destinations have any
   * photography at all, so the imageless state is the primary design here and the
   * photograph is treated as an enhancement — with `heroImage` empty this still
   * reads as a deep-green editorial field, never a grey hole.
   *
   * Nothing here is invented. The single number on screen is `total`, the count of
   * published destinations; the other two trust lines are brand facts that hold
   * sitewide. No ratings, trip counts, awards or seasons — none of that exists in
   * the CMS.
   */
  import { ArrowRight, Compass, MapPin, Users } from '@lucide/svelte';
  import { trackEvent } from '$lib/analytics';
  import { fadeUpOnScroll } from '$lib/animations';
  import { imgUrl } from '$lib/img';

  export let heroImage = '';
  export let total = 0;
  export let regions: string[] = [];

  const BROWSE_TARGET = '#all-destinations';

  // Guarded rather than trusting the types: this hero renders on a page whose
  // data comes from the CMS, where a null image or a missing region array is a
  // normal state, not an error.
  $: image = (heroImage || '').trim();
  $: regionList = [...new Set((regions || []).map((region) => (region || '').trim()).filter(Boolean))];
  $: countLine =
    total > 0 ? `${total} ${total === 1 ? 'destination' : 'destinations'} to explore` : 'Every destination we plan, in one place';

  // Three restrained, honest lines. The count is the only figure on this page.
  $: trustPoints = [
    { icon: 'pin' as const, label: countLine },
    { icon: 'team' as const, label: 'Planned by a local Tanzania team' },
    { icon: 'compass' as const, label: 'Tailor-made, never off-the-shelf' }
  ];

  const onCta = (name: string, type: 'primary' | 'secondary') =>
    trackEvent('cta_click', { cta_name: name, cta_type: type, cta_location: 'destinations_hero' });
</script>

<svelte:head>
  {#if image}
    <link rel="preload" as="image" href={imgUrl(image, 2200, 74)} fetchpriority="high" />
  {/if}
</svelte:head>

<section class="relative isolate overflow-hidden bg-deep-green text-white">
  <!-- Background layer: photograph + scrim when we have one, otherwise a lit
       green field. Both paths end in the same top wash and vignette, so the
       typography sits on identical values either way. -->
  <div class="absolute inset-0" aria-hidden="true">
    {#if image}
      <img
        class="hero-media h-full w-full object-cover"
        src={imgUrl(image, 2200, 74)}
        alt=""
        sizes="100vw"
        loading="eager"
        fetchpriority="high"
        decoding="async"
      />
      <div class="hero-scrim absolute inset-0"></div>
    {:else}
      <div class="hero-field absolute inset-0"></div>
    {/if}
    <div class="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/30 to-transparent"></div>
    <div class="hero-vignette absolute inset-0"></div>
  </div>

  <div class="hero-shell container-shell relative z-10 flex min-h-[62vh] flex-col pb-12 pt-20 md:min-h-[72vh] md:pb-16 md:pt-24">
    <nav class="mb-auto flex flex-wrap items-center gap-2 text-[13px] font-medium text-white/60" aria-label="Breadcrumb">
      <a class="inline-flex min-h-[44px] items-center rounded-[6px] pr-1 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green" href="/">
        Home
      </a>
      <span class="text-white/30" aria-hidden="true">/</span>
      <span class="text-white/90" aria-current="page">Destinations</span>
    </nav>

    <div class="grid grid-cols-12 pt-10 md:pt-14">
      <div class="col-span-12 min-w-0 lg:col-span-8 xl:col-span-7" use:fadeUpOnScroll={{ y: 16 }}>
        <p class="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-goldfinch-gold">
          <span class="h-px w-8 bg-goldfinch-gold/70" aria-hidden="true"></span>
          Goldfinch destinations
        </p>

        <h1 class="mt-6 max-w-[18ch] break-words font-serif text-[clamp(2.35rem,6.2vw,4.5rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-white">
          Where would you like to <span class="whitespace-nowrap font-normal italic text-goldfinch-gold">wake up</span>?
        </h1>

        <p class="mt-5 max-w-[52ch] text-[15px] leading-7 text-white/80 md:mt-6 md:text-lg md:leading-9">
          Crater rims, migration plains, woodland and reef — the places our planners know first-hand, with honest notes
          on how long to stay and what pairs well with what.
        </p>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:mt-9">
          <a
            class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-goldfinch-gold px-7 text-sm font-bold text-heading shadow-lg shadow-black/15 transition duration-200 ease-out hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green sm:w-auto"
            href="/plan-my-trip"
            on:click={() => onCta('Plan my trip', 'primary')}
          >
            Plan my trip <ArrowRight size={17} strokeWidth={2.4} />
          </a>
          <a
            class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] border border-white/40 bg-white/10 px-7 text-sm font-bold text-white backdrop-blur transition duration-200 ease-out hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green sm:w-auto"
            href={BROWSE_TARGET}
            on:click={() => onCta('Browse destinations', 'secondary')}
          >
            Browse destinations
          </a>
        </div>

        <ul class="mt-8 flex flex-col gap-3 text-[13px] font-medium text-white/72 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-7 sm:gap-y-3 md:mt-10">
          {#each trustPoints as point (point.label)}
            <li class="flex items-center gap-2.5">
              <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-goldfinch-gold" aria-hidden="true">
                {#if point.icon === 'pin'}
                  <MapPin size={14} strokeWidth={2.2} />
                {:else if point.icon === 'team'}
                  <Users size={14} strokeWidth={2.2} />
                {:else}
                  <Compass size={14} strokeWidth={2.2} />
                {/if}
              </span>
              <span>{point.label}</span>
            </li>
          {/each}
        </ul>
      </div>
    </div>

    {#if regionList.length}
      <!-- Orientation, not a filter: the real regions this index covers, read left
           to right. A rail on mobile rather than a block of wrapping chips. -->
      <div class="mt-10 border-t border-white/12 pt-5 md:mt-12">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <p class="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Regions</p>
          <ul
            class="hero-rail -mx-1 flex snap-x snap-mandatory items-center gap-x-4 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:gap-y-2 sm:overflow-visible sm:px-0"
            aria-label="Regions covered by these destinations"
          >
            {#each regionList as region, index (region)}
              <li class="flex shrink-0 snap-start items-center gap-4">
                {#if index > 0}
                  <span class="h-1 w-1 shrink-0 rounded-full bg-goldfinch-gold/60" aria-hidden="true"></span>
                {/if}
                <span class="whitespace-nowrap text-[13px] font-medium text-white/78">{region}</span>
              </li>
            {/each}
          </ul>
        </div>
      </div>
    {/if}
  </div>
</section>

<style>
  /* Viewport units: svh keeps the frame honest on mobile browsers whose toolbars
     shrink the visible area, with the vh utilities as the fallback. */
  @supports (height: 1svh) {
    .hero-shell {
      min-height: 62svh;
    }

    @media (min-width: 768px) {
      .hero-shell {
        min-height: 72svh;
      }
    }
  }

  /* Scrim over the photograph, written out in full rather than as Tailwind
     gradient utilities so the stop positions are exact and can change direction
     at the breakpoint. Mobile seats the type on a bottom-up wash and leaves the
     top of the frame as photograph; from md the copy sits left, so a left-to-
     right wash takes over and the right of the frame opens up. */
  .hero-scrim {
    background: linear-gradient(
      to top,
      rgb(var(--c-deep-green) / 0.96) 0%,
      rgb(var(--c-deep-green) / 0.88) 30%,
      rgb(var(--c-deep-green) / 0.66) 62%,
      rgb(var(--c-deep-green) / 0.34) 100%
    );
  }

  @media (min-width: 768px) {
    .hero-scrim {
      background:
        linear-gradient(
          to right,
          rgb(var(--c-deep-green) / 0.92) 0%,
          rgb(var(--c-deep-green) / 0.6) 44%,
          rgb(var(--c-deep-green) / 0.04) 80%
        ),
        linear-gradient(to top, rgb(var(--c-deep-green) / 0.82) 0%, rgb(var(--c-deep-green) / 0.18) 55%, transparent 100%);
    }
  }

  /* The imageless field. Built from the branded CSS variables (not hex) so the
     admin Branding page recolours this hero along with everything else. */
  .hero-field {
    background:
      radial-gradient(78% 62% at 82% 12%, rgb(var(--c-goldfinch-gold) / 0.2), transparent 62%),
      radial-gradient(70% 76% at 6% 96%, rgb(var(--c-forest) / 0.95), transparent 68%),
      linear-gradient(152deg, rgb(var(--c-deep-green)), rgb(var(--c-forest)) 54%, rgb(var(--c-deep-green)));
  }

  /* Soft vignette — darkens the corners only, so the frame reads cinematic and
     the text keeps its contrast wherever the photograph is bright. */
  .hero-vignette {
    background: radial-gradient(125% 100% at 28% 45%, transparent 0%, transparent 56%, rgb(0 0 0 / 0.3) 100%);
  }

  .hero-rail {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .hero-rail::-webkit-scrollbar {
    display: none;
  }

  .hero-media {
    animation: hero-settle 1400ms cubic-bezier(0.22, 1, 0.36, 1) both;
    will-change: transform;
  }

  @keyframes hero-settle {
    from {
      opacity: 0;
      transform: scale(1.06);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-media {
      animation: none;
      opacity: 1;
      transform: none;
      will-change: auto;
    }
  }
</style>
