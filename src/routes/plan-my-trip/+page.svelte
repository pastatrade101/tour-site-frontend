<script lang="ts">
  import { goto } from '$app/navigation';
  import { brand } from '$lib/brand';
  import EnquiryForm from '$lib/components/public/enquiry/EnquiryForm.svelte';
  import { configFor } from '$lib/enquiry/configs';

  const config = configFor('homepage_trip_planner');
  let open = true;

  const close = () => {
    open = false;
    if (history.length > 1) history.back();
    else void goto('/');
  };
</script>

<svelte:head>
  <title>Plan My Trip | {brand.name}</title>
  <meta
    name="description"
    content="Tell us your dates, budget and travel style and a local Goldfinch specialist will shape a tailor-made East Africa plan — no payment to start."
  />
</svelte:head>

<EnquiryForm bind:open {config} on:close={close} />
