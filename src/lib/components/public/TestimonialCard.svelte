<script lang="ts">
  import { Star } from '@lucide/svelte';
  import type { Testimonial } from '$lib/types';

  export let testimonial: Testimonial;

  $: rating = testimonial.rating ?? 5;
  $: featured = Boolean(testimonial.is_featured);
  $: initials =
    testimonial.client_name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';
</script>

<article
  class={`flex h-full flex-col rounded-2xl border p-6 transition ${
    featured
      ? 'border-forest/40 bg-forest/[0.05] shadow-[0_18px_50px_rgba(31,77,58,0.10)]'
      : 'border-ink/10 bg-white shadow-soft hover:border-forest/25'
  }`}
>
  <blockquote class="flex-1 text-[15px] leading-7 text-ink/80">{testimonial.message}</blockquote>

  <div class="mt-5 border-t border-ink/10 pt-4">
    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        {#if testimonial.client_image_url}
          <img class="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm" src={testimonial.client_image_url} alt={testimonial.client_name} loading="lazy" />
        {:else}
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest/10 text-sm font-bold text-forest">{initials}</span>
        {/if}
        <div class="min-w-0">
          <p class="truncate font-bold text-ink">{testimonial.client_name}</p>
          {#if testimonial.client_country}
            <p class={`truncate text-sm font-medium ${featured ? 'text-forest' : 'text-ink/55'}`}>{testimonial.client_country}</p>
          {/if}
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-1.5">
        <Star size={16} class="text-goldfinch-gold" fill="currentColor" />
        <span class="font-bold text-deep-green">{rating}</span>
      </div>
    </div>
  </div>
</article>
