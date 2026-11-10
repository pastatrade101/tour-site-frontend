<script lang="ts">
  import { ArrowRight, Newspaper } from '@lucide/svelte';
  import { t } from '$lib/i18n/ui';
  import { postHref } from '$lib/journal';
  import type { BlogPost } from '$lib/types';
  import Img from '../Img.svelte';

  export let post: BlogPost;
  /** Cards in a three-up row drop the excerpt so the titles line up. */
  export let compact = false;
  export let cta = '';

  $: href = postHref(post);
  $: label = post.blog_topic_groups?.title || post.blog_categories?.name || '';
</script>

<article class="group flex flex-col overflow-hidden rounded-[12px] border border-ink/10 bg-surface transition-colors hover:border-ink/25">
  <a {href} class="block aspect-[16/10] overflow-hidden bg-sand" tabindex="-1" aria-hidden="true">
    {#if post.featured_image_url}
      <Img record={post} fields={['featured_image_url']} alt="" width={760} sizes="(max-width: 768px) 92vw, 380px" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
    {:else}
      <div class="grid h-full w-full place-items-center text-forest/35"><Newspaper size={30} /></div>
    {/if}
  </a>
  <div class="flex flex-1 flex-col {compact ? 'p-4' : 'p-5'}">
    {#if label}<span class="text-[12px] font-semibold uppercase tracking-[0.14em] text-clay">{label}</span>{/if}
    <h3 class="mt-2 font-serif text-[20px] font-semibold leading-snug text-heading md:text-[21px]">
      <a {href} class="rounded-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heading">{post.title}</a>
    </h3>
    {#if compact}
      <div class="flex-1"></div>
    {:else if post.excerpt}
      <p class="mt-2 flex-1 text-[15px] leading-relaxed text-ink/70">{post.excerpt}</p>
    {/if}
    <a {href} class="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-heading hover:text-clay" tabindex="-1">
      {cta || $t('journal.read_article')} <ArrowRight size={16} class="transition-transform group-hover:translate-x-0.5" />
    </a>
  </div>
</article>
