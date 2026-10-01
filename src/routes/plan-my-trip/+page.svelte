<script lang="ts">
  /**
   * Plan My Trip — a six-step planner that suggests real trips as it goes.
   *
   * Every "Plan My Trip" link on the site lands here. It replaces the short
   * two-step dialog: the visitor still reaches a specialist, but now arrives
   * with a trip shape (type, length, month, style, budget) and three published
   * tours that fit it, which the specialist sees in the enquiry.
   *
   * The logic lives in lib/tripPlanner.ts. The request goes through the same
   * bookings endpoint as every other form, so the CMS inbox, the staff and
   * traveller emails, HubSpot and the WhatsApp opt-in all work unchanged.
   */
  import { tick } from 'svelte';
  import { page } from '$app/stores';
  import { ArrowLeft, ArrowRight, Check, Lightbulb, Loader2, Lock, Minus, Pencil, Plus, Sparkles } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { getAttribution, trackEvent } from '$lib/analytics';
  import { currency, formatUsd } from '$lib/currency';
  import { brand } from '$lib/brand';
  import { locale, t } from '$lib/i18n/ui';
  import Img from '$lib/components/public/Img.svelte';
  import {
    BUDGETS,
    COMFORT,
    LENGTHS,
    MONTHS,
    MONTH_NAMES,
    MONTH_TIP,
    PARTIES,
    SEASON,
    fromQuery,
    insights,
    offeredTypes,
    placesOf,
    popularBand,
    recommend,
    totalDays,
    travellers,
    typeOf,
    type Draft,
    type PlannerTour,
    type TypeId
  } from '$lib/tripPlanner';

  export let data: { tours: PlannerTour[]; categorySlugs: string[] };

  // Translation keys, resolved with $t where the progress bar renders.
  const STEPS = [
    'pg_plan_my_trip.step_trip_type',
    'ui.travellers',
    'pg_plan_my_trip.step_when',
    'pg_plan_my_trip.step_how_long',
    'ui.preferences',
    'pg_plan_my_trip.step_summary'
  ];
  const LAST = STEPS.length - 1;

  const now = new Date();
  const thisYear = now.getFullYear();
  const years = [thisYear, thisYear + 1, thisYear + 2];
  const monthPast = (year: number, month: number) => year === thisYear && month < now.getMonth();

  // Links from tour, park and style pages carry context — start from it.
  const incoming = fromQuery($page.url.searchParams, now);
  const offered = offeredTypes(data.tours, data.categorySlugs);

  let d: Draft = {
    types: incoming.types.filter((type) => offered.some((o) => o.id === type)),
    party: incoming.party,
    adults: 2,
    children: 0,
    year: incoming.year && incoming.year >= thisYear ? incoming.year : thisYear,
    month: incoming.month ?? now.getMonth(),
    lengths: {},
    comfort: '',
    budget: '',
    notes: ''
  };
  if (monthPast(d.year, d.month)) d.month = now.getMonth();

  let step = 0;
  let errors: Record<string, string> = {};

  // Contact — only asked on the last step.
  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'sw', label: 'Kiswahili' },
    { code: 'de', label: 'Deutsch (German)' },
    { code: 'fr', label: 'Français (French)' },
    { code: 'es', label: 'Español (Spanish)' }
  ];
  const DIAL_CODES = ['+255', '+254', '+256', '+250', '+44', '+1', '+49', '+33', '+34', '+39', '+31', '+41', '+61', '+27', '+971'];
  const CONTACTS = ['WhatsApp', 'Email', 'Phone call'] as const;
  // The values above go to staff as they are; only the button text is translated.
  const CONTACT_LABELS: Record<(typeof CONTACTS)[number], string> = {
    WhatsApp: 'cta.whatsapp',
    Email: 'form.email',
    'Phone call': 'pg_plan_my_trip.phone_call'
  };

  let full_name = '';
  let email = '';
  let dialCode = '+44';
  let phone = '';
  let contact: (typeof CONTACTS)[number] = 'WhatsApp';
  let whatsappConsent = false;
  let language = LANGUAGES.some((l) => l.code === $locale) ? String($locale) : 'en';
  let hp_company = '';
  // One per filled-in form: the bookings table's unique index on it is what stops a double click sending twice.
  const idempotencyKey = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

  let submitting = false;
  let submitted = false;
  let bookingCode = '';
  let errorMessage = '';
  let card: HTMLDivElement;

  $: people = travellers(d);
  $: days = totalDays(d);
  $: tips = insights(d);
  $: price = (usd: number) => formatUsd(usd, $currency);
  $: recs = recommend(d, data.tours, incoming.context, price);
  $: budgetLabel = (id: string) => {
    const band = BUDGETS.find((b) => b.id === id);
    if (!band) return '';
    // Round bands read better without the formatter's cents.
    const whole = (usd: number) => price(usd).replace(/[.,]00(?!\d)/, '');
    if (!band.min) return `${$t('label.under')} ${whole(band.max)}`;
    if (!Number.isFinite(band.max)) return `${whole(band.min)}+`;
    return `${whole(band.min)}–${whole(band.max)}`;
  };
  // Shown on the summary step; lengthSummary() below stays in English for the staff enquiry.
  $: lengthDisplay =
    d.types.map((type) => `${typeOf(type).label}: ${d.lengths[type]}`).join(' · ') +
    (days ? ` (${$t('pg_plan_my_trip.about_n_days').replace('{n}', String(days))})` : '');
  $: interest = (() => {
    const slug = incoming.context.destinationSlug;
    if (slug) {
      for (const tour of data.tours) {
        const hit = placesOf(tour).find((p) => p.slug === slug);
        if (hit) return hit.name;
      }
    }
    return incoming.context.placeName ?? '';
  })();

  const toggleType = (id: TypeId) => {
    const on = d.types.includes(id);
    const lengths = { ...d.lengths };
    if (on) delete lengths[id];
    d = { ...d, types: on ? d.types.filter((x) => x !== id) : [...d.types, id], lengths };
    errors = {};
  };

  const validate = (index: number): boolean => {
    const e: Record<string, string> = {};
    if (index === 0 && !d.types.length) e.types = $t('pg_plan_my_trip.err_types');
    if (index === 1 && !d.party) e.party = $t('pg_plan_my_trip.err_party');
    if (index === 3) for (const type of d.types) if (!d.lengths[type]) e[`len_${type}`] = $t('pg_plan_my_trip.err_length');
    if (index === 4 && !d.comfort) e.comfort = $t('ui.choose_a_comfort_level');
    if (index === LAST) {
      if (full_name.trim().length < 2) e.full_name = $t('pg_plan_my_trip.err_name');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.email = $t('pg_plan_my_trip.err_email');
      const digits = phone.replace(/[\s-]/g, '');
      // A number is only required when that is how they asked to be reached.
      if ((contact !== 'Email' || digits) && !/^\d{6,14}$/.test(digits)) e.phone = $t('pg_plan_my_trip.err_phone');
    }
    errors = e;
    return !Object.keys(e).length;
  };

  const goTo = async (index: number) => {
    step = index;
    errorMessage = '';
    await tick();
    card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const next = () => validate(step) && goTo(Math.min(LAST, step + 1));
  const back = () => goTo(Math.max(0, step - 1));
  /** Jump back to edit — only to steps already passed, so nothing is skipped unvalidated. */
  const edit = (index: number) => index < step && goTo(index);

  const lengthSummary = () =>
    d.types.map((type) => `${typeOf(type).label}: ${d.lengths[type]}`).join(' · ') + (days ? ` (about ${days} days)` : '');

  const submit = async () => {
    if (submitting || !validate(LAST)) return;
    submitting = true;
    errorMessage = '';
    const band = BUDGETS.find((b) => b.id === d.budget);
    try {
      const res = await api.bookings.create({
        tour_id: null,
        full_name: full_name.trim(),
        email: email.trim(),
        phone: phone.trim() ? `${dialCode} ${phone.trim()}` : null,
        // Month only — a made-up day would read as a real date in the CMS.
        travel_date: null,
        number_of_adults: people.adults,
        number_of_children: people.children,
        special_requests: d.notes.trim() || null,
        source: 'plan_my_trip',
        whatsapp_opt_in: whatsappConsent,
        idempotency_key: idempotencyKey,
        lead_context: {
          v: 1,
          form_type: 'trip_planner',
          lead_source: 'Plan My Trip',
          language,
          page: { url: location.href, title: document.title, referrer: document.referrer || undefined },
          attribution: getAttribution(),
          // Named keys are the ones the staff email and HubSpot print as their
          // own lines (notification.service buildLeadFromBooking); the rest
          // are listed under them as they are.
          answers: {
            travel_interests: d.types.map((type) => typeOf(type).label),
            travel_month: `${MONTH_NAMES[d.month]} ${d.year} (${SEASON[d.month].toLowerCase()} season)`,
            traveller_type: PARTIES.find((p) => p.id === d.party)?.label ?? '',
            trip_duration: lengthSummary(),
            accommodation_preference: d.comfort,
            budget_per_person: band ? `${budgetLabelUsd(band)} per person (USD)` : '',
            destination_interest: interest || undefined,
            preferred_contact: contact,
            suggested_trips: recs.map((r) => r.tour.title),
            came_from: incoming.context.tourSlug ? `tour: ${incoming.context.tourSlug}` : incoming.from
          }
        },
        hp_company
      });
      bookingCode = String((res.data as Record<string, unknown>)?.booking_code ?? '');
      submitted = true;
      trackEvent('request_trip_submitted', { metadata: { form: 'trip_planner', language, types: d.types.join(',') } });
      await tick();
      card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      errorMessage = error instanceof Error && error.message ? error.message : $t('form.err_generic');
    } finally {
      submitting = false;
    }
  };

  // Staff read prices in USD, whatever currency the visitor browsed in.
  const budgetLabelUsd = (band: (typeof BUDGETS)[number]) => {
    const usd = (n: number) => `$${n.toLocaleString('en-US')}`;
    if (!band.min) return `Under ${usd(band.max)}`;
    if (!Number.isFinite(band.max)) return `${usd(band.min)}+`;
    return `${usd(band.min)}–${usd(band.max)}`;
  };

  const choice = (on: boolean) =>
    `relative rounded-[10px] border p-4 text-left transition ${
      on ? 'border-goldfinch-gold bg-goldfinch-gold/10 shadow-sm' : 'border-ink/12 bg-surface hover:border-goldfinch-gold'
    }`;
  const pill = (on: boolean) =>
    `rounded-[8px] border px-4 py-2.5 text-sm transition ${
      on ? 'border-goldfinch-gold bg-goldfinch-gold/10 font-semibold text-heading' : 'border-ink/15 text-heading hover:border-goldfinch-gold'
    }`;
</script>

<svelte:head>
  <title>{$t('cta.plan_my_trip')} — {$t('pg_plan_my_trip.meta_title')} | {brand.name}</title>
  <meta name="description" content={$t('pg_plan_my_trip.meta_description')} />
  <meta property="og:title" content="{$t('cta.plan_my_trip')} — {brand.name}" />
  <meta property="og:description" content={$t('pg_plan_my_trip.og_description')} />
</svelte:head>

<section class="bg-deep-green px-4 pb-10 pt-28 text-center md:pb-14 md:pt-32">
  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">{$t('cta.plan_my_trip')}</p>
  <h1 class="mx-auto mt-2 max-w-2xl font-serif text-3xl font-semibold text-white md:text-4xl">{$t('pg_plan_my_trip.title')}</h1>
  <p class="mx-auto mt-3 max-w-xl text-sm text-white/75 md:text-base">
    {$t('pg_plan_my_trip.intro')}
  </p>
</section>

<div class="bg-canvas">
  <!-- items-start: each column keeps its own height. Stretched, the form card
       grew to the sidebar's height and left a tall empty panel under Next. -->
  <div class="mx-auto grid max-w-6xl items-start gap-6 px-4 py-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
    <div bind:this={card} class="scroll-mt-28 rounded-[12px] border border-ink/10 bg-surface p-5 shadow-sm md:p-7">
      {#if submitted}
        <div class="grid gap-3 py-8 text-center">
          <span class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-forest/10 text-forest"><Check size={22} /></span>
          <h2 class="font-serif text-2xl font-semibold text-heading">{$t('form.thank_you')}</h2>
          {#if bookingCode}<p class="gf-hint">{$t('form.your_reference_is')} <b class="text-clay">{bookingCode}</b>.</p>{/if}
          <p class="gf-hint">{$t('form.specialist_replies')}</p>
          {#if recs.length}
            <p class="gf-hint">{$t(recs.length > 1 ? 'pg_plan_my_trip.thanks_start_from_many' : 'pg_plan_my_trip.thanks_start_from_one').replace('{trip}', recs[0].tour.title)}</p>
          {/if}
        </div>
      {:else}
        <!-- Progress: every step named, so the length of the form is never a surprise. -->
        <ol class="mb-6 flex items-start gap-1.5">
          {#each STEPS as label, i}
            <li class="flex-1" aria-current={i === step ? 'step' : undefined}>
              <div class={`h-1.5 rounded-full ${i <= step ? 'bg-goldfinch-gold' : 'bg-ink/10'}`}></div>
              <div class={`mt-1.5 hidden text-[11px] sm:block ${i === step ? 'font-semibold text-heading' : 'text-ink/55'}`}>{$t(label)}</div>
            </li>
          {/each}
        </ol>
        <p class="text-xs text-ink/55">{$t('ui.step_x_of_y').replace('{step}', String(step + 1)).replace('{total}', String(STEPS.length))}</p>

        {#if step === 0}
          <h2 class="mt-2 font-serif text-xl font-semibold text-heading md:text-2xl">{$t('pg_plan_my_trip.trip_type_heading')}</h2>
          <p class="gf-hint mt-1.5">{$t('pg_plan_my_trip.trip_type_hint')}</p>
          {#if errors.types}<p class="mt-2 text-sm font-medium text-clay" role="alert">{errors.types}</p>{/if}
          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            {#each offered as option (option.id)}
              {@const on = d.types.includes(option.id)}
              <button type="button" class={choice(on)} aria-pressed={on} on:click={() => toggleType(option.id)}>
                {#if on}<span class="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-goldfinch-gold text-heading"><Check size={12} /></span>{/if}
                <span class="block font-semibold text-heading">{option.label}</span>
                <span class="mt-0.5 block text-xs text-ink/60">{option.desc}</span>
              </button>
            {/each}
          </div>
        {:else if step === 1}
          <h2 class="mt-2 font-serif text-xl font-semibold text-heading md:text-2xl">{$t('pg_plan_my_trip.whos_travelling')}</h2>
          {#if errors.party}<p class="mt-2 text-sm font-medium text-clay" role="alert">{errors.party}</p>{/if}
          <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {#each PARTIES as option (option.id)}
              <button type="button" class={choice(d.party === option.id)} aria-pressed={d.party === option.id} on:click={() => { d = { ...d, party: option.id }; errors = {}; }}>
                <span class="block text-center font-semibold text-heading">{option.label}</span>
              </button>
            {/each}
          </div>
          {#if d.party === 'family' || d.party === 'group'}
            <div class="mt-5 grid gap-4 rounded-[10px] bg-canvas p-4">
              {#each [{ key: 'adults', label: $t('form.adults'), min: 1 }, { key: 'children', label: $t('pg_plan_my_trip.children_under_18'), min: 0 }] as counter (counter.key)}
                {@const value = counter.key === 'adults' ? d.adults : d.children}
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-heading">{counter.label}</span>
                  <div class="flex items-center gap-3">
                    <button type="button" class="grid h-9 w-9 place-items-center rounded-full border border-ink/20 bg-surface disabled:opacity-40" aria-label={$t('pg_plan_my_trip.fewer_label').replace('{label}', counter.label)} disabled={value <= counter.min} on:click={() => (d = { ...d, [counter.key]: value - 1 })}><Minus size={16} /></button>
                    <span class="w-6 text-center font-semibold text-heading">{value}</span>
                    <button type="button" class="grid h-9 w-9 place-items-center rounded-full border border-ink/20 bg-surface disabled:opacity-40" aria-label={$t('pg_plan_my_trip.more_label').replace('{label}', counter.label)} disabled={value >= 20} on:click={() => (d = { ...d, [counter.key]: value + 1 })}><Plus size={16} /></button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        {:else if step === 2}
          <h2 class="mt-2 font-serif text-xl font-semibold text-heading md:text-2xl">{$t('pg_plan_my_trip.when_heading')}</h2>
          <p class="gf-hint mt-1.5">{MONTH_TIP[d.month]}</p>
          <div class="mt-5 flex gap-2">
            {#each years as year}
              <button type="button" aria-pressed={d.year === year}
                class={`rounded-[8px] px-4 py-2 text-sm font-semibold ${d.year === year ? 'bg-heading text-white' : 'bg-canvas text-heading'}`}
                on:click={() => (d = { ...d, year, month: monthPast(year, d.month) ? now.getMonth() : d.month })}>{year}</button>
            {/each}
          </div>
          <div class="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {#each MONTHS as label, i}
              {@const past = monthPast(d.year, i)}
              <button type="button" disabled={past} aria-pressed={d.month === i}
                class={`rounded-[10px] border p-3 text-left transition ${past ? 'cursor-not-allowed opacity-35' : ''} ${d.month === i ? 'border-goldfinch-gold bg-goldfinch-gold/10' : 'border-ink/12 hover:border-goldfinch-gold'}`}
                on:click={() => (d = { ...d, month: i })}>
                <span class="block text-sm font-semibold text-heading">{label}</span>
                <span class={`mt-1 block text-[10px] font-semibold uppercase tracking-wide ${SEASON[i] === 'Peak' ? 'text-clay' : SEASON[i] === 'Low' ? 'text-forest' : 'text-ink/55'}`}>{SEASON[i]}</span>
              </button>
            {/each}
          </div>
        {:else if step === 3}
          <h2 class="mt-2 font-serif text-xl font-semibold text-heading md:text-2xl">{$t('pg_plan_my_trip.how_long_heading')}</h2>
          <div class="mt-5 grid gap-5">
            {#each d.types as type (type)}
              {@const popular = popularBand(type, data.tours)}
              <div>
                <p class="mb-2 text-sm font-semibold text-heading">{typeOf(type).label}</p>
                <div class="flex flex-wrap gap-2">
                  {#each LENGTHS[type] as band}
                    <button type="button" class={pill(d.lengths[type] === band)} aria-pressed={d.lengths[type] === band}
                      on:click={() => { d = { ...d, lengths: { ...d.lengths, [type]: band } }; errors = {}; }}>
                      {band}
                      {#if popular === band}<span class="ml-2 rounded bg-clay px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">{$t('pg_plan_my_trip.popular')}</span>{/if}
                    </button>
                  {/each}
                </div>
                {#if errors[`len_${type}`]}<p class="mt-1 text-xs text-clay" role="alert">{errors[`len_${type}`]}</p>{/if}
              </div>
            {/each}
            {#if days > 0}<p class="text-sm text-ink/65">{$t('pg_plan_my_trip.estimated_total')} <b class="text-heading">{$t('pg_plan_my_trip.about_n_days').replace('{n}', String(days))}</b></p>{/if}
          </div>
        {:else if step === 4}
          <h2 class="mt-2 font-serif text-xl font-semibold text-heading md:text-2xl">{$t('pg_plan_my_trip.style_heading')}</h2>
          {#if errors.comfort}<p class="mt-2 text-sm font-medium text-clay" role="alert">{errors.comfort}</p>{/if}
          <div class="mt-5 grid gap-3 sm:grid-cols-3">
            {#each COMFORT as option (option.id)}
              <button type="button" class={choice(d.comfort === option.id)} aria-pressed={d.comfort === option.id} on:click={() => { d = { ...d, comfort: option.id }; errors = {}; }}>
                <span class="block font-semibold text-heading">{option.id}</span>
                <span class="mt-0.5 block text-xs text-ink/60">{option.desc}</span>
              </button>
            {/each}
          </div>
          <p class="mt-5 text-sm font-semibold text-heading">{$t('filter.budget_pp')} <span class="font-normal text-ink/55">{$t('pg_plan_my_trip.optional_paren')}</span></p>
          <div class="mt-2 flex flex-wrap gap-2">
            {#each BUDGETS as band (band.id)}
              <button type="button" class={pill(d.budget === band.id)} aria-pressed={d.budget === band.id} on:click={() => (d = { ...d, budget: d.budget === band.id ? '' : band.id })}>{budgetLabel(band.id)}</button>
            {/each}
          </div>
          <label class="mt-5 grid gap-1.5">
            <span class="gf-label">{$t('pg_plan_my_trip.anything_special')} <span class="gf-hint">{$t('pg_plan_my_trip.optional_paren')}</span></span>
            <textarea class="gf-textarea" rows="3" bind:value={d.notes} placeholder={$t('pg_plan_my_trip.notes_placeholder')}></textarea>
          </label>
        {:else}
          <h2 class="mt-2 font-serif text-xl font-semibold text-heading md:text-2xl">{$t('pg_plan_my_trip.review_heading')}</h2>
          <dl class="mt-5 divide-y divide-ink/10 rounded-[10px] border border-ink/12">
            {#each [
              { label: $t('pg_plan_my_trip.row_trip_types'), value: d.types.map((type) => typeOf(type).label).join(', '), at: 0 },
              { label: $t('ui.travellers'), value: `${PARTIES.find((p) => p.id === d.party)?.label ?? ''} · ${$t(people.adults > 1 ? 'pg_plan_my_trip.n_adults' : 'pg_plan_my_trip.n_adult').replace('{n}', String(people.adults))}${people.children ? ` · ${$t(people.children > 1 ? 'pg_plan_my_trip.n_children' : 'pg_plan_my_trip.n_child').replace('{n}', String(people.children))}` : ''}`, at: 1 },
              { label: $t('pg_plan_my_trip.step_when'), value: `${MONTH_NAMES[d.month]} ${d.year} · ${$t('pg_plan_my_trip.season_value').replace('{season}', SEASON[d.month])}`, at: 2 },
              { label: $t('pg_plan_my_trip.row_length'), value: lengthDisplay, at: 3 },
              { label: $t('pg_plan_my_trip.row_style'), value: [d.comfort, d.budget && budgetLabel(d.budget), d.notes && `“${d.notes}”`].filter(Boolean).join(' · '), at: 4 }
            ] as row (row.at)}
              <div class="flex items-start justify-between gap-3 px-4 py-3">
                <div class="min-w-0">
                  <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink/55">{row.label}</dt>
                  <dd class="mt-0.5 break-words text-sm text-heading">{row.value || '—'}</dd>
                </div>
                <button type="button" class="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-clay hover:underline" on:click={() => edit(row.at)}><Pencil size={12} />{$t('pg_plan_my_trip.edit')}</button>
              </div>
            {/each}
          </dl>

          <form class="mt-5 grid gap-4 sm:grid-cols-2" on:submit|preventDefault={submit} novalidate>
            <!-- Honeypot, named as nothing so autofill leaves it alone. -->
            <div class="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
              <input type="text" name="gf-x1" tabindex="-1" autocomplete="off" bind:value={hp_company} />
            </div>
            <label class="grid gap-1.5">
              <span class="gf-label">{$t('form.full_name')}<span class="gf-req">*</span></span>
              <input class="gf-input" autocomplete="name" bind:value={full_name} />
              {#if errors.full_name}<span class="text-xs font-medium text-clay">{errors.full_name}</span>{/if}
            </label>
            <label class="grid gap-1.5">
              <span class="gf-label">{$t('form.email')}<span class="gf-req">*</span></span>
              <input class="gf-input" type="email" autocomplete="email" bind:value={email} placeholder="you@example.com" />
              {#if errors.email}<span class="text-xs font-medium text-clay">{errors.email}</span>{/if}
            </label>
            <div class="grid gap-1.5">
              <span class="gf-label">{$t('form.phone')}{#if contact !== 'Email'}<span class="gf-req">*</span>{:else}<span class="gf-hint">{$t('pg_plan_my_trip.optional_paren')}</span>{/if}</span>
              <div class="grid grid-cols-[6.5rem_1fr] gap-2">
                <select class="gf-input" bind:value={dialCode} aria-label={$t('pg_plan_my_trip.country_code')}>
                  {#each DIAL_CODES as code}<option value={code}>{code}</option>{/each}
                </select>
                <input class="gf-input" type="tel" inputmode="tel" autocomplete="tel-national" bind:value={phone} aria-label={$t('form.phone')} />
              </div>
              {#if errors.phone}<span class="text-xs font-medium text-clay">{errors.phone}</span>{/if}
            </div>
            <div class="grid gap-1.5">
              <span class="gf-label">{$t('pg_plan_my_trip.preferred_contact')}</span>
              <div class="flex gap-2">
                {#each CONTACTS as option}
                  <button type="button" aria-pressed={contact === option}
                    class={`flex-1 rounded-[8px] border px-2 py-2.5 text-xs font-semibold text-heading ${contact === option ? 'border-goldfinch-gold bg-goldfinch-gold/10' : 'border-ink/20'}`}
                    on:click={() => (contact = option)}>{$t(CONTACT_LABELS[option])}</button>
                {/each}
              </div>
            </div>
            <label class="grid gap-1.5 sm:col-span-2">
              <span class="gf-label">{$t('pg_plan_my_trip.reply_in')}</span>
              <select class="gf-input" bind:value={language}>
                {#each LANGUAGES as option}<option value={option.code}>{option.label}</option>{/each}
              </select>
            </label>
            <label class="flex items-start gap-2 text-xs text-ink/65 sm:col-span-2">
              <input type="checkbox" class="mt-0.5" bind:checked={whatsappConsent} />
              {$t('pg_plan_my_trip.whatsapp_consent').replace('{brand}', brand.name)}
            </label>
            {#if errorMessage}
              <p class="rounded-[8px] bg-clay/10 px-3 py-2.5 text-sm text-clay sm:col-span-2" role="alert">{errorMessage}</p>
            {/if}
            <button type="submit" class="hidden" aria-hidden="true" tabindex="-1"></button>
          </form>
        {/if}

        <div class="mt-7 flex items-center justify-between gap-3 border-t border-ink/10 pt-5">
          {#if step > 0}
            <button type="button" class="gf-btn-ghost" on:click={back}><ArrowLeft size={16} />{$t('form.back')}</button>
          {:else}<span></span>{/if}
          {#if step < LAST}
            <button type="button" class="gf-btn-primary px-6" on:click={next}>{$t('ui.next')} <ArrowRight size={16} strokeWidth={2.6} /></button>
          {:else}
            <button type="button" class="gf-btn-primary px-6" disabled={submitting} on:click={submit}>
              {#if submitting}<Loader2 size={16} class="animate-spin" /> {$t('form.sending')}{:else}{$t('pg_plan_my_trip.send_plan')} <ArrowRight size={16} strokeWidth={2.6} />{/if}
            </button>
          {/if}
        </div>
        {#if step === LAST}
          <p class="gf-hint mt-3 flex items-center justify-center gap-1.5"><Lock size={12} />{$t('form.secure_never_shared')}</p>
        {/if}
      {/if}
    </div>

    <!-- The planner's running commentary: what they have chosen, what we'd advise, and trips that fit. -->
    <aside class="grid content-start gap-4 lg:sticky lg:top-28 lg:self-start">
      <div class="rounded-[12px] bg-deep-green p-5 text-white">
        <p class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold"><Sparkles size={14} />{$t('pg_plan_my_trip.your_trip_so_far')}</p>
        <ul class="mt-3 grid gap-1.5 text-sm text-white/80">
          <li>{d.types.length ? d.types.map((type) => typeOf(type).label).join(' + ') : $t('pg_plan_my_trip.choose_type_to_begin')}</li>
          {#if interest}<li>{$t('pg_plan_my_trip.interested_in').replace('{place}', interest)}</li>{/if}
          {#if d.party}<li>{$t(people.adults + people.children > 1 ? 'pg_plan_my_trip.n_travellers' : 'pg_plan_my_trip.n_traveller').replace('{n}', String(people.adults + people.children))}</li>{/if}
          {#if step >= 2}<li>{MONTH_NAMES[d.month]} {d.year}</li>{/if}
          {#if days > 0}<li>{$t('pg_plan_my_trip.about_n_days_cap').replace('{n}', String(days))}</li>{/if}
          {#if d.comfort}<li>{d.comfort}</li>{/if}
        </ul>
      </div>

      {#if tips.length && step >= 1}
        <div class="rounded-[12px] border border-ink/10 bg-surface p-5">
          <p class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-clay"><Lightbulb size={14} />{$t('pg_plan_my_trip.expert_tips')}</p>
          <ul class="mt-3 grid gap-2.5">
            {#each tips as tip (tip)}<li class="text-sm leading-snug text-heading">{tip}</li>{/each}
          </ul>
        </div>
      {/if}

      {#if recs.length}
        <div class="rounded-[12px] border border-ink/10 bg-surface p-5">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">{$t('pg_plan_my_trip.trips_that_match')}</p>
          <!-- Compact on purpose: a sidebar that outgrows the form it sits
               beside reads as the main thing on the page. One reason each —
               the strongest — and titles held to two lines. -->
          <ul class="mt-3 grid gap-3">
            {#each recs as rec (rec.tour.id)}
              <li>
                <a href={`/tours/${rec.tour.slug}`} target="_blank" rel="noopener" class="group flex gap-3">
                  {#if rec.tour.main_image_url_thumbnail || rec.tour.main_image_url}
                    <Img src={rec.tour.main_image_url_thumbnail || rec.tour.main_image_url || ''} alt="" width={160} sizes="56px" className="h-12 w-14 shrink-0 rounded-[8px] object-cover" />
                  {/if}
                  <span class="min-w-0">
                    <span class="line-clamp-2 text-[13px] font-semibold leading-tight text-heading group-hover:text-clay">{rec.tour.title}</span>
                    <span class="mt-0.5 block text-[11px] text-ink/60">
                      {[
                        rec.tour.duration_days ? $t('pg_plan_my_trip.n_days').replace('{n}', String(rec.tour.duration_days)) : '',
                        rec.tour.price_from ? $t('pg_plan_my_trip.from_price').replace('{price}', () => price(Number(rec.tour.price_from))) : '',
                        people.children && rec.tour.minimum_age ? $t('pg_plan_my_trip.kids_age_plus').replace('{age}', String(rec.tour.minimum_age)) : ''
                      ].filter(Boolean).join(' · ')}
                    </span>
                    {#if rec.reasons[0]}
                      <span class="mt-0.5 flex items-start gap-1 text-[11px] leading-snug text-forest"><Check size={11} class="mt-0.5 shrink-0" /><span class="line-clamp-1">{rec.reasons[0]}</span></span>
                    {/if}
                  </span>
                </a>
              </li>
            {/each}
          </ul>
          <p class="mt-3 text-xs text-ink/60">{$t('pg_plan_my_trip.tailor_one_of_these')}</p>
        </div>
      {:else if d.types.length}
        <div class="rounded-[12px] border border-ink/10 bg-surface p-5">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">{$t('pg_plan_my_trip.made_for_you')}</p>
          <p class="mt-2 text-sm text-heading">{$t('pg_plan_my_trip.no_ready_made_trip')}</p>
        </div>
      {/if}

      <p class="px-1 text-xs text-ink/60">{$t('pg_plan_my_trip.prefer_to_talk')} <a href="/contact" class="font-semibold text-heading underline">{$t('pg_plan_my_trip.contact_our_team')}</a></p>
    </aside>
  </div>
</div>
