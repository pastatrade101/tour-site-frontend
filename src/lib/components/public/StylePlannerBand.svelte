<script lang="ts">
  /**
   * The inline planner on a safari-style page.
   *
   * Three short steps rather than one long form: the band sits between
   * sections, so asking nine questions at once would either dominate the page
   * or shrink the fields past usability. Each step is one row of three.
   *
   * It writes the same booking_request every other form does — same endpoint,
   * same honeypot, same idempotency key — so a lead from here reaches the
   * inbox looking like every other lead, tagged with the style it came from.
   */
  import { ChevronDown, ChevronLeft, ChevronRight, Loader2 } from '@lucide/svelte';
  import { getAttribution, trackEvent } from '$lib/analytics';
  import { api } from '$lib/api/client';
  import { ACCOMMODATION } from '$lib/enquiry/fields';

  export let eyebrow = 'Plan this experience';
  export let title: string;
  export let description = '';
  /** Real gateways from the CMS. An empty list hides the field rather than inventing one. */
  export let startPoints: Array<Record<string, unknown>> = [];
  /** Real categories, used for "main interest". */
  export let interests: Array<{ name: string; slug: string }> = [];
  export let categoryName = '';
  export let categorySlug = '';

  // Two steps everywhere: what the trip is, then who is going. Three short
  // rows made this band feel longer to complete than the form it feeds.
  const TOTAL = 2;
  let step = 1;
  let submitting = false;
  let submitted = false;
  let bookingCode = '';
  let error = '';

  let travellers = '2';
  let travelDate = '';
  let days = '';
  let startPoint = '';
  let comfort = '';
  let interest = '';
  let fullName = '';
  let email = '';
  let phone = '';
  let whatsappOptIn = false;
  let hp = '';

  const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  $: canSubmit = fullName.trim().length > 1 && isEmail(email.trim()) && phone.trim().length > 5;

  const next = () => {
    error = '';
    if (step === 1) {
      if (!travellers) return (error = 'How many travellers?');
      if (!travelDate.trim()) return (error = 'Add a travel date or month.');
      if (!days.trim()) return (error = 'How many days?');
      if (hasStartPoints && !startPoint) return (error = 'Where are you starting from?');
      if (!comfort) return (error = 'Choose a comfort level.');
      if (!interest) return (error = 'Choose a main interest.');
    }
    if (step < TOTAL) step += 1;
  };
  const back = () => {
    error = '';
    if (step > 1) step -= 1;
  };

  const submit = async () => {
    if (submitting) return;
    error = '';
    if (!canSubmit) {
      error = 'Please add your name, a valid email and a number we can reach you on.';
      return;
    }

    submitting = true;
    try {
      const res = await api.bookings.create({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        number_of_adults: Number(travellers) || 1,
        number_of_children: 0,
        // Free text: travellers write "August" as readily as a date, and
        // forcing a picker here loses the ones who do not know yet.
        travel_date: /^\d{4}-\d{2}-\d{2}$/.test(travelDate) ? travelDate : null,
        source: 'category_enquiry',
        whatsapp_opt_in: whatsappOptIn,
        lead_context: {
          v: 1,
          form_type: 'style_planner',
          safari_style: categoryName || undefined,
          safari_style_slug: categorySlug || undefined,
          travel_when: travelDate.trim() || undefined,
          trip_days: days.trim() || undefined,
          starting_point: startPoint || undefined,
          comfort_level: comfort || undefined,
          main_interest: interest || undefined,
          attribution: getAttribution()
        },
        hp_company: hp
      });
      bookingCode = String((res.data as Record<string, unknown>)?.booking_code ?? '');
      submitted = true;
      trackEvent('request_trip_submitted', { metadata: { form: 'style_planner', safari_style_slug: categorySlug } });
    } catch (err) {
      error = err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.';
    } finally {
      submitting = false;
    }
  };

  const fieldClass =
    'h-11 w-full min-w-0 rounded-[10px] border border-white/20 bg-white px-3.5 text-[15px] text-heading outline-none transition placeholder:text-ink/45 focus:border-goldfinch-gold focus:ring-2 focus:ring-goldfinch-gold/25';
  const selectClass = `${fieldClass} appearance-none pr-10`;
  const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.10em] text-white/70';
  // No fallback list. The loader already filters to points whose role is start
  // or both, so an empty array means the CMS genuinely has none — and offering
  // a gateway this operator may not run from would put a preference in the
  // inbox that nobody can honour.
  $: hasStartPoints = startPoints.length > 0;
</script>

