<script lang="ts">
  import { Check } from '@lucide/svelte';
  import { fadeUpOnScroll } from '$lib/animations';

  type Season = {
    name: string;
    months: string;
    tone: 'gold' | 'green' | 'clay';
    points: string[];
  };

  export let eyebrow = 'When to go';
  export let title = 'Best Times to Visit Tanzania';
  export let subtitle =
    'Every season has its magic — here is an honest guide so we can match your trip to what matters most to you.';

  export let seasons: Season[] = [
    {
      tone: 'gold',
      name: 'Dry Season',
      months: 'Jun – Oct',
      points: [
        'Peak wildlife — animals gather at water',
        'Great Migration river crossings (Jul–Oct)',
        'Clear skies, cooler nights',
        'Busier parks, premium prices'
      ]
    },
    {
      tone: 'green',
      name: 'Green Season',
      months: 'Nov – May',
      points: [
        'Lush scenery and dramatic skies',
        'Calving season in the south (Jan–Mar)',
        'Fewer vehicles, better value',
        'Superb light for photography'
      ]
    },
    {
      tone: 'clay',
      name: 'Shoulder Season',
      months: 'Apr – May',
      points: [
        'Quietest parks and lowest prices',
        'Short afternoon showers',
        'Vivid green landscapes',
        'Great for repeat travellers'
      ]
    }
  ];

  const bandClasses: Record<Season['tone'], string> = {
    gold: 'bg-goldfinch-gold text-heading',
    green: 'bg-deep-green text-white',
    clay: 'bg-clay text-white'
  };
</script>

<section class="bg-canvas py-16 md:py-24" use:fadeUpOnScroll>
  <div class="container-shell">
    <div class="mx-auto max-w-2xl text-center">
      <p class="text-sm font-semibold uppercase tracking-[0.16em] text-goldfinch-gold">{eyebrow}</p>
      <h2 class="mt-3 text-3xl md:text-[38px] leading-tight font-semibold text-heading">{title}</h2>
      <p class="mt-4 text-ink/70">{subtitle}</p>
    </div>

    <div class="mt-12 grid gap-6 md:grid-cols-3">
      {#each seasons as season}
        <div class="overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-soft">
          <div class={bandClasses[season.tone]}>
            <div class="p-5">
              <h3 class="text-lg font-semibold">{season.name}</h3>
              <p class="mt-0.5 text-sm font-medium opacity-80">{season.months}</p>
            </div>
          </div>
          <div class="space-y-3 p-5">
            {#each season.points as point}
              <div class="flex items-start gap-2.5">
                <Check size={16} strokeWidth={2.4} class="mt-0.5 shrink-0 text-goldfinch-gold" />
                <span class="text-sm leading-6 text-ink/70">{point}</span>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>
