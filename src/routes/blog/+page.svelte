<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';
  import { staggeredCardReveal } from '$lib/animations';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import type { BlogPost } from '$lib/types';

  let posts: BlogPost[] = [];

  onMount(async () => {
    try {
      const response = await api.blog.list();
      posts = response.data.items ?? [];
    } catch {
      posts = [];
    }
  });
</script>

<section class="container-shell py-14">
  <SectionHeader eyebrow="Blog" title="Travel Notes" description="CMS-managed blog index starter." />
  {#if posts.length === 0}
    <div class="mt-8 flex justify-center">
      <div class="max-w-md rounded-2xl border border-deep-green/10 bg-white p-10 text-center shadow-sm">
        <h3 class="text-heading text-2xl font-semibold">Stories coming soon</h3>
        <p class="mt-3 text-ink">Our East Africa specialists are writing new guides — check back soon.</p>
        <a
          href="/plan-my-trip"
          class="mt-6 inline-flex items-center justify-center rounded-full bg-goldfinch-gold px-6 py-3 font-semibold text-deep-green transition hover:opacity-90"
        >
          Plan my trip
        </a>
      </div>
    </div>
  {:else}
    <div class="mt-8 grid gap-6 md:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.06 }}>
      {#each posts as post}
        <BlogCard {post} />
      {/each}
    </div>
  {/if}
</section>
