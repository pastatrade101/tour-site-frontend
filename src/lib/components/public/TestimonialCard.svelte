<script lang="ts">
  import type { Testimonial } from '$lib/types';

  export let testimonial: Testimonial;
</script>

<article class="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
  <p class="text-sm font-semibold text-clay">{testimonial.rating ?? 5}/5</p>
  <blockquote class="mt-3 text-base leading-7 text-ink/80">"{testimonial.message}"</blockquote>
  <div class="mt-5">
    <p class="font-bold text-ink">{testimonial.client_name}</p>
    {#if testimonial.client_country}
      <p class="text-sm text-ink/60">{testimonial.client_country}</p>
    {/if}
  </div>
</article>
