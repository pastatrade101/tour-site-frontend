<script lang="ts">
  /**
   * The one enquiry form. Everything contextual arrives as config — this
   * component only knows about steps, validation, submission and analytics.
   */
  import { createEventDispatcher, tick } from 'svelte';
  import { ArrowLeft, ArrowRight, Check, Loader2, MessageCircle, Send } from '@lucide/svelte';
  import { currency, formatUsd } from '$lib/currency';
  import { brand } from '$lib/brand';
  import { publicSettings, settingText } from '$lib/settings';
  import { trackEvent } from '$lib/analytics';
  import { BUDGET_BANDS_USD } from '$lib/enquiry/fields';
  import { newIdempotencyKey, submitEnquiry } from '$lib/enquiry/submit';
  import type { EnquiryContext, Field, FormConfig, FormValues } from '$lib/enquiry/types';
  import Img from '$lib/components/public/Img.svelte';
  import EnquiryField from './EnquiryField.svelte';
  import EnquiryModal from './EnquiryModal.svelte';

  export let open = false;
  export let config: FormConfig;
  export let context: EnquiryContext = {};

  const dispatch = createEventDispatcher<{ close: void; submitted: { booking_code?: string | null } }>();

  let values: FormValues = { adults: 2, children: 0, child_ages: [], hp_company: '' };
  let errors: Record<string, string> = {};
  let stepIndex = 0;
  let submitting = false;
  let submitError = '';
  let done = false;
  let bookingCode: string | null = null;
  let idempotencyKey = newIdempotencyKey();

  // ── "Continue on WhatsApp" on the success screen ────────────────────────────
  // Same settings source the navbar and footer use. No hardcoded fallback
  // number: if none is configured the button simply does not appear, rather
  // than sending travellers to a number that is not ours.
  $: waDigits = (
    settingText($publicSettings, 'whatsapp_number') || settingText($publicSettings, 'contact_phone')
  ).replace(/[^0-9]/g, '');
  $: waText = [
    `Hello ${brand.name}, I have just sent a request through your website.`,
    bookingCode ? `Reference: ${bookingCode}` : '',
    tour?.title ? `Trip: ${tour.title}` : category?.name ? `Interested in: ${category.name}` : ''
  ]
    .filter(Boolean)
    .join('\n');
  $: waHref = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(waText)}` : '';
  let started = false;
  let bodyEl: HTMLDivElement;

  $: steps = config.steps;
  $: step = steps[stepIndex];
  $: isLast = stepIndex === steps.length - 1;
  $: tour = context.tour;
  $: category = context.category;
  // Standing rule: never advertise a zero price. Hide the line instead.
  $: tourPrice = Number(tour?.price_from ?? 0) > 0 ? formatUsd(Number(tour?.price_from), $currency) : '';

  /** Analytics context — non-personal only; SAFE_KEYS enforces that anyway. */
  const eventMeta = () => ({
    form_type: config.formType,
    form_name: config.formType,
    step_index: stepIndex,
    step_key: step?.key,
    category_id: context.category?.id,
    category_name: context.category?.name,
    tour_id: context.tour?.id,
    tour_slug: context.tour?.slug,
    tour_title: context.tour?.title
  });

  // Opening and closing are tracked here rather than at each call site, so a
  // new CTA cannot forget to instrument itself.
  let wasOpen = false;
  $: if (open !== wasOpen) {
    wasOpen = open;
    if (open) {
      trackEvent('form_opened', eventMeta());
    } else if (!done && started) {
      trackEvent('form_abandoned', eventMeta());
    }
  }

  /** Budget labels are authored in USD; show them in the visitor's currency. */
  const budgetLabel = (raw: string): string => {
    const band = BUDGET_BANDS_USD.find((item) => item.value === raw || item.label === raw);
    if (!band || band.value === 'not_sure') return raw;
    const from = formatUsd(band.from, $currency);
    return band.to ? `${from}–${formatUsd(band.to, $currency)}` : `${from}+`;
  };

  $: visibleFields = (step?.fields ?? []).filter((field) => !field.showIf || field.showIf(values));

  const localise = (field: Field): Field =>
    field.key === 'budget_range' && field.options
      ? { ...field, options: field.options.map((option) => ({ ...option, label: budgetLabel(option.value) })) }
      : field;

  const errorFor = (field: Field): string => {
    const value = values[field.key];
    if (field.required) {
      const empty =
        value === undefined ||
        value === '' ||
        value === null ||
        (Array.isArray(value) && value.length === 0);
      if (empty) return `${field.label} is required`;
    }
    return field.validate ? field.validate(value, values) : '';
  };

  const validateStep = async (): Promise<boolean> => {
    const next: Record<string, string> = {};
    for (const field of visibleFields) {
      const message = errorFor(field);
      if (message) next[field.key] = message;
    }
    errors = next;

    const bad = Object.keys(next);
    if (!bad.length) return true;

    trackEvent('form_validation_error', { ...eventMeta(), field_name: bad[0], error_type: 'required_or_invalid' });
    await tick();
    bodyEl?.querySelector<HTMLElement>(`[data-field="${bad[0]}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return false;
  };

  const markStarted = () => {
    if (started) return;
    started = true;
    trackEvent('form_started', eventMeta());
  };

  const next = async () => {
    markStarted();
    if (!(await validateStep())) return;
    trackEvent('form_step_completed', eventMeta());
    if (!isLast) {
      stepIndex += 1;
      errors = {};
      await tick();
      bodyEl?.scrollTo({ top: 0 });
    }
  };

  const back = async () => {
    if (stepIndex === 0) return;
    stepIndex -= 1;
    errors = {};
    await tick();
    bodyEl?.scrollTo({ top: 0 });
  };

  const submit = async () => {
    // Guard 1 of 2 against double submission; the idempotency key on the server
    // is the one that survives a refresh or a lost response.
    if (submitting) return;
    markStarted();
    if (!(await validateStep())) return;

    submitting = true;
    submitError = '';

    try {
      const result = await submitEnquiry(config, values, context, idempotencyKey, $currency.selectedCurrency);
      bookingCode = (result.booking_code as string | null) ?? null;
      done = true;
      trackEvent('form_submitted', { ...eventMeta(), lead_type: config.formType });
      dispatch('submitted', { booking_code: bookingCode });
    } catch (error) {
      // Values are deliberately untouched — a failed submission must never cost
      // somebody the five minutes they just spent filling this in.
      submitError =
        error instanceof Error && error.message
          ? error.message
          : 'Something went wrong sending your enquiry. Please try again.';
      trackEvent('form_submit_error', { ...eventMeta(), error_type: 'submit_failed' });
    } finally {
      submitting = false;
    }
  };

  const close = () => dispatch('close');

  /** Reset only after a success, so reopening starts a genuinely new enquiry. */
  export const reset = () => {
    values = { adults: 2, children: 0, child_ages: [], hp_company: '' };
    errors = {};
    stepIndex = 0;
    done = false;
    bookingCode = null;
    submitError = '';
    started = false;
    idempotencyKey = newIdempotencyKey();
  };
