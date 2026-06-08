<script lang="ts">
  import ContactForm from '$lib/components/public/ContactForm.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
</script>

<section class="container-shell grid gap-10 py-14 lg:grid-cols-[0.8fr_1.2fr]">
  <SectionHeader eyebrow="Contact" title="Plan a Trip" description="This form posts to the backend contact endpoint and stores messages for the admin CMS." />
  <ContactForm />
</section>
