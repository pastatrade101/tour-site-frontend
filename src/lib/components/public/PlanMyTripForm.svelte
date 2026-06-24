<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { AlertCircle, CheckCircle2, Copy, MapPin } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { defaultSpecialist } from '$lib/data/specialists';
  import { publicSettings, settingText } from '$lib/settings';
  import { shortlist } from '$lib/shortlist';
  import Button from './Button.svelte';
  import CountrySelect from './CountrySelect.svelte';
  import FormInput from './FormInput.svelte';
  import SelectInput from './SelectInput.svelte';
  import SpecialistCard from './SpecialistCard.svelte';
  import TextArea from './TextArea.svelte';

  $: bookCallUrl = settingText($publicSettings, 'booking_call_url');

  type Option = { label: string; value: string };

  const destinationOptions = ['Not sure yet', 'Tanzania', 'Kenya', 'Uganda', 'Rwanda', 'Zanzibar', 'Multi-country'].map((v) => ({ label: v, value: v }));
  const experienceOptions = ['Safari', 'Kilimanjaro', 'Gorilla Trekking', 'Beach Holiday', 'Family Trip', 'Honeymoon', 'Cultural Tour'].map((v) => ({ label: v, value: v }));
  const monthOptions = ['Flexible', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((v) => ({ label: v, value: v }));
  const budgetOptions = ['Not sure yet', 'Under $1,500', '$1,500 – $3,000', '$3,000 – $5,000', '$5,000+'].map((v) => ({ label: v, value: v }));
  const travellerOptions = ['Couple', 'Family', 'Solo', 'Group of friends', 'Honeymooners', 'Corporate'].map((v) => ({ label: v, value: v }));

  let full_name = '';
  let email = '';
  let phone = '';
  let country = '';
  let destination_interest = 'Not sure yet';
  let experience_interest = 'Safari';
  let travel_month = 'Flexible';
  let budget_per_person = 'Not sure yet';
  let traveller_type = 'Couple';
  let number_of_adults = '2';
  let number_of_children = '0';
  let message = '';

  let submitting = false;
  let errorMessage = '';
  let bookingCode = '';
  let copied = false;
  let tripContext = ''; // tour name carried in from a tour/departure/persona link

  $: sent = Boolean(bookingCode);

  // Pre-fill the enquiry from context (spec §4.9): a visitor arriving from a tour,
  // departure, persona or experience link carries that intent into the form.
  const matchOption = (options: Option[], value: unknown) =>
    options.find((o) => o.value.toLowerCase() === String(value).toLowerCase())?.value;

  onMount(async () => {
    const p = $page.url.searchParams;
    const persona = p.get('persona');
    const experience = p.get('experience');
    const destination = p.get('destination');
    const monthParam = p.get('month') || p.get('date');
    const tourSlug = p.get('tour');

    const personaMap: Record<string, string> = {
      family: 'Family',
      couple: 'Couple',
      solo: 'Solo',
      group: 'Group of friends',
      honeymoon: 'Honeymooners'
    };
    const expMap: Record<string, string> = {
      safari: 'Safari',
      kilimanjaro: 'Kilimanjaro',
      gorilla: 'Gorilla Trekking',
      'gorilla-trekking': 'Gorilla Trekking',
      beach: 'Beach Holiday',
      'beach-holiday': 'Beach Holiday',
      cultural: 'Cultural Tour',
      honeymoon: 'Honeymoon'
    };

    if (persona && personaMap[persona.toLowerCase()]) traveller_type = personaMap[persona.toLowerCase()];
    if (experience) {
      const e = expMap[experience.toLowerCase()] || matchOption(experienceOptions, experience);
      if (e) experience_interest = e;
    }
    if (destination) {
      const d = matchOption(destinationOptions, destination);
      if (d) destination_interest = d;
    }
    if (monthParam) {
      let m = monthParam;
      if (/^\d{4}-\d{2}/.test(monthParam)) {
        const iso = monthParam.length === 7 ? `${monthParam}-01` : monthParam;
        m = new Date(iso).toLocaleString('en', { month: 'long' });
      }
      const mm = matchOption(monthOptions, m);
      if (mm) travel_month = mm;
    }
    if (tourSlug) {
      try {
        const res = await api.tours.get(tourSlug);
        const t = res.data as Record<string, unknown>;
        tripContext = String(t.title ?? '');
        const dName = (t.destinations as Record<string, unknown> | undefined)?.name;
        const cName = (t.tour_categories as Record<string, unknown> | undefined)?.name;
        if (dName) {
          const d = matchOption(destinationOptions, dName);
          if (d) destination_interest = d;
        }
        if (cName) {
          const e = matchOption(experienceOptions, cName);
          if (e) experience_interest = e;
        }
      } catch {
        tripContext = tourSlug.replace(/-/g, ' ');
      }
      if (tripContext && !message.trim()) message = `I'm interested in: ${tripContext}.`;
    } else {
      // No specific tour — carry in the visitor's saved shortlist (spec §7).
      const saved = get(shortlist);
      if (saved.length) {
        tripContext = saved.length === 1 ? saved[0].title : `${saved.length} saved trips`;
        if (!message.trim()) message = `I'm interested in: ${saved.map((sv) => sv.title).join(', ')}.`;
      }
    }
  });

  const submit = async () => {
    errorMessage = '';
    if (!full_name.trim() || !email.trim()) {
      errorMessage = 'Please add your name and a valid email so an advisor can reach you.';
      return;
    }

    submitting = true;
    try {
      const res = await api.bookings.create({
        full_name: full_name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        country: country.trim() || null,
        number_of_adults: Number(number_of_adults) || 1,
        number_of_children: Number(number_of_children) || 0,
        message: message.trim() || null,
        source: 'plan_my_trip',
        lead_context: {
          destination_interest,
          experience_interest,
          travel_month,
          budget_per_person,
          traveller_type,
          ...(tripContext ? { tour_interest: tripContext } : {})
        }
      });
      bookingCode = String((res.data as Record<string, unknown>)?.booking_code ?? '');
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to send your request. Please try again.';
    } finally {
      submitting = false;
    }
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
  <div class="grid gap-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-soft md:p-8">
    <div class="flex items-center gap-3">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 size={26} /></span>
      <div>
        <h3 class="text-xl font-bold text-deep-green">Thank you. Your trip request has been received.</h3>
        <p class="mt-1 text-sm text-ink/70">A Goldfinch travel specialist will review your details and contact you shortly.</p>
      </div>
    </div>
    <div class="rounded-xl border border-emerald-200 bg-white p-4">
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">Your request reference</p>
      <div class="mt-1 flex items-center gap-3">
        <p class="text-2xl font-extrabold tracking-wide text-deep-green">{bookingCode}</p>
        <button class="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-2.5 py-1 text-xs font-semibold text-ink/70 transition hover:bg-sand" type="button" on:click={copyCode}>
          <Copy size={13} />{copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>

    <!-- what happens next (SRS v2.0 §4.11) -->
    <div class="rounded-xl border border-emerald-200 bg-white p-4">
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">What happens next</p>
      <ol class="mt-3 grid gap-3">
        {#each [{ t: 'We review your request', s: 'A specialist reads your details — usually within one business day.' }, { t: 'We craft a tailored itinerary', s: 'Shaped around your dates, budget and travel style.' }, { t: 'You refine it with us', s: 'Adjust pace, lodges and activities until it feels right.' }, { t: 'Confirm when you are ready', s: 'No pressure — you decide if and when to book.' }] as step, i}
          <li class="flex gap-3">
            <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-forest text-[11px] font-bold text-white">{i + 1}</span>
            <span>
              <span class="block text-sm font-semibold text-ink">{step.t}</span>
              <span class="block text-xs leading-5 text-ink/55">{step.s}</span>
            </span>
          </li>
        {/each}
      </ol>
    </div>

    <SpecialistCard specialist={defaultSpecialist} heading="Who will be in touch" />

    <div class="flex flex-col gap-3 sm:flex-row">
      {#if bookCallUrl}
        <a class="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-deep-green px-5 font-bold text-white transition hover:bg-forest" href={bookCallUrl} target="_blank" rel="noopener noreferrer">
          Book a call now
        </a>
      {/if}
      <Button type="button" variant="secondary" on:click={() => (bookingCode = '')}>Start another request</Button>
    </div>
    <p class="text-center text-xs text-ink/45">A confirmation email is on its way to the address you provided.</p>
  </div>
{:else}
  <form class="grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6" on:submit|preventDefault={submit}>
    <div>
      <p class="text-sm font-semibold uppercase tracking-[0.14em] text-goldfinch-gold">Plan My Trip</p>
      <h3 class="mt-1 text-2xl font-bold tracking-normal text-deep-green">Tell us about your dream trip</h3>
      {#if tripContext}
        <p class="mt-1 text-sm leading-6 text-ink/65">We've carried your trip across — adjust anything below and a local expert will tailor it to you.</p>
      {:else}
        <p class="mt-1 text-sm leading-6 text-ink/65">No tour selected yet? Perfect. Share the basics and a local expert will shape a confident East Africa plan — safari, Kilimanjaro, gorilla trekking, or beach.</p>
      {/if}
    </div>

    {#if tripContext}
      <div class="flex items-center gap-2 rounded-xl border border-forest/20 bg-forest/[0.06] px-3.5 py-2.5 text-sm font-semibold text-forest">
        <MapPin size={16} class="shrink-0" />
        Planning: {tripContext}
      </div>
    {/if}

    <div class="grid gap-4 md:grid-cols-2">
      <FormInput label="Full name" name="full_name" bind:value={full_name} placeholder="Your name" required />
      <FormInput label="Email" name="email" type="email" bind:value={email} placeholder="you@example.com" required />
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <FormInput label="Phone / WhatsApp" name="phone" bind:value={phone} placeholder="+255 ..." />
      <div class="grid gap-2 text-sm font-medium text-ink">
        <span>Country</span>
        <CountrySelect bind:value={country} placeholder="Search your country..." />
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <SelectInput label="Destination interest" name="destination_interest" bind:value={destination_interest} options={destinationOptions} />
      <SelectInput label="Experience interest" name="experience_interest" bind:value={experience_interest} options={experienceOptions} />
    </div>
    <div class="grid gap-4 md:grid-cols-3">
      <SelectInput label="Travel month" name="travel_month" bind:value={travel_month} options={monthOptions} />
      <SelectInput label="Budget per person" name="budget_per_person" bind:value={budget_per_person} options={budgetOptions} />
      <SelectInput label="Traveller type" name="traveller_type" bind:value={traveller_type} options={travellerOptions} />
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <FormInput label="Adults" name="number_of_adults" type="number" bind:value={number_of_adults} />
      <FormInput label="Children" name="number_of_children" type="number" bind:value={number_of_children} />
    </div>

    <TextArea label="Trip notes" name="message" bind:value={message} rows={3} placeholder="Dates flexibility, must-see places, group details, special occasions..." />

    {#if errorMessage}
      <div class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <AlertCircle size={18} class="mt-0.5 shrink-0" />
        <span>{errorMessage}</span>
      </div>
    {/if}

    <Button type="submit">{submitting ? 'Sending your request...' : 'Plan My Trip'}</Button>
  </form>
{/if}
