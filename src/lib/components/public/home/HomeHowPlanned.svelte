<script lang="ts">
  export let eyebrow = 'How Your Trip Is Planned';
  export let title = 'Simple Planning. Clear Routes. Local Support.';
  export let subtitle =
    "You do not need to arrive with a finished itinerary. Share the basics, and we'll help turn the idea into a route that makes sense.";

  export let steps: Array<{ title: string; text: string }> = [
    {
      title: 'Tell Us What You Have in Mind',
      text: 'Share your dates, starting point, number of travellers, budget range and whether you want safari, Zanzibar, Kilimanjaro, culture or a mix.'
    },
    {
      title: 'We Shape the Right Route',
      text: 'We suggest what fits, what to avoid and how the journey could flow from arrival to departure.'
    },
    {
      title: 'We Refine the Details',
      text: 'Lodges, camps, beach areas, domestic flights, transfers, guides and timing are matched to your season and comfort level.'
    },
    {
      title: 'You Travel With Local Support',
      text: 'You travel with trusted guides and a Tanzania-based team reachable from arrival to departure.'
    }
  ];

  const stepNumber = (i: number) => String(i + 1).padStart(2, '0');
</script>

{#if steps.length}
  <section class="home-how-planned py-14 md:py-20">
    <div class="container-shell">
      <div class="home-how-head max-w-[1180px]">
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
      <div class="home-how-grid mt-10 grid gap-8 md:grid-cols-4 md:gap-6">
        {#each steps as s, i (s.title)}
          <div class="home-how-card border-t border-ink/10 pt-5">
            <div class="font-serif text-4xl text-clay">{stepNumber(i)}</div>
            {#if s.title}
              <h3 class="mt-3 text-lg font-semibold text-heading">{s.title}</h3>
            {/if}
            {#if s.text}
              <p class="mt-2 text-sm leading-relaxed text-ink/70">{s.text}</p>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </section>
{/if}

<style>
  @media (max-width: 767px) {
    .home-how-planned {
      padding-block: 3.25rem;
      background: rgb(var(--c-surface));
    }

    .home-how-head h2 {
      font-size: clamp(1.85rem, 8vw, 2.25rem);
      line-height: 1.08;
      text-wrap: balance;
    }

    .home-how-head p {
      font-size: 0.95rem;
      line-height: 1.65;
    }

    .home-how-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.85rem;
      margin-top: 1.5rem;
    }

    .home-how-card {
      min-height: 0;
      border: 1px solid rgb(var(--c-ink) / 0.1);
      border-radius: 12px;
      background: rgb(var(--c-surface));
      padding: 1.1rem;
    }
  }
</style>
