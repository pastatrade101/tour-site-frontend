<script lang="ts">
  import { AlertCircle, CheckCircle2, Copy } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import Button from './Button.svelte';
  import FormInput from './FormInput.svelte';
  import SelectInput from './SelectInput.svelte';
  import TextArea from './TextArea.svelte';

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

  $: sent = Boolean(bookingCode);

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
          traveller_type
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
    <Button type="button" variant="secondary" on:click={() => (bookingCode = '')}>Start another request</Button>
  </div>
{:else}
  <form class="grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6" on:submit|preventDefault={submit}>
    <div>
      <p class="text-sm font-semibold uppercase tracking-[0.14em] text-goldfinch-gold">Plan My Trip</p>
      <h3 class="mt-1 text-2xl font-bold tracking-normal text-deep-green">Tell us about your dream trip</h3>
      <p class="mt-1 text-sm leading-6 text-ink/65">No tour selected yet? Perfect. Share the basics and a local expert will shape a confident East Africa plan — safari, Kilimanjaro, gorilla trekking, or beach.</p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <FormInput label="Full name" name="full_name" bind:value={full_name} placeholder="Your name" required />
      <FormInput label="Email" name="email" type="email" bind:value={email} placeholder="you@example.com" required />
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <FormInput label="Phone / WhatsApp" name="phone" bind:value={phone} placeholder="+255 ..." />
      <FormInput label="Country" name="country" bind:value={country} placeholder="Where you're travelling from" />
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
