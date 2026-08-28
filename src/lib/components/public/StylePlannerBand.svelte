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
  import { ArrowRight, ChevronLeft, Loader2 } from '@lucide/svelte';
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

  const TOTAL = 3;
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

  // Only the last step can fail validation in a way worth blocking on — the
  // first two are preferences, and an empty preference is a real answer.
  $: canSubmit = fullName.trim().length > 1 && isEmail(email.trim()) && phone.trim().length > 5;

  const next = () => {
    error = '';
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
    'h-12 w-full min-w-0 rounded-xl border border-transparent bg-white px-4 text-sm text-heading outline-none transition placeholder:text-ink/35 focus:border-goldfinch-gold focus:ring-2 focus:ring-goldfinch-gold/30';
  const labelClass = 'text-[11px] font-bold uppercase tracking-[0.14em] text-white/70';
</script>

<section class="relative overflow-hidden bg-deep-green py-12 text-white md:py-16">
  <div class="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/10" aria-hidden="true"></div>

  <div class="container-shell relative grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] lg:items-center lg:gap-12">
    <div class="min-w-0">
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">{eyebrow}</p>
      <h2 class="mt-3 font-serif text-3xl font-semibold leading-tight md:text-[32px]">{title}</h2>
      {#if description}
        <p class="mt-3 text-[15px] leading-7 text-white/70">{description}</p>
      {/if}

      {#if !submitted}
        <!-- Progress reads as bars rather than numbered circles: three steps do
             not need the ceremony, and it keeps the left column short. -->
        <div class="mt-6 flex items-center gap-3">
          <span class="flex items-center gap-1.5" aria-hidden="true">
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
          <span class="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Step {step} of {TOTAL}</span>
        </div>
      {/if}
    </div>

    <div class="min-w-0">
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
          {:else if step === 2}
            <div class="grid gap-4 sm:grid-cols-3">
              {#if startPoints.length}
                <label class="grid gap-1.5">
                  <span class={labelClass}>Starting point</span>
                  <select class={fieldClass} bind:value={startPoint}>
                    <option value="">Not sure yet</option>
                    {#each startPoints as point}
                      <option value={String(point.name)}>{point.name}</option>
                    {/each}
                  </select>
                </label>
              {/if}
              <label class="grid gap-1.5">
                <span class={labelClass}>Comfort level</span>
                <select class={fieldClass} bind:value={comfort}>
                  <option value="">Not sure yet</option>
                  {#each ACCOMMODATION as option}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </label>
              {#if interests.length}
                <label class="grid gap-1.5">
                  <span class={labelClass}>Main interest</span>
                  <select class={fieldClass} bind:value={interest}>
                    <option value="">Not sure yet</option>
                    {#each interests as option}
                      <option value={option.name}>{option.name}</option>
                    {/each}
                  </select>
                </label>
              {/if}
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

          <div class="mt-5 flex flex-wrap items-center justify-end gap-3">
            {#if step > 1}
              <button
                class="inline-flex h-12 items-center gap-1.5 rounded-full border border-white/25 px-5 text-sm font-bold text-white transition hover:bg-white/10"
                type="button"
                on:click={back}
              ><ChevronLeft size={16} /> Back</button>
            {/if}
            <button
              class="inline-flex h-12 items-center gap-2 rounded-full bg-goldfinch-gold px-7 text-sm font-bold uppercase tracking-[0.06em] text-heading transition hover:brightness-105 disabled:opacity-60"
              type="submit"
              disabled={submitting}
            >
              {#if submitting}
                <Loader2 size={16} class="animate-spin" /> Sending…
              {:else}
                {step === TOTAL ? 'Start my trip plan' : 'Continue'} <ArrowRight size={16} />
              {/if}
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
</section>
