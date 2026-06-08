<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import { placeholderPosts } from '$lib/data/placeholders';
  import type { BlogPost } from '$lib/types';

  let post: BlogPost = placeholderPosts[0];
  let loading = true;

  onMount(async () => {
    const slug = $page.params.slug ?? '';
    try {
      const response = await api.blog.get(slug);
      post = response.data;
    } catch {
      post = placeholderPosts.find((item) => item.slug === slug) ?? placeholderPosts[0];
    } finally {
      loading = false;
    }
  });
</script>

<article class="container-shell py-14">
  {#if loading}
    <LoadingState message="Loading article..." />
  {:else}
    <div class="max-w-3xl">
      <p class="text-sm font-semibold uppercase tracking-[0.16em] text-clay">{post.author_name ?? 'Tour Team'}</p>
      <h1 class="mt-3 text-4xl font-bold tracking-normal text-ink">{post.title}</h1>
      <p class="mt-4 text-lg leading-8 text-ink/70">{post.excerpt}</p>
    </div>
    {#if post.featured_image_url}
      <img class="mt-8 aspect-[16/8] w-full rounded-lg object-cover shadow-soft" src={post.featured_image_url} alt={post.title} />
    {/if}
    <div class="mt-8 max-w-3xl text-base leading-8 text-ink/75">
      <p>{post.content}</p>
    </div>
  {/if}
</article>
