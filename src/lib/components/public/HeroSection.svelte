<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fly } from 'svelte/transition';
  import { ArrowRight, Check, ChevronDown, Star } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { revealHeading } from '$lib/animations';
  import { brand } from '$lib/brand';
  import { imgUrl } from '$lib/img';
  import type { Destination } from '$lib/types';

  export let eyebrow = 'Rated 4.9/5 by travellers';
  export let title = 'Witness the Greatest';
  export let highlight = 'Wildlife Show on Earth';
  export let description = 'Honest safari, Kilimanjaro, gorilla trekking and beach advice from local experts.';
  export let imageUrl = '';
  export let primaryCta = brand.primaryCta;
  export let primaryCtaUrl = '/plan-my-trip';
  export let secondaryCta = 'Explore Tours';
  export let secondaryCtaUrl = '/tours';
  export let trustPoints: string[] = ['Local experts', 'No payment to plan', 'Honest, tailored advice'];
  // Dark-overlay strength over the hero image, 0–100. 0 = no overlay at all (full
  // image clarity). Driven per-homepage from the CMS hero section's overlay
  // opacity slider (Admin → Homepage → hero → Background & overlay).
  export let overlay = 0;
  $: overlayOpacity = Math.max(0, Math.min(100, Number(overlay) || 0)) / 100;

  // Background image(s): the CMS hero image, or the bundled brand default. The
  // slider only rotates through REAL published-destination photos (added in
  // onMount) — no fabricated stock images. With no CMS content it's one clean
  // brand image, no rotation.
  const BRAND_FALLBACK = '/images/surf-hero.jpg';
  let images: string[] = [imageUrl || BRAND_FALLBACK];
  let index = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let loaded = new Set<number>([0]);

  // Fill exactly the viewport height *below* the (solid) nav so the hero is one
  // clean screen — measured at runtime, robust to whatever the nav height is.
  let sectionEl: HTMLElement;
  let heroMinH = '100svh';
  const setHeight = () => {
    if (!sectionEl) return;
    const top = sectionEl.getBoundingClientRect().top + window.scrollY;
    heroMinH = `calc(100svh - ${Math.max(0, Math.round(top))}px)`;
  };
  const scrollDown = () => window.scrollTo({ top: (sectionEl?.offsetTop ?? 0) + (sectionEl?.offsetHeight ?? 0), behavior: 'smooth' });

  $: {
    loaded.add(index);
    if (images.length > 1) loaded.add((index + 1) % images.length);
    loaded = loaded;
  }

  const stop = () => { if (timer) clearInterval(timer); };
  const startAuto = () => {
    stop();
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (images.length > 1 && !reduce) timer = setInterval(() => { index = (index + 1) % images.length; }, 6500);
  };
  const goSlide = (i: number) => { index = i; startAuto(); };
  onDestroy(() => { stop(); if (typeof window !== 'undefined') window.removeEventListener('resize', setHeight); });

  onMount(async () => {
    setHeight();
    window.addEventListener('resize', setHeight, { passive: true });
    const first = images[0];
    try {
      const dest = await api.destinations.list({ status: 'published', limit: 12 });
      const urls = (dest.data.items as Destination[])
        .map((d) => d.banner_image_url || d.main_image_url || d.image_url || '')
        .filter(Boolean)
        .filter((u, i, a) => a.indexOf(u) === i)
        .slice(0, 5);
      images = [first, ...urls.filter((u) => u !== first)];
    } catch {
      images = [first];
    }
    startAuto();
  });
</script>