</script>

<EnquiryModal
  {open}
  title={done ? 'Thank you — request received' : config.title}
  description={done ? '' : config.description}
  steps={done ? [] : steps.map((item) => item.label)}
  {stepIndex}
  on:close={close}
>
  <div bind:this={bodyEl}>
    {#if done}
      <!-- success ------------------------------------------------------------>
      <div class="py-6 text-center">
        <span class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-goldfinch-gold text-heading">
          <Check size={26} strokeWidth={3} />
        </span>
        <p class="mt-5 font-serif text-[22px] leading-tight">We have your request</p>
        <p class="mx-auto mt-3 max-w-sm text-[14px] leading-7 text-white/70">
          A local specialist will confirm availability and send a personalised quotation within one business day. No
          payment is required.
        </p>
        {#if bookingCode}
          <p class="mt-4 text-[13px] text-white/55">
            Your reference: <span class="font-bold text-goldfinch-gold">{bookingCode}</span>
          </p>
        {/if}
        <p class="mt-4 text-[13px] text-white/55">We have emailed you a copy.</p>
      </div>
    {:else}
      <!-- persistent tour summary: one compact row, ~80px --------------------->
      {#if tour?.title}
        <div class="mb-3.5 flex items-center gap-3 rounded-[12px] border border-white/12 bg-white/[0.06] p-2">
          {#if tour.image}
            <Img
              src={tour.image}
              alt=""
              width={160}
              height={160}
              className="h-[60px] w-[60px] shrink-0 rounded-[8px] object-cover"
            />
          {/if}
          <div class="min-w-0">
            <p class="truncate font-serif text-[15px] font-semibold leading-snug">{tour.title}</p>
            <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] leading-4 text-white/60">
              {#if tour.duration_days}<span>{tour.duration_days} days</span>{/if}
              {#if tourPrice}<span aria-hidden="true">·</span><span class="font-semibold text-white/80">from {tourPrice} pp</span>{/if}
              {#if tour.destinations}<span aria-hidden="true">·</span><span class="truncate">{tour.destinations}</span>{/if}
            </p>
          </div>
        </div>
      {/if}

      {#if step?.heading}
        <p class="mb-3 text-[13px] font-bold uppercase tracking-[0.14em] text-white/45">{step.heading}</p>
      {/if}
      {#if step?.blurb}
        <p class="-mt-2 mb-3 text-[12.5px] leading-5 text-white/55">{step.blurb}</p>
      {/if}

      <!-- Two columns from the first breakpoint; `half` fields pair up, the
           rest span both. Row gap is deliberately tighter than the column gap:
           vertical space is the scarce one. -->
      {#key stepIndex}
        <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2 step-body">
          {#each visibleFields as field (field.key)}
            <EnquiryField field={localise(field)} bind:values error={errors[field.key] ?? ''} />
          {/each}
        </div>
      {/key}

      <!-- honeypot: off-screen, not hidden, so bots that check visibility fill it -->
      <div class="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
        <label for="hp_company">Company</label>
        <input id="hp_company" type="text" tabindex="-1" autocomplete="off" bind:value={values.hp_company} />
      </div>

      {#if submitError}
        <p class="mt-5 rounded-[10px] border border-red-400/40 bg-red-500/15 px-3.5 py-3 text-[13px] text-red-200" role="alert">
          {submitError} Your answers have been kept — press {config.submitLabel} to try again.
        </p>
      {/if}
    {/if}
  </div>

  <svelte:fragment slot="footer">
    {#if done}
      <div class="grid gap-2.5">
        {#if waHref}
          <a
            class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 text-[14px] font-bold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            on:click={() =>
              trackEvent('whatsapp_click', {
                form_type: config.formType,
                tour_id: tour?.id,
                tour_title: tour?.title,
                cta_location: 'enquiry_success'
              })}
          >
            <MessageCircle size={17} />
            Continue on WhatsApp
          </a>
        {/if}
        <button
          type="button"
          class="h-11 w-full rounded-full px-6 text-[14px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white {waHref
            ? 'border border-white/25 text-white hover:bg-white/10'
            : 'bg-goldfinch-gold text-heading hover:brightness-105'}"
          on:click={close}
        >
          Close
        </button>
      </div>
    {:else}
      <div class="flex items-center gap-3">
        {#if stepIndex > 0}
          <button
            type="button"
            class="inline-flex h-11 items-center gap-1.5 rounded-full border border-white/25 px-4 text-[14px] font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
            on:click={back}
          >
            <ArrowLeft size={16} /> Back
          </button>
        {/if}

        <button
          type="button"
          class="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-goldfinch-gold px-6 text-[14px] font-bold text-heading transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          disabled={submitting}
          on:click={isLast ? submit : next}
        >
          {#if submitting}
            <Loader2 size={16} class="animate-spin" /> Sending…
          {:else if isLast}
            <Send size={16} /> {config.submitLabel}
          {:else}
            Continue <ArrowRight size={16} />
          {/if}
        </button>
      </div>

      <!-- One reassurance line, on every step rather than only at the end —
           the doubt it answers is what stops people starting, not finishing. -->
      {#if config.submitNote}
        <p class="mt-2 text-center text-[11.5px] leading-4 text-white/45">{config.submitNote}</p>
      {/if}
    {/if}
  </svelte:fragment>
</EnquiryModal>

<style>
  /* Steps fade and settle rather than jumping, keyed on the step index so it
     replays each time. Purely presentational — no layout shift. */
  .step-body {
    animation: step-in 220ms cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  @keyframes step-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .step-body {
      animation: none;
    }
  }
</style>
