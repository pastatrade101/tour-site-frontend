<script lang="ts">
  /**
   * The trip request form — one form, used everywhere.
   *
   * There were three of these: a four-step one on tour pages, a three-step one
   * on /plan-my-trip, and a three-step band on the safari-style pages. Same
   * job, three field sets, three layouts. A traveller who saw two of them saw
   * two different companies.
   *
   * This is the one. Two steps, and only the questions worth stopping someone
   * for: when, how many, what language, and how to reach them. Everything the
   * old forms also asked — budget band, trip duration, date flexibility,
   * interests, accommodation preference — is a conversation a specialist has
   * once they reply, not a barrier between a visitor and their enquiry.
   */
  import { createEventDispatcher } from 'svelte';
  import {
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    Check,
    Globe,
    Loader2,
    Lock,
    Mail,
    PencilLine,
    User,
    Users
  } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { getAttribution, trackEvent } from '$lib/analytics';
  import type { Tour } from '$lib/types';

  export let tour: Tour | null = null;
  export let source = 'website_booking_form';
  export let leadContext: Record<string, unknown> = {};
  /** 'dark' sits on the green panel; 'light' on a pale page section. */
  export let tone: 'dark' | 'light' = 'dark';
  /**
   * The card around the form. On by default so the form is self-contained
   * wherever it is dropped — it previously relied on whatever panel its parent
   * happened to provide, and on /plan-my-trip there wasn't one, so it rendered
   * edge to edge with no container at all.
   *
   * Turn it off where the parent already draws the panel, to avoid a card
   * inside a card.
   */
  export let panel = true;
  /**
   * 'stacked' is the card — one field per row. 'inline' lays the same fields
   * across a single row for a mid-page band, where a tall stacked form would
   * double the height of a section that is meant to be a short interruption.
   */
  export let layout: 'stacked' | 'inline' = 'stacked';
  /** Off where the surrounding section already states the heading. */
  export let showHeader = true;
  export let heading = 'Plan This Trip';
  export let intro = "Share a few details about your trip and we'll check availability for you.";

  const dispatch = createEventDispatcher<{ submitted: { bookingCode: string } }>();

  const STEPS = ['Trip basics', 'Your details'];
  let step = 0;

  let travel_date = '';
  let adults = '1';
  let children_note = '';
  let language = '';
  let full_name = '';
  let email = '';
  let dialCode = '+255';
  let phone = '';
  let special_requests = '';
  let hp_company = '';

  let submitting = false;
  let submitted = false;
  let bookingCode = '';
  let errorMessage = '';
  let errors: Record<string, string> = {};

  const todayStr = new Date().toISOString().slice(0, 10);
  const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const ADULTS = Array.from({ length: 20 }, (_, i) => String(i + 1));

  /**
   * The languages the business actually replies in. Kept short and honest —
   * offering a language nobody here speaks turns a helpful question into a
   * promise that gets broken on the first reply.
   */
  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'sw', label: 'Kiswahili' },
    { code: 'de', label: 'Deutsch (German)' },
    { code: 'fr', label: 'Français (French)' },
    { code: 'es', label: 'Español (Spanish)' }
  ];

  const DIAL_CODES = [
    { code: '+255', label: '🇹🇿 +255' },
    { code: '+254', label: '🇰🇪 +254' },
    { code: '+256', label: '🇺🇬 +256' },
    { code: '+250', label: '🇷🇼 +250' },
    { code: '+44', label: '🇬🇧 +44' },
    { code: '+1', label: '🇺🇸 +1' },
    { code: '+49', label: '🇩🇪 +49' },
    { code: '+33', label: '🇫🇷 +33' },
    { code: '+34', label: '🇪🇸 +34' },
    { code: '+39', label: '🇮🇹 +39' },
    { code: '+31', label: '🇳🇱 +31' },
    { code: '+61', label: '🇦🇺 +61' }
  ];

  const clearErr = (key: string) => {
    if (errors[key]) {
      const { [key]: _drop, ...rest } = errors;
      errors = rest;
    }
  };

  const validateStep = (index: number): boolean => {
    const e: Record<string, string> = {};
    if (index === 0) {
      if (!travel_date) e.travel_date = 'Please choose a start date.';
      else if (travel_date < todayStr) e.travel_date = "That date has already passed.";
      if (!adults) e.adults = 'How many adults are travelling?';
      if (!language) e.language = 'Which language should we reply in?';
    } else {
      if (full_name.trim().length < 2) e.full_name = 'Please enter your full name.';
      if (!email.trim()) e.email = 'We need an email to send your plan to.';
      else if (!isEmail(email.trim())) e.email = 'That email address does not look right.';
    }
    errors = e;
    return Object.keys(e).length === 0;
  };

  const next = () => {
    errorMessage = '';
    if (!validateStep(step)) return;
    step = 1;
  };
  const back = () => {
    errorMessage = '';
    step = 0;
  };

  /**
   * "2 children, ages 7 and 11" -> 2. A leading number is the only part that
   * can be read reliably; the rest stays as the traveller wrote it, because
   * ages and arrangements are exactly what a specialist needs verbatim.
   */
  const childCount = (note: string): number => {
    const match = note.trim().match(/^\s*(\d{1,2})\b/);
    return match ? Number(match[1]) : 0;
  };

  const submit = async () => {
    if (submitting) return;
    errorMessage = '';
    if (!validateStep(1)) return;

    submitting = true;
    try {
      const res = await api.bookings.create({
        tour_id: tour?.id ?? null,
        full_name: full_name.trim(),
        email: email.trim(),
        phone: phone.trim() ? `${dialCode} ${phone.trim()}` : null,
        travel_date: travel_date || null,
        number_of_adults: Number(adults) || 1,
        number_of_children: childCount(children_note),
        special_requests: special_requests.trim() || null,
        source,
        lead_context: {
          v: 1,
          ...leadContext,
          // No column for either of these, and neither is worth one: the
          // language is a preference and the children note is free text a
          // person reads, not a number anything computes on.
          language,
          children_note: children_note.trim() || undefined,
          tour_title: tour?.title ?? undefined,
          attribution: getAttribution()
        },
        hp_company
      });
      bookingCode = String((res.data as Record<string, unknown>)?.booking_code ?? '');
      submitted = true;
      trackEvent('request_trip_submitted', { tour_id: tour?.id, metadata: { form: 'trip_request', language } });
      dispatch('submitted', { bookingCode });
    } catch (error) {
      errorMessage = error instanceof Error && error.message ? error.message : 'Something went wrong. Please try again.';
    } finally {
      submitting = false;
    }
  };

  $: dark = tone === 'dark';
  $: inline = layout === 'inline';

  /*
   * Everything below is the site's own form vocabulary from app.css — gf-label,
   * gf-input, gf-textarea, gf-btn-primary — rather than one-off pixel values.
   * The first version invented its own scale (13px labels, 15px fields, 48px
   * controls) and sat visibly larger than every other form on the site.
   *
   * gf-panel-dark restyles labels and controls for the green panel on its own,
   * so the dark variant needs no parallel set of classes here.
   */
  const labelCls = 'gf-label';
  const hintCls = 'gf-hint';
  /* gf-input plus room for the leading icon. */
  const fieldCls = 'gf-input pl-10';
  const iconCls = 'trip-icon pointer-events-none absolute left-3 top-1/2 -translate-y-1/2';
  const errCls = 'text-[11px] font-medium text-red-400';
