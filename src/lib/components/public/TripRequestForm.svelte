<script module lang="ts">
  import { createFormTracker, type FormTracker } from '$lib/analytics';

  /**
   * One tracker per form per page view, shared by every copy of the form.
   *
   * A tour page renders this form twice: in the desktop sidebar (always in
   * the page, hidden below lg) and in the phone sheet (mounted each time the
   * sheet is shown). A tracker per copy would count a phone visitor's form as
   * opened again on every reopen of the sheet, and as abandoned on every
   * close. So the copies share one, keyed by form name and tour, and held for
   * as long as any copy of it is on the page: "this form for this tour on
   * this page view" is counted once — opened, started, each step, the lead —
   * whichever copy the visitor uses. The last copy to leave (navigating away,
   * or to another tour) lets it go, and an unfinished form is reported as
   * abandoned then.
   *
   * The page path is not part of the key: the copies' lifetime already is the
   * page view, and the URL can lag a client-side navigation by a tick, which
   * would split two copies on one page into two "forms".
   */
  type Shared = { tracker: FormTracker; users: number; stop: () => void };
  const shared = new Map<string, Shared>();
</script>

<script lang="ts">
  import { locale, t } from '$lib/i18n/ui';
  // Two-step enquiry for tour details and the tour booking page.
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
  import { browser } from '$app/environment';
  import {
    ArrowLeft,
    ArrowRight,
    Check,
    Globe,
    Loader2,
    Lock,
    Mail,
    PencilLine,
    User,
    Users
  } from '@lucide/svelte';
  import { isEnquiryEmail, isEnquiryPhoneFor, newEnquiryKey, savedEnquiryReference } from '$lib/enquiry/validation';
  import { api, ApiRequestError, submitErrorKey } from '$lib/api/client';
  import { campaignTags, getAttribution, lastCtaClicked, pushDataLayerEvent } from '$lib/analytics';
  import type { Tour } from '$lib/types';
  import TripDatePicker from './TripDatePicker.svelte';
  import TripPhoneInput from './TripPhoneInput.svelte';

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
  /** Empty means the translated default ("Plan This Trip"). */
  export let heading = '';
  /**
   * Which form this is, for the analytics funnel and for the lead itself
   * (lead_context.form_name): the tour page's itinerary form by default,
   * 'tour_booking_page' on /booking/[slug]. One of the main leads either way.
   */
  export let formName = 'tour_itinerary';

  const dispatch = createEventDispatcher<{ submitted: { bookingCode: string } }>();

  $: STEPS = [$t('form.trip_basics'), $t('form.your_details')];
  let step = 0;

  let travel_date = '';
  // Empty until the visitor fills them: a pre-filled count reads as their answer.
  let adults = '';
  let children = '';
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
  // The Google Ads conversion is pushed once per form, however often the
  // success path runs.
  let conversionSent = false;
  let errorMessage = '';
  let errors: Record<string, string> = {};

  const localToday = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const todayStr = localToday();
  const idempotencyKey = newEnquiryKey();
  let stepTabs: HTMLDivElement;

  /**
   * The languages the business actually replies in. Kept short and honest —
   * offering a language nobody here speaks turns a helpful question into a
   * promise that gets broken on the first reply.
   */
  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'sw', label: 'Kiswahili' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
    { code: 'es', label: 'Español' },
    { code: 'it', label: 'Italiano' }
  ];
  // Start on the page's language when we reply in it, as the planner does.
  if (LANGUAGES.some((l) => l.code === $locale)) language = $locale;

  const clearErr = (key: string) => {
    if (errors[key]) {
      const { [key]: _drop, ...rest } = errors;
      errors = rest;
    }
  };

  /** Rows as the confirmation email takes them: trimmed, held to 300 characters, none empty, at most 12. */
  const recapRows = (rows: Array<{ label: string; value: string }>) =>
    rows
      .map((row) => ({ label: row.label.trim().slice(0, 300).trim(), value: row.value.trim().slice(0, 300).trim() }))
      .filter((row) => row.label && row.value)
      .slice(0, 12);

  /*
   * The traveller's own confirmation email is written in the page's language,
   * so it repeats their answers the way they read them here — the labels on
   * screen, the date in their own format, the language by its own name. Never
   * their name, email or phone: the email does not repeat contact details.
   * The rest of the request, which staff read, is unchanged.
   */
  $: travellerRecap = recapRows([
    {
      label: layout === 'inline' ? $t('form.start_date') : $t('form.preferred_start_date'),
      value: /^\d{4}-\d{2}-\d{2}$/.test(travel_date)
        ? new Intl.DateTimeFormat($locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${travel_date}T00:00:00Z`))
        : ''
    },
    { label: $t('form.adults'), value: adults },
    { label: $t('ui.children'), value: children },
    { label: layout === 'inline' ? $t('label.language') : $t('form.preferred_language'), value: LANGUAGES.find((l) => l.code === language)?.label ?? '' },
    { label: $t('form.special_requests'), value: special_requests }
  ]);

  // ── Tracking ───────────────────────────────────────────────────────────────
  // The itinerary form is one of the main leads. Its path — seen, first field
  // touched, step passed, what stopped a step, where it was left, the lead —
  // goes through the shared tracker above. Only the tour and the step names
  // leave the page: never a name, an address or a note.
  const STEP_KEYS = ['trip_details', 'contact'];
  let root: HTMLElement;
  let tracker: FormTracker | null = null;
  let trackerKey = '';
  let seen: IntersectionObserver | null = null;

  const release = () => {
    const entry = shared.get(trackerKey);
    if (entry && --entry.users === 0) {
      shared.delete(trackerKey);
      entry.stop(); // reports the form abandoned if it was started and not sent
    }
    trackerKey = '';
    tracker = null;
  };

  /** Join (or start) the tracker for this form and tour — again when the page moves to another tour. */
  const attach = (name: string, record: Tour | null) => {
    if (!browser) return; // per browser tab; never a map shared by server requests
    const key = `${name}|${record?.id ?? ''}`;
    if (key === trackerKey) return;
    release();
    let entry = shared.get(key);
    if (!entry) {
      const created = createFormTracker(
        {
          form_name: name,
          form_type: 'trip_request',
          lead_type: 'itinerary_form',
          tour_id: record?.id,
          // Held to the lengths the analytics edge accepts: one over refuses
          // the whole event, the lead with it.
          tour_title: record?.title?.slice(0, 256),
          tour_slug: record?.slug,
          destination: record?.destinations?.name?.slice(0, 128),
          price_from: record?.price_from,
          duration_days: record?.duration_days,
          currency: record?.currency
        },
        'request_trip_submitted'
      );
      entry = { tracker: created, users: 0, stop: created.watchLeave() };
      shared.set(key, entry);
    }
    entry.users += 1;
    trackerKey = key;
    tracker = entry.tracker;
    // A new tour's form is a new form to see. Observing afresh reports the
    // current visibility at once, so one already on screen counts.
    if (seen && root) {
      seen.unobserve(root);
      seen.observe(root);
    }
  };

  $: attach(formName, tour);
  // Where the visitor is, for the abandon event.
  $: tracker?.at(step, STEP_KEYS[step]);

  onMount(() => {
    // Seen: at least ~40% of the form on screen — or, for a form taller than
    // the screen, filling 40% of it. A copy that is not displayed (the
    // sidebar on a phone) never intersects, so only a copy the visitor can
    // actually see counts the form as opened.
    if (typeof IntersectionObserver === 'undefined') {
      if (root.getClientRects().length) tracker?.opened();
      return;
    }
    seen = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry?.isIntersecting) return;
        const screen = entry.rootBounds?.height || window.innerHeight;
        if (entry.intersectionRatio < 0.4 && entry.intersectionRect.height < screen * 0.4) return;
        tracker?.opened();
        seen?.unobserve(root); // once per form; attach() watches again for another tour
      },
      { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] }
    );
    seen.observe(root);
    return () => seen?.disconnect();
  });
  onDestroy(release);

  /** The first touch of a field starts the form — not a focus on a button, nor the hidden trap. */
  const begin = (event: Event) => {
    const field = event.target;
    if (field instanceof HTMLElement && field.matches('input, select, textarea, [data-trip-field]') && field.getAttribute('name') !== 'gf-x1') tracker?.started();
  };
  /** The field a refused step stopped on first, by its name in the form (never its value). */
  const firstInvalid = () => Object.keys(errors)[0] ?? 'unknown';

  const validateStep = (index: number): boolean => {
    const e: Record<string, string> = {};
    if (index === 0) {
      if (!travel_date) e.travel_date = $t('form.err_start_date');
      else if (travel_date < localToday()) e.travel_date = $t('form.err_date_past');
      if (!adults || !Number.isSafeInteger(Number(adults)) || Number(adults) < 1) e.adults = $t('form.err_adult_count');
      if (children && (!Number.isSafeInteger(Number(children)) || Number(children) < 0)) e.children = $t('form.err_child_count');
      if (!language) e.language = $t('form.err_language');
    } else {
      if (full_name.trim().length < 2) e.full_name = $t('form.err_name');
      if (!email.trim()) e.email = $t('form.err_email_required');
      else if (!isEnquiryEmail(email)) e.email = $t('form.err_email_invalid');
      if (phone.trim() && !isEnquiryPhoneFor(dialCode, phone)) e.phone = $t('ui.add_a_number_we_can');
    }
    errors = e;
    return Object.keys(e).length === 0;
  };

  const focusErrors = async () => {
    await tick();
    const field = root?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]');
    field?.scrollIntoView({ block: 'center' });
    field?.focus({ preventScroll: true });
  };
  const focusStep = async () => {
    await tick();
    stepTabs?.scrollIntoView({ block: 'start' });
    stepTabs?.querySelector<HTMLElement>('[aria-current="step"]')?.focus({ preventScroll: true });
  };
  const next = () => {
    errorMessage = '';
    if (!validateStep(step)) {
      tracker?.invalid(STEP_KEYS[step], firstInvalid());
      void focusErrors();
      return;
    }
    // The second tab calls this too, from the second step itself; only
    // leaving the first step passes a step (the second ends in the submit).
    if (step === 0) tracker?.step(0, STEP_KEYS[0]);
    step = 1;
    void focusStep();
  };
  const back = () => {
    errorMessage = '';
    step = 0;
    void focusStep();
  };

  const submit = async () => {
    if (submitting || submitted) return;
    errorMessage = '';
    for (const index of [0, 1]) {
      if (!validateStep(index)) {
        step = index;
        tracker?.invalid(STEP_KEYS[index], firstInvalid());
        await focusErrors();
        return;
      }
    }

    submitting = true;
    try {
      const res = await api.bookings.create({
        tour_id: tour?.id ?? null,
        full_name: full_name.trim(),
        email: email.trim(),
        phone: phone.trim() ? `${dialCode} ${phone.trim()}` : null,
        travel_date: travel_date || null,
        number_of_adults: Number(adults) || 1,
        number_of_children: Number(children) || 0,
        special_requests: special_requests.trim() || null,
        source,
        idempotency_key: idempotencyKey,
        lead_context: {
          v: 1,
          ...leadContext,
          // Which form sent it — the same name the analytics funnel uses, so
          // a lead and its form's path can be matched up.
          form_name: formName,
          // No column for the language, and it is not worth one: it is a
          // preference a person reads, not something anything computes on.
          language,
          answers: {
            ...((leadContext.answers as Record<string, unknown> | undefined) ?? {}),
            preferred_language: LANGUAGES.find((option) => option.code === language)?.label ?? language
          },
          // For the traveller's confirmation email: the page's language, and
          // their answers as they read them (see travellerRecap).
          page_locale: $locale,
          traveller_recap: travellerRecap,
          tour_title: tour?.title ?? undefined,
          // The page it was sent from: staff see it as "Enquired from", and the
          // CMS can tell a developer's local test from a traveller.
          page: { url: location.href, title: document.title, referrer: document.referrer || undefined },
          attribution: getAttribution()
        },
        hp_company
      });
      bookingCode = savedEnquiryReference(res.data);
      submitted = true;
      // The lead: request_trip_submitted here, generate_lead in GA4 with
      // lead_source itinerary_form. The reply language is a preference, not
      // personal, so it rides along for the in-house record.
      tracker?.submitted({ transaction_id: bookingCode, metadata: { language } });
      dispatch('submitted', { bookingCode });
      // Google Ads conversion, through GTM's Custom Event trigger — the same
      // event as the Plan My Trip planner: only now the server has stored the
      // enquiry and the success message is showing, and only once. The
      // reference is the transaction id that lets Ads drop a repeat. Trip
      // shape and campaign only — never name, email or phone.
      await tick();
      if (!conversionSent) {
        conversionSent = true;
        const adultCount = Number(adults) || 1;
        const childCount = Number(children) || 0;
        pushDataLayerEvent('trip_request_submitted', {
          form_type: 'Tour Request Form',
          form_name: formName,
          reference_id: bookingCode,
          transaction_id: bookingCode,
          trip_type: tour?.tour_categories?.name ?? '',
          tour_name: tour?.title ?? '',
          travel_date: travel_date,
          travellers: `${adultCount} ${adultCount === 1 ? 'adult' : 'adults'}${childCount ? `, ${childCount} ${childCount === 1 ? 'child' : 'children'}` : ''}`,
          source_page: location.pathname,
          cta_clicked: lastCtaClicked(),
          ...campaignTags()
        });
      }
    } catch (error) {
      tracker?.failed(error instanceof ApiRequestError && error.status === 422 ? 'server_validation' : 'submit_failed');
      errorMessage = $t(submitErrorKey(error));
    } finally {
      submitting = false;
    }
  };

  $: dark = tone === 'dark';
  $: inline = layout === 'inline';

  // Keep the site's form classes; the white-field treatment is scoped below.
  const labelCls = 'gf-label';
  const hintCls = 'gf-hint';
  /* gf-input plus room for the leading icon. */
  const fieldCls = 'gf-input pl-10';
  const iconCls = 'trip-icon pointer-events-none absolute left-3 top-1/2 -translate-y-1/2';
  const errCls = 'text-[11px] font-medium text-red-400';
</script>

<div
  bind:this={root}
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
      <h3 class={`font-serif text-2xl font-semibold ${dark ? 'text-white' : 'text-heading'}`}>{$t('form.thank_you')}</h3>
      {#if bookingCode}
        <p class={hintCls}>{$t('form.your_reference_is')} <b class={dark ? 'text-goldfinch-gold' : 'text-clay'}>{bookingCode}</b>.</p>
      {/if}
      <p class={hintCls}>{$t('form.specialist_replies')}</p>
    </div>
  {:else}
    {#if showHeader}
      <div class="grid gap-1">
        <h3 class={`font-serif text-2xl font-semibold leading-tight ${dark ? 'text-white' : 'text-heading'}`}>{heading || $t('ui.plan_this_trip')}</h3>
      </div>
    {/if}

    <!-- Two tabs, both always visible. A stepper that hides where you are
         going reads as a form of unknown length. -->
    <div bind:this={stepTabs} class={`trip-steps grid grid-cols-2 gap-2.5 ${showHeader ? 'mt-4' : ''} ${inline ? 'max-w-md' : ''}`}>
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
          aria-current={step === index ? 'step' : undefined}
          on:click={() => (index === 0 ? back() : next())}
        >
          {#if step > index}<Check size={14} />{/if}
          {index + 1} · {label}
        </button>
      {/each}
    </div>

    <form class="mt-5 grid gap-4" on:submit|preventDefault={step === 0 ? next : submit} on:focusin={begin} on:input={begin} novalidate>
      <!-- Named as nothing, so autofill has nothing to match. A honeypot
           labelled "Company" eats real enquiries. -->
      <div class="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
        <input type="text" name="gf-x1" tabindex="-1" autocomplete="off" hidden bind:value={hp_company} />
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
        <div class="grid gap-1.5">
          <span class={labelCls}>{inline ? $t('form.start_date') : $t('form.preferred_start_date')} <span class="gf-req">*</span></span>
          <TripDatePicker bind:value={travel_date} min={todayStr} label={inline ? $t('form.start_date') : $t('form.preferred_start_date')} invalid={Boolean(errors.travel_date)} on:change={() => { clearErr('travel_date'); tracker?.started(); }} />
          {#if errors.travel_date}<span class={errCls} role="alert">{errors.travel_date}</span>{/if}
        </div>

        <label class="grid gap-1.5">
          <span class={labelCls}>{$t('form.adults')}<span class="gf-req">*</span></span>
          <span class="relative block">
            <User size={16} class={iconCls} />
            <input class={fieldCls} type="number" inputmode="numeric" min="1" step="1" required aria-invalid={Boolean(errors.adults)} value={adults} on:input={(event) => { adults = event.currentTarget.value; clearErr('adults'); }} />
          </span>
          {#if errors.adults}<span class={errCls} role="alert">{errors.adults}</span>{/if}
        </label>

        <label class="grid gap-1.5">
          <span class={labelCls}>{$t('ui.children')} <span class="gf-hint">({$t('ui.optional').toLowerCase()})</span></span>
          <span class="relative block">
            <Users size={16} class={iconCls} />
            <input class={fieldCls} type="number" inputmode="numeric" min="0" step="1" aria-invalid={Boolean(errors.children)} value={children} on:input={(event) => { children = event.currentTarget.value; clearErr('children'); }} />
          </span>
          {#if errors.children}<span class={errCls} role="alert">{errors.children}</span>{/if}
        </label>

        <label class="grid gap-1.5">
          <span class={labelCls}>{inline ? $t('label.language') : $t('form.preferred_language')} <span class="gf-req">*</span></span>
          <span class="relative block">
            <Globe size={16} class={iconCls} />
            <select required aria-invalid={Boolean(errors.language)} class={`${fieldCls} appearance-none`} bind:value={language} on:change={() => clearErr('language')}>
              <option value="" disabled>{inline ? $t('ui.select') : $t('form.select_language')}</option>
              {#each LANGUAGES as l}<option value={l.code}>{l.label}</option>{/each}
            </select>
          </span>
          {#if errors.language}<span class={errCls} role="alert">{errors.language}</span>{/if}
          <!-- Only in the card. In a band this one hint sat under a single
               column and pushed that field out of line with its neighbours. -->
          {#if !inline}<span class={hintCls}>{$t('form.language_helps')}</span>{/if}
        </label>
      {:else}
        <label class="grid gap-1.5">
          <span class={labelCls}>{$t('form.full_name')}<span class="gf-req">*</span></span>
          <span class="relative block">
            <User size={16} class={iconCls} />
            <input class={fieldCls} autocomplete="name" required aria-invalid={Boolean(errors.full_name)} bind:value={full_name} on:input={() => clearErr('full_name')} placeholder={$t('form.your_full_name')} />
          </span>
          {#if errors.full_name}<span class={errCls} role="alert">{errors.full_name}</span>{/if}
        </label>

        <label class="grid gap-1.5">
          <span class={labelCls}>{$t('form.email')}<span class="gf-req">*</span></span>
          <span class="relative block">
            <Mail size={16} class={iconCls} />
            <input class={fieldCls} type="email" autocomplete="email" required aria-invalid={Boolean(errors.email)} bind:value={email} on:input={() => clearErr('email')} placeholder={$t('form.email_placeholder')} />
          </span>
          {#if errors.email}<span class={errCls} role="alert">{errors.email}</span>{/if}
        </label>

        <div class="grid gap-1.5">
          <span class={labelCls}>{$t('cta.whatsapp')}<span class="gf-hint">({$t('ui.optional').toLowerCase()})</span></span>
          <TripPhoneInput bind:dialCode bind:phone invalid={Boolean(errors.phone)} on:input={() => clearErr('phone')} />
          {#if errors.phone}<span class={errCls} role="alert">{errors.phone}</span>{/if}
        </div>

        <label class="grid gap-1.5">
          <span class={labelCls}>{$t('form.special_requests')}<span class="gf-hint">({$t('ui.optional').toLowerCase()})</span></span>
          <span class="relative block">
            <PencilLine size={16} class="trip-icon pointer-events-none absolute left-3 top-3" />
            <textarea
              class="gf-textarea pl-10"
              rows="3"
              bind:value={special_requests}
              placeholder={$t('ui.dietary_needs_hotel_pickup_details')}
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
              <Loader2 size={16} class="animate-spin" /> {$t('form.sending')}
            {:else}
              {step === 0 ? $t('ui.next') : $t('ui.send')} <ArrowRight size={16} strokeWidth={2.6} />
            {/if}
          </button>
        {/if}
      </div>

      {#if errorMessage}
        <p class="rounded-[8px] bg-red-500/15 px-3 py-2.5 text-sm text-red-300" role="alert">{errorMessage}</p>
      {/if}

      {#if !inline}
        <div class="flex items-center gap-4">
          {#if step === 1}
            <button type="button" class={`flex items-center gap-1.5 py-3 text-sm ${dark ? 'text-white/85 hover:text-white' : 'text-ink'}`} on:click={back}><ArrowLeft size={15} />{$t('form.back')}</button>
          {/if}
        <button type="submit" disabled={submitting} class="gf-btn-primary min-w-0 flex-1">
          {#if submitting}
            <Loader2 size={17} class="animate-spin" /> {$t('form.sending')}
          {:else}
            {step === 0 ? $t('form.next_step') : $t('ui.send_request')} <ArrowRight size={17} strokeWidth={2.6} />
          {/if}
        </button>
        </div>
      {/if}

      {#if step === 1 && inline}
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
          <button type="button" class={`flex items-center gap-1.5 text-[13px] font-semibold ${dark ? 'text-white/70 hover:text-white' : 'text-ink/60 hover:text-heading'}`} on:click={back}>
            <ArrowLeft size={14} />{$t('form.back')}</button>
          <p class={`flex items-center gap-1.5 ${hintCls}`}><Lock size={12} />{$t('form.never_shared')}</p>
        </div>
      {:else if step === 1}
        <p class={`flex items-center justify-center gap-1.5 ${hintCls}`}>
          <Lock size={13} />{$t('form.secure_never_shared')}</p>
      {/if}
    </form>
  {/if}
</div>

<style>
  .trip-steps { scroll-margin-top: 7rem; }
  :global(.tour-planner-sheet) .trip-steps { scroll-margin-top: 1rem; }
  .trip-request :global(.gf-input),
  .trip-request :global(.gf-textarea) {
    min-width: 0;
    background-color: #fff;
    color: #393d32;
    border-color: rgb(197 155 58 / .65);
    color-scheme: light;
    font-size: 16px;
  }
  .trip-request :global(.gf-input:focus),
  .trip-request :global(.gf-textarea:focus) {
    background-color: #fff;
    border-color: #d8a22d;
    box-shadow: 0 0 0 2px rgb(247 189 55 / .2);
  }
  .trip-request :global(.date-trigger),
  .trip-request :global(.date-trigger:focus) { background-color: #fcfaf4; border-color: #c9b77d; }
  .trip-request :global(.date-trigger svg) { color: #656b59; flex-shrink: 0; }
  .trip-request :global(.gf-input::placeholder),
  .trip-request :global(.gf-textarea::placeholder) { color: #777b71; opacity: 1; }
  .trip-request :global(.gf-input option) { background: #fff; color: #393d32; }
  .trip-request :global(.trip-icon) { color: #393d32; }
  .trip-request.gf-panel-dark :global(.gf-label) { color: rgb(255 255 255 / .85); }
  .trip-request :global(label),
  .trip-request :global(label > span) { min-width: 0; }
  .trip-request :global(select) {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23393D32' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.9rem center;
    padding-right: 2.5rem;
  }
</style>
