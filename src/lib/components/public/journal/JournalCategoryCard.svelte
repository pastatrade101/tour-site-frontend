<script lang="ts">
  import { ArrowRight, Newspaper } from '@lucide/svelte';
  import { t } from '$lib/i18n/ui';
  import { categoryHref, isComingSoon } from '$lib/journal';
  import type { BlogCategory } from '$lib/types';
  import Img from '../Img.svelte';

  export let category: BlogCategory;
  $: soon = isComingSoon(category);
</script>

<a
  href={categoryHref(category)}
  class="group relative block aspect-[4/3] overflow-hidden rounded-[12px] border border-ink/10 bg-sand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heading lg:aspect-[4/5]"
>
  {#if category.cover_image_url}
    <Img
      src={category.cover_image_url}
      alt={category.image_alt || category.name}
      width={720}
      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 380px"
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  {:else}
    <div class="absolute inset-0 grid place-items-center bg-gradient-to-br from-sand to-savanna/50 text-forest/35"><Newspaper size={34} /></div>
  {/if}
  <div class="absolute inset-0 bg-gradient-to-t from-[#272B22]/90 via-[#272B22]/35 to-transparent"></div>
  {#if soon}
    <span class="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-heading">{$t('journal.coming_soon')}</span>
  {/if}
  <div class="absolute inset-x-0 bottom-0 p-4 text-white">
    <h3 class="font-serif text-[20px] font-semibold leading-tight">{category.name}</h3>
    {#if category.description}<p class="mt-1 text-[13.5px] text-white/85">{category.description}</p>{/if}
    <span class="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-goldfinch-gold">
      {soon ? $t('journal.preview') : $t('journal.explore')}
      <ArrowRight size={14} class="transition-transform group-hover:translate-x-0.5" />
    </span>
  </div>
</a>
