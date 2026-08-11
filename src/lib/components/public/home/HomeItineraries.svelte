<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { currency, formatUsd } from '$lib/currency';
  import Img from '../Img.svelte';

  export let eyebrow = 'Featured Itineraries';
  export let title = 'Trip Ideas You Can Shape Around You';
  export let subtitle =
    'These are not rigid packages. They are starting points — useful examples of how safari, beach, Kilimanjaro, culture and seasonal wildlife routes can be built around your travel dates.';
  export let tours: any[] = [];
  export let ctaHref = '/tours';
  export let ctaLabel = 'Browse all itineraries';
  export let viewLabel = 'View this trip';

  $: list = (tours ?? []).filter(Boolean);
  $: featured = list[0];
  $: rest = list.slice(1);

  const imageOf = (t: any): string => t?.main_image_url || t?.image_url || t?.hero_image_url || '';

  const durationLabel = (t: any): string => {
    const d = Number(t?.duration_days);
    if (!Number.isFinite(d) || d <= 0) return '';
    return `${d} ${d === 1 ? 'day' : 'days'}`;
  };

  const priceLabel = (t: any): string => {
    const p = Number(t?.price_from);
    if (!Number.isFinite(p) || p <= 0) return 'Price on request';
    return `From ${formatUsd(p, $currency)}`;
  };

  const hasPrice = (t: any): boolean => {
    const p = Number(t?.price_from);
    return Number.isFinite(p) && p > 0;
  };

  const badgeLabel = (t: any): string => (t?.is_popular ? 'Most Popular' : t?.is_featured ? 'Featured' : '');
</script>

{#if list.length}
  <section id="featured-itineraries" class="home-itineraries scroll-mt-20 py-14 md:py-[64px]">
    <div class="container-shell">
      <div class="home-itineraries-head max-w-[1180px]">
        {#if eyebrow}
          <div class="inline-flex items-center gap-2">
            <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
            <span class="text-xs font-semibold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
          </div>
        {/if}
        {#if title}
          <h2 class="font-serif mt-3 text-3xl leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[40px]">
            {title}
          </h2>
        {/if}
        {#if subtitle}
          <p class="mt-3 max-w-[720px] text-[15px] leading-relaxed text-ink/70">
            {subtitle}
          </p>
        {/if}
      </div>

      <div class="mt-8 grid gap-5 lg:grid-cols-2 lg:items-stretch">
        <!-- Featured card -->
        {#if featured}
          <article class="home-itinerary-feature flex flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div class="relative w-full overflow-hidden bg-sand">
              {#if imageOf(featured)}
                <Img
                  record={featured}
                  fields={['main_image_url', 'image_url', 'hero_image_url', 'banner_image_url']}
                  alt=""
                  width={1200}
                  height={680}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="h-[220px] w-full object-cover sm:h-[260px] lg:h-[320px]"
                />
              {/if}
              {#if badgeLabel(featured)}
                <span class="absolute left-4 top-4 inline-flex items-center rounded-md bg-clay px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                  {badgeLabel(featured)}
                </span>
              {/if}
            </div>
            <div class="flex flex-1 flex-col p-5 md:p-6">
              <h3 class="font-serif text-xl leading-tight text-heading sm:text-2xl">
                {featured.title}
              </h3>
              {#if durationLabel(featured)}
                <p class="mt-1.5 text-[13px] text-ink/70">
                  {durationLabel(featured)}
                </p>
              {/if}
              {#if featured.short_description}
                <p class="mt-3 text-[14px] leading-relaxed text-heading/85 line-clamp-2">
                  {featured.short_description}
                </p>
              {/if}
              <div class="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                <div>
                  <div class="text-[10px] uppercase tracking-[0.14em] text-ink/70">Price</div>
                  <div class="text-[15px] font-semibold text-heading">
                    {#if hasPrice(featured)}
                      {priceLabel(featured)} <span class="text-[13px] font-normal text-ink/70">pp</span>
                    {:else}
                      Price on request
                    {/if}
                  </div>
                </div>
                <a
                  href={`/tours/${featured.slug}`}
                  data-cta="featured-itinerary"
                  class="inline-flex items-center gap-1.5 rounded-md bg-goldfinch-gold px-4 py-2 text-[13px] font-semibold text-heading transition-colors hover:bg-goldfinch-gold/85"
                >
                  {viewLabel}
                  <ArrowRight size={14} strokeWidth={2} />
                </a>
              </div>
            </div>
          </article>
        {/if}

        <!-- Compact list -->
        <ul class="flex h-full flex-col divide-y divide-ink/10 overflow-hidden rounded-[10px] border border-ink/10 bg-surface">
          {#each rest as t (t.slug ?? t.title)}
            <li class="flex-1">
              <a
                href={`/tours/${t.slug}`}
                class="itinerary-list-link group flex h-full items-center gap-3 px-4 py-3 transition-colors hover:bg-sand"
              >
                {#if imageOf(t)}
                  <Img
                    record={t}
                    fields={['main_image_url', 'image_url', 'hero_image_url', 'banner_image_url']}
                    alt=""
                    width={128}
                    height={128}
                    sizes="56px"
                    className="h-14 w-14 shrink-0 rounded-[8px] object-cover"
                  />
                {/if}
                <div class="min-w-0 flex-1">
                  <h4 class="truncate text-[14px] font-semibold text-heading">{t.title}</h4>
                  {#if durationLabel(t)}
                    <p class="mt-0.5 truncate text-[12px] text-ink/70">{durationLabel(t)}</p>
                  {/if}
                </div>
                <div class="flex shrink-0 items-center gap-2 pl-2">
                  <span class="itinerary-list-price text-[13px] font-semibold text-heading">{priceLabel(t)}</span>
                  <ArrowRight size={14} strokeWidth={2} class="text-clay transition-transform group-hover:translate-x-0.5" />
                </div>
              </a>
            </li>
          {/each}
          <li>
            <a
              href={ctaHref}
              data-cta="browse-all-itineraries"
              class="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-sand"
            >
              <span class="text-[12px] font-semibold uppercase tracking-[0.14em] text-clay">
                {ctaLabel}
              </span>
              <ArrowRight size={16} strokeWidth={2} class="text-clay transition-transform group-hover:translate-x-0.5" />
            </a>
          </li>
        </ul>
      </div>
    </div>
  </section>
{/if}

<style>
  @media (max-width: 767px) {
    .home-itineraries {
      padding-block: 3.25rem;
      background: rgb(var(--c-surface));
    }

    .home-itineraries-head h2 {
      font-size: clamp(1.85rem, 8vw, 2.25rem);
      line-height: 1.08;
      text-wrap: balance;
    }

    .home-itineraries-head p {
      font-size: 0.95rem;
      line-height: 1.65;
    }

    .home-itinerary-feature {
      border-radius: 12px;
    }

    .home-itinerary-feature :global(img) {
      height: 200px;
    }

    .itinerary-list-link {
      align-items: flex-start;
      min-height: 82px;
    }

    .itinerary-list-price {
      max-width: 7.5rem;
      white-space: normal;
      text-align: right;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }
  }
</style>
