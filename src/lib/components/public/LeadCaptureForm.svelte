<script lang="ts">
  /**
   * The homepage / listing trip-planning prompt.
   *
   * This used to render input fields with no submit handler and no endpoint —
   * anything a visitor typed into it was silently discarded. It is now a
   * genuine call to action. The card links to the six-step planner page; the
   * inline variant (the homepage closing band) shows the planner form itself. Props and file name are unchanged so its three mount points
   * (homepage, tours listing, placeholder pages) needed no edits.
   *
   */
  import { ArrowRight, MessageCircle } from '@lucide/svelte';
  import { t } from '$lib/i18n/ui';
  import EnquiryForm from './enquiry/EnquiryForm.svelte';
  import { configFor } from '$lib/enquiry/configs';
  import type { Option } from '$lib/enquiry/types';

  /** Empty means the translated default heading. */
  export let title = '';
  export let compact = false;
  /**
   * Show the form itself instead of a card that opens it.
   *
   * For a section whose whole job is to invite someone to plan a trip — the
   * closing band on the homepage — a button to open a dialog is one click
   * between the invitation and the first question.
   */
  export let inline = false;
  /** Trip types offered on the first step. Real published categories. */
  export let tripTypes: Option[] = [];
  /** Comfort level → a real property photograph at that level. */
  export let styleImages: Record<string, string> = {};

  $: config = configFor('homepage_trip_planner', {}, [], { tripTypes, styleImages });

  // i18n keys, translated where they are rendered.
  const POINTS = [
    'lead_capture_form.point_route_and_pace',
    'lead_capture_form.point_honest_advice',
    'lead_capture_form.point_one_specialist'
  ];
</script>

{#if inline}
  <EnquiryForm inline {config} />
{:else}
<div
  class={`relative grid gap-5 overflow-hidden rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card ${compact ? '' : 'md:p-6'}`}
>
  <span class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-goldfinch-gold via-forest/45 to-transparent" aria-hidden="true"></span>

  <div>
    <p class="text-sm font-semibold uppercase tracking-[0.14em] text-goldfinch-gold">{$t('lead.tell_us')}</p>
    <h3 class="mt-2 text-2xl font-bold tracking-normal text-heading">{title || $t('lead_capture_form.title')}</h3>
    <p class="mt-2 text-sm leading-6 text-ink/70">
      {$t('lead_capture_form.intro')}
    </p>
  </div>

  <ul class="grid gap-2">
    {#each POINTS as point}
      <li class="flex items-start gap-2.5 text-sm leading-6 text-ink/75">
        <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-goldfinch-gold" aria-hidden="true"></span>
        {$t(point)}
      </li>
    {/each}
  </ul>

  <div class="grid gap-3 sm:flex sm:flex-wrap">
    <!-- Planning starts on the six-step planner page, not in a popup. -->
    <a
      class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-forest px-6 text-sm font-bold text-white transition hover:bg-deep-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 sm:w-auto"
      href="/plan-my-trip"
    >
      {$t('cta.plan_my_trip')} <ArrowRight size={16} />
    </a>
    <a
      class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] border border-ink/15 px-6 text-sm font-bold text-heading transition hover:border-goldfinch-gold hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold sm:w-auto"
      href="/contact"
    >
      <MessageCircle size={16} /> {$t('cta.talk_to_advisor')}
    </a>
  </div>

  <p class="text-xs text-ink/50">{$t('lead.no_payment')}</p>
</div>
{/if}
