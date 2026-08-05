<script lang="ts">
  import { imgUrl } from '$lib/img';

  type Cta = { label: string; href: string };
  type QuickLink = { label: string; href: string };

  export let eyebrow = '';
  export let title = 'Plan your African safari,';
  export let highlight = 'your way.';
  export let description = '';
  export let primaryCta: Cta = { label: 'Find my best options →', href: '#lead-form' };
  export let secondaryCta: Cta = { label: 'Explore Tanzania →', href: '#experiences' };
  export let imageUrl = '';
  export let trustPoints: string[] = [];
  export let quickLinks: QuickLink[] = [];
  export let note = "No commitment. We'll simply help you understand what fits best.";

  $: hasPrimary = Boolean(primaryCta?.label && primaryCta?.href);
  $: hasSecondary = Boolean(secondaryCta?.label && secondaryCta?.href);
  $: showPanel = quickLinks.length > 0 || hasPrimary;
</script>

<section data-hero class="relative isolate overflow-hidden">
  {#if imageUrl}
    <img
      src={imgUrl(imageUrl, 1920)}
      alt=""
      width="1920"
      height="1200"
      fetchpriority="high"
      decoding="async"
      class="absolute inset-0 h-full w-full object-cover"
      style="filter: saturate(1.1) contrast(1.05) brightness(1.02)"
    />
  {/if}
  <div
    aria-hidden="true"
    class="absolute inset-0"
    style="background: linear-gradient(100deg, rgba(20,22,16,0.78) 0%, rgba(20,22,16,0.42) 32%, rgba(20,22,16,0.08) 58%, rgba(20,22,16,0) 72%)"
  ></div>
  <div
    aria-hidden="true"
    class="absolute inset-x-0 bottom-0 h-40"
    style="background: linear-gradient(to top, rgba(20,22,16,0.55), transparent)"
  ></div>

  <div class="relative container-shell pt-20 pb-8 md:pt-28 md:pb-10 lg:pt-32">
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
    <div class="relative container-shell pb-10 md:pb-14">
      {#if showPanel}
        <div
          class="rounded-[14px] p-4 md:p-3"
          style="background: rgba(20,25,20,0.45); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.15)"
        >
          <div class="flex flex-wrap gap-3 md:flex-nowrap md:items-center md:justify-between md:gap-3">
            {#if quickLinks.length}
              <div class="flex flex-wrap items-center gap-2 md:gap-3">
                {#each quickLinks as link}
                  <a
                    href={link.href}
                    class="inline-flex h-11 items-center rounded-[8px] border border-white/20 bg-surface/95 px-3 text-[14px] text-heading transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-goldfinch-gold"
                  >
                    {link.label}
                  </a>
                {/each}
              </div>
            {/if}
            {#if hasPrimary}
              <a
                href={primaryCta.href}
                data-cta="hero-quick-planner"
                class="inline-flex h-11 w-full items-center justify-center rounded-[8px] bg-goldfinch-gold px-5 text-[14px] font-bold text-heading transition-colors hover:bg-goldfinch-gold/90 md:w-auto md:whitespace-nowrap"
              >
                {primaryCta.label}
              </a>
            {/if}
          </div>
        </div>
      {/if}
      {#if note || hasSecondary}
        <p class="mt-3 text-[13px] text-white/75">
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
