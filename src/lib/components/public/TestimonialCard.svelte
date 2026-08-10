<script lang="ts">
  import { MapPin, Star } from '@lucide/svelte';
  import Img from '$lib/components/public/Img.svelte';
  import type { Testimonial } from '$lib/types';

  export let testimonial: Testimonial;

  $: rating = testimonial.rating ?? 5;
  $: featured = Boolean(testimonial.is_featured);
  $: tourTitle = testimonial.tours?.title ?? '';
  $: initials =
    testimonial.client_name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';
</script>

<article class="relative flex h-full flex-col gap-4 overflow-hidden rounded-[8px] border border-ink/10 bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-forest/25 hover:shadow-card-hover">
  <div class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-goldfinch-gold via-forest/40 to-transparent"></div>
  <!-- header -->
  <div class="flex items-start gap-3">
    {#if testimonial.client_image_url}
      <Img
        record={testimonial}
        fields={['client_image_url']}
        alt={testimonial.client_name}
        width={96}
        height={96}
        className="h-12 w-12 shrink-0 rounded-[8px] object-cover ring-1 ring-ink/10"
      />
    {:else}
      <div class="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] bg-forest/10 text-sm font-bold text-forest ring-1 ring-forest/15">
        {initials}
      </div>
    {/if}
    <div class="min-w-0 flex-1">
      <p class="truncate font-bold text-ink">{testimonial.client_name}</p>
      {#if testimonial.client_country}
        <p class="truncate text-xs text-ink/70">{testimonial.client_country}</p>
      {/if}
    </div>
    {#if featured}
      <span class="flex shrink-0 items-center gap-1 rounded-[6px] bg-goldfinch-gold px-2 py-0.5 text-[11px] font-bold text-heading">
        <Star size={10} fill="currentColor" />Featured
      </span>
    {/if}
  </div>

  <!-- rating -->
  <div class="flex items-center gap-0.5">
    {#each Array(5) as _, i}
      <Star size={15} class={i < rating ? 'text-goldfinch-gold' : 'text-ink/15'} fill={i < rating ? 'currentColor' : 'none'} />
    {/each}
    <span class="ml-1 text-xs font-semibold text-ink/65">{rating}/5</span>
  </div>

  <!-- quote -->
  <blockquote class="relative flex-1 border-l-2 border-goldfinch-gold/45 pl-4 text-sm leading-6 text-ink/70">"{testimonial.message}"</blockquote>

  <!-- linked trip -->
  {#if tourTitle}
    <div class="flex flex-wrap items-center gap-2">
      <span class="inline-flex items-center gap-1 rounded-[6px] bg-forest/10 px-2 py-0.5 text-[11px] font-semibold text-forest">
        <MapPin size={10} />{tourTitle}
      </span>
    </div>
  {/if}
</article>
