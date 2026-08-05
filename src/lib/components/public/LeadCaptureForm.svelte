<script lang="ts">
  import Button from './Button.svelte';
  import FormInput from './FormInput.svelte';
  import SelectInput from './SelectInput.svelte';
  import TextArea from './TextArea.svelte';

  export let title = 'Plan your East Africa trip';
  export let compact = false;

  const travelInterests = ['Safari', 'Kilimanjaro', 'Gorilla Trekking', 'Beach Holiday', 'Multi-country'].map((value) => ({
    label: value,
    value
  }));

  const budgetRanges = ['Comfort', 'Premium', 'Luxury', 'Not sure yet'].map((value) => ({
    label: value,
    value
  }));
</script>

<form class={`relative grid gap-4 overflow-hidden rounded-[8px] border border-white/10 bg-surface p-5 shadow-card ${compact ? '' : 'md:p-6'}`}>
  <div class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-goldfinch-gold via-forest/45 to-transparent"></div>
  <div>
    <p class="text-sm font-semibold uppercase tracking-[0.14em] text-goldfinch-gold">Tell us about your trip</p>
    <h3 class="mt-2 text-2xl font-bold tracking-normal text-heading">{title}</h3>
    <p class="mt-2 text-sm leading-6 text-ink/70">Tell us the basics and a local advisor can shape a confident safari, Kilimanjaro, gorilla trekking, or beach plan.</p>
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    <FormInput label="Full name" name="full_name" placeholder="Your name" required />
    <FormInput label="Email" name="email" type="email" placeholder="you@example.com" required />
    <SelectInput label="Travel interest" name="interest" options={travelInterests} />
    <SelectInput label="Budget range" name="budget_tier" options={budgetRanges} />
  </div>

  <TextArea label="Trip notes" name="message" placeholder="Dates, travelers, countries, must-see places..." />

  <div class="grid gap-3 sm:flex sm:flex-wrap">
    <Button href="/plan-my-trip" className="w-full rounded-[8px] sm:w-auto">Plan My Trip</Button>
    <Button href="/contact" variant="secondary" className="w-full rounded-[8px] sm:w-auto">Talk to a Travel Advisor</Button>
  </div>
</form>
