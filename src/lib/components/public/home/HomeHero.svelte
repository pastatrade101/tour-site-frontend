<script lang="ts">
  import { goto } from '$app/navigation';
  import { trackEvent } from '$lib/analytics';
  import Img from '../Img.svelte';
  import type { ImageVariantMap } from '$lib/img';

  type Cta = { label: string; href: string };
  type QuickLink = { label: string; href: string };

  export let eyebrow = '';
  export let title = 'Plan your African safari,';
  export let highlight = 'your way.';
  export let description = '';
  export let primaryCta: Cta = { label: 'Find my best options →', href: '#lead-form' };
  export let secondaryCta: Cta = { label: 'Explore Tanzania →', href: '#experiences' };
  export let imageUrl = '';
  export let imageVariants: ImageVariantMap = {};
  export let trustPoints: string[] = [];
  export let quickLinks: QuickLink[] = [];
  // Quick planner. `experiences` are REAL published tour categories, so the
  // Experience select filters the tours page by an actual category slug.
  export let experiences: { label: string; slug: string }[] = [];
  export let travellerOptions: { label: string; value: string }[] = [
    { label: 'Solo traveller', value: 'solo' },
    { label: 'Couple', value: 'couple' },
    { label: 'Family', value: 'family' },
    { label: 'Friends / group', value: 'group' },
    { label: 'Honeymoon', value: 'honeymoon' }
  ];

  let traveller = '';
  let focus = '';
  let travelDate = '';
  const today = new Date().toISOString().slice(0, 10);

  // Every quick-planner value is carried into the complete planning form.
  const findOptions = () => {
    trackEvent('cta_click', {
      cta_name: 'Plan My Trip',
      cta_location: 'hero_quick_planner',
      traveller_type: traveller,
      experience_type: focus
    });
    const params = new URLSearchParams();
    if (traveller) params.set('persona', traveller);
    if (focus) params.set('experience', focus);
    if (travelDate) params.set('date', travelDate);
    void goto(params.toString() ? `/plan-my-trip?${params}` : '/plan-my-trip');
  };
  export let note = "No commitment. We'll simply help you understand what fits best.";

  $: hasPrimary = Boolean(primaryCta?.label && primaryCta?.href);
  $: hasSecondary = Boolean(secondaryCta?.label && secondaryCta?.href);
  $: showPanel = quickLinks.length > 0 || hasPrimary || experiences.length > 0;
</script>

