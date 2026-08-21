<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { get } from 'svelte/store';
  import { AlertCircle, ArrowLeft, ArrowRight, BedDouble, CalendarDays, CheckCircle2, Copy, MapPin, MessageCircle, Scale, ShieldCheck, X } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { getAttribution, trackEvent } from '$lib/analytics';
  import { api } from '$lib/api/client';
  import { brand } from '$lib/brand';
  import { publicSettings, settingText } from '$lib/settings';
  import { shortlist } from '$lib/shortlist';
  import type { Specialist, Tour } from '$lib/types';
  import Button from './Button.svelte';
  import FormStepper from './FormStepper.svelte';
  import CategoryPicker from './CategoryPicker.svelte';
  import SpecialistCard from './SpecialistCard.svelte';

  $: bookCallUrl = settingText($publicSettings, 'booking_call_url');

  // ── Options ────────────────────────────────────────────────────────────────
  const destinationOptions = ['Tanzania', 'Kenya', 'Rwanda', 'Uganda', 'Zanzibar', 'Multiple countries', 'Not sure yet'];
  const experienceOptions = [
    'Safari',
    'Kilimanjaro climb',
    'Gorilla trekking',
    'Beach holiday',
    'Honeymoon',
    'Family trip',
    'Culture',
    'Adventure',
    'Luxury',
    'Photography',
    'Wildlife',
    'Not sure yet'
  ];
  const monthOptions = ['Flexible', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'I know exact dates'];
  const flexibilityOptions = ['Yes', 'No', 'Not sure'];
  const budgetOptions = ['Under $1,000', '$1,000 – $2,500', '$2,500 – $5,000', '$5,000+', 'Not sure yet'];
  const travellerOptions = ['Solo traveller', 'Couple', 'Family', 'Friends / group', 'Corporate / team', 'Honeymoon', 'Not sure yet'];
  const durationOptions = ['1–3 days', '4–6 days', '7–10 days', '11–14 days', '15+ days', 'Not sure yet'];
  const accommodationOptions = ['Budget lodge', 'Mid-range lodge/hotel', 'Luxury lodge/resort', 'Tented camp', 'Beach resort', 'Not sure yet'];

  // ── Form state ───────────────────────────────────────────────────────────────
  let full_name = '';
  let email = '';
  let phone = '';
  let whatsapp_opt_in = false;
  let country = ''; // no longer collected in the form; kept so the API payload shape is unchanged
  let destination_interest = '';
  let experience_interests: string[] = [];
  let travel_month = '';  // derived from exact_start_date
  let exact_start_date = '';
  let date_flexibility = '';
  let budget_per_person = '';
  let traveller_type = '';
  let number_of_adults = '2';
  let number_of_children = '0';
  let trip_duration = '';
  let accommodation_preference = '';
  let message = '';
  let hp_company = ''; // honeypot — must stay empty

  let submitting = false;
  let errorMessage = '';
  let bookingCode = '';
  let submitted = false;
  let copied = false;
  let tripContext = ''; // tour name carried in from a tour/departure/persona link
  let selectedStay = { id: '', slug: '', name: '', type: '', destination: '' };
  let referrerTopic = ''; // free-form topic from a referring page (e.g. a /compare CTA)
  let errors: Record<string, string> = {};
  let bodyEl: HTMLDivElement;
  let selectedSpecialist: Specialist | null = null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // The traveller now picks an exact date; the month label is derived from it so
  // the lead brief/CRM keeps the same field it always had.
  $: travel_month = exact_start_date
    ? new Date(`${exact_start_date}T00:00:00`).toLocaleString('en', { month: 'long' })
    : '';
  $: sent = submitted;

  const inputBase = 'gf-input';
  $: cls = (field: string) => `${inputBase}${errors[field] ? ' gf-input-error' : ''}`;

  const clearErr = (key: string) => {
    if (errors[key]) {
      const { [key]: _removed, ...rest } = errors;
      errors = rest;
    }
  };

  const toggleExperience = (value: string) => {
    experience_interests = experience_interests.includes(value)
      ? experience_interests.filter((v) => v !== value)
      : [...experience_interests, value];
    clearErr('experience_interests');
  };

  const removeSelectedStay = () => {
    const attachedName = selectedStay.name;
    selectedStay = { id: '', slug: '', name: '', type: '', destination: '' };
    if (tripContext === attachedName) tripContext = '';
    if (message === `Please include ${attachedName} in my itinerary.`) message = '';
  };

  // ── Context carry: a visitor arriving from a tour/persona/experience link
  //    brings that intent into the form (defaults otherwise stay empty). ───────
  const matchOption = (options: string[], value: unknown) =>
    options.find((o) => o.toLowerCase() === String(value).toLowerCase());

  onMount(async () => {
    trackEvent('plan_my_trip_opened');
    const p = $page.url.searchParams;
    const persona = p.get('persona');
    const experience = p.get('experience');
    const destination = p.get('destination');
    const monthParam = p.get('month') || p.get('date');
    const tourSlug = p.get('tour');
    const staySlug = p.get('stay') ?? '';
    const stayName = p.get('stay_name') ?? (staySlug.includes('-') ? staySlug.replace(/-/g, ' ') : staySlug);
    if (stayName) {
      selectedStay = {
        id: p.get('stay_id') ?? '',
        slug: staySlug,
        name: stayName,
        type: p.get('stay_type') ?? '',
        destination: p.get('place') ?? ''
      };
      if (!tripContext) tripContext = stayName;
      if (!message.trim()) message = `Please include ${stayName} in my itinerary.`;
      const typePreference: Record<string, string> = {
        HOTEL: 'Mid-range lodge/hotel', BOUTIQUE_HOTEL: 'Mid-range lodge/hotel', SAFARI_LODGE: 'Luxury lodge/resort',
        ECO_LODGE: 'Luxury lodge/resort', TENTED_CAMP: 'Tented camp', MOBILE_CAMP: 'Tented camp', BEACH_RESORT: 'Beach resort'
      };
      accommodation_preference = typePreference[selectedStay.type] ?? accommodation_preference;
    }

    const personaMap: Record<string, string> = {
      family: 'Family',
      couple: 'Couple',
      solo: 'Solo traveller',
      group: 'Friends / group',
      honeymoon: 'Honeymoon'
    };
    const expMap: Record<string, string> = {
      safari: 'Safari',
      kilimanjaro: 'Kilimanjaro climb',
      gorilla: 'Gorilla trekking',
      'gorilla-trekking': 'Gorilla trekking',
      beach: 'Beach holiday',
      'beach-holiday': 'Beach holiday',
      cultural: 'Culture',
      culture: 'Culture',
      honeymoon: 'Honeymoon',
      photography: 'Photography',
      wildlife: 'Wildlife'
    };

    if (persona && personaMap[persona.toLowerCase()]) traveller_type = personaMap[persona.toLowerCase()];
    if (experience) {
      const e = expMap[experience.toLowerCase()] || matchOption(experienceOptions, experience) || experience.trim();
      if (e && !experience_interests.includes(e)) experience_interests = [...experience_interests, e];
    }
    if (destination) {
      const d = matchOption(destinationOptions, destination);
      if (d) destination_interest = d;
    }
    // `place` is a specific destination (a park, peak or island) rather than a
    // country — e.g. from the homepage "Request this trip" tiles. Carry it into
    // the trip context/message, and use it for the country selector when it is
    // itself an option (Zanzibar).
    const place = p.get('place');
    if (place) {
      tripContext = place;
      const asOption = matchOption(destinationOptions, place);
      if (asOption) destination_interest = asOption;
      if (!message.trim()) message = `I'm interested in: ${place}.`;
    }
    if (monthParam) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(monthParam)) {
        exact_start_date = monthParam;
      } else {
        let m = monthParam;
        if (/^\d{4}-\d{2}$/.test(monthParam)) {
          const iso = monthParam.length === 7 ? `${monthParam}-01` : monthParam;
          m = new Date(iso).toLocaleString('en', { month: 'long' });
        }
        const mm = matchOption(monthOptions, m);
        if (mm) travel_month = mm;
      }
    }
    if (tourSlug) {
      try {
        const res = await api.tours.get(tourSlug);
        const t = res.data as Record<string, unknown>;
        tripContext = String(t.title ?? '');
        const assignedSpecialist = t.specialist as Specialist | null | undefined;
        selectedSpecialist = assignedSpecialist?.name && assignedSpecialist.status === 'published' ? assignedSpecialist : null;
        const dName = (t.destinations as Record<string, unknown> | undefined)?.name;
        const cName = (t.tour_categories as Record<string, unknown> | undefined)?.name;
        if (dName) {
          const d = matchOption(destinationOptions, dName);
          if (d) destination_interest = d;
        }
        if (cName) {
          const e = matchOption(experienceOptions, cName) || String(cName).trim();
          if (e && !experience_interests.includes(e)) experience_interests = [...experience_interests, e];
        }
      } catch {
        tripContext = tourSlug.replace(/-/g, ' ');
      }
      if (tripContext && !message.trim()) message = `I'm interested in: ${tripContext}.`;
    } else if (!tripContext) {
      // Only fall back to the saved shortlist when nothing more specific (e.g. a
      // `place` from a destination tile) has already set the trip context.
      const saved = get(shortlist);
      if (saved.length) {
        tripContext = saved.length === 1 ? saved[0].title : `${saved.length} saved trips`;
        if (!message.trim()) message = `I'm interested in: ${saved.map((sv) => sv.title).join(', ')}.`;
      }
    }

    // Free-form context from a referring page (e.g. a /compare "X vs Y" CTA).
    const topic = p.get('topic');
    if (topic) {
      referrerTopic = topic;
      if (!message.trim()) message = `I'd like help deciding: ${topic}.`;
    }
  });

  onMount(() => {
    const viewport = window.visualViewport;
    const updateViewportHeight = () => {
      document.documentElement.style.setProperty('--planning-viewport-height', `${viewport?.height ?? window.innerHeight}px`);
    };
    updateViewportHeight();
    viewport?.addEventListener('resize', updateViewportHeight);
    viewport?.addEventListener('scroll', updateViewportHeight);
    window.addEventListener('resize', updateViewportHeight);

    return () => {
      viewport?.removeEventListener('resize', updateViewportHeight);
      viewport?.removeEventListener('scroll', updateViewportHeight);
      window.removeEventListener('resize', updateViewportHeight);
      document.documentElement.style.removeProperty('--planning-viewport-height');
    };
  });

  // ── Stepper ────────────────────────────────────────────────────────────────
  const STEPS = [
    { key: 'trip', label: 'Trip details' },
    { key: 'prefs', label: 'Preferences' },
    { key: 'contact', label: 'About you' }
  ];
  const steps = STEPS;
  const LAST = STEPS.length - 1;
  let step = 0;

  // Which fields belong to which step, so we can validate one step at a time.
  const STEP_FIELDS: string[][] = [
    ['experience_interests', 'exact_start_date'],
    ['budget_per_person', 'traveller_type', 'number_of_adults', 'number_of_children'],
    ['full_name', 'email', 'phone']
  ];

  // ── Review summary + WhatsApp handoff ──────────────────────────────────────
  $: paxLabel = `${number_of_adults} adult${Number(number_of_adults) === 1 ? '' : 's'}${
    Number(number_of_children) > 0 ? `, ${number_of_children} child${Number(number_of_children) === 1 ? '' : 'ren'}` : ''
  }`;
  $: summaryRows = (() => {
    const rows: { label: string; value: string }[] = [];
    const add = (label: string, value: string) => {
      if (value && value.trim()) rows.push({ label, value: value.trim() });
    };
    if (tripContext && !selectedStay.name) add('Trip', tripContext);
    if (selectedStay.name) add('Requested stay', selectedStay.name);
    add('Name', full_name);
    add('Email', email);
    add('Phone / WhatsApp', phone);
    add('Destination', destination_interest);
    add('Experiences', experience_interests.join(', '));
    add('When', exact_start_date || travel_month);
    add('Dates flexible', date_flexibility);
    add('Duration', trip_duration);
    add('Travellers', `${paxLabel}${traveller_type ? ` · ${traveller_type}` : ''}`);
    add('Budget per person', budget_per_person);
    add('Accommodation', accommodation_preference);
    add('Notes', message);
    return rows;
  })();

  $: waDigits = (settingText($publicSettings, 'whatsapp_number') || '+255 700 000 000').replace(/[^0-9]/g, '');
  $: waText = [`Hello ${brand.name}, I'd like to plan a trip:`, ...summaryRows.map((r) => `• ${r.label}: ${r.value}`)].join('\n');
  $: waHref = `https://wa.me/${waDigits}?text=${encodeURIComponent(waText)}`;
  const onWhatsApp = () => trackEvent('whatsapp_click', { cta_location: 'plan_my_trip_review' });

  const validateStep = async (index: number): Promise<boolean> => {
    validate(); // fills `errors` for the whole form
    const own = STEP_FIELDS[index].filter((f) => errors[f]);
    // Keep only this step's errors visible so later steps don't light up early.
    errors = Object.fromEntries(Object.entries(errors).filter(([k]) => STEP_FIELDS[index].includes(k)));
    if (own.length) {
      errorMessage = 'Please check the highlighted fields and try again.';
      await tick();
      (bodyEl?.querySelector('[data-error]') as HTMLElement | null)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return false;
    }
    errorMessage = '';
    return true;
  };

  const scrollStepIntoView = async () => {
    await tick();
    bodyEl?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const keepFocusedFieldVisible = (event: FocusEvent) => {
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    const target = event.target as HTMLElement | null;
    if (!target?.matches('input, select, textarea')) return;
    window.setTimeout(() => target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 180);
  };

  const next = async () => {
    if (!(await validateStep(step))) return;
    if (step < LAST) step += 1;
    await scrollStepIntoView();
  };
  const back = async () => {
    errorMessage = '';
    errors = {};
    if (step > 0) step -= 1;
    await scrollStepIntoView();
  };
  const goStep = async (i: number) => {
    if (i < step) {
      step = i;
      errorMessage = '';
      errors = {};
      await scrollStepIntoView();
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (full_name.trim().length < 2) e.full_name = 'Please enter your full name.';
    if (!email.trim()) e.email = 'Email is required.';
    else if (!isEmail(email.trim())) e.email = 'Please enter a valid email address.';
    if (phone.trim().length < 6) e.phone = 'A phone or WhatsApp number is required.';
    if (experience_interests.length === 0) e.experience_interests = 'Pick at least one experience.';
    if (!exact_start_date) e.exact_start_date = 'Please pick your travel date.';
    else if (exact_start_date < todayStr) e.exact_start_date = "Travel date can't be in the past.";
    if (!budget_per_person) e.budget_per_person = 'Choose a budget range.';
    if (!traveller_type) e.traveller_type = 'Who is travelling?';
    if (Number(number_of_adults) < 1) e.number_of_adults = 'At least one adult is required.';
    if (number_of_children === '' || Number(number_of_children) < 0) e.number_of_children = "Can't be negative.";
    errors = e;
    return Object.keys(e).length === 0;
  };

  const resolveSelectedStyleSpecialist = async (): Promise<Specialist | null> => {
    if (selectedSpecialist?.name && selectedSpecialist.status === 'published') return selectedSpecialist;
    const selectedStyles = new Set(experience_interests.map((value) => value.trim().toLowerCase()).filter(Boolean));
    if (!selectedStyles.size) return null;

    try {
      const response = await api.tours.list({ status: 'published', limit: 100 });
      const matchingTour = response.data.items.find((tour: Tour) => {
        const styleValues = [tour.tour_categories?.name, tour.tour_categories?.slug, tour.experience_type]
          .map((value) => String(value ?? '').trim().toLowerCase())
          .filter(Boolean);
        return styleValues.some((value) => selectedStyles.has(value)) && tour.specialist?.status === 'published' && Boolean(tour.specialist.name);
      });
      return matchingTour?.specialist ?? null;
    } catch {
      return null;
    }
  };

  const submit = async () => {
    if (submitting) return;
    // Enter on an earlier step advances instead of submitting early.
    if (step < LAST) {
      await next();
      return;
    }
    errorMessage = '';

    // The honeypot is judged server-side, where the same check already lives.
    // Deciding it here too meant a false positive threw the enquiry away
    // before anything could observe that it had happened.

    if (!validate()) {
      errorMessage = 'Please check the highlighted fields and try again.';
      // Jump back to the first step that still has a problem.
      const bad = STEP_FIELDS.findIndex((fields) => fields.some((f) => errors[f]));
      if (bad >= 0) step = bad;
      await tick();
      (bodyEl?.querySelector('[data-error]') as HTMLElement | null)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    // Structured lead brief → lead_context (HubSpot/CRM-ready, shown to specialist).
    const lead_context: Record<string, unknown> = {
      destination_interest,
      travel_interests: experience_interests.join(', '),
      travel_month,
      budget_per_person,
      traveller_type,
      source_page_url: $page.url.href,
      submitted_at: new Date().toISOString(),
      lead_source: 'Website Plan My Trip'
    };
    if (exact_start_date) {
      lead_context.exact_start_date = exact_start_date;
    }
    if (date_flexibility) lead_context.date_flexibility = date_flexibility;
    if (trip_duration) lead_context.trip_duration = trip_duration;
    if (accommodation_preference) lead_context.accommodation_preference = accommodation_preference;
    if (selectedStay.name) lead_context.selected_accommodation = { ...selectedStay };
    if (tripContext) lead_context.tour_interest = tripContext;
    if (referrerTopic) lead_context.topic = referrerTopic;
    lead_context.attribution = getAttribution(); // first-touch source/campaign + session id

    submitting = true;
    const specialistPromise = resolveSelectedStyleSpecialist();
    try {
      const res = await api.bookings.create({
        full_name: full_name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        whatsapp_opt_in,
        country: country.trim() || null,
        travel_date: exact_start_date || null,
        number_of_adults: Number(number_of_adults) || 1,
        number_of_children: Number(number_of_children) || 0,
        message: message.trim() || null,
        source: 'plan_my_trip',
        lead_context,
        hp_company // honeypot — backend inspects then drops it
      });
      bookingCode = String((res.data as Record<string, unknown>)?.booking_code ?? '');
      selectedSpecialist = await specialistPromise;
      submitted = true;
      trackEvent('plan_my_trip_submitted', {
        destination: destination_interest,
        budget_range: budget_per_person,
        traveller_type,
        experience_type: experience_interests.join(', ')
      });
    } catch (error) {
      errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Something went wrong. Please try again or contact us directly on WhatsApp.';
    } finally {
      submitting = false;
    }
  };

  const resetForm = () => {
    submitted = false;
    bookingCode = '';
    errors = {};
    errorMessage = '';
    step = 0;
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(bookingCode);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // ignore
    }
  };
</script>

{#if sent}
  <div class="grid gap-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-surface p-6 shadow-soft md:p-8">
    <div class="flex items-center gap-3">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 size={26} /></span>
      <div>
        <h3 class="text-xl font-bold text-heading">Thank you! Your trip request has been received.</h3>
        <p class="mt-1 text-sm text-ink/70">A Goldfinch travel specialist will contact you shortly.</p>
      </div>
    </div>

    {#if bookingCode}
      <div class="rounded-xl border border-emerald-200 bg-surface p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-ink/70">Your request reference</p>
        <div class="mt-1 flex items-center gap-3">
          <p class="text-2xl font-extrabold tracking-wide text-heading">{bookingCode}</p>
          <button class="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-surface px-2.5 py-1 text-xs font-semibold text-ink/70 transition hover:bg-sand" type="button" on:click={copyCode}>
            <Copy size={13} />{copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    {/if}

    <!-- what happens next -->
    <div class="rounded-xl border border-emerald-200 bg-surface p-4">
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-ink/70">What happens next</p>
      <ol class="mt-3 grid gap-3">
        {#each [{ t: 'We review your request', s: 'A specialist reads your details — usually within one business day.' }, { t: 'We craft a tailored itinerary', s: 'Shaped around your dates, budget and travel style.' }, { t: 'You refine it with us', s: 'Adjust pace, lodges and activities until it feels right.' }, { t: 'Confirm when you are ready', s: 'No pressure — you decide if and when to book.' }] as step, i}
          <li class="flex gap-3">
            <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-forest text-[11px] font-bold text-white">{i + 1}</span>
            <span>
              <span class="block text-sm font-semibold text-ink">{step.t}</span>
              <span class="block text-xs leading-5 text-ink/70">{step.s}</span>
            </span>
          </li>
        {/each}
      </ol>
    </div>

    {#if selectedSpecialist}
      <SpecialistCard specialist={selectedSpecialist} heading="Who will be in touch" />
    {/if}

    <div class="flex flex-col gap-3 sm:flex-row">
      {#if bookCallUrl}
        <a class="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-deep-green px-5 font-bold text-white transition hover:bg-forest" href={bookCallUrl} target="_blank" rel="noopener noreferrer">
          Book a call now
        </a>
      {/if}
      <Button type="button" variant="secondary" on:click={resetForm}>Start another request</Button>
    </div>
    <p class="text-center text-xs text-ink/70">A confirmation email is on its way to the address you provided.</p>
  </div>
{:else}
  <form class="planning-form gf-panel-dark relative flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-white/10 p-4 shadow-soft sm:p-5 md:p-6" on:focusin={keepFocusedFieldVisible} on:submit|preventDefault={submit} novalidate>
    <div class="shrink-0">
      <p class="text-sm font-semibold uppercase tracking-[0.14em] text-goldfinch-gold">Plan My Trip</p>
      <h3 class="mt-1 font-serif text-2xl font-semibold tracking-normal text-white">Tell us about your dream trip</h3>
      {#if tripContext}
        <p class="mt-1 text-sm leading-6 text-white/70">We've carried your trip across — adjust anything below and a local specialist will tailor it to you.</p>
      {:else}
        <p class="mt-1 text-sm leading-6 text-white/70">Don't know the exact tour yet? Perfect. Share the basics and a local specialist will shape a confident East Africa plan.</p>
      {/if}
    </div>

    {#if tripContext}
      <div class="planning-trip-context mt-2" title={tripContext}>
        <MapPin size={13} class="shrink-0 text-goldfinch-gold" />
        <span class="truncate text-xs font-semibold text-white/85">{tripContext}</span>
      </div>
    {/if}

    {#if selectedStay.name}
      <div class="mt-2 flex items-center gap-2 rounded-[8px] border border-goldfinch-gold/30 bg-goldfinch-gold/[0.08] px-3 py-2.5 text-white">
        <BedDouble size={16} class="shrink-0 text-goldfinch-gold" />
        <div class="min-w-0"><span class="block text-[9px] font-bold uppercase tracking-[0.14em] text-white/50">Accommodation attached</span><span class="block truncate text-sm font-bold">{selectedStay.name}</span></div>
        <button type="button" class="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/15 text-white/65 transition hover:border-white/35 hover:text-white" aria-label={`Remove ${selectedStay.name} from this request`} title="Remove stay" on:click={removeSelectedStay}><X size={14}/></button>
      </div>
    {/if}

    {#if referrerTopic}
      <div class="mt-2 flex items-center gap-2 rounded-[8px] border border-goldfinch-gold/25 bg-goldfinch-gold/[0.06] px-2.5 py-2 text-xs font-semibold text-white/80">
        <Scale size={14} class="shrink-0 text-goldfinch-gold" />
        You're planning around: {referrerTopic}
      </div>
    {/if}

    <div class="mt-3 shrink-0">
      <FormStepper {steps} current={step} tone="dark" compact onStep={goStep} />
    </div>

    <div class="planning-form-body mt-3 grid min-h-0 flex-1 gap-3 overflow-y-auto overscroll-contain" bind:this={bodyEl}>
      <!-- ── Contact details ───────────────────────────────────────────────── -->
      <fieldset class="grid gap-3" class:hidden={step !== 2}>
        <legend class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Contact details</legend>
        <div class="planning-field-grid">
          <label class="grid gap-1.5">
            <span class="gf-label">Full name</span>
            <input class={cls('full_name')} bind:value={full_name} on:input={() => clearErr('full_name')} placeholder="Your name" autocomplete="name" aria-invalid={Boolean(errors.full_name)} aria-describedby={errors.full_name ? 'pmt-full_name-err' : undefined} />
            {#if errors.full_name}<span id="pmt-full_name-err" data-error class="text-xs text-red-600">{errors.full_name}</span>{/if}
          </label>
          <label class="grid gap-1.5">
            <span class="gf-label">Email</span>
            <input class={cls('email')} type="email" bind:value={email} on:input={() => clearErr('email')} placeholder="you@example.com" autocomplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'pmt-email-err' : undefined} />
            {#if errors.email}<span id="pmt-email-err" data-error class="text-xs text-red-600">{errors.email}</span>{/if}
          </label>
        </div>
        <div class="planning-field-grid">
          <label class="grid gap-1.5">
            <span class="gf-label">Phone / WhatsApp</span>
            <input class={cls('phone')} type="tel" bind:value={phone} on:input={() => clearErr('phone')} placeholder="+255 ..." autocomplete="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'pmt-phone-err' : undefined} />
            {#if errors.phone}<span id="pmt-phone-err" data-error class="text-xs text-red-600">{errors.phone}</span>{/if}
          </label>
          <!--
            Transactional consent, unticked by default. A phone number is a
            way to reach someone, not permission to message them on WhatsApp,
            and the backend records this tick as the evidence for that.
            -->
          <label class="flex cursor-pointer items-start gap-2.5">
            <input type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-goldfinch-gold" bind:checked={whatsapp_opt_in} />
            <span class="text-xs leading-5 text-white/75">
              Contact me on WhatsApp about my trip, quotation and booking updates.
              <span class="block text-white/50">Optional — we will still reply by email either way.</span>
            </span>
          </label>
        </div>
      </fieldset>

      <!-- ── Trip idea ─────────────────────────────────────────────────────── -->
      <fieldset class="grid gap-3" class:hidden={step !== 0}>
        <legend class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Trip idea</legend>
        <div class="grid gap-2">
          <span class="gf-label">What would you love to do? <span class="gf-hint">(select any)</span></span>
          <CategoryPicker
            selected={experience_interests}
            fallbackOptions={experienceOptions}
            tone="dark"
            compact
            onToggle={toggleExperience}
          />
          {#if errors.experience_interests}<span data-error class="text-xs text-red-600">{errors.experience_interests}</span>{/if}
        </div>

        <div class="planning-field-grid">
          <label class="grid gap-1.5">
            <span class="gf-label">Travel date <span class="gf-req">*</span></span>
            <span class="planning-date-field">
              <input
                class={`${cls('exact_start_date')} planning-date-input`}
                type="date"
                min={todayStr}
                bind:value={exact_start_date}
                on:input={() => clearErr('exact_start_date')}
                aria-invalid={Boolean(errors.exact_start_date)}
              />
              <CalendarDays class="planning-date-icon" size={18} strokeWidth={2.2} aria-hidden="true" />
            </span>
            {#if errors.exact_start_date}<span data-error class="text-xs text-red-600">{errors.exact_start_date}</span>{/if}
          </label>
          <label class="grid gap-1.5">
            <span class="gf-label">Trip duration</span>
            <select class={cls('trip_duration')} bind:value={trip_duration}>
              <option value="">Not sure yet</option>
              {#each durationOptions.filter((d) => d !== 'Not sure yet') as opt}<option value={opt}>{opt}</option>{/each}
            </select>
          </label>
        </div>

      </fieldset>

      <!-- ── Travel preferences ────────────────────────────────────────────── -->
      <fieldset class="grid gap-3" class:hidden={step !== 1}>
        <legend class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Travel preferences</legend>
        <div class="planning-field-grid">
          <label class="grid gap-1.5">
            <span class="gf-label">Are your dates flexible?</span>
            <select class={cls('date_flexibility')} bind:value={date_flexibility}>
              <option value="">Select…</option>
              {#each flexibilityOptions as opt}<option value={opt}>{opt}</option>{/each}
            </select>
          </label>
          <label class="grid gap-1.5">
            <span class="gf-label">Budget per person</span>
            <select class={cls('budget_per_person')} bind:value={budget_per_person} on:change={() => clearErr('budget_per_person')} aria-invalid={Boolean(errors.budget_per_person)}>
              <option value="" disabled>Select budget…</option>
              {#each budgetOptions as opt}<option value={opt}>{opt}</option>{/each}
            </select>
            {#if errors.budget_per_person}<span data-error class="text-xs text-red-600">{errors.budget_per_person}</span>{/if}
          </label>
        </div>
        <div class="planning-field-grid">
          <label class="grid gap-1.5">
            <span class="gf-label">Who is travelling?</span>
            <select class={cls('traveller_type')} bind:value={traveller_type} on:change={() => clearErr('traveller_type')} aria-invalid={Boolean(errors.traveller_type)}>
              <option value="" disabled>Select traveller type…</option>
              {#each travellerOptions as opt}<option value={opt}>{opt}</option>{/each}
            </select>
            {#if errors.traveller_type}<span data-error class="text-xs text-red-600">{errors.traveller_type}</span>{/if}
          </label>
          <label class="grid gap-1.5">
            <span class="gf-label">Accommodation preference</span>
            <select class={cls('accommodation_preference')} bind:value={accommodation_preference}>
              <option value="">No preference</option>
              {#each accommodationOptions.filter((a) => a !== 'Not sure yet') as opt}<option value={opt}>{opt}</option>{/each}
            </select>
          </label>
        </div>
        <div class="planning-count-grid">
          <label class="grid gap-1.5">
            <span class="gf-label">Adults</span>
            <input class={cls('number_of_adults')} type="number" min="1" bind:value={number_of_adults} on:input={() => clearErr('number_of_adults')} aria-invalid={Boolean(errors.number_of_adults)} />
            {#if errors.number_of_adults}<span data-error class="text-xs text-red-600">{errors.number_of_adults}</span>{/if}
          </label>
          <label class="grid gap-1.5">
            <span class="gf-label">Children</span>
            <input class={cls('number_of_children')} type="number" min="0" bind:value={number_of_children} on:input={() => clearErr('number_of_children')} aria-invalid={Boolean(errors.number_of_children)} />
            {#if errors.number_of_children}<span data-error class="text-xs text-red-600">{errors.number_of_children}</span>{/if}
          </label>
        </div>
      </fieldset>

      <!-- ── Notes ─────────────────────────────────────────────────────────── -->
      <fieldset class="grid gap-3" class:hidden={step !== 1}>
        <legend class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Notes</legend>
        <label class="grid gap-1.5">
          <span class="gf-label">Trip notes</span>
          <textarea
            class="gf-textarea planning-textarea"
            rows={3}
            bind:value={message}
            placeholder="Tell us anything important: must-see places, special occasions, dietary needs, accessibility needs, preferred pace, room preferences…"
          ></textarea>
        </label>
      </fieldset>

    </div>

    <!--
      Honeypot. Named and labelled as nothing on purpose: a field called
      "Company" is exactly what a browser or password manager autofills for a
      real person, and a filled honeypot silently discards their enquiry. The
      form posts over fetch, so this input's name never reaches the API.
    -->
    <div class="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
      <input type="text" name="gf-x1" tabindex="-1" autocomplete="off" bind:value={hp_company} />
    </div>

    {#if errorMessage}
      <div class="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700" role="alert">
        <AlertCircle size={18} class="mt-0.5 shrink-0" />
        <span>{errorMessage}</span>
      </div>
    {/if}

    <div class="mt-3 shrink-0">
      <div class:single-action={step === 0} class="planning-form-nav">
        {#if step > 0}
          <button type="button" class="gf-btn-ghost planning-nav-back" on:click={back}>
            <ArrowLeft size={16} /> Back
          </button>
        {/if}
        {#if step < LAST}
          <button type="button" class="gf-btn-primary planning-nav-primary" on:click={next}>
            Continue <ArrowRight size={16} strokeWidth={2.6} />
          </button>
        {:else}
          <button type="submit" class="gf-btn-primary planning-nav-primary" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send My Trip Request'}
          </button>
        {/if}
      </div>
      <p class="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/60">
        <ShieldCheck size={13} class="text-forest" />
        Your details are kept private and used only to plan your trip.
      </p>
    </div>
  </form>
{/if}

<style>
  .planning-form {
    container-type: inline-size;
    max-width: 100%;
    overflow-x: clip;
  }

  .planning-trip-context {
    display: flex;
    min-width: 0;
    height: 1.875rem;
    align-items: center;
    gap: 0.4rem;
    border-left: 2px solid rgb(212 175 55 / 0.8);
    padding: 0 0.55rem;
    background: rgb(255 255 255 / 0.045);
  }

  .planning-field-grid,
  .planning-count-grid {
    display: grid;
    gap: 0.75rem;
  }

  .planning-field-grid > :global(label),
  .planning-count-grid > :global(label) {
    min-width: 0;
  }

  .planning-count-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  :global(.planning-form .gf-input) {
    height: 2.5rem;
    min-height: 2.5rem;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
    font-size: 0.8125rem;
  }

  :global(.planning-form input[type='date']) {
    display: block;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    -webkit-appearance: none;
    appearance: none;
  }

  .planning-date-field {
    position: relative;
    display: block;
    min-width: 0;
    max-width: 100%;
  }

  :global(.planning-form .planning-date-input) {
    padding-right: 2.75rem;
  }

  :global(.planning-date-icon) {
    position: absolute;
    top: 50%;
    right: 0.875rem;
    pointer-events: none;
    color: rgb(var(--c-goldfinch-gold));
    transform: translateY(-50%);
  }

  :global(.planning-form .gf-label) {
    font-size: 0.5625rem;
    letter-spacing: 0.1em;
  }

  .planning-textarea {
    min-height: 4.5rem;
    resize: vertical;
  }

  .planning-form-nav {
    display: grid;
    grid-template-columns: minmax(5.5rem, 0.42fr) minmax(0, 1fr);
    gap: 0.625rem;
  }

  .planning-form-nav.single-action {
    grid-template-columns: minmax(0, 1fr);
  }

  :global(.planning-form .planning-nav-back),
  :global(.planning-form .planning-nav-primary) {
    width: 100%;
    height: 2.625rem;
    padding-inline: 0.875rem;
  }

  @container (min-width: 520px) {
    .planning-field-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 1023px) {
    .planning-form {
      width: 100%;
      height: calc(var(--planning-viewport-height, 100dvh) - 1rem);
      max-height: calc(var(--planning-viewport-height, 100dvh) - 1rem);
    }

    .planning-form-body {
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
    }

    :global(.planning-form .gf-input),
    :global(.planning-form .gf-textarea) {
      font-size: 1rem;
    }
  }
</style>