<section class="bg-surface py-10 md:py-14">
  <div class="container-shell">
    <div class="relative overflow-hidden rounded-[12px] bg-deep-green p-6 text-white md:p-8">
      <div class="grid gap-6 lg:grid-cols-12 lg:items-center lg:gap-10">
    <div class="min-w-0 lg:col-span-4">
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">{eyebrow}</p>
      <h2 class="mt-2 font-serif text-2xl font-semibold leading-[1.15] md:text-[30px]">{title}</h2>
      {#if description}
        <p class="mt-2 text-[14px] leading-relaxed text-white/70">{description}</p>
      {/if}

      {#if !submitted}
        <!-- Progress reads as bars rather than numbered circles: three steps do
             not need the ceremony, and it keeps the left column short. -->
        <div class="mt-4 flex items-center gap-2">
          <span class="flex items-center gap-2" aria-hidden="true">
            {#each Array(TOTAL) as _, index}
              <span
                class="h-1.5 rounded-full transition-all duration-300 {index + 1 === step
                  ? 'w-8 bg-goldfinch-gold'
                  : index + 1 < step
                    ? 'w-4 bg-clay'
                    : 'w-4 bg-white/25'}"
              ></span>
            {/each}
          </span>
          <span class="ml-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">Step {step} of {TOTAL}</span>
        </div>
      {/if}
    </div>

    <div class="min-w-0 lg:col-span-8">
      {#if submitted}
        <div class="rounded-2xl border border-goldfinch-gold/30 bg-white/[0.06] p-6">
          <p class="font-serif text-2xl font-semibold">Thank you — we have your request.</p>
          {#if bookingCode}
            <p class="mt-2 text-sm text-white/75">Your reference is <span class="font-bold text-goldfinch-gold">{bookingCode}</span>.</p>
          {/if}
          <p class="mt-2 text-sm leading-6 text-white/70">A local specialist will shape this around your dates and be in touch.</p>
        </div>
      {:else}
        <form on:submit|preventDefault={step === TOTAL ? submit : next}>
          <!-- Honeypot: named as nothing, so autofill has nothing to match. -->
          <div class="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
            <input type="text" name="gf-x1" tabindex="-1" autocomplete="off" bind:value={hp} />
          </div>

          {#if step === 1}
            <div class="grid gap-4 sm:grid-cols-3">
              <label class="grid gap-1.5">
                <span class={labelClass}>Travellers</span>
                <input class={fieldClass} type="number" min="1" inputmode="numeric" bind:value={travellers} />
              </label>
              <label class="grid gap-1.5">
                <span class={labelClass}>Travel date / month</span>
                <input class={fieldClass} type="text" bind:value={travelDate} placeholder="August, or 12/08/2026" />
              </label>
              <label class="grid gap-1.5">
                <span class={labelClass}>Number of days</span>
                <input class={fieldClass} type="text" inputmode="numeric" bind:value={days} placeholder="7" />
              </label>
            </div>
            <div class="mt-4 grid gap-4 {hasStartPoints ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}">
              {#if hasStartPoints}
                <label>
                  <span class={labelClass}>Starting point</span>
                  <span class="relative block">
                    <select class={selectClass} bind:value={startPoint}>
                      <option value="">Select</option>
                      {#each startPoints as point}
                        <option value={String(point.name)}>{point.name}</option>
                      {/each}
                      <option value="Not sure yet">Not sure yet</option>
                    </select>
                    <ChevronDown class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/65" size={18} />
                  </span>
                </label>
              {/if}
              <label>
                <span class={labelClass}>Comfort level</span>
                <span class="relative block">
                  <select class={selectClass} bind:value={comfort}>
                    <option value="">Select</option>
                    {#each ACCOMMODATION as option}
                      <option value={option.value}>{option.label}</option>
                    {/each}
                    <option value="Not sure yet">Not sure yet</option>
                  </select>
                  <ChevronDown class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/65" size={18} />
                </span>
              </label>
              <label>
                <span class={labelClass}>Main interest</span>
                <span class="relative block">
                  <select class={selectClass} bind:value={interest}>
                    <option value="">Select</option>
                    {#each interests as option}
                      <option value={option.name}>{option.name}</option>
                    {/each}
                    <option value="Not sure yet">Not sure yet</option>
                  </select>
                  <ChevronDown class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/65" size={18} />
                </span>
              </label>
            </div>
          {:else}
            <div class="grid gap-4 sm:grid-cols-3">
              <label class="grid gap-1.5">
                <span class={labelClass}>Name</span>
                <input class={fieldClass} type="text" autocomplete="name" bind:value={fullName} />
              </label>
              <label class="grid gap-1.5">
                <span class={labelClass}>Email</span>
                <input class={fieldClass} type="email" autocomplete="email" bind:value={email} />
              </label>
              <label class="grid gap-1.5">
                <span class={labelClass}>WhatsApp number</span>
                <input class={fieldClass} type="tel" autocomplete="tel" bind:value={phone} placeholder="+255 …" />
              </label>
            </div>

            <!-- A WhatsApp number is not permission to use it, so it is asked
                 for separately here as it is on every other form. -->
            <label class="mt-3 flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-[#25D366]" bind:checked={whatsappOptIn} />
              <span class="text-xs leading-5 text-white/70">
                Contact me on WhatsApp about my trip, quotation and booking updates.
                <span class="text-white/45">Optional — we reply by email either way.</span>
              </span>
            </label>
          {/if}

          {#if error}
            <p class="mt-3 rounded-lg bg-clay/25 px-3 py-2 text-xs text-white" role="alert">{error}</p>
          {/if}

          <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {#if step > 1}
              <button
                class="inline-flex h-11 items-center justify-center gap-1.5 rounded-[10px] border border-white/25 px-5 text-[13px] font-semibold text-white transition hover:bg-white/10"
                type="button"
                on:click={back}
              ><ChevronLeft size={16} /> Back</button>
            {/if}
            <button
              class="inline-flex h-11 items-center justify-center gap-1.5 rounded-[10px] bg-goldfinch-gold px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-heading transition hover:brightness-105 disabled:opacity-60"
              type="submit"
              disabled={submitting}
            >
              {#if submitting}
                <Loader2 size={16} class="animate-spin" /> Sending…
              {:else}
                {step === TOTAL ? 'Start my trip plan' : 'Continue'} <ChevronRight size={16} />
              {/if}
            </button>
          </div>
        </form>
      {/if}
    </div>
      </div>
    </div>
  </div>
</section>