</script>

<div
  class={`trip-request ${dark ? 'gf-panel-dark' : ''} ${
    panel
      ? `mx-auto w-full max-w-[540px] rounded-[10px] p-5 sm:p-6 ${dark ? 'shadow-[0_24px_70px_rgba(57,61,50,0.22)]' : 'border border-ink/10 bg-surface shadow-sm'}`
      : ''
  }`}
>
  {#if submitted}
    <div class="grid gap-3 text-center">
      <span class={`mx-auto grid h-12 w-12 place-items-center rounded-full ${dark ? 'bg-goldfinch-gold/20 text-goldfinch-gold' : 'bg-forest/10 text-forest'}`}>
        <Check size={22} />
      </span>
      <h3 class={`font-serif text-2xl font-semibold ${dark ? 'text-white' : 'text-heading'}`}>Thank you — we have your request.</h3>
      {#if bookingCode}
        <p class={hintCls}>Your reference is <b class={dark ? 'text-goldfinch-gold' : 'text-clay'}>{bookingCode}</b>.</p>
      {/if}
      <p class={hintCls}>A local specialist will come back to you shortly, in the language you chose.</p>
    </div>
  {:else}
    {#if showHeader}
      <div class="grid gap-1">
        <h3 class={`font-serif text-2xl font-semibold leading-tight ${dark ? 'text-white' : 'text-heading'}`}>{heading}</h3>
        <p class={`${hintCls} leading-6`}>{intro}</p>
      </div>
    {/if}

    <!-- Two tabs, both always visible. A stepper that hides where you are
         going reads as a form of unknown length. -->
    <div class={`grid grid-cols-2 gap-2.5 ${showHeader ? 'mt-4' : ''} ${inline ? 'max-w-md' : ''}`}>
      {#each STEPS as label, index}
        <button
          type="button"
          class={`flex h-11 items-center justify-center gap-2 rounded-[8px] text-[11px] font-bold uppercase tracking-[0.12em] transition ${
            step === index
              ? 'bg-goldfinch-gold text-heading'
              : dark
                ? 'border border-white/20 text-white/60 hover:border-white/35'
                : 'border border-ink/15 text-ink/55 hover:border-ink/30'
          }`}
          on:click={() => (index === 0 ? back() : next())}
        >
          {#if step > index}<Check size={14} />{/if}
          {index + 1} · {label}
        </button>
      {/each}
    </div>

    <form class="mt-5 grid gap-4" on:submit|preventDefault={step === 0 ? next : submit} novalidate>
      <!-- Named as nothing, so autofill has nothing to match. A honeypot
           labelled "Company" eats real enquiries. -->
      <div class="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
        <input type="text" name="gf-x1" tabindex="-1" autocomplete="off" bind:value={hp_company} />
      </div>

      <!--
        One field per row in the card. In a band: proportioned columns rather
        than four equal ones — a date and a language need different room than a
        traveller count — aligned on the bottom edge so labels of different
        lengths cannot leave the controls stepped, with the action as the last
        column so the whole thing reads as one strip.
      -->
      <div
        class={inline
          ? 'grid items-end gap-x-3 gap-y-3 sm:grid-cols-2 lg:grid-cols-[1fr_.55fr_1fr_1.35fr_auto]'
          : 'grid gap-4'}
      >
      {#if step === 0}
        <label class="grid gap-1.5">
          <span class={labelCls}>{inline ? 'Start date' : 'Preferred start date'} <span class="gf-req">*</span></span>
          <span class="relative block">
            <CalendarDays size={16} class={iconCls} />
            <input class={fieldCls} type="date" min={todayStr} bind:value={travel_date} on:input={() => clearErr('travel_date')} />
          </span>
          {#if errors.travel_date}<span class={errCls}>{errors.travel_date}</span>{/if}
        </label>

        <label class="grid gap-1.5">
          <span class={labelCls}>Adults <span class="gf-req">*</span></span>
          <span class="relative block">
            <User size={16} class={iconCls} />
            <select class={`${fieldCls} appearance-none`} bind:value={adults} on:change={() => clearErr('adults')}>
              {#each ADULTS as n}<option value={n}>{n}</option>{/each}
            </select>
          </span>
          {#if errors.adults}<span class={errCls}>{errors.adults}</span>{/if}
        </label>

        <label class="grid gap-1.5">
          <span class={labelCls}>{inline ? 'Children' : 'Children and ages'} <span class="gf-hint">(optional)</span></span>
          <span class="relative block">
            <Users size={16} class={iconCls} />
            <!-- Free text on purpose. Ages drive park fees and room
                 configuration, and "2 children, ages 7 and 11" tells a
                 specialist far more than a number in a stepper. -->
            <input class={fieldCls} bind:value={children_note} placeholder={inline ? '2, ages 7 & 11' : 'e.g. 2 children, ages 7 and 11'} />
          </span>
        </label>

        <label class="grid gap-1.5">
          <span class={labelCls}>{inline ? 'Language' : 'Preferred language'} <span class="gf-req">*</span></span>
          <span class="relative block">
            <Globe size={16} class={iconCls} />
            <select class={`${fieldCls} appearance-none`} bind:value={language} on:change={() => clearErr('language')}>
              <option value="" disabled>{inline ? 'Select' : 'Select language'}</option>
              {#each LANGUAGES as l}<option value={l.code}>{l.label}</option>{/each}
            </select>
          </span>
          {#if errors.language}<span class={errCls}>{errors.language}</span>{/if}
          <!-- Only in the card. In a band this one hint sat under a single
               column and pushed that field out of line with its neighbours. -->
          {#if !inline}<span class={hintCls}>This helps us prepare the best options in your language.</span>{/if}
        </label>
      {:else}
        <label class="grid gap-1.5">
          <span class={labelCls}>Full name <span class="gf-req">*</span></span>
          <span class="relative block">
            <User size={16} class={iconCls} />
            <input class={fieldCls} autocomplete="name" bind:value={full_name} on:input={() => clearErr('full_name')} placeholder="Your full name" />
          </span>
          {#if errors.full_name}<span class={errCls}>{errors.full_name}</span>{/if}
        </label>

        <label class="grid gap-1.5">
          <span class={labelCls}>Email <span class="gf-req">*</span></span>
          <span class="relative block">
            <Mail size={16} class={iconCls} />
            <input class={fieldCls} type="email" autocomplete="email" bind:value={email} on:input={() => clearErr('email')} placeholder="you@example.com" />
          </span>
          {#if errors.email}<span class={errCls}>{errors.email}</span>{/if}
        </label>

        <div class="grid gap-1.5">
          <span class={labelCls}>WhatsApp <span class="gf-hint">(optional)</span></span>
          <div class="grid grid-cols-[7.5rem_1fr] gap-2.5">
            <span class="relative block">
              <select class="gf-input appearance-none pr-2 text-xs" bind:value={dialCode}>
                {#each DIAL_CODES as d}<option value={d.code}>{d.label}</option>{/each}
              </select>
            </span>
            <input
              class="gf-input"
              type="tel"
              autocomplete="tel"
              bind:value={phone}
              placeholder="Phone number"
            />
          </div>
        </div>

        <label class="grid gap-1.5">
          <span class={labelCls}>Special requests <span class="gf-hint">(optional)</span></span>
          <span class="relative block">
            <PencilLine size={16} class="trip-icon pointer-events-none absolute left-3 top-3" />
            <textarea
              class="gf-textarea pl-10"
              rows="3"
              bind:value={special_requests}
              placeholder="Dietary needs, hotel pickup details, honeymoon, room preference, budget range, or anything else we should know."
            ></textarea>
          </span>
        </label>
      {/if}

        {#if inline}
          <button
            type="submit"
            disabled={submitting}
            class="gf-btn-primary w-full whitespace-nowrap px-6 sm:col-span-2 lg:col-span-1 lg:w-auto"
          >
            {#if submitting}
              <Loader2 size={16} class="animate-spin" /> Sending…
            {:else}
              {step === 0 ? 'Next' : 'Send'} <ArrowRight size={16} strokeWidth={2.6} />
            {/if}
          </button>
        {/if}
      </div>

      {#if errorMessage}
        <p class="rounded-[8px] bg-red-500/15 px-3 py-2.5 text-sm text-red-300" role="alert">{errorMessage}</p>
      {/if}

      {#if !inline}
        <button type="submit" disabled={submitting} class="gf-btn-primary w-full">
          {#if submitting}
            <Loader2 size={17} class="animate-spin" /> Sending…
          {:else}
            {step === 0 ? 'Next Step' : 'Send Request'} <ArrowRight size={17} strokeWidth={2.6} />
          {/if}
        </button>
      {/if}

      {#if step === 1 && inline}
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
          <button type="button" class={`flex items-center gap-1.5 text-[13px] font-semibold ${dark ? 'text-white/70 hover:text-white' : 'text-ink/60 hover:text-heading'}`} on:click={back}>
            <ArrowLeft size={14} /> Back
          </button>
          <p class={`flex items-center gap-1.5 ${hintCls}`}><Lock size={12} /> Your info is never shared with third parties.</p>
        </div>
      {:else if step === 1}
        <button type="button" class="gf-btn-ghost w-full" on:click={back}>
          <ArrowLeft size={15} /> Back
        </button>
        <p class={`flex items-center justify-center gap-1.5 ${hintCls}`}>
          <Lock size={13} /> Your info is secure and never shared with third parties.
        </p>
      {/if}
    </form>
  {/if}
</div>

<style>
  /*
    gf-panel-dark turns the controls dark, so an ink-coloured icon disappears
    into the field it is supposed to label. Colour follows the panel instead of
    being fixed to one surface.
  */
  .trip-request :global(.trip-icon) {
    color: rgb(57 61 50 / 0.45);
  }
  .trip-request.gf-panel-dark :global(.trip-icon) {
    color: rgb(255 255 255 / 0.5);
  }

  /*
    A grid item's min-width is auto, so any control that reports an intrinsic
    width wider than its column widens the column instead of shrinking — which
    is how the date field pushed itself past the right edge of the card on iOS.
    Zero lets the column govern. (The date control's own sizing is handled in
    app.css, which every date field on the site needs, not just this one.)
  */
  .trip-request :global(label),
  .trip-request :global(label > span) {
    min-width: 0;
  }

  .trip-request :global(select) {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23393D32' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.9rem center;
    padding-right: 2.5rem;
  }
  /* Same reason as the icons: a dark chevron on a dark control is invisible. */
  .trip-request.gf-panel-dark :global(select) {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-opacity='0.55' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  }
</style>
