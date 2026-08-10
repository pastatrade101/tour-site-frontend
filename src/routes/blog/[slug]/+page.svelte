<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { staggeredCardReveal } from '$lib/animations/motion';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import DestinationCard from '$lib/components/public/DestinationCard.svelte';
  import Img from '$lib/components/public/Img.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import { toMetaText } from '$lib/richText';
  import { breadcrumbLd } from '$lib/seo';
  import type { BlogPost, Destination } from '$lib/types';

  $: origin = $page.url.origin;

  let post: BlogPost | null = null;
  let loading = true;

  // Relevant content for onward navigation (loaded best-effort after the article).
  let morePosts: BlogPost[] = [];
  let exploreDestinations: Destination[] = [];

  const loadRelated = async (current: BlogPost) => {
    const [postRes, destRes] = await Promise.allSettled([
      api.blog.list({ limit: 4 }),
      api.destinations.list({ limit: 3 })
    ]);

    if (postRes.status === 'fulfilled') {
      morePosts = (postRes.value.data.items ?? [])
        .filter((item) => item.id !== current.id && item.slug !== current.slug)
        .slice(0, 3);
    }
    if (destRes.status === 'fulfilled') {
      exploreDestinations = destRes.value.data.items ?? [];
    }
  };

  const load = async (slug: string) => {
    loading = true;
    morePosts = [];
    exploreDestinations = [];
    try {
      const response = await api.blog.get(slug);
      post = response.data ?? null;
    } catch {
      post = null;
    } finally {
      loading = false;
    }

    if (post) void loadRelated(post);
  };

  // The component is reused across /blog/[slug] navigations, so a one-shot
  // onMount would leave the page stale. Re-load whenever the slug changes.
  $: slug = $page.params.slug ?? '';
  $: if (browser && slug) void load(slug);
  $: postMeta = post
    ? String((post as unknown as { meta_description?: string | null }).meta_description ?? '')
    : '';
  $: description = post ? toMetaText(postMeta || post.excerpt || post.content || '', 170) : '';
</script>

<svelte:head>
  {#if post}
    <title>{post.title} | Goldfinch Adventures</title>
    {#if description}<meta name="description" content={description} />{/if}
    <link rel="canonical" href={`${origin}/blog/${post.slug}`} />
  {/if}
</svelte:head>

<article class="container-shell py-14">
  {#if loading}
    <LoadingState message="Loading article..." />
  {:else if !post}
    <div class="mx-auto max-w-xl py-20 text-center">
      <h1 class="text-3xl font-bold text-heading">Story not found</h1>
      <p class="mt-4 text-lg text-ink/70">We couldn't find the article you were looking for.</p>
      <a class="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-deep-green px-6 font-bold text-white transition hover:bg-forest" href="/blog">
        Back to the journal <ArrowRight size={16} />
      </a>
    </div>
  {:else}
    <JsonLd data={breadcrumbLd(origin, [{ name: 'Home', path: '/' }, { name: 'Expert Advice', path: '/expert-advice' }, { name: post.title, path: `/blog/${post.slug}` }])} />
    <nav class="mb-6 flex items-center gap-2 text-sm">
      <a class="font-medium text-ink/70 transition hover:text-forest" href="/blog">Blog</a>
      <span class="text-ink/30">/</span>
      <span class="max-w-[60vw] truncate font-medium text-ink/80">{post.title}</span>
    </nav>

    <div class="max-w-3xl">
      <p class="font-serif text-lg italic text-clay">{post.author_name ?? 'Tour Team'}</p>
      <h1 class="mt-3 text-4xl font-bold tracking-normal text-ink">{post.title}</h1>
      <p class="mt-4 text-lg leading-8 text-ink/70">{post.excerpt}</p>
    </div>
    {#if post.featured_image_url}
      <Img
        record={post}
        fields={['featured_image_url']}
        alt={post.title}
        width={1500}
        sizes="100vw"
        eager
        aspect="16/8"
        className="mt-8 aspect-[16/8] w-full rounded-lg object-cover shadow-soft"
      />
    {/if}
    <RichText value={post.content} element="article" className="mt-8 max-w-3xl text-base leading-8 text-ink/75" />
  {/if}
</article>

{#if !loading}
  <!-- guide → primary action (SRS v2.0 §4.8: every guide ends with Plan My Trip) -->
  <section class="container-shell pb-4 pt-2 md:pb-8">
    <div class="flex flex-col items-start justify-between gap-4 rounded-2xl border border-goldfinch-gold/30 bg-savanna/20 p-5 sm:flex-row sm:items-center md:p-6">
      <p class="text-base font-semibold text-heading">Ready to turn this into a real trip?</p>
      <a class="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-deep-green px-6 font-bold text-white transition hover:bg-forest" href="/plan-my-trip">
        Plan My Trip <ArrowRight size={16} />
      </a>
    </div>
  </section>

  <!-- Continue reading -->
  {#if morePosts.length}
    <section class="border-t border-ink/[0.06] bg-sand/30 py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            eyebrow="Keep reading"
            title="More from the journal"
            description="Travel inspiration, tips and stories from the field."
          />
          <a
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading"
            href="/blog"
          >
            All articles <ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each morePosts as item (item.id)}
            <BlogCard post={item} />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Explore destinations -->
  {#if exploreDestinations.length}
    <section class="py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            eyebrow="Plan your trip"
            title="Explore destinations"
            description="Turn inspiration into a real itinerary across East Africa."
          />
          <a
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading"
            href="/destinations"
          >
            All destinations <ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each exploreDestinations as item (item.id)}
            <DestinationCard destination={item} />
          {/each}
        </div>
      </div>
    </section>
  {/if}
{/if}
