<script lang="ts">
  /**
   * The homepage / listing trip-planning prompt.
   *
   * This used to render input fields with no submit handler and no endpoint —
   * anything a visitor typed into it was silently discarded. It is now a
   * genuine call to action that opens the three-step trip planner, which does
   * submit. Props and file name are unchanged so its three mount points
   * (homepage, tours listing, placeholder pages) needed no edits.
   *
   * The popup is only ever opened by this button. It never appears on load.
   */
  import { ArrowRight, MessageCircle } from '@lucide/svelte';
  import EnquiryForm from './enquiry/EnquiryForm.svelte';
  import { configFor } from '$lib/enquiry/configs';

  export let title = 'Plan your East Africa trip';
  export let compact = false;

  let open = false;
  const config = configFor('homepage_trip_planner');

  const POINTS = [
    'A route and pace built around your dates',
    'Honest advice on timing, parks and lodges',
    'One local specialist, start to finish'
  ];
</script>

<div
  class={`relative grid gap-5 overflow-hidden rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card ${compact ? '' : 'md:p-6'}`}
>
  <span class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-goldfinch-gold via-forest/45 to-transparent" aria-hidden="true"></span>

  <div>
    <p class="text-sm font-semibold uppercase tracking-[0.14em] text-goldfinch-gold">Tell us about your trip</p>
    <h3 class="mt-2 text-2xl font-bold tracking-normal text-heading">{title}</h3>
    <p class="mt-2 text-sm leading-6 text-ink/70">
      Answer a few questions and a local specialist will come back with a trip that fits your dates, interests and
      budget.
    </p>
  </div>

  <ul class="grid gap-2">
    {#each POINTS as point}
      <li class="flex items-start gap-2.5 text-sm leading-6 text-ink/75">
        <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-goldfinch-gold" aria-hidden="true"></span>
        {point}
      </li>
    {/each}
  </ul>

  <div class="grid gap-3 sm:flex sm:flex-wrap">
    <button
      type="button"
      class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-forest px-6 text-sm font-bold text-white transition hover:bg-deep-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 sm:w-auto"
      on:click={() => (open = true)}
    >
      Plan My Trip <ArrowRight size={16} />
    </button>
    <a
      class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] border border-ink/15 px-6 text-sm font-bold text-heading transition hover:border-goldfinch-gold hover:bg-sand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold sm:w-auto"
      href="/contact"
    >
      <MessageCircle size={16} /> Talk to a specialist
    </a>
  </div>

  <p class="text-xs text-ink/50">No payment required — we reply within one business day.</p>
</div>

<EnquiryForm bind:open {config} on:close={() => (open = false)} />
