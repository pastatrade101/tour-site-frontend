<script lang="ts">
  import { ArrowRight, Compass, Heart, HeartHandshake, Link2, MapPinned, ReceiptText } from '@lucide/svelte';

  type WhyFeature = {
    body?: string;
    icon?: string;
    icon_url?: string;
    text?: string;
    title: string;
  };

  export let eyebrow = 'Why Goldfinch';
  export let title = 'A Local Team to Help You Make Sense of Tanzania';
  export let titleHighlight = 'Tanzania';
  export let subtitle =
    'Tanzania has many possible routes. That is the good part — and also the confusing part. We help you understand what fits your dates, budget, pace and travel style before you commit to anything.';
  export let ctaLabel = 'Plan Your Trip';
  export let ctaHref = '#lead-form';
  export let features: WhyFeature[] = [
    {
      icon_url: '/images/icons-home/icon-planned.png',
      title: 'Planned Around Your Trip',
      text: 'We do not force every traveller into the same route. Safari, Zanzibar, Kilimanjaro, culture and beach can be shaped around what you actually want.'
    },
    {
      icon_url: '/images/icons-home/icon-local-knowledge.png',
      title: 'Local Knowledge, Real Experience',
      text: 'We understand the parks, roads, seasons, lodge areas, domestic flights and beach regions because this is where we work.'
    },
    {
      icon_url: '/images/icons-home/icon-real-support.png',
      title: 'Real Support, Real People',
      text: 'From first enquiry to final drop-off, you speak with people who know your route and can help when plans need adjusting.'
    },
    {
      icon_url: '/images/icons-home/icon-transparent-planning.png',
      title: 'Transparent Planning',
      text: 'We explain what affects cost — lodges, park fees, transfers, domestic flights, route style and comfort level — before you confirm.'
    },
    {
      icon_url: '/images/icons-home/icon-we-care.png',
      title: 'We Actually Care',
      text: 'Tanzania is our home. The goal is not to sell the longest trip. It is to help you experience the country properly.'
    },
    {
      icon_url: '/images/icons-home/icon-connected.png',
      title: 'Connected From Start to Finish',
      text: 'Safari, Zanzibar, Kilimanjaro, culture, airport pickups, domestic flights, guides and transfers are planned as one connected journey.'
    }
  ];

  const FALLBACK_ICONS = [Compass, MapPinned, HeartHandshake, ReceiptText, Heart, Link2];
  const iconFor = (index: number) => FALLBACK_ICONS[index % FALLBACK_ICONS.length];
  const featureText = (feature: WhyFeature) => feature.text?.trim() || feature.body?.trim() || '';

  $: visibleFeatures = (features ?? []).filter((feature) => feature?.title?.trim()).slice(0, 6);
  $: highlightAt = titleHighlight ? title.toLowerCase().lastIndexOf(titleHighlight.toLowerCase()) : -1;
  $: titleBefore = highlightAt >= 0 ? title.slice(0, highlightAt) : title;
  $: highlightedTitle = highlightAt >= 0 ? title.slice(highlightAt, highlightAt + titleHighlight.length) : '';
  $: titleAfter = highlightAt >= 0 ? title.slice(highlightAt + titleHighlight.length) : '';
</script>

{#if visibleFeatures.length}
  <section class="home-why-choose bg-white py-14 md:py-20">
    <div class="container-shell">
      <div class="mx-auto max-w-[1180px] text-center">
        {#if eyebrow}
          <span class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">{eyebrow}</span>
        {/if}
        {#if title}
          <h2 class="mx-auto mt-3 max-w-4xl font-serif text-3xl font-semibold leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[44px]">
            {titleBefore}{#if highlightedTitle}<span class="italic text-goldfinch-gold">{highlightedTitle}</span>{titleAfter}{/if}
          </h2>
        {/if}
        {#if subtitle}
          <p class="mx-auto mt-4 max-w-[720px] text-base leading-relaxed text-ink/65">{subtitle}</p>
        {/if}
      </div>

      <div class="mt-14 flex flex-wrap justify-center gap-x-11 gap-y-14">
        {#each visibleFeatures as feature, index (feature.title)}
          {@const FallbackIcon = iconFor(index)}
          <article class="max-w-[300px] flex-1 basis-[240px] text-center">
            <div class="flex h-16 items-end justify-center">
              {#if feature.icon_url || feature.icon}
                <img
                  src={feature.icon_url || feature.icon}
                  alt=""
                  loading="lazy"
                  class="h-16 w-auto object-contain"
                />
              {:else}
                <FallbackIcon size={52} strokeWidth={1.35} class="text-goldfinch-gold" aria-hidden="true" />
              {/if}
            </div>
            <h3 class="mt-5 font-serif text-[19px] font-semibold leading-tight text-heading">{feature.title}</h3>
            {#if featureText(feature)}
              <p class="mt-2.5 text-sm leading-relaxed text-ink/65">{featureText(feature)}</p>
            {/if}
          </article>
        {/each}
      </div>

      {#if ctaLabel && ctaHref}
        <div class="mt-14 flex justify-center">
          <a
            href={ctaHref}
            data-cta="why-goldfinch-plan"
            class="inline-flex items-center gap-2 rounded-[13px] bg-goldfinch-gold px-8 py-3.5 text-[15px] font-semibold text-heading transition-colors hover:bg-[#C68A1E]"
          >
            {ctaLabel}
            <ArrowRight size={16} />
          </a>
        </div>
      {/if}
    </div>
  </section>
{/if}

<style>
  @media (max-width: 767px) {
    .home-why-choose h2 {
      font-size: clamp(1.85rem, 8vw, 2.25rem);
      line-height: 1.08;
      text-wrap: balance;
    }
  }
</style>
