<script lang="ts">
  import { ArrowRight, Newspaper } from '@lucide/svelte';
  import { tilt } from '$lib/animations';
  import Img from './Img.svelte';
  import { toMetaText } from '$lib/richText';
  import type { BlogPost } from '$lib/types';

  export let post: BlogPost;

  $: summary = toMetaText(post.excerpt || post.content || '', 180);
</script>

<article class="group flex h-full flex-col overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-forest/25 hover:shadow-card-hover" use:tilt={{ max: 3 }}>
  <a href={`/blog/${post.slug}`} class="flex h-full flex-col">
    <div class="relative aspect-[16/10] overflow-hidden bg-skywash">
      {#if post.featured_image_url}
        <Img record={post} fields={['featured_image_url']} alt={post.title} width={760} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 380px" className="h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-105" />
      {:else}
        <div class="grid h-full w-full place-items-center bg-gradient-to-br from-sand to-savanna/50 text-forest/35"><Newspaper size={30} /></div>
      {/if}
      <div class="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent"></div>
    </div>
    <div class="flex flex-1 flex-col p-5">
      {#if post.author_name}
        <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-clay">{post.author_name}</p>
      {/if}
      <h3 class="mt-2 text-xl font-bold tracking-normal text-ink">{post.title}</h3>
      {#if summary}
        <p class="mt-2 line-clamp-3 text-sm leading-6 text-ink/70">{summary}</p>
      {/if}
      <span class="mt-auto inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[8px] bg-canvas px-4 text-sm font-bold text-forest transition group-hover:bg-deep-green group-hover:text-white">
        Read guide <ArrowRight size={14} strokeWidth={2.6} class="transition-transform group-hover:translate-x-0.5" />
      </span>
    </div>
  </a>
</article>