<section bind:this={sectionEl} class="relative flex min-h-[560px] items-end overflow-hidden bg-deep-green dark:bg-[#0b100e]" style={`min-height:${heroMinH}`}>
  <!-- rotating background images -->
  {#each images as src, i (src)}
    <div class={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${i === index ? 'opacity-100' : 'opacity-0'}`} aria-hidden={i === index ? undefined : 'true'}>
      {#if loaded.has(i)}
        <img class="h-full w-full object-cover" src={imgUrl(src, 1600)} alt="" loading={i === 0 ? 'eager' : 'lazy'} decoding="async" fetchpriority={i === 0 ? 'high' : 'auto'} />
      {/if}
    </div>
  {/each}
  <!-- Overlay: CMS-controllable darkness for legible text. 0 = no overlay at all
       (the layer isn't rendered), so the image shows at full clarity. -->
  {#if overlayOpacity > 0}
    <div class="absolute inset-0" style={`opacity:${overlayOpacity}`} aria-hidden="true">
      <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-deep-green/45 to-deep-green/15 dark:from-[#0b100e] dark:via-[#0b100e]/70 dark:to-[#0b100e]/30"></div>
      <div class="absolute inset-0 bg-gradient-to-r from-deep-green/80 via-deep-green/30 to-transparent dark:from-[#0b100e]/90 dark:via-[#0b100e]/40 dark:to-transparent"></div>
    </div>
  {/if}

  <!-- content (bottom-left, like the reference) -->
  <div class="relative z-10 mx-auto w-full max-w-[1500px] px-5 pb-20 pt-24 md:px-8 md:pb-24">
    <div class="max-w-2xl text-white">
      <span class="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-savanna backdrop-blur" in:fly={{ y: 12, duration: 450 }}>
        <Star size={13} fill="currentColor" /> {eyebrow}
      </span>

      <h1 class="mt-5 font-semibold leading-[1.04] tracking-tight drop-shadow-sm text-[40px] sm:text-6xl lg:text-7xl" use:revealHeading={{ stagger: 0.02 }}>
        {title}<br />
        <span class="italic text-goldfinch-gold">{highlight}</span>
      </h1>

      <p class="mt-5 max-w-xl text-base font-medium leading-7 text-white/85 sm:text-lg" in:fly={{ y: 14, duration: 500, delay: 120 }}>
        {description}
      </p>

      <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <a class="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-goldfinch-gold px-8 font-bold text-heading shadow-lg transition hover:brightness-105 sm:w-auto" href={primaryCtaUrl}>
          {primaryCta} <ArrowRight size={18} strokeWidth={2.6} />
        </a>
        <a class="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full border border-white/45 bg-white/5 px-8 font-semibold text-white backdrop-blur transition hover:bg-white/15 sm:w-auto" href={secondaryCtaUrl}>
          {secondaryCta}
        </a>
      </div>

      <div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5">
        {#each trustPoints as point}
          <span class="inline-flex items-center gap-2 text-sm font-medium text-white/80">
            <span class="grid h-5 w-5 place-items-center rounded-full bg-goldfinch-gold/25 text-goldfinch-gold"><Check size={12} strokeWidth={3} /></span>
            {point}
          </span>
        {/each}
      </div>
    </div>
  </div>

  <!-- scroll-down cue (bottom center) -->
  <button
    type="button"
    class="group absolute bottom-5 left-1/2 z-10 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full text-white/85 transition hover:text-white"
    aria-label="Scroll down"
    on:click={scrollDown}
  >
    <ChevronDown size={26} strokeWidth={2.4} class="motion-safe:animate-bounce" />
  </button>

  <!-- slide dots (bottom right) -->
  {#if images.length > 1}
    <div class="absolute bottom-7 right-6 z-10 flex gap-2 md:right-10" role="tablist" aria-label="Hero background">
      {#each images as _src, i (i)}
        <button class={`h-2 rounded-full transition-all ${i === index ? 'w-7 bg-goldfinch-gold' : 'w-2.5 bg-white/50 hover:bg-white/80'}`} type="button" role="tab" aria-selected={i === index} aria-label={`Background ${i + 1}`} on:click={() => goSlide(i)}></button>
      {/each}
    </div>
  {/if}
</section>
