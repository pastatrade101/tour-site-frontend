<script lang="ts">
  import { imgUrl } from '$lib/img';

  export let eyebrow = "Advisor's Note";
  export let title = 'The Trip Is Won or Lost in the Planning Details';
  export let body =
    'Most travel mistakes happen before arrival. The wrong route, too many one-night stops, poor lodge locations or badly timed transfers can make even a beautiful trip feel tiring.';

  /** Two-column editorial points — each column is a heading + a supporting line. */
  export let points: Array<{ title: string; text: string }> = [];

  export let imageUrl = '';

  /** Closing italic line under the divider. */
  export let footnote =
    'That is why we start with your dates, travel style and priorities — not with a fixed package.';

  export let ctaLabel = '';
  export let ctaHref = '';
</script>

{#if title || body || points.length}
  <section class="py-14 md:py-20">
    <div class="container-shell">
      <div
        class="relative overflow-hidden rounded-[12px] border border-ink/10 bg-sand px-7 py-8 sm:px-10 sm:py-10 md:px-14 md:py-14 lg:px-[72px] lg:py-[64px]"
        style="box-shadow: 0 18px 45px rgba(57,61,50,0.06)"
      >
        <!-- subtle background compass mark -->
        <svg
          aria-hidden="true"
          viewBox="0 0 200 200"
          class="pointer-events-none absolute right-6 top-6 z-0 h-[110px] w-[110px] text-clay opacity-[0.09] sm:right-8 sm:top-8 md:h-[160px] md:w-[160px] lg:h-[200px] lg:w-[200px]"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
        >
          <circle cx="100" cy="100" r="80" />
          <circle cx="100" cy="100" r="55" />
          <path d="M100 20 L110 100 L100 180 L90 100 Z" fill="currentColor" opacity="0.5" />
          <path d="M20 100 L100 90 L180 100 L100 110 Z" fill="currentColor" opacity="0.3" />
        </svg>

        <div class="relative max-w-[1180px]">
          {#if eyebrow}
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
              <span class="text-xs font-semibold uppercase tracking-[0.15em] text-clay">
                {eyebrow}
              </span>
            </div>
          {/if}
          {#if title}
            <h2
              class="font-serif mt-4 text-3xl leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[42px]"
            >
              {title}
            </h2>
          {/if}
          {#if body}
            <p class="mt-4 max-w-[760px] text-base leading-relaxed text-ink/70 md:text-lg">
              {body}
            </p>
          {/if}
        </div>

        {#if imageUrl}
          <div class="relative mt-8 overflow-hidden rounded-[12px] border border-ink/10 md:mt-10">
            <img
              src={imgUrl(imageUrl, 1600)}
              alt={title}
              loading="lazy"
              class="h-full w-full object-cover aspect-[21/9]"
            />
          </div>
        {/if}

        {#if points.length}
          <div class="relative mt-10 grid gap-10 md:mt-14 md:grid-cols-2 md:gap-14">
            {#each points as col (col.title)}
              <div>
                {#if col.title}
                  <h3 class="font-serif text-xl text-heading md:text-2xl">{col.title}</h3>
                  <div class="mt-3 h-[2px] w-10 bg-goldfinch-gold" aria-hidden="true"></div>
                {/if}
                {#if col.text}
                  <ul class="mt-6 space-y-[15px]">
                    <li class="flex items-start gap-3.5 text-[15px] leading-relaxed text-heading">
                      <span
                        aria-hidden="true"
                        class="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-goldfinch-gold"
                      ></span>
                      <span>{col.text}</span>
                    </li>
                  </ul>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        {#if footnote || (ctaLabel && ctaHref)}
          <div class="relative mt-10 border-t border-ink/10 pt-6 md:mt-14 md:pt-7">
            {#if footnote}
              <p class="max-w-3xl text-[15px] italic leading-relaxed text-ink/70 md:text-base">
                {footnote}
              </p>
            {/if}
            {#if ctaLabel && ctaHref}
              <a
                href={ctaHref}
                class="mt-6 inline-flex items-center justify-center rounded-[12px] bg-deep-green px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest"
              >
                {ctaLabel}
              </a>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </section>
{/if}
