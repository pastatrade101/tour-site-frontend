<script lang="ts">
  import WhatsAppIcon from './WhatsAppIcon.svelte';
  import { onMount, tick } from 'svelte';
  import { ArrowLeft, ArrowRight, ChevronDown, Loader2 } from '@lucide/svelte';
  import { locale, t } from '$lib/i18n/ui';
  import { createFormTracker, getAttribution, campaignTags, lastCtaClicked, pushDataLayerEvent } from '$lib/analytics';
  import { newEnquiryKey, savedEnquiryReference } from '$lib/enquiry/validation';
  import { api, submitErrorKey } from '$lib/api/client';
  import { publicSettings, settingText } from '$lib/settings';
  import TripDatePicker from './TripDatePicker.svelte';
  import TripPhoneInput from './TripPhoneInput.svelte';
  import CountStepper from './CountStepper.svelte';
  import { plannerProblems, plannerPayload, type PlannerValues, type PlannerField } from '$lib/enquiry/stylePlanner';
  import { loadDraft, saveDraft, clearDraft } from '$lib/enquiry/draft';

  export let eyebrow = '';
  export let title: string;
  export let description = '';
  export let categoryName = '';
  export let categorySlug = '';
  export let packageName = '';
  export let packageSlug = '';
  export let routeOptions: Array<{ label: string; tourTitle: string; tourSlug: string; tourDays?: number | null }> = [];
  export let suggestedRoute = '';
  /**
   * `band` lays the heading beside the fields across a page-wide panel.
   * `hero` is the same form as a narrow card, for sitting beside a headline.
   */
  export let layout: 'band' | 'hero' = 'band';
  /** A usual length for this kind of trip: where the empty days count begins. */
  export let daysStart: number | undefined = undefined;

  const LANGUAGES = [
    { code: 'en', label: 'English' }, { code: 'sw', label: 'Kiswahili' },
    { code: 'de', label: 'Deutsch' }, { code: 'fr', label: 'Français' },
    { code: 'es', label: 'Español' }, { code: 'it', label: 'Italiano' }
  ];
  const STEP_KEYS = ['style_form.your_trip', 'style_form.travellers_preferences', 'style_form.your_details'];
  const COMFORT = [
    { value: 'Mid-range', key: 'tier.mid_range' }, { value: 'Luxury', key: 'tier.luxury' },
    { value: 'Budget', key: 'tier.budget' }
  ];
  const BEACH = [
    { value: 'Yes', key: 'style_form.yes' }, { value: 'No', key: 'style_form.safari_only' },
    { value: 'Not sure yet', key: 'ui.not_sure_yet' }
  ];

  let step = 1;
  let submitting = false;
  let submitted = false;
  let bookingCode = '';
  let formError = '';
  let errors: Partial<Record<PlannerField, string>> = {};
  let stepHeading: HTMLParagraphElement;
  let stepFields: HTMLDivElement;
  let confirmation: HTMLDivElement;
  let daysTouched = false;
  let routeTouched = false;
  let idempotencyKey = '';
  let values: PlannerValues = {
    days: undefined, daysUnsure: false, travelDate: '', dateUnsure: false,
    adults: 2, children: 0, language: $locale, comfort: '', beach: '',
    fullName: '', email: '', phone: '', dialCode: '+255', specialRequests: '',
    whatsappOptIn: false, route: '', hp: ''
  };
  let root: HTMLElement;
  const tracker = createFormTracker({ form_name: 'style_planner', form_type: 'category_enquiry', lead_type: 'category_enquiry', category_name: (packageName || categoryName).slice(0, 128) }, 'request_trip_submitted');
  $: tracker.at(step - 1, STEP_KEYS[step - 1]);
  onMount(() => {
    const stop = tracker.watchLeave();
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) { tracker.opened(); observer.disconnect(); } });
    observer.observe(root);
    return () => { observer.disconnect(); stop(); };
  });
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const uid = `enquiry-${packageSlug || categorySlug || 'safari'}`;

  /*
   * The half-filled band is kept in the visitor's own browser (see draft.ts),
   * so opening a suggested trip and coming back finds it where they left it.
   * Trip answers and the step go in the trip half; name, email, phone and notes
   * in the tab-only contact half. The honeypot, idempotency key and send state
   * are never kept. Everything read back is checked, and anything that no
   * longer fits (a passed date, a route from another page) is left empty.
   */
  const DRAFT_KEY = 'style_planner';
  let draftReady = false;
  let draftSnapshot: string | null = null;
  const asBool = (value: unknown) => (typeof value === 'boolean' ? value : undefined);
  const asCount = (value: unknown, min: number) => (typeof value === 'number' && Number.isSafeInteger(value) && value >= min ? value : undefined);
  const asText = (value: unknown, max: number) => (typeof value === 'string' && value.length <= max ? value : undefined);
  const asChoice = (value: unknown, allowed: string[]) => (typeof value === 'string' && allowed.includes(value) ? value : undefined);
  const asFutureDate = (value: unknown) => {
    const date = asText(value, 10);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
    const parsed = new Date(`${date}T00:00:00Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date && date >= today ? date : undefined;
  };
  async function restoreDraft() {
    const { trip, contact } = loadDraft<Record<string, unknown>, Record<string, unknown>>(DRAFT_KEY);
    if (!trip && !contact) { draftReady = true; return; }
    const next: PlannerValues = { ...values };
    let resume = 1;
    if (trip) {
      const samePage = trip.categorySlug === categorySlug && trip.packageSlug === packageSlug;
      const typedDays = trip.daysTouched === true;
      // Days a route filled in belong to that route's page; days the visitor typed go with them.
      const days = asCount(trip.days, 1);
      if (days !== undefined && (samePage || typedDays)) { next.days = days; daysTouched = typedDays; }
      next.daysUnsure = asBool(trip.daysUnsure) ?? next.daysUnsure;
      next.travelDate = asFutureDate(trip.travelDate) ?? next.travelDate;
      next.dateUnsure = asBool(trip.dateUnsure) ?? next.dateUnsure;
      next.adults = asCount(trip.adults, 1) ?? next.adults;
      next.children = asCount(trip.children, 0) ?? next.children;
      // Left at the page's own language the answer follows the page; picked, it goes with the visitor.
      const language = asChoice(trip.language, LANGUAGES.map((option) => option.code));
      if (language && typeof trip.locale === 'string' && (trip.locale === $locale || language !== trip.locale)) next.language = language;
      next.comfort = asChoice(trip.comfort, ['', ...COMFORT.map((option) => option.value)]) ?? next.comfort;
      next.beach = asChoice(trip.beach, ['', ...BEACH.map((option) => option.value)]) ?? next.beach;
      // A route only means something on the page it was chosen on, and one the page itself suggests wins —
      // now or later: it comes back untouched, so a route the visitor picks on the page (a tab, a "request" button) still replaces it.
      const pageRoute = Boolean(suggestedRoute) && routeOptions.some((option) => option.label === suggestedRoute);
      const route = asChoice(trip.route, [...routeOptions.map((option) => option.label), 'Not sure yet']);
      if (samePage && !pageRoute && route) next.route = route;
      const savedStep = asCount(trip.step, 1);
      if (savedStep && savedStep <= STEP_KEYS.length) resume = savedStep;
    }
    if (contact) {
      next.fullName = asText(contact.fullName, 200) ?? next.fullName;
      next.email = asText(contact.email, 254) ?? next.email;
      // The number is only kept together with the country code it was typed for.
      const dialCode = asText(contact.dialCode, 5);
      const phone = asText(contact.phone, 32);
      if (dialCode && /^\+\d{1,4}$/.test(dialCode) && phone !== undefined && /^[\d\s().-]*$/.test(phone)) { next.dialCode = dialCode; next.phone = phone; }
      next.specialRequests = asText(contact.specialRequests, 5000) ?? next.specialRequests;
      next.whatsappOptIn = asBool(contact.whatsappOptIn) ?? next.whatsappOptIn;
    }
    values = next;
    await tick(); // a restored route fills in its days before the steps are checked
    // Reopen on the saved step, but never past one whose answers no longer hold.
    for (let index = 1; index < resume; index += 1) {
      if (Object.keys(plannerProblems(values, index, today, hasRouteOptions)).length) { resume = index; break; }
    }
    step = resume;
    draftReady = true;
  }
  /** Save on every change the visitor makes — never the page as it first opened, so that cannot overwrite a draft. */
  function keepDraft(current: PlannerValues, currentStep: number, typedDays: boolean) {
    const trip = {
      days: current.days, daysUnsure: current.daysUnsure, travelDate: current.travelDate, dateUnsure: current.dateUnsure,
      adults: current.adults, children: current.children, language: current.language, comfort: current.comfort,
      beach: current.beach, route: current.route, step: currentStep, daysTouched: typedDays,
      locale: $locale, categorySlug, packageSlug
    };
    const contact = {
      fullName: current.fullName, email: current.email, phone: current.phone, dialCode: current.dialCode,
      specialRequests: current.specialRequests, whatsappOptIn: current.whatsappOptIn
    };
    const snapshot = JSON.stringify([trip, contact]);
    if (draftSnapshot === null || snapshot === draftSnapshot) { draftSnapshot = snapshot; return; }
    draftSnapshot = snapshot;
    saveDraft(DRAFT_KEY, trip, contact);
  }
  onMount(() => { void restoreDraft(); });

  $: hasRouteOptions = routeOptions.length > 1;
  $: if (!routeTouched && suggestedRoute && routeOptions.some((option) => option.label === suggestedRoute)) values.route = suggestedRoute;
  $: chosenRoute = routeOptions.find((option) => option.label === values.route);
  $: if (!daysTouched && chosenRoute?.tourDays && chosenRoute.tourDays > 0) values.days = chosenRoute.tourDays;
  $: waDigits = (settingText($publicSettings, 'whatsapp_number') || settingText($publicSettings, 'contact_phone')).replace(/\D/g, '');
  $: whatsappHref = `https://wa.me/${waDigits}?text=${encodeURIComponent($t('style_form.whatsapp_message').replace('{trip}', packageName || categoryName || title))}`;
  $: recap = [
    { label: $t('ui.route_option'), value: hasRouteOptions ? (values.route === 'Not sure yet' ? $t('ui.not_sure_yet') : values.route) : '' },
    { label: $t('style_form.safari_days'), value: values.daysUnsure ? $t('ui.not_sure_yet') : String(values.days ?? '') },
    { label: $t('form.preferred_start_date'), value: values.dateUnsure ? $t('style_form.dates_undecided') : values.travelDate ? new Intl.DateTimeFormat($locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${values.travelDate}T00:00:00Z`)) : '' },
    { label: $t('form.adults'), value: String(values.adults ?? '') },
    { label: $t('style_form.children'), value: values.children == null ? '' : String(values.children) },
    { label: $t('form.preferred_language'), value: LANGUAGES.find((language) => language.code === values.language)?.label ?? '' },
    { label: $t('style_form.accommodation'), value: values.comfort ? $t(COMFORT.find((option) => option.value === values.comfort)?.key ?? '') : '' },
    { label: $t('style_form.beach_stay'), value: values.beach ? $t(BEACH.find((option) => option.value === values.beach)?.key ?? '') : '' },
    { label: $t('form.special_requests'), value: values.specialRequests }
  ].filter((row) => row.value).map((row) => ({ label: row.label.slice(0, 300), value: row.value.trim().slice(0, 300) }));

  const clearError = (field: PlannerField) => { if (errors[field]) { delete errors[field]; errors = { ...errors }; } };
  const errorId = (field: PlannerField) => `${uid}-${field}-error`;
  async function validate(index: number) {
    errors = plannerProblems(values, index, today, hasRouteOptions);
    const field = Object.keys(errors)[0];
    if (!field) return true;
    await tick();
    const holder = stepFields?.querySelector<HTMLElement>(`[data-field="${field}"]`);
    (holder?.querySelector<HTMLElement>('[data-focus]') ?? holder?.querySelector<HTMLElement>('input, select, button'))?.focus();
    tracker.invalid(STEP_KEYS[index - 1], field);
    return false;
  }
  async function focusStep() { await tick(); stepHeading?.scrollIntoView({ block: layout === 'hero' ? 'nearest' : 'start' }); stepHeading?.focus({ preventScroll: true }); }
  // A press of plus or minus is an answer too, but not an `input` event the form would hear.
  const counted = (field: PlannerField) => { if (field === 'days') daysTouched = true; clearError(field); tracker.started(); };
  async function next() { if (submitting || !(await validate(step))) return; formError = ''; tracker.step(step - 1, STEP_KEYS[step - 1]); step += 1; await focusStep(); }
  async function back() { formError = ''; errors = {}; step -= 1; await focusStep(); }
  async function submit() {
    if (submitting || submitted) return;
    formError = '';
    // Recheck the whole enquiry so going back cannot leave an invalid earlier answer.
    for (const index of [1, 2, 3]) {
      const problems = plannerProblems(values, index, today, hasRouteOptions);
      if (Object.keys(problems).length) { step = index; await tick(); await validate(index); return; }
    }
    submitting = true;
    idempotencyKey ||= newEnquiryKey();
    try {
      const result = await api.bookings.create(plannerPayload(values, {
        categoryName, categorySlug, packageName, packageSlug,
        route: chosenRoute, hasRouteOptions, pageLocale: $locale,
        recap, attribution: getAttribution(), pageUrl: window.location.href, idempotencyKey
      }));
      bookingCode = savedEnquiryReference(result.data);
      submitted = true;
      clearDraft(DRAFT_KEY);
      tracker.submitted({ transaction_id: bookingCode, metadata: { safari_style_slug: categorySlug, safari_package_slug: packageSlug } });
      pushDataLayerEvent('trip_request_submitted', { form_type: 'Category Enquiry Form', form_name: 'style_planner', reference_id: bookingCode, transaction_id: bookingCode, source_page: location.pathname, cta_clicked: lastCtaClicked(), ...campaignTags() });
      await tick(); confirmation?.focus();
    } catch (error) { tracker.failed(); formError = $t(submitErrorKey(error, 'ui.unable_to_send_your_message')); }
    finally { submitting = false; }
  }
  // Only once the saved draft has been read back; a failed send keeps it, a sent one clears it above.
  $: if (draftReady && !submitted) keepDraft(values, step, daysTouched);
</script>

<section bind:this={root} class="enquiry-band" class:bg-surface={layout === 'band'} class:hero={layout === 'hero'} aria-label={title}>
  <div class:container-shell={layout === 'band'}>
    <div class="planner-panel">
      <div class="planner-intro">
        <p class="eyebrow">{eyebrow || $t('ui.plan_this_safari')}</p>
        <h2>{title}</h2>
        <!-- In the card the invitation is for the first step; after that the room goes to the questions. -->
        {#if description && (layout === 'band' || (step === 1 && !submitted))}<p class="intro-copy">{description}</p>{/if}
      </div>
      <div class="planner-form">
        {#if submitted}
          <div bind:this={confirmation} class="confirmation" role="status" tabindex="-1">
            <h3>{$t('form.thank_you')}</h3>
            {#if bookingCode}<p>{$t('form.your_reference_is')} <strong>{bookingCode}</strong>.</p>{/if}
            <p>{$t('ui.a_local_specialist_will_shape')}</p>
          </div>
        {:else}
          <form novalidate on:input={() => tracker.started()} on:change={() => tracker.started()} on:submit|preventDefault={step === 3 ? submit : next}>
            <input type="text" hidden tabindex="-1" autocomplete="off" aria-hidden="true" name="gf-x1" bind:value={values.hp} />
            <div class="progress" aria-hidden="true">{#each STEP_KEYS as key, index (key)}<span class:reached={index < step}></span>{/each}</div>
            <p class="step-heading" bind:this={stepHeading} tabindex="-1" aria-live="polite"><span>{$t('ui.step_x_of_y').replace('{step}', String(step)).replace('{total}', String(STEP_KEYS.length))}</span> · {$t(STEP_KEYS[step - 1])}</p>
            <div bind:this={stepFields}>
              {#if step === 1}
                {#if hasRouteOptions}
                  <div class="field route-field" data-field="route">
                    <label for={`${uid}-route`}>{$t('ui.route_option')} <span class="required">*</span></label>
                    <span class="select-wrap"><select id={`${uid}-route`} class="control" bind:value={values.route} on:change={() => { routeTouched = true; clearError('route'); }} aria-invalid={Boolean(errors.route)} aria-describedby={errors.route ? errorId('route') : undefined}>
                      <option value="">{$t('ui.select')}</option>
                      {#each routeOptions as option}<option value={option.label}>{option.label}</option>{/each}
                      <option value="Not sure yet">{$t('ui.not_sure_yet')}</option>
                    </select><ChevronDown size={16} aria-hidden="true" /></span>
                    {#if errors.route}<p class="field-error" id={errorId('route')}>{$t(errors.route)}</p>{/if}
                  </div>
                {/if}
                <div class="fields two-columns trip-fields">
                  <div class="field" data-field="days">
                    <label for={`${uid}-days`}>{$t('style_form.safari_days')} <span class="required">*</span></label>
                    <CountStepper id={`${uid}-days`} label={$t('style_form.safari_days')} min={1} max={60} start={daysStart} bind:value={values.days} disabled={values.daysUnsure} invalid={Boolean(errors.days)} describedBy={errors.days ? errorId('days') : undefined} on:input={() => { daysTouched = true; clearError('days'); }} on:change={() => counted('days')} />
                    <label class="check"><input type="checkbox" bind:checked={values.daysUnsure} on:change={() => clearError('days')} /><span>{$t('ui.not_sure_yet')}</span></label>
                    {#if errors.days}<p class="field-error" id={errorId('days')}>{$t(errors.days)}</p>{/if}
                  </div>
                  <div class="field" data-field="travelDate">
                    <span class="field-label">{$t('form.preferred_start_date')} <span class="required">*</span></span>
                    <TripDatePicker bind:value={values.travelDate} min={today} label={$t('form.preferred_start_date')} disabled={values.dateUnsure} invalid={Boolean(errors.travelDate)} describedBy={errors.travelDate ? errorId('travelDate') : undefined} on:change={() => { clearError('travelDate'); tracker.started(); }} />
                    <label class="check"><input type="checkbox" bind:checked={values.dateUnsure} on:change={() => { clearError('travelDate'); tracker.started(); }} /><span>{$t('style_form.dates_undecided')}</span></label>
                    {#if errors.travelDate}<p class="field-error" id={errorId('travelDate')}>{$t(errors.travelDate)}</p>{/if}
                  </div>
                </div>
              {:else if step === 2}
                <div class="fields three-columns party-fields">
                  <div class="field" data-field="adults">
                    <label for={`${uid}-adults`}>{$t('form.adults')} <span class="required">*</span></label>
                    <CountStepper id={`${uid}-adults`} label={$t('form.adults')} min={1} max={40} start={2} bind:value={values.adults} invalid={Boolean(errors.adults)} describedBy={errors.adults ? errorId('adults') : undefined} on:input={() => clearError('adults')} on:change={() => counted('adults')} />
                    {#if errors.adults}<p class="field-error" id={errorId('adults')}>{$t(errors.adults)}</p>{/if}
                  </div>
                  <div class="field" data-field="children">
                    <label for={`${uid}-children`}>{$t('style_form.children')} <span class="optional">({$t('ui.optional').toLowerCase()})</span></label>
                    <CountStepper id={`${uid}-children`} label={$t('style_form.children')} min={0} max={20} start={0} bind:value={values.children} invalid={Boolean(errors.children)} describedBy={errors.children ? errorId('children') : undefined} on:input={() => clearError('children')} on:change={() => counted('children')} />
                    {#if errors.children}<p class="field-error" id={errorId('children')}>{$t(errors.children)}</p>{/if}
                  </div>
                  <div class="field" data-field="language">
                    <label for={`${uid}-language`}>{$t('form.preferred_language')} <span class="required">*</span></label>
                    <span class="select-wrap"><select id={`${uid}-language`} class="control" aria-invalid={Boolean(errors.language)} aria-describedby={errors.language ? errorId('language') : undefined} bind:value={values.language} on:change={() => clearError('language')}>
                      {#each LANGUAGES as language}<option value={language.code}>{language.label}</option>{/each}
                    </select><ChevronDown size={16} aria-hidden="true" /></span>
                    {#if errors.language}<p class="field-error" id={errorId('language')}>{$t(errors.language)}</p>{/if}
                  </div>
                </div>
                <div class="fields two-columns preferences">
                  <fieldset><legend>{$t('style_form.accommodation')} <span class="optional">({$t('ui.optional').toLowerCase()})</span></legend>
                    <div class="choices">{#each COMFORT as option}<label class:chosen={values.comfort === option.value}><input type="radio" name={`${uid}-comfort`} value={option.value} bind:group={values.comfort} /><span>{$t(option.key)}</span></label>{/each}</div>
                  </fieldset>
                  <fieldset><legend>{$t('style_form.beach_stay')} <span class="optional">({$t('ui.optional').toLowerCase()})</span></legend>
                    <div class="choices">{#each BEACH as option}<label class:chosen={values.beach === option.value}><input type="radio" name={`${uid}-beach`} value={option.value} bind:group={values.beach} /><span>{$t(option.key)}</span></label>{/each}</div>
                  </fieldset>
                </div>
              {:else}
                <div class="fields three-columns contact-fields">
                  <div class="field" data-field="fullName">
                    <label for={`${uid}-name`}>{$t('form.full_name')} <span class="required">*</span></label>
                    <input id={`${uid}-name`} class="control" type="text" autocomplete="name" required bind:value={values.fullName} placeholder={$t('style_form.name_placeholder')} on:input={() => clearError('fullName')} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? errorId('fullName') : undefined} />
                    {#if errors.fullName}<p class="field-error" id={errorId('fullName')}>{$t(errors.fullName)}</p>{/if}
                  </div>
                  <div class="field" data-field="email">
                    <label for={`${uid}-email`}>{$t('form.email')} <span class="required">*</span></label>
                    <input id={`${uid}-email`} class="control" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" required bind:value={values.email} placeholder="you@example.com" on:input={() => clearError('email')} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? errorId('email') : undefined} />
                    {#if errors.email}<p class="field-error" id={errorId('email')}>{$t(errors.email)}</p>{/if}
                  </div>
                  <div class="field" data-field="phone">
                    <span class="field-label">WhatsApp <span class="optional">({$t('ui.optional').toLowerCase()})</span></span>
                    <TripPhoneInput bind:dialCode={values.dialCode} bind:phone={values.phone} invalid={Boolean(errors.phone)} describedBy={errors.phone ? errorId('phone') : undefined} on:input={() => clearError('phone')} />
                    {#if errors.phone}<p class="field-error" id={errorId('phone')}>{$t(errors.phone)}</p>{/if}
                  </div>
                </div>
                <div class="field requests"><label for={`${uid}-requests`}>{$t('form.special_requests')} <span class="optional">({$t('ui.optional').toLowerCase()})</span></label>
                  <textarea id={`${uid}-requests`} class="control" rows="2" bind:value={values.specialRequests} placeholder={$t('style_form.requests_placeholder')}></textarea>
                </div>
                {#if values.phone.trim()}
                  <label class="check consent"><input type="checkbox" bind:checked={values.whatsappOptIn} /><span>{$t('ui.contact_me_on_whatsapp_about')} {$t('ui.optional_we_reply_by_email')}</span></label>
                {/if}
              {/if}
            </div>
            {#if formError}<p class="form-error" role="alert">{formError}</p>{/if}
            <div class="actions">
              {#if step > 1}<button class="back" type="button" disabled={submitting} on:click={back}><ArrowLeft size={18} />{$t('form.back')}</button>{/if}
              <button class="next" type="submit" disabled={submitting} aria-busy={submitting}>
                {#if submitting}<Loader2 size={18} class="animate-spin" />{$t('ui.sending')}{:else}{step === 3 ? $t('style_form.send_enquiry') : $t('form.next_step')}<ArrowRight size={18} />{/if}
              </button>
            </div>
          </form>
        {/if}
        {#if waDigits}<a class="whatsapp" href={whatsappHref} target="_blank" rel="noopener noreferrer" data-track-location="style_planner"><WhatsAppIcon size={22} brand />{$t('style_form.chat_whatsapp')}</a>{/if}
      </div>
    </div>
  </div>
</section>

<style>
  .step-heading { scroll-margin-top: 7rem; }
  .enquiry-band { padding-block: 40px; }
  /* The panel's colours, named once: a layout that sits on a different surface restates these and nothing else. */
  .planner-panel {
    --pf-surface: rgb(var(--c-deep-green)); --pf-text: #fff; --pf-accent: rgb(var(--c-goldfinch-gold));
    --pf-soft: #ffffffd9; --pf-label: #fffffff0; --pf-check: #ffffffeb; --pf-track: rgb(255 255 255 / .2);
    --pf-border: rgb(var(--c-goldfinch-gold) / .45); --pf-focus: rgb(var(--c-goldfinch-gold));
    --pf-invalid: #f2b8a6; --pf-error: #ffd0c0; --pf-link-hover: rgb(var(--c-gold-hover));
  }
  .planner-panel { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); align-items: center; gap: 44px; padding: 32px 36px; border-radius: 16px; background: var(--pf-surface); color: var(--pf-text); }
  .planner-intro, .planner-form { min-width: 0; }
  .eyebrow { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--pf-accent); }
  h2 { margin-top: 12px; font-family: "Source Serif 4", Georgia, serif; font-size: clamp(28px, 2.5vw, 40px); line-height: 1.12; font-weight: 400; }
  .intro-copy { margin-top: 16px; font-size: 16px; line-height: 1.55; color: var(--pf-soft); }
  .progress { display: flex; gap: 6px; margin-bottom: 12px; }
  .progress span { flex: 1 1 0; max-width: 72px; height: 4px; border-radius: 999px; background: var(--pf-track); transition: background-color 240ms ease; }
  .progress .reached { background: rgb(var(--c-goldfinch-gold)); }
  .step-heading { margin-bottom: 18px; font-size: 13px; letter-spacing: .1em; text-transform: uppercase; outline: none; }
  .step-heading span { font-weight: 600; }
  .fields { display: grid; gap: 16px; align-items: start; }
  .two-columns { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .three-columns { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .field, fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
  .field > label:not(.check), .field-label, legend { display: block; margin-bottom: 7px; font-size: 10.5px; letter-spacing: .07em; line-height: 1.4; text-transform: uppercase; color: var(--pf-label); }
  .optional { text-transform: none; letter-spacing: 0; }
  .required { color: var(--pf-accent); }
  .control, .planner-form :global(.gf-input) { width: 100%; min-width: 0; border: 1px solid var(--pf-border); border-radius: 5px; background-color: #fff; color: rgb(var(--c-deep-green)); font-size: 14px; }
  .control { height: 46px; padding: 10px 14px; outline: none; }
  .planner-form :global(.date-trigger), .planner-form :global(.phone-row .gf-input) { height: 46px; }
  .planner-form :global(.date-trigger) { background: #fcfaf4; padding-inline: 14px; }
  .control::placeholder, .planner-form :global(input::placeholder) { color: rgb(57 61 50 / 0.42); opacity: 1; }
  .control:focus, .planner-form :global(.gf-input:focus-visible) { outline: 2px solid var(--pf-focus); outline-offset: 2px; }
  .control:disabled, .planner-form :global(.date-trigger:disabled) { background: #e6e6df; opacity: .65; cursor: default; }
  .planner-form :global(.date-trigger[data-invalid='true']), .control[aria-invalid='true'], .planner-form :global(.gf-input[aria-invalid='true']) { border-color: var(--pf-invalid); outline: 2px solid var(--pf-invalid); }
  .select-wrap { position: relative; display: block; }
  .select-wrap select { appearance: none; padding-right: 32px; background-image: none; }
  .select-wrap :global(svg) { position: absolute; right: 12px; top: 15px; pointer-events: none; color: rgb(var(--c-deep-green)); }
  .check { display: flex; align-items: flex-start; gap: 10px; margin-top: 12px; cursor: pointer; font-size: 12px; line-height: 1.5; color: var(--pf-check); }
  .check input { flex-shrink: 0; width: 18px; height: 18px; margin-top: 0; accent-color: rgb(var(--c-goldfinch-gold)); }
  .preferences, .requests { margin-top: 18px; }
  /* Choices wrap instead of overflowing: long words (German, a larger default
     font) break inside their box, and a choice that no longer fits moves to a
     full-width row. The 1px gap over the grey background draws the dividers
     wherever the choices land. */
  .choices { display: flex; flex-wrap: wrap; gap: 1px; min-height: 46px; border: 1px solid var(--pf-border); border-radius: 5px; background: #dedbd2; color: rgb(var(--c-deep-green)); overflow: hidden; }
  .choices label { display: flex; flex: 1 1 7rem; align-items: center; justify-content: center; min-width: 0; gap: 7px; padding: 10px 8px; background: #fff; font-size: 11px; line-height: 1.3; cursor: pointer; }
  .choices label span { min-width: 0; overflow-wrap: anywhere; hyphens: auto; }
  .choices input { flex-shrink: 0; width: 16px; height: 16px; accent-color: rgb(var(--c-goldfinch-gold)); }
  .choices .chosen { background: #fff0ce; }
  .choices label:focus-within { box-shadow: inset 0 0 0 2px rgb(var(--c-goldfinch-gold)); }
  .requests textarea { height: 62px; min-height: 46px; resize: vertical; }
  .route-field { margin-bottom: 16px; }
  .actions { display: flex; justify-content: flex-end; align-items: center; gap: 24px; margin-top: 16px; }
  .actions button { display: inline-flex; justify-content: center; align-items: center; gap: 12px; min-height: 44px; font-size: 12px; }
  .back { padding: 8px 0; color: var(--pf-text); }
  .next { padding: 12px 23px; background: rgb(var(--c-goldfinch-gold)); border: 1px solid rgb(var(--c-goldfinch-gold)); border-radius: 6px; color: rgb(var(--c-deep-green)); font-weight: 600; letter-spacing: .07em; text-transform: uppercase; }
  .next:hover { background: rgb(var(--c-gold-hover)); }
  button:disabled { opacity: .6; cursor: wait; }
  button:focus-visible, a:focus-visible { outline: 2px solid var(--pf-focus); outline-offset: 4px; }
  .whatsapp { display: flex; justify-content: flex-end; align-items: center; gap: 9px; margin-top: 13px; font-size: 12px; line-height: 1.4; color: var(--pf-label); }
  .whatsapp:hover { color: var(--pf-link-hover); }
  .field-error { margin-top: 7px; font-size: 12px; line-height: 1.45; color: var(--pf-error); }
  .form-error { margin-top: 16px; padding: 12px; border: 1px solid var(--pf-invalid); border-radius: 6px; font-size: 14px; }
  .confirmation { padding: 24px; border: 1px solid var(--pf-border); border-radius: 10px; outline: none; }
  .confirmation h3 { font-family: Georgia, serif; font-size: 28px; }
  .confirmation p { margin-top: 12px; line-height: 1.6; }
  .confirmation strong { color: var(--pf-accent); }
  /* The same form as a card beside a headline: one narrow column, the heading
     on top, and the paired answers (adults and children, name and email) kept
     side by side so the card stays short enough to be seen whole. */
  .hero.enquiry-band { padding-block: 0; }
  /* White glass over the photograph. The colours are stated outright rather
     than taken from the theme's text tokens: those turn light in dark mode,
     and this card stays white in both. */
  .hero .planner-panel {
    --pf-surface: linear-gradient(165deg, rgb(255 255 255 / .94), rgb(255 255 255 / .84)); --pf-text: rgb(var(--c-deep-green)); --pf-accent: #aa3d1d;
    --pf-soft: rgb(var(--c-deep-green) / .82); --pf-label: rgb(var(--c-deep-green) / .9); --pf-check: rgb(var(--c-deep-green) / .92);
    --pf-track: rgb(var(--c-deep-green) / .16); --pf-border: rgb(var(--c-deep-green) / .24); --pf-focus: rgb(var(--c-deep-green));
    --pf-invalid: #c9543c; --pf-error: #a3301b; --pf-link-hover: #aa3d1d;
    grid-template-columns: minmax(0, 1fr); gap: 18px; padding: 26px 28px 22px;
    border: 1px solid rgb(255 255 255 / .65); box-shadow: 0 28px 70px rgb(0 0 0 / .32), inset 0 1px 0 rgb(255 255 255 / .85);
    -webkit-backdrop-filter: blur(22px) saturate(1.6); backdrop-filter: blur(22px) saturate(1.6);
  }
  /* Without the blur the photograph would show through the words, so the card turns nearly solid. */
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .hero .planner-panel { --pf-surface: rgb(255 255 255 / .96); }
  }
  .hero h2 { max-width: none; margin-top: 8px; font-size: 26px; }
  .hero .intro-copy { max-width: none; margin-top: 8px; font-size: 14px; line-height: 1.5; }
  .hero .progress span { max-width: none; }
  .hero .step-heading { margin-bottom: 16px; font-size: 12px; }
  .hero .trip-fields, .hero .preferences { grid-template-columns: minmax(0, 1fr); }
  .hero .party-fields, .hero .contact-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hero .party-fields .field:last-child, .hero .contact-fields .field:last-child { grid-column: 1 / -1; }
  .hero .preferences, .hero .requests { margin-top: 16px; }
  .hero .next { flex: 1; }
  .hero .whatsapp { justify-content: center; text-align: center; }
  @media (max-width: 1100px) {
    .planner-panel { grid-template-columns: minmax(0, 1fr) minmax(0, 1.8fr); gap: 28px; padding: 28px; }
    .contact-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .contact-fields .field:last-child { grid-column: 1 / -1; }
  }
  @media (max-width: 800px) {
    .planner-panel { grid-template-columns: minmax(0, 1fr); gap: 28px; }
    h2 { max-width: 560px; font-size: 32px; }
    .intro-copy { max-width: 540px; font-size: 15px; margin-top: 12px; }
  }
  @media (max-width: 540px) {
    .enquiry-band { padding-block: 28px; }
    .enquiry-band .container-shell { width: calc(100% - 32px); }
    .planner-panel { padding: 24px 20px; border-radius: 14px; }
    h2 { font-size: 29px; }
    .two-columns, .three-columns { grid-template-columns: minmax(0, 1fr); }
    .fields { gap: 18px; }
    .control, .planner-form :global(.phone-row .gf-input), .planner-form :global(.date-trigger) { font-size: 16px; height: 48px; }
    .planner-form { --stepper-height: 48px; --stepper-font-size: 16px; }
    .hero .planner-panel { gap: 16px; padding: 22px 18px 18px; }
    .hero h2 { font-size: 24px; }
    /* On a phone the page's own introduction sits right above the card; the room goes to the first questions. */
    .hero .intro-copy { display: none; }
    .hero .contact-fields { grid-template-columns: minmax(0, 1fr); }
    .choices label { font-size: 12px; padding-block: 13px; }
    .step-heading { font-size: 12px; letter-spacing: .065em; }
    .actions { gap: 20px; }
    .next { flex: 1; }
    .whatsapp { justify-content: center; text-align: center; }
    .consent { font-size: 11px; }
  }
</style>
