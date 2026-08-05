<script lang="ts">
  // Reusable "how planning works" process (spec §5). `compact` renders a tight
  // vertical timeline for sidebars; the default renders a homepage-width row.
  export let title = '';
  export let subtitle = '';
  export let compact = false;

  type Step = { title: string; text: string };
  const defaultSteps: Step[] = [
    { title: 'Discover', text: 'Share your dates, budget and what you dream of doing — in a conversation, not a checkout.' },
    { title: 'Design', text: 'A specialist shapes a tailored itinerary around you, never a fixed package.' },
    { title: 'Refine', text: 'Adjust the pace, lodges and activities together until it feels exactly right.' },
    { title: 'Confirm', text: 'No pressure and no payment to start — you decide if and when to book.' },
    { title: 'Travel', text: 'Enjoy your journey with a local team reachable throughout your trip.' },
    { title: 'Aftercare', text: 'We check in when you are home and help you plan the next adventure.' }
  ];

  // Callers can pass a tailored set (e.g. the Plan My Trip sidebar); defaults
  // keep every existing usage unchanged.
  export let steps: Step[] = defaultSteps;
</script>

{#if compact}
  <div class="grid gap-3">
    {#if title}<p class="text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">{title}</p>{/if}
    <ol class="relative grid gap-4 border-l border-ink/10 pl-6">
      {#each steps as step, i}
        <li class="relative">
          <span class="absolute -left-[31px] grid h-6 w-6 place-items-center rounded-full bg-forest text-[11px] font-bold text-white ring-4 ring-white">{i + 1}</span>
          <p class="text-sm font-semibold text-ink">{step.title}</p>
          <p class="mt-0.5 text-xs leading-5 text-ink/70">{step.text}</p>
        </li>
      {/each}
    </ol>
  </div>
{:else}
  <div class="text-center">
    {#if title}<h2 class="text-3xl font-semibold tracking-normal text-heading md:text-[38px]">{title}</h2>{/if}
    {#if subtitle}<p class="mx-auto mt-3 max-w-2xl text-base leading-8 text-ink/65">{subtitle}</p>{/if}
    <ol class="mt-10 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
      {#each steps as step, i}
        <li class="relative overflow-hidden rounded-[8px] border border-ink/10 bg-surface p-6 shadow-card transition hover:border-goldfinch-gold/35">
          <span class="font-sans text-4xl font-extrabold text-goldfinch-gold">{(i + 1).toString().padStart(2, '0')}</span>
          <h3 class="mt-3 text-lg font-semibold text-heading">{step.title}</h3>
          <p class="mt-2 text-sm leading-7 text-ink/65">{step.text}</p>
        </li>
      {/each}
    </ol>
  </div>
{/if}
