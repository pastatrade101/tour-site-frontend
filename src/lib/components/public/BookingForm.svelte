<script lang="ts">
  import { AlertCircle, CheckCircle2, Copy, ShieldCheck } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import Button from './Button.svelte';
  import FormInput from './FormInput.svelte';
  import TextArea from './TextArea.svelte';
  import type { Tour } from '$lib/types';

  export let tour: Tour | null = null;

  let full_name = '';
  let email = '';
  let phone = '';
  let country = '';
  let travel_date = '';
  let number_of_adults = '2';
  let number_of_children = '0';
  let special_requests = '';
  let message = '';

  let submitting = false;
  let errorMessage = '';
  let bookingCode = '';
  let copied = false;

  $: sent = Boolean(bookingCode);

  const submit = async () => {
    errorMessage = '';

    if (!full_name.trim() || !email.trim()) {
      errorMessage = 'Please add your name and a valid email so a specialist can reach you.';
      return;
    }
    if (Number(number_of_adults) < 1) {
      errorMessage = 'At least one adult traveller is required.';
      return;
    }

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
        source: 'website_booking_form'
      });
      bookingCode = String((res.data as Record<string, unknown>)?.booking_code ?? '');
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to send your booking request. Please try again.';
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
      // clipboard not available — ignore
    }
  };
</script>

{#if sent}
  <div class="grid gap-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-soft md:p-8">
    <div class="flex items-center gap-3">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 size={26} />
      </span>
      <div>
        <h3 class="text-xl font-bold text-deep-green">Thank you. Your trip request has been received.</h3>
        <p class="mt-1 text-sm text-ink/70">A Goldfinch travel specialist will review your details and contact you shortly.</p>
      </div>
    </div>

    <div class="rounded-xl border border-emerald-200 bg-white p-4">
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">Your booking reference</p>
      <div class="mt-1 flex items-center gap-3">
        <p class="text-2xl font-extrabold tracking-wide text-deep-green">{bookingCode}</p>
        <button class="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-2.5 py-1 text-xs font-semibold text-ink/70 transition hover:bg-sand" type="button" on:click={copyCode}>
          <Copy size={13} />{copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p class="mt-2 text-xs leading-5 text-ink/55">Keep this reference for your records. This is a trip planning request — no payment is required yet.</p>
    </div>

    <Button type="button" variant="secondary" on:click={() => (bookingCode = '')}>Submit another request</Button>
  </div>
{:else}
  <form class="grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6" on:submit|preventDefault={submit}>
    <div>
      <p class="text-sm font-semibold uppercase tracking-[0.14em] text-goldfinch-gold">Booking request</p>
      <h3 class="mt-1 text-2xl font-bold tracking-normal text-deep-green">Request this trip with confidence</h3>
      <p class="mt-1 text-sm leading-6 text-ink/65">Share a few details and a local specialist will tailor your plan. No payment is taken now — this is a request, not a final booking.</p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <FormInput label="Full name" name="full_name" bind:value={full_name} placeholder="Your name" required />
      <FormInput label="Email" name="email" type="email" bind:value={email} placeholder="you@example.com" required />
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <FormInput label="Phone / WhatsApp" name="phone" bind:value={phone} placeholder="+255 ..." />
      <FormInput label="Country" name="country" bind:value={country} placeholder="Where you're travelling from" />
    </div>
    <div class="grid gap-4 md:grid-cols-3">
      <FormInput label="Preferred travel date" name="travel_date" type="date" bind:value={travel_date} />
      <FormInput label="Adults" name="number_of_adults" type="number" bind:value={number_of_adults} required />
      <FormInput label="Children" name="number_of_children" type="number" bind:value={number_of_children} />
    </div>

    <TextArea label="Special requests" name="special_requests" bind:value={special_requests} rows={2} placeholder="Dietary needs, accessibility, celebrations, room preferences..." />
    <TextArea label="Anything else we should know?" name="message" bind:value={message} rows={3} placeholder="Dates flexibility, must-see places, group details..." />

    {#if errorMessage}
      <div class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <AlertCircle size={18} class="mt-0.5 shrink-0" />
        <span>{errorMessage}</span>
      </div>
    {/if}

    <Button type="submit">{submitting ? 'Sending your request...' : 'Submit Booking Request'}</Button>

    <p class="flex items-center justify-center gap-1.5 text-center text-xs text-ink/50">
      <ShieldCheck size={13} class="text-forest" />
      Your details are kept private and used only to plan your trip.
    </p>
  </form>
{/if}
