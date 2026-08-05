<script lang="ts">
  import { Compass, Users, Heart, Shield, Sparkles, Plane } from '@lucide/svelte';

  export let eyebrow = 'Why Goldfinch';
  export let title = 'A Local Team to Help You Make Sense of Tanzania';
  export let subtitle =
    'Tanzania has many possible routes. That is the good part — and also the confusing part. We help you understand what fits your dates, budget, pace and travel style before you commit to anything.';

  export let features: Array<{ title: string; text: string }> = [
    {
      title: 'Planned Around Your Trip',
      text: 'We do not force every traveller into the same route. Safari, Zanzibar, Kilimanjaro, culture and beach can be shaped around what you actually want.'
    },
    {
      title: 'Local Knowledge, Real Experience',
      text: 'We understand the parks, roads, seasons, lodge areas, domestic flights and beach regions because this is where we work.'
    },
    {
      title: 'Real Support, Real People',
      text: 'From first enquiry to final drop-off, you speak with people who know your route and can help when plans need adjusting.'
    },
    {
      title: 'Transparent Planning',
      text: 'We explain what affects cost — lodges, park fees, transfers, domestic flights, route style and comfort level — before you confirm.'
    },
    {
      title: 'We Actually Care',
      text: 'Tanzania is our home. The goal is not to sell the longest trip. It is to help you experience the country properly.'
    },
    {
      title: 'Connected From Start to Finish',
      text: 'Safari, Zanzibar, Kilimanjaro, culture, airport pickups, domestic flights, guides and transfers are planned as one connected journey.'
    }
  ];

  const ICONS = [Compass, Users, Heart, Shield, Sparkles, Plane];
  const iconFor = (i: number) => ICONS[i % ICONS.length];
</script>

{#if features.length}
  <section class="py-14 md:py-20">
    <div class="container-shell">
      <div class="max-w-[1180px]">
        {#if eyebrow}
          <div class="inline-flex items-center gap-2">
            <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
            <span class="text-xs font-semibold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
          </div>
        {/if}
        {#if title}
          <h2
            class="font-serif mt-3 text-3xl leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[44px]"
          >
            {title}
          </h2>
        {/if}
        {#if subtitle}
          <p class="mt-4 max-w-[820px] text-base leading-relaxed text-ink/70">
            {subtitle}
          </p>
        {/if}
      </div>
      <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each features as f, i (f.title)}
          <div
            class="group rounded-lg border border-ink/10 bg-surface p-6 transition-shadow hover:shadow-[0_6px_20px_rgba(15,23,42,0.06)]"
          >
            <div
              class="inline-flex h-10 w-10 items-center justify-center rounded-md bg-sand text-goldfinch-gold"
            >
              <svelte:component this={iconFor(i)} size={20} strokeWidth={2} />
            </div>
            {#if f.title}
              <h3 class="mt-4 text-lg font-semibold text-heading">{f.title}</h3>
            {/if}
            {#if f.text}
              <p class="mt-2 text-sm leading-relaxed text-ink/70">{f.text}</p>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </section>
{/if}
