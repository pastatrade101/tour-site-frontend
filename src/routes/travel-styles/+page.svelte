<script lang="ts">
  import { ArrowRight, Heart } from '@lucide/svelte';
  import { TRAVEL_STYLES } from '$lib/data/travel-styles';
</script>

<section class="relative overflow-hidden bg-gradient-to-br from-deep-green via-forest to-deep-green text-white">
  <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
  <div class="container-shell relative py-16 text-center md:py-20">
    <span class="inline-flex items-center gap-2 rounded-full border border-goldfinch-gold/30 bg-goldfinch-gold/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">
      <Heart size={14} strokeWidth={2.4} /> Travel Styles
    </span>
    <h1 class="mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-[1.1] tracking-tight md:text-[44px]">How do you want to travel?</h1>
    <p class="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-white/75 md:text-lg">
      Honeymoon, family, luxury, photography and more — we shape the trip around how you travel, not just where.
    </p>
  </div>
</section>

<section class="container-shell py-12 md:py-16">
  <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {#each TRAVEL_STYLES as style (style.slug)}
      <a class="group flex flex-col rounded-2xl border border-ink/10 bg-white p-6 shadow-soft transition hover:border-goldfinch-gold/40 hover:shadow-[0_18px_50px_rgba(15,47,36,0.1)]" href={`/travel-styles/${style.slug}`}>
        <h2 class="text-xl font-extrabold text-deep-green">{style.name}</h2>
        <p class="mt-1 text-sm font-semibold text-clay">{style.emotionalPromise}</p>
        <p class="mt-2 flex-1 text-sm leading-6 text-ink/65">{style.description}</p>
        <span class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition group-hover:text-deep-green">Explore {style.name} <ArrowRight size={15} /></span>
      </a>
    {/each}
  </div>
</section>
