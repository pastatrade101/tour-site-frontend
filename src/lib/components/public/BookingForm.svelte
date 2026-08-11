<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Copy, Download, MapPin, MessageCircle, ShieldCheck } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { getAttribution, trackEvent } from '$lib/analytics';
  import { api } from '$lib/api/client';
  import { brand } from '$lib/brand';
  import { currency, formatUsd } from '$lib/currency';
  import { publicSettings, settingText } from '$lib/settings';
  import Button from './Button.svelte';
  import CategoryPicker from './CategoryPicker.svelte';
  import FormStepper from './FormStepper.svelte';
  import type { Tour } from '$lib/types';

  export let tour: Tour | null = null;

  onMount(() => {
    trackEvent('request_trip_opened', { tour_id: tour?.id, tour_title: tour?.title });

    const viewport = window.visualViewport;
    const updateViewportHeight = () => {
      document.documentElement.style.setProperty('--booking-viewport-height', `${viewport?.height ?? window.innerHeight}px`);
    };
    updateViewportHeight();
    viewport?.addEventListener('resize', updateViewportHeight);
    viewport?.addEventListener('scroll', updateViewportHeight);
    window.addEventListener('resize', updateViewportHeight);

    return () => {
      viewport?.removeEventListener('resize', updateViewportHeight);
      viewport?.removeEventListener('scroll', updateViewportHeight);
      window.removeEventListener('resize', updateViewportHeight);
      document.documentElement.style.removeProperty('--booking-viewport-height');
    };
  });

  // ── Options ────────────────────────────────────────────────────────────────
  const BUDGET_OPTIONS = ['Budget', 'Mid-range', 'Luxury', 'Not sure yet'];
  const FLEX_OPTIONS = ['Yes', 'No', 'Not sure'];
  const ACCOMMODATION_OPTIONS = ['Budget lodge', 'Mid-range hotel/lodge', 'Luxury lodge/resort', 'Tented camp', 'Beach resort', 'Not sure yet'];
  const INTERESTS = ['Safari', 'Beach', 'Honeymoon', 'Family trip', 'Culture', 'Adventure', 'Luxury', 'Budget travel', 'Photography', 'Wildlife'];

  // ── Form state ───────────────────────────────────────────────────────────────
  let full_name = '';
  let email = '';
  let phone = '';
  let country = ''; // no longer collected in the form; kept so the API payload shape is unchanged
  let travel_date = '';
  let date_flexibility = '';
  let trip_duration = '';
  let number_of_adults = '2';
  let number_of_children = '0';
  let budget_range = '';
  let travel_interests: string[] = [];
  let accommodation_preference = '';
  let special_requests = '';
  let message = '';
  let hp_company = ''; // honeypot — must stay empty

  let submitting = false;
  let errorMessage = '';
  let bookingCode = '';
  let submitted = false;
  let copied = false;
  let errors: Record<string, string> = {};
  let bodyEl: HTMLDivElement;

  // ── Stepper ──────────────────────────────────────────────────────────────────
  const STEPS = [
    { key: 'contact', label: 'Contact' },
    { key: 'trip', label: 'Trip' },
    { key: 'prefs', label: 'Preferences' },
    { key: 'review', label: 'Review' }
  ];
  const LAST = STEPS.length - 1;
  let step = 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  $: s = $publicSettings;
  $: companyName = settingText(s, 'company_name') || brand.companyName;
  $: contactEmail = settingText(s, 'contact_email');
  $: contactPhone = settingText(s, 'contact_phone');
  $: waDigits = (settingText(s, 'whatsapp_number') || contactPhone || '+255 700 000 000').replace(/[^0-9]/g, '');

  const clearErr = (key: string) => {
    if (errors[key]) {
      const { [key]: _removed, ...rest } = errors;
      errors = rest;
    }
  };

  const toggleInterest = (interest: string) => {
    travel_interests = travel_interests.includes(interest)
      ? travel_interests.filter((i) => i !== interest)
      : [...travel_interests, interest];
  };

  const inputBase = 'gf-input';
  $: cls = (field: string) => `${inputBase}${errors[field] ? ' gf-input-error' : ''}`;

  // Validate only the fields on a given step.
  const validateStep = (index: number): boolean => {
    const e: Record<string, string> = { ...errors };
    const only = (keys: string[]) => keys.forEach((k) => delete e[k]);
    if (index === 0) {
      only(['full_name', 'email', 'phone']);
      if (full_name.trim().length < 2) e.full_name = 'Please enter your full name.';
      if (!email.trim()) e.email = 'Email is required.';
      else if (!isEmail(email.trim())) e.email = 'Please enter a valid email address.';
      if (phone.trim().length < 6) e.phone = 'A phone or WhatsApp number is required.';
    } else if (index === 1) {
      only(['travel_date', 'date_flexibility', 'budget_range', 'number_of_adults', 'number_of_children']);
      if (travel_date && travel_date < todayStr) e.travel_date = "Travel date can't be in the past.";
      if (!date_flexibility) e.date_flexibility = 'Let us know if your dates are flexible.';
      if (!budget_range) e.budget_range = 'Please choose a budget range.';
      if (Number(number_of_adults) < 1) e.number_of_adults = 'At least one adult is required.';
      if (number_of_children === '' || Number(number_of_children) < 0) e.number_of_children = "Can't be negative.";
    }
    errors = e;
    const stepErrs = Object.keys(errors).filter((k) => {
      if (index === 0) return ['full_name', 'email', 'phone'].includes(k);
      if (index === 1) return ['travel_date', 'date_flexibility', 'budget_range', 'number_of_adults', 'number_of_children'].includes(k);
      return false;
    });
    return stepErrs.length === 0;
  };

  const next = async () => {
    errorMessage = '';
    if (!validateStep(step)) {
      errorMessage = 'Please check the highlighted fields and try again.';
      await tick();
      (bodyEl?.querySelector('span.text-red-600') as HTMLElement | null)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    if (step < LAST) {
      step += 1;
      await scrollBodyTop();
    }
  };
  const back = async () => {
    errorMessage = '';
    if (step > 0) step -= 1;
    await scrollBodyTop();
  };
  const goStep = async (index: number) => {
    if (index < step) {
      step = index;
      errorMessage = '';
      await scrollBodyTop();
    }
  };

  const scrollBodyTop = async () => {
    await tick();
    bodyEl?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const keepFocusedFieldVisible = (event: FocusEvent) => {
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    const target = event.target as HTMLElement | null;
    if (!target?.matches('input, select, textarea')) return;
    window.setTimeout(() => target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 180);
  };

  // ── Derived summary used by the review step, the PDF and WhatsApp ────────────
  $: paxLabel = `${number_of_adults} adult${Number(number_of_adults) === 1 ? '' : 's'}${
    Number(number_of_children) > 0 ? `, ${number_of_children} child${Number(number_of_children) === 1 ? '' : 'ren'}` : ''
  }`;
  const money = (n: number) => formatUsd(n, $currency);

  type Row = { label: string; value: string };
  $: summaryRows = (() => {
    const rows: Row[] = [];
    const add = (label: string, value: string | undefined | null) => {
      if (value && String(value).trim()) rows.push({ label, value: String(value).trim() });
    };
    if (tour?.title) add('Trip', tour.title);
    if (bookingCode) add('Reference', bookingCode);
    add('Name', full_name);
    add('Email', email);
    add('Phone / WhatsApp', phone);
    add('Preferred date', travel_date);
    add('Dates flexible', date_flexibility);
    add('Duration', trip_duration);
    add('Travellers', paxLabel);
    add('Budget per person', budget_range);
    add('Interests', travel_interests.join(', '));
    add('Accommodation', accommodation_preference);
    add('Special requests', special_requests);
    add('Notes', message);
    return rows;
  })();

  // Indicative estimate — ONLY from the tour's real "from" price; clearly non-binding.
  $: indicative = (() => {
    if (!tour?.price_from) return null;
    const adults = Math.max(1, Number(number_of_adults) || 1);
    return { perPerson: money(tour.price_from), adults, total: money(tour.price_from * adults) };
  })();

  // ── WhatsApp handoff — prefilled with what they entered ──────────────────────
  $: waText = (() => {
    const lines: string[] = [`Hello ${brand.name}, I'd like to request this trip:`];
    for (const r of summaryRows) lines.push(`• ${r.label}: ${r.value}`);
    if (indicative) lines.push(`• Indicative (from): ${indicative.perPerson} pp × ${indicative.adults} ≈ ${indicative.total} (excl. int'l flights)`);
    return lines.join('\n');
  })();
  $: waHref = `https://wa.me/${waDigits}?text=${encodeURIComponent(waText)}`;
  const openWhatsApp = () => trackEvent('whatsapp_click', { tour_id: tour?.id, cta_location: 'booking_form' });

  // ── PDF quotation — branded, printable (Save as PDF), no dependencies ────────
  const esc = (v: string) =>
    String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const buildQuotationHtml = () => {
    const rowsHtml = summaryRows.map((r) => `<tr><th>${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`).join('');
    const priceHtml = indicative
      ? `<div class="price"><p class="pl">Indicative estimate</p><p class="pv">${esc(indicative.perPerson)} <span>per person</span></p>
         <p class="pn">${esc(indicative.perPerson)} × ${indicative.adults} adult${indicative.adults === 1 ? '' : 's'} ≈ <b>${esc(indicative.total)}</b></p>
         <p class="pd">Indicative only — excludes international flights, visas, insurance and optional extras. Your specialist confirms the final quote.</p></div>`
      : `<div class="price"><p class="pl">Price</p><p class="pv">On request</p><p class="pd">Your specialist will prepare a tailored quote for this trip.</p></div>`;
    const contactLine = [contactEmail, contactPhone].filter(Boolean).map(esc).join(' · ');
    const title = `${brand.name} Quotation${bookingCode ? ' ' + bookingCode : ''}`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
    <style>
      *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2d3027;margin:0;padding:40px;background:#fff}
      .wrap{max-width:720px;margin:0 auto}
      .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #c79a3a;padding-bottom:16px}
      .brand{font-size:22px;font-weight:800;color:#1f4d3a} .co{font-size:12px;color:#6b6f63;margin-top:2px}
      .doc{text-align:right} .doc h1{font-size:16px;margin:0;color:#1f4d3a;text-transform:uppercase;letter-spacing:.06em} .doc p{margin:4px 0 0;font-size:12px;color:#6b6f63}
      .trip{margin:20px 0;padding:12px 16px;background:#f6f1e6;border-radius:10px;font-size:15px} .trip b{color:#1f4d3a}
      table{width:100%;border-collapse:collapse;margin-top:8px} th,td{text-align:left;padding:9px 10px;font-size:13px;border-bottom:1px solid #eee;vertical-align:top}
      th{width:180px;color:#6b6f63;font-weight:600} td{color:#2d3027}
      .price{margin-top:22px;padding:16px 18px;border:1px solid #e3dcc9;border-radius:12px;background:#faf7ef}
      .pl{margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#8a7a4a;font-weight:700}
      .pv{margin:4px 0 0;font-size:22px;font-weight:800;color:#1f4d3a} .pv span{font-size:12px;font-weight:600;color:#6b6f63}
      .pn{margin:6px 0 0;font-size:14px;color:#2d3027} .pd{margin:8px 0 0;font-size:11px;color:#8a8d82;line-height:1.5}
      .foot{margin-top:26px;border-top:1px solid #eee;padding-top:14px;font-size:11px;color:#8a8d82;line-height:1.6}
      @media print{body{padding:0} .wrap{max-width:none}}
    </style></head><body><div class="wrap">
      <div class="head">
        <div><div class="brand">${esc(brand.name)}</div><div class="co">${esc(companyName)}</div></div>
        <div class="doc"><h1>Trip Quotation Request</h1><p>${esc(todayStr)}</p>${bookingCode ? `<p>Ref: <b>${esc(bookingCode)}</b></p>` : ''}</div>
      </div>
      ${tour?.title ? `<div class="trip">Requested trip: <b>${esc(tour.title)}</b>${tour?.duration_days ? ` · ${tour.duration_days} day${tour.duration_days === 1 ? '' : 's'}` : ''}</div>` : ''}
      <table>${rowsHtml}</table>
      ${priceHtml}
      <div class="foot">This is a trip planning request, not a booking or a binding quote — no payment is required. A local specialist will contact you to confirm availability and a final tailored quotation.${contactLine ? `<br>${contactLine}` : ''}</div>
    </div></body></html>`;
  };

  const downloadQuotation = () => {
    trackEvent('quotation_download', { tour_id: tour?.id, tour_title: tour?.title });
    const html = buildQuotationHtml();
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) { iframe.remove(); return; }
    doc.open();
    doc.write(html);
    doc.close();
    const run = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => iframe.remove(), 1500);
      }
    };
    if (iframe.contentWindow?.document.readyState === 'complete') setTimeout(run, 60);
    else iframe.onload = () => setTimeout(run, 60);
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const submit = async () => {
    if (submitting) return;
    // Enter key on an earlier step advances instead of submitting.
    if (step < LAST) { await next(); return; }
    errorMessage = '';

    if (hp_company.trim()) { submitted = true; return; } // honeypot

    if (!validateStep(0) || !validateStep(1)) {
      errorMessage = 'Some required details are missing. Please review the earlier steps.';
      step = validateStep(0) ? 1 : 0;
      await scrollBodyTop();
      return;
    }

    const lead_context: Record<string, unknown> = {
      budget_range,
      date_flexibility,
      source_page_url: $page.url.href,
      submitted_at: new Date().toISOString()
    };
    lead_context.selected_currency = $currency.selectedCurrency;
    if (tour?.title) lead_context.selected_trip = tour.title;
    if (trip_duration.trim()) lead_context.trip_duration = trip_duration.trim();
    if (travel_interests.length) lead_context.travel_interests = travel_interests.join(', ');
    if (accommodation_preference) lead_context.accommodation_preference = accommodation_preference;
    lead_context.attribution = getAttribution();

    submitting = true;
    try {
      const res = await api.bookings.create({
        tour_id: tour?.id ?? null,
        full_name: full_name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        country: country.trim() || null,
        travel_date: travel_date || null,
        number_of_adults: Number(number_of_adults) || 1,
        number_of_children: Number(number_of_children) || 0,
        special_requests: special_requests.trim() || null,
        message: message.trim() || null,
        source: 'website_booking_form',
        selected_currency: $currency.selectedCurrency,
        lead_context,
        hp_company
      });
      bookingCode = String((res.data as Record<string, unknown>)?.booking_code ?? '');
      submitted = true;
      trackEvent('request_trip_submitted', {
        tour_id: tour?.id,
        tour_title: tour?.title,
        budget_range,
        experience_type: travel_interests.join(', ')
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
      // clipboard not available — ignore
    }
  };
</script>

{#if submitted}
  <div class="grid gap-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-surface p-6 shadow-soft md:p-8">
    <div class="flex items-center gap-3">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 size={26} /></span>
      <div>
        <h3 class="text-xl font-bold text-heading">Thank you! Your request has been received.</h3>
        <p class="mt-1 text-sm text-ink/70">A local travel specialist will contact you shortly.</p>
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
        <p class="mt-2 text-xs leading-5 text-ink/70">Keep this reference for your records. This is a trip planning request — no payment is required yet.</p>
      </div>
    {/if}

    <div class="grid gap-3 sm:grid-cols-2">
      <button type="button" class="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-ink/15 bg-surface px-5 text-sm font-bold text-heading shadow-sm transition hover:border-goldfinch-gold/50 hover:bg-sand" on:click={downloadQuotation}>
        <Download size={17} /> Download quotation (PDF)
      </button>
      <a href={waHref} target="_blank" rel="noopener noreferrer" on:click={openWhatsApp} class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-105">
        <MessageCircle size={17} /> Continue on WhatsApp
      </a>
    </div>

    <Button type="button" variant="secondary" on:click={resetForm}>Submit another request</Button>
  </div>
{:else}
  <form class="booking-form gf-panel-dark relative flex max-h-[88svh] min-h-0 min-w-0 flex-col overflow-hidden rounded-[14px] border border-white/10 shadow-soft sm:max-h-[88vh] sm:rounded-2xl" on:focusin={keepFocusedFieldVisible} on:submit|preventDefault={submit} novalidate>
    <!-- Header + progress -->
    <div class="shrink-0 border-b border-white/10 px-4 py-3 sm:px-5 md:px-6">
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-goldfinch-gold">Booking request</p>
      <h3 class="mt-0.5 font-serif text-xl font-semibold tracking-normal text-white">Request this trip with confidence</h3>
      {#if tour}
        <div class="booking-trip-context mt-2" title={tour.title}>
          <MapPin size={13} class="shrink-0 text-goldfinch-gold" />
          <span class="truncate text-xs font-semibold text-white/85">{tour.title}</span>
        </div>
      {/if}

      <div class="mt-2">
        <FormStepper steps={STEPS} current={step} tone="dark" compact onStep={goStep} />
      </div>
    </div>

    <!-- Body (scrolls) -->
    <div class="grid min-h-0 flex-1 gap-3 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 md:px-6" bind:this={bodyEl}>
      {#if step === 0}
        <fieldset class="grid gap-3">
          <legend class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Contact details</legend>
          <div class="booking-field-grid">
            <label class="grid gap-1.5">
              <span class="gf-label">Full name</span>
              <input class={cls('full_name')} bind:value={full_name} on:input={() => clearErr('full_name')} placeholder="Your name" autocomplete="name" />
              {#if errors.full_name}<span class="text-xs text-red-600">{errors.full_name}</span>{/if}
            </label>
            <label class="grid gap-1.5">
              <span class="gf-label">Email</span>
              <input class={cls('email')} type="email" bind:value={email} on:input={() => clearErr('email')} placeholder="you@example.com" autocomplete="email" />
              {#if errors.email}<span class="text-xs text-red-600">{errors.email}</span>{/if}
            </label>
          </div>
          <div class="booking-field-grid">
            <label class="grid gap-1.5">
              <span class="gf-label">Phone / WhatsApp</span>
              <input class={cls('phone')} type="tel" bind:value={phone} on:input={() => clearErr('phone')} placeholder="+255 ..." autocomplete="tel" />
              {#if errors.phone}<span class="text-xs text-red-600">{errors.phone}</span>{/if}
            </label>
          </div>
        </fieldset>
      {:else if step === 1}
        <fieldset class="grid gap-3">
          <legend class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Trip details</legend>
          <div class="booking-field-grid">
            <label class="grid gap-1.5">
              <span class="gf-label">Preferred travel date</span>
              <input class={cls('travel_date')} type="date" min={todayStr} bind:value={travel_date} on:input={() => clearErr('travel_date')} />
              {#if errors.travel_date}<span class="text-xs text-red-600">{errors.travel_date}</span>{/if}
            </label>
            <label class="grid gap-1.5">
              <span class="gf-label">Are your dates flexible?</span>
              <select class={cls('date_flexibility')} bind:value={date_flexibility} on:change={() => clearErr('date_flexibility')}>
                <option value="" disabled>Select…</option>
                {#each FLEX_OPTIONS as opt}<option value={opt}>{opt}</option>{/each}
              </select>
              {#if errors.date_flexibility}<span class="text-xs text-red-600">{errors.date_flexibility}</span>{/if}
            </label>
          </div>
          <div class="booking-field-grid">
            <label class="grid gap-1.5">
              <span class="gf-label">Trip duration</span>
              <input class={cls('trip_duration')} bind:value={trip_duration} placeholder="e.g. 5 days / 4 nights" />
            </label>
            <label class="grid gap-1.5">
              <span class="gf-label">Estimated budget per person</span>
              <select class={cls('budget_range')} bind:value={budget_range} on:change={() => clearErr('budget_range')}>
                <option value="" disabled>Select budget…</option>
                {#each BUDGET_OPTIONS as opt}<option value={opt}>{opt}</option>{/each}
              </select>
              {#if errors.budget_range}<span class="text-xs text-red-600">{errors.budget_range}</span>{/if}
            </label>
          </div>
          <div class="booking-count-grid">
            <label class="grid gap-1.5">
              <span class="gf-label">Adults</span>
              <input class={cls('number_of_adults')} type="number" min="1" bind:value={number_of_adults} on:input={() => clearErr('number_of_adults')} />
              {#if errors.number_of_adults}<span class="text-xs text-red-600">{errors.number_of_adults}</span>{/if}
            </label>
            <label class="grid gap-1.5">
              <span class="gf-label">Children</span>
              <input class={cls('number_of_children')} type="number" min="0" bind:value={number_of_children} on:input={() => clearErr('number_of_children')} />
              {#if errors.number_of_children}<span class="text-xs text-red-600">{errors.number_of_children}</span>{/if}
            </label>
          </div>
        </fieldset>
      {:else if step === 2}
        <fieldset class="grid gap-3">
          <legend class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Preferences</legend>
          <div class="grid gap-2">
            <span class="gf-label">What are you interested in? <span class="gf-hint">(select any)</span></span>
            <CategoryPicker
              selected={travel_interests}
              fallbackOptions={INTERESTS}
              tone="dark"
              onToggle={toggleInterest}
            />
          </div>
          <label class="grid gap-1.5">
            <span class="gf-label">Accommodation preference</span>
            <select class={cls('accommodation_preference')} bind:value={accommodation_preference}>
              <option value="">No preference</option>
              {#each ACCOMMODATION_OPTIONS as opt}<option value={opt}>{opt}</option>{/each}
            </select>
          </label>
          <label class="grid gap-1.5">
            <span class="gf-label">Special requests</span>
            <textarea class="gf-textarea booking-textarea-short" rows={2} bind:value={special_requests} placeholder="Dietary needs, accessibility, celebrations, room preferences..."></textarea>
          </label>
          <label class="grid gap-1.5">
            <span class="gf-label">Anything else we should know?</span>
            <textarea class="gf-textarea booking-textarea" rows={3} bind:value={message} placeholder="Must-see places, special occasions, group details..."></textarea>
          </label>
        </fieldset>
      {:else}
        <!-- Review -->
        <div class="grid gap-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Review your request</p>
          <div class="overflow-hidden rounded-xl border border-ink/10">
            <dl class="divide-y divide-ink/8">
              {#each summaryRows as r}
                <div class="grid gap-1 px-3 py-3 text-sm sm:grid-cols-[130px_1fr] sm:gap-3 sm:px-4 sm:py-2.5">
                  <dt class="text-xs font-semibold uppercase tracking-[0.1em] text-ink/50 sm:text-sm sm:normal-case sm:tracking-normal">{r.label}</dt>
                  <dd class="break-words font-semibold text-heading">{r.value}</dd>
                </div>
              {/each}
            </dl>
          </div>

          {#if indicative}
            <div class="rounded-xl border border-goldfinch-gold/25 bg-sand/40 p-4">
              <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-clay">Indicative estimate</p>
              <p class="mt-1 text-lg font-extrabold text-heading">{indicative.perPerson} <span class="text-xs font-semibold text-ink/60">per person</span></p>
              <p class="mt-0.5 text-sm text-ink/70">{indicative.perPerson} × {indicative.adults} adult{indicative.adults === 1 ? '' : 's'} ≈ <b>{indicative.total}</b></p>
              <p class="mt-1.5 text-[11px] leading-5 text-ink/55">Indicative only — excludes international flights, visas and insurance. Your specialist confirms the final quote.</p>
            </div>
          {/if}

          <div class="grid gap-3 sm:grid-cols-2">
            <button type="button" class="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ink/15 bg-surface px-4 text-sm font-bold text-heading shadow-sm transition hover:border-goldfinch-gold/50 hover:bg-sand" on:click={downloadQuotation}>
              <Download size={16} /> Download quotation (PDF)
            </button>
            <a href={waHref} target="_blank" rel="noopener noreferrer" on:click={openWhatsApp} class="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-bold text-white shadow-sm transition hover:brightness-105">
              <MessageCircle size={16} /> Send on WhatsApp
            </a>
          </div>
          <p class="text-xs text-ink/55">Submit below to get a reference number, or send us your details straight away on WhatsApp.</p>
        </div>
      {/if}
    </div>

    <!-- Honeypot -->
    <div class="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
      <label>Company<input type="text" name="hp_company" tabindex="-1" autocomplete="off" bind:value={hp_company} /></label>
    </div>

    <!-- Footer nav -->
    <div class="shrink-0 space-y-2.5 border-t border-white/10 px-4 py-3.5 sm:px-5 md:px-6">
      {#if errorMessage}
        <div class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
          <AlertCircle size={15} class="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      {/if}

      <div class:single-action={step === 0} class="booking-form-nav">
        {#if step > 0}
          <button type="button" class="gf-btn-ghost booking-nav-back" on:click={back}>
            <ArrowLeft size={16} /> Back
          </button>
        {/if}
        {#if step < LAST}
          <button type="button" class="gf-btn-primary booking-nav-primary" on:click={next}>
            Continue <ArrowRight size={16} strokeWidth={2.6} />
          </button>
        {:else}
          <button type="submit" class="gf-btn-primary booking-nav-primary" disabled={submitting}>
            {submitting ? 'Sending…' : 'Submit Booking Request'}
          </button>
        {/if}
      </div>

      <p class="flex items-center justify-center gap-1.5 text-center text-xs text-white/60">
        <ShieldCheck size={13} class="text-forest" />
        Your details are kept private and used only to plan your trip.
      </p>
    </div>
  </form>
{/if}

<style>
  .booking-form {
    container-type: inline-size;
  }

  @media (max-width: 1023px) {
    .booking-form {
      width: 100%;
      max-height: calc(var(--booking-viewport-height, 100dvh) - 0.75rem);
    }
  }

  .booking-trip-context {
    display: flex;
    min-width: 0;
    height: 1.875rem;
    align-items: center;
    gap: 0.4rem;
    border-left: 2px solid rgb(212 175 55 / 0.8);
    padding: 0 0.55rem;
    background: rgb(255 255 255 / 0.045);
  }

  .booking-field-grid,
  .booking-count-grid {
    display: grid;
    gap: 0.75rem;
  }

  .booking-count-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  :global(.booking-form .gf-input) {
    height: 2.5rem;
    min-height: 2.5rem;
    font-size: 0.8125rem;
  }

  :global(.booking-form .gf-label) {
    font-size: 0.5625rem;
    letter-spacing: 0.1em;
  }

  .booking-textarea-short {
    min-height: 3.75rem;
    resize: vertical;
  }

  .booking-textarea {
    min-height: 4.5rem;
    resize: vertical;
  }

  .booking-form-nav {
    display: grid;
    grid-template-columns: minmax(5.5rem, 0.42fr) minmax(0, 1fr);
    gap: 0.625rem;
  }

  .booking-form-nav.single-action {
    grid-template-columns: minmax(0, 1fr);
  }

  :global(.booking-form .booking-nav-back),
  :global(.booking-form .booking-nav-primary) {
    width: 100%;
    height: 2.625rem;
    padding-inline: 0.875rem;
  }

  @container (min-width: 520px) {
    .booking-field-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
