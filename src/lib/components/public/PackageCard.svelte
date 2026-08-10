<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import Img from '$lib/components/public/Img.svelte';

  export let title = '';
  export let subtitle = '';
  export let href = '#';
  export let image = '';
  export let cta = 'View Tours';
</script>

<a
  {href}
  class="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-deep-green shadow-soft ring-1 ring-ink/5"
>
  {#if image}
    <Img
      src={image}
      alt={title}
      width={800}
      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw"
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
    />
  {/if}
  <!-- gradient so the overlaid text stays legible -->
  <div class="absolute inset-0 bg-gradient-to-t from-deep-green/95 via-deep-green/35 to-transparent"></div>

  <div class="absolute inset-x-0 bottom-0 p-6">
    <h3 class="text-xl font-semibold leading-tight text-white drop-shadow-sm">{title}</h3>
    {#if subtitle}
      <p class="mt-1.5 line-clamp-2 text-sm leading-6 text-white/75">{subtitle}</p>
    {/if}
    <span class="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-goldfinch-gold">
      {cta} <ArrowRight size={15} class="transition-transform group-hover:translate-x-1" />
    </span>
  </div>
</a>
