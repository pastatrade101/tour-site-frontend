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
  $: labelCls = `text-[13px] font-bold ${dark ? 'text-white' : 'text-heading'}`;
  $: hintCls = `text-[12px] ${dark ? 'text-white/55' : 'text-ink/55'}`;
  $: fieldCls =
    'h-12 w-full min-w-0 rounded-[10px] border bg-white pl-11 pr-3 text-[15px] text-heading outline-none transition placeholder:text-ink/40 focus:border-goldfinch-gold focus:ring-2 focus:ring-goldfinch-gold/25 border-transparent';
  const iconCls = 'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/45';
  const errCls = 'text-xs font-medium text-red-400';
</script>

<div
  class={`trip-request ${dark ? 'is-dark' : 'is-light'} ${
    panel
      ? `mx-auto w-full max-w-[560px] rounded-[14px] p-5 sm:p-6 md:p-7 ${dark ? 'bg-deep-green shadow-[0_24px_70px_rgba(57,61,50,0.22)]' : 'border border-ink/10 bg-surface shadow-sm'}`
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
    <div class="grid gap-1">
      <h3 class={`font-serif text-[28px] font-semibold leading-tight ${dark ? 'text-white' : 'text-heading'}`}>{heading}</h3>
      <p class={`${hintCls} leading-6`}>{intro}</p>
    </div>

    <!-- Two tabs, both always visible. A stepper that hides where you are
         going reads as a form of unknown length. -->
    <div class="mt-4 grid grid-cols-2 gap-2.5">
      {#each STEPS as label, index}
        <button
          type="button"
          class={`flex h-11 items-center justify-center gap-2 rounded-[10px] text-[13px] font-bold uppercase tracking-[0.06em] transition ${
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

      {#if step === 0}
        <label class="grid gap-1.5">
          <span class={labelCls}>Preferred start date <span class="text-goldfinch-gold">*</span></span>
          <span class="relative block">
            <CalendarDays size={17} class={iconCls} />
            <input class={fieldCls} type="date" min={todayStr} bind:value={travel_date} on:input={() => clearErr('travel_date')} />
          </span>
          {#if errors.travel_date}<span class={errCls}>{errors.travel_date}</span>{/if}
        </label>

        <label class="grid gap-1.5">
          <span class={labelCls}>Adults <span class="text-goldfinch-gold">*</span></span>
          <span class="relative block">
            <User size={17} class={iconCls} />
            <select class={`${fieldCls} appearance-none`} bind:value={adults} on:change={() => clearErr('adults')}>
              {#each ADULTS as n}<option value={n}>{n}</option>{/each}
            </select>
          </span>
          {#if errors.adults}<span class={errCls}>{errors.adults}</span>{/if}
        </label>

        <label class="grid gap-1.5">
          <span class={labelCls}>Children and ages <span class={`font-medium ${dark ? 'text-white/50' : 'text-ink/45'}`}>(optional)</span></span>
          <span class="relative block">
            <Users size={17} class={iconCls} />
            <!-- Free text on purpose. Ages drive park fees and room
                 configuration, and "2 children, ages 7 and 11" tells a
                 specialist far more than a number in a stepper. -->
            <input class={fieldCls} bind:value={children_note} placeholder="e.g. 2 children, ages 7 and 11" />
          </span>
        </label>

        <label class="grid gap-1.5">
          <span class={labelCls}>Preferred language <span class="text-goldfinch-gold">*</span></span>
          <span class="relative block">
            <Globe size={17} class={iconCls} />
            <select class={`${fieldCls} appearance-none`} bind:value={language} on:change={() => clearErr('language')}>
              <option value="" disabled>Select language</option>
              {#each LANGUAGES as l}<option value={l.code}>{l.label}</option>{/each}
            </select>
          </span>
          {#if errors.language}<span class={errCls}>{errors.language}</span>{/if}
          <span class={hintCls}>This helps us prepare the best options in your language.</span>
        </label>
      {:else}
        <label class="grid gap-1.5">
          <span class={labelCls}>Full name <span class="text-goldfinch-gold">*</span></span>
          <span class="relative block">
            <User size={17} class={iconCls} />
            <input class={fieldCls} autocomplete="name" bind:value={full_name} on:input={() => clearErr('full_name')} placeholder="Your full name" />
          </span>
          {#if errors.full_name}<span class={errCls}>{errors.full_name}</span>{/if}
        </label>

        <label class="grid gap-1.5">
          <span class={labelCls}>Email <span class="text-goldfinch-gold">*</span></span>
          <span class="relative block">
            <Mail size={17} class={iconCls} />
            <input class={fieldCls} type="email" autocomplete="email" bind:value={email} on:input={() => clearErr('email')} placeholder="you@example.com" />
          </span>
          {#if errors.email}<span class={errCls}>{errors.email}</span>{/if}
        </label>

        <div class="grid gap-1.5">
          <span class={labelCls}>WhatsApp <span class={`font-medium ${dark ? 'text-white/50' : 'text-ink/45'}`}>(optional)</span></span>
          <div class="grid grid-cols-[7.5rem_1fr] gap-2.5">
            <span class="relative block">
              <select class={`${fieldCls} appearance-none !pl-3 pr-2 text-[14px]`} bind:value={dialCode}>
                {#each DIAL_CODES as d}<option value={d.code}>{d.label}</option>{/each}
              </select>
            </span>
            <input
              class="h-12 w-full min-w-0 rounded-[10px] border border-transparent bg-white px-3.5 text-[15px] text-heading outline-none transition placeholder:text-ink/40 focus:border-goldfinch-gold focus:ring-2 focus:ring-goldfinch-gold/25"
              type="tel"
              autocomplete="tel"
              bind:value={phone}
              placeholder="Phone number"
            />
          </div>
        </div>

        <label class="grid gap-1.5">
          <span class={labelCls}>Special requests <span class={`font-medium ${dark ? 'text-white/50' : 'text-ink/45'}`}>(optional)</span></span>
          <span class="relative block">
            <PencilLine size={17} class="pointer-events-none absolute left-3.5 top-3.5 text-ink/45" />
            <textarea
              class="w-full rounded-[10px] border border-transparent bg-white py-3 pl-11 pr-3 text-[15px] leading-6 text-heading outline-none transition placeholder:text-ink/40 focus:border-goldfinch-gold focus:ring-2 focus:ring-goldfinch-gold/25"
              rows="3"
              bind:value={special_requests}
              placeholder="Dietary needs, hotel pickup details, honeymoon, room preference, budget range, or anything else we should know."
            ></textarea>
          </span>
        </label>
      {/if}

      {#if errorMessage}
        <p class="rounded-[8px] bg-red-500/15 px-3 py-2.5 text-sm text-red-300" role="alert">{errorMessage}</p>
      {/if}

      <button
        type="submit"
        disabled={submitting}
        class="flex h-13 items-center justify-center gap-2 rounded-[10px] bg-goldfinch-gold px-6 py-3.5 text-[15px] font-bold text-heading transition hover:brightness-105 disabled:opacity-60"
      >
        {#if submitting}
          <Loader2 size={17} class="animate-spin" /> Sending…
        {:else}
          {step === 0 ? 'Next Step' : 'Send Request'} <ArrowRight size={17} strokeWidth={2.6} />
        {/if}
      </button>

      {#if step === 1}
        <button type="button" class={`flex items-center justify-center gap-2 text-sm font-semibold ${dark ? 'text-white/70 hover:text-white' : 'text-ink/60 hover:text-heading'}`} on:click={back}>
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
  .trip-request :global(select) {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23393D32' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.9rem center;
    padding-right: 2.5rem;
  }
  /* Tailwind has no h-13; the button is deliberately taller than a field. */
  .trip-request :global(.h-13) {
    height: 3.25rem;
  }
</style>
