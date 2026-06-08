<script lang="ts">
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
</script>

<section class="container-shell py-14">
  <SectionHeader eyebrow="About" title="Tour Company Starter" description="A clean content page prepared for your company story, team details, licenses, and travel values." />
  <div class="mt-8 grid gap-6 md:grid-cols-3">
    <div class="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
      <h2 class="text-lg font-bold text-ink">Local Expertise</h2>
      <p class="mt-2 text-sm leading-6 text-ink/70">Use this section for guide credentials, destination knowledge, and operating regions.</p>
    </div>
    <div class="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
      <h2 class="text-lg font-bold text-ink">Custom Planning</h2>
      <p class="mt-2 text-sm leading-6 text-ink/70">Connect booking requests to itinerary design and quote workflows.</p>
    </div>
    <div class="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
      <h2 class="text-lg font-bold text-ink">CMS Ready</h2>
      <p class="mt-2 text-sm leading-6 text-ink/70">Admins can manage tours, content, messages, and uploaded images.</p>
    </div>
  </div>
</section>