<section data-hero class="home-hero relative isolate overflow-hidden">
  {#if imageUrl}
    <Img
      src={imageUrl}
      variantsMap={imageVariants}
      alt=""
      width={1920}
      height={1200}
      sizes="100vw"
      eager
      className="absolute inset-0 h-full w-full object-cover"
      imgStyle="filter: saturate(1.1) contrast(1.05) brightness(1.02)"
    />
  {/if}
  <div
    aria-hidden="true"
    class="absolute inset-0"
    style="background: linear-gradient(100deg, rgba(57,61,50,0.80) 0%, rgba(57,61,50,0.48) 32%, rgba(57,61,50,0.12) 58%, rgba(57,61,50,0) 72%)"
  ></div>
  <div
    aria-hidden="true"
    class="absolute inset-x-0 bottom-0 h-40"
    style="background: linear-gradient(to top, rgba(57,61,50,0.62), transparent)"
  ></div>

  <div class="hero-copy relative container-shell pt-20 pb-8 md:pt-28 md:pb-10 lg:pt-32">
    <div class="max-w-2xl text-white">
      {#if eyebrow}
        <span
          class="inline-flex items-center rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white ring-1 ring-white/25 backdrop-blur"
        >
          {eyebrow}
        </span>
      {/if}
      <h1 class="font-serif mt-5 text-4xl leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-[64px]">
        {title}{' '}
        {#if highlight}<span class="italic text-goldfinch-gold">{highlight}</span>{/if}
      </h1>
      {#if description}
        <p class="mt-5 max-w-xl text-base leading-relaxed text-white/90 md:text-lg">
          {description}
        </p>
      {/if}
    </div>

    {#if trustPoints.length}
      <div
        class="mt-6 inline-flex items-center gap-2 rounded-md bg-black/25 px-3 py-2 text-[12px] font-medium text-white/90 backdrop-blur-sm ring-1 ring-white/15 md:absolute md:bottom-8 md:left-6 md:mt-0"
      >
        {#each trustPoints as point, i}
          {#if i === 0}
            <span>{point}</span>
          {:else}
            <span class="hidden text-white/50 sm:inline">·</span>
            <span class="hidden sm:inline">{point}</span>
          {/if}
        {/each}
      </div>
    {/if}
  </div>

  {#if showPanel || note || hasSecondary}
    <div class="hero-planner-shell relative container-shell pb-10 md:pb-14">
      {#if showPanel}
        <div
          class="hero-planner-card rounded-[14px] p-4 md:p-3"
          style="background: rgba(57,61,50,0.78); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.15)"
        >
          <div class="hero-planner-grid grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end md:gap-3">
            <label class="hero-planner-field hero-planner-field-origin block">
              <span class="hero-planner-label mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">Who is travelling?</span>
              <select
                bind:value={traveller}
                class="hero-planner-select h-11 w-full rounded-[8px] border border-white/20 bg-surface/95 px-3 text-[14px] text-heading focus:outline-none focus:ring-2 focus:ring-goldfinch-gold"
              >
                <option value="">Select travellers</option>
                {#each travellerOptions as option}<option value={option.value}>{option.label}</option>{/each}
              </select>
            </label>

            <label class="hero-planner-field hero-planner-field-focus block">
              <span class="hero-planner-label mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">Experience</span>
              <select
                bind:value={focus}
                class="hero-planner-select h-11 w-full rounded-[8px] border border-white/20 bg-surface/95 px-3 text-[14px] text-heading focus:outline-none focus:ring-2 focus:ring-goldfinch-gold"
              >
                <option value="">Pick a focus</option>
                {#each experiences as e}<option value={e.label}>{e.label}</option>{/each}
              </select>
            </label>

            <label class="hero-planner-field hero-planner-field-duration block">
              <span class="hero-planner-label mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">When?</span>
              <input
                bind:value={travelDate}
                type="date"
                min={today}
                class="hero-planner-select h-11 w-full rounded-[8px] border border-white/20 bg-surface/95 px-3 text-[14px] text-heading focus:outline-none focus:ring-2 focus:ring-goldfinch-gold"
              />
            </label>

            <button
              type="button"
              data-cta="hero-quick-planner"
              on:click={findOptions}
              class="hero-planner-submit h-11 w-full rounded-[8px] bg-goldfinch-gold px-5 text-[14px] font-bold text-heading transition hover:brightness-105 md:w-auto md:whitespace-nowrap"
            >
              {primaryCta.label}
            </button>
          </div>
        </div>
      {/if}
      {#if note || hasSecondary}
        <p class="hero-note mt-3 text-[13px] text-white/75">
          {note}{' '}
          {#if hasSecondary}
            <a href={secondaryCta.href} class="font-semibold text-goldfinch-gold hover:underline">
              {secondaryCta.label}
            </a>
          {/if}
        </p>
      {/if}
    </div>
  {/if}
</section>

<style>
  @media (max-width: 767px) {
    .home-hero {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      min-height: clamp(520px, calc(78svh - 20px), 700px);
      max-width: 100vw;
      overflow-x: clip;
      background: rgb(var(--c-deep-green));
    }

    .home-hero :global(*) {
      min-width: 0;
    }

    .hero-copy {
      padding-top: clamp(2.8rem, 8svh, 4rem);
      padding-bottom: 0.65rem;
    }

    .home-hero h1 {
      margin-top: 0.9rem;
      width: 100%;
      max-width: 100%;
      font-size: clamp(2.15rem, 9.8vw, 3rem);
      line-height: 0.98;
      text-wrap: balance;
    }

    .home-hero p {
      margin-top: 0.8rem;
      max-width: 100%;
      white-space: normal;
      overflow-wrap: break-word;
      text-wrap: pretty;
    }

    .hero-planner-shell {
      padding-bottom: 1.1rem;
    }

    .hero-planner-card {
      border-radius: 16px;
      padding: 0.6rem;
    }

    .hero-planner-grid {
      display: grid;
      align-items: end;
      gap: 0.5rem;
    }

    .hero-planner-field {
      min-width: 0;
    }

    .hero-planner-label {
      margin-bottom: 0.35rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.58rem;
      letter-spacing: 0.11em;
    }

    .hero-planner-select {
      display: block;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      height: 2.625rem;
      border-radius: 0.65rem;
      padding-inline: 0.65rem 1.85rem;
      font-size: 0.8125rem;
      line-height: 1.1;
    }

    input.hero-planner-select[type='date'] {
      -webkit-appearance: none;
      appearance: none;
      overflow: hidden;
      padding-right: 0.45rem;
      color-scheme: light;
    }

    input.hero-planner-select[type='date']::-webkit-date-and-time-value {
      min-width: 0;
      text-align: left;
    }

    .hero-planner-submit {
      height: 2.625rem;
      border-radius: 0.65rem;
      padding-inline: 0.75rem;
      font-size: 0.8125rem;
      white-space: nowrap;
    }

    .hero-note {
      margin-top: 0.65rem;
      font-size: 0.78rem;
      line-height: 1.45;
      text-shadow: 0 1px 12px rgb(0 0 0 / 0.35);
    }
  }

  @media (max-width: 479px) {
    .home-hero :global(.container-shell) {
      width: min(430px, calc(100vw - 32px));
    }

    .hero-planner-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .hero-planner-field-origin {
      order: 1;
    }

    .hero-planner-field-focus {
      order: 2;
    }

    .hero-planner-field-duration {
      order: 3;
      grid-column: 1 / -1;
    }

    .hero-planner-submit {
      order: 4;
      grid-column: 1 / -1;
    }
  }

  @media (min-width: 480px) and (max-width: 767px) {
    .home-hero {
      min-height: clamp(500px, 72svh, 650px);
    }

    .home-hero :global(.container-shell) {
      width: calc(100vw - 48px);
      max-width: none;
    }

    .hero-copy {
      padding-top: clamp(3.5rem, 8svh, 4.75rem);
      padding-bottom: 0.85rem;
    }

    .home-hero h1 {
      width: 100%;
      max-width: 100%;
      font-size: clamp(2.7rem, 7.6vw, 3.6rem);
      line-height: 0.98;
    }

    .hero-planner-shell {
      padding-bottom: 1.4rem;
    }

    .hero-planner-card {
      padding: 0.7rem;
    }

    .hero-planner-select,
    .hero-planner-submit {
      height: 2.5rem;
      font-size: 0.8125rem;
    }
  }

  @media (min-width: 480px) and (max-width: 599px) {
    .hero-planner-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .hero-planner-field-origin {
      order: 1;
    }

    .hero-planner-field-focus {
      order: 2;
    }

    .hero-planner-field-duration {
      order: 3;
      grid-column: 1 / -1;
    }

    .hero-planner-submit {
      order: 4;
      grid-column: 1 / -1;
    }
  }

  @media (min-width: 600px) and (max-width: 767px) {
    .hero-planner-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .hero-planner-field-origin {
      order: 1;
    }

    .hero-planner-field-focus {
      order: 2;
    }

    .hero-planner-field-duration {
      order: 3;
      grid-column: 1 / -1;
    }

    .hero-planner-submit {
      order: 4;
      grid-column: 1 / -1;
    }
  }
</style>
