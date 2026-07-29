<script lang="ts">
  import { Compass, HeartHandshake, ShieldCheck } from '@lucide/svelte';
  import { fadeUpOnScroll } from '$lib/animations';

  export let eyebrow = 'Why travel with us';
  export let title = 'Your Safari, Your Way';
  export let subtitle =
    'We listen first, then design. Every trip is shaped around your dates, budget and the kind of journey you want.';

  const features = [
    {
      icon: Compass,
      title: '100% Tailored Safaris',
      body: 'Every itinerary is built around you — never a fixed, off-the-shelf package.'
    },
    {
      icon: HeartHandshake,
      title: 'Expert Local Assistance',
      body: 'Real specialists who live and travel Tanzania, reachable before and throughout your trip.'
    },
    {
      icon: ShieldCheck,
      title: 'Trusted Local Operator',
      body: 'Licensed, insured and honest — no pressure, and no payment to start planning.'
    }
  ];
</script>

<section class="bg-surface py-16 md:py-24" use:fadeUpOnScroll>
  <div class="container-shell">
    <div class="text-center">
      <p class="text-sm font-semibold uppercase tracking-[0.16em] text-goldfinch-gold">{eyebrow}</p>
      <h2 class="mt-3 text-3xl md:text-[38px] font-semibold text-heading">{title}</h2>
      <p class="mx-auto mt-4 max-w-2xl text-ink/65 leading-8">{subtitle}</p>
    </div>

    <div class="mt-12 grid gap-6 md:grid-cols-3">
      {#each features as feature}
        <div class="rounded-2xl border border-ink/10 bg-canvas p-7 shadow-soft">
          <span class="grid h-12 w-12 place-items-center rounded-full bg-goldfinch-gold/15 text-goldfinch-gold">
            <svelte:component this={feature.icon} size={22} />
          </span>
          <h3 class="mt-5 text-lg font-semibold text-heading">{feature.title}</h3>
          <p class="mt-2 text-ink/65 leading-7">{feature.body}</p>
        </div>
      {/each}
    </div>
  </div>
</section>
