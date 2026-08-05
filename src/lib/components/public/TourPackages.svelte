<script lang="ts">
  import { fadeUpOnScroll } from '$lib/animations';
  import { ArrowRight } from '@lucide/svelte';
  import DealCard from './DealCard.svelte';

  export let eyebrow = 'Handpicked journeys';
  export let title = 'Top Tour Packages';
  export let subtitle =
    'Our most-loved safari, Kilimanjaro and Zanzibar itineraries — each fully tailorable to you.';
  export let tours: any[] = [];

  let active = 'All';

  $: cats = ['All', ...Array.from(new Set(tours.map((t) => t.experience_type).filter(Boolean)))];
  $: shown = active === 'All' ? tours : tours.filter((t) => t.experience_type === active);
</script>

<section class="bg-canvas py-14 md:py-20" use:fadeUpOnScroll>
  <div class="container-shell">
    <!-- header -->
    <div class="mx-auto max-w-2xl text-center">
      <p class="text-sm font-semibold uppercase tracking-[0.16em] text-goldfinch-gold">{eyebrow}</p>
      <h2 class="mt-3 text-3xl font-semibold leading-tight text-heading md:text-[38px]">{title}</h2>
      <p class="mt-4 leading-7 text-ink/70">{subtitle}</p>
    </div>

    <!-- filter tabs -->
    <div class="mt-8 flex max-w-full gap-2 overflow-x-auto pb-1 md:flex-wrap md:justify-center">
      {#each cats as cat}
        <button
          type="button"
          class={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
            active === cat
              ? 'bg-deep-green text-white'
              : 'border border-ink/15 text-ink hover:bg-sand'
          }`}
          on:click={() => (active = cat)}
        >
          {cat}
        </button>
      {/each}
    </div>

    <!-- grid -->
    <div class="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {#each shown as t, i (t.id ?? i)}
        <DealCard tour={t} index={i} />
      {/each}
    </div>

    <!-- can't find band -->
    <div
      class="mt-10 flex flex-col items-center justify-between gap-4 rounded-[8px] border border-ink/10 bg-sand/50 p-5 text-center sm:flex-row sm:text-left md:p-6"
    >
      <div>
        <p class="font-semibold text-heading">Can't find your perfect trip?</p>
        <p class="text-sm text-ink/65">
          Tell us what you have in mind and we'll build it from scratch — free.
        </p>
      </div>
      <a
        class="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-goldfinch-gold px-6 font-bold text-heading transition hover:brightness-105"
        href="/plan-my-trip"
      >
        Get a free quote <ArrowRight size={16} />
      </a>
    </div>
  </div>
</section>
