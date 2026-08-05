<script lang="ts">
  import { Check } from '@lucide/svelte';

  /** Small uppercase label above the heading. */
  export let eyebrow = 'Start Planning';
  export let title = 'Tell Us the Tanzania Trip You Have in Mind';
  export let subtitle =
    "Share your travel dates, group size and the experiences you are considering. We'll help you understand the best route, timing, pace and logistics.";
  /** Reassurance bullets shown with gold check chips. */
  export let points: string[] = [
    'Planned around your dates and budget',
    'Local Tanzania travel experts',
    'Safari, beach, trekking and culture options',
    'Clear proposal with no obligation',
    'Response within 24 hours'
  ];
  /** Optional CTA — rendered only when both label and href are provided. */
  export let ctaLabel = '';
  export let ctaHref = '';
</script>

<section id="lead-form" class="bg-deep-green py-14 md:py-20 scroll-mt-20">
  <div class="container-shell">
    <div class="grid gap-10 lg:grid-cols-2 lg:gap-14">
      <div class="text-white">
        {#if eyebrow}
          <div class="inline-flex items-center gap-2">
            <span class="h-px w-6 bg-goldfinch-gold" aria-hidden="true"></span>
            <span class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">
              {eyebrow}
            </span>
          </div>
        {/if}

        {#if title}
          <h2 class="font-serif mt-3 text-3xl leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
            {title}
          </h2>
        {/if}

        {#if subtitle}
          <p class="mt-4 max-w-lg text-base leading-relaxed text-[#D8D3C4]">
            {subtitle}
          </p>
        {/if}

        {#if points.length}
          <ul class="mt-7 space-y-3">
            {#each points as p (p)}
              <li class="flex items-start gap-3 text-base text-white/90">
                <span
                  class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-goldfinch-gold text-deep-green"
                >
                  <Check size={12} strokeWidth={2} />
                </span>
                {p}
              </li>
            {/each}
          </ul>
        {/if}

        {#if ctaLabel && ctaHref}
          <div class="mt-8">
            <a
              href={ctaHref}
              class="inline-flex items-center justify-center gap-2 rounded-md bg-goldfinch-gold px-5 py-2.5 text-sm font-semibold text-deep-green transition-colors hover:bg-goldfinch-gold/90"
            >
              {ctaLabel}
            </a>
          </div>
        {/if}
      </div>

      <slot />
    </div>
  </div>
</section>
