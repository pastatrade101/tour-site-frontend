<script lang="ts">
  import type { BlogPost } from '$lib/types';

  export let post: BlogPost;
</script>

<article class="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft">
  <a href={`/blog/${post.slug}`} class="block">
    <div class="aspect-[16/10] bg-skywash">
      {#if post.featured_image_url}
        <img class="h-full w-full object-cover" src={post.featured_image_url} alt={post.title} />
      {/if}
    </div>
    <div class="p-5">
      <p class="text-sm font-semibold text-clay">{post.author_name ?? 'Tour Team'}</p>
      <h3 class="mt-2 text-xl font-bold tracking-normal text-ink">{post.title}</h3>
      <p class="mt-2 line-clamp-3 text-sm leading-6 text-ink/70">{post.excerpt}</p>
    </div>
  </a>
</article>
