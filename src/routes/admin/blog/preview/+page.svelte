<script lang="ts">
  /**
   * A journal article exactly as the public page draws it, drafts included,
   * for editors. It shows the SAVED version: save in the editor, then reload.
   *
   * Content can be read in any language that has a translation; the page's
   * own labels ("On this page", dates) stay in English because the admin runs
   * in the default language.
   */
  import { page } from '$app/stores';
  import { ArrowLeft } from '@lucide/svelte';
  import { apiRequest } from '$lib/api/client';
  import { KNOWN_LOCALES } from '$lib/i18n';
  import { postHref } from '$lib/journal';
  import type { BlogPost } from '$lib/types';
  import JournalArticle from '$lib/components/public/journal/JournalArticle.svelte';

  const NAMES: Record<string, string> = { en: 'English', sw: 'Swahili', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian' };

  let post: BlogPost | null = null;
  let error = '';
  let loading = true;

  $: id = $page.url.searchParams.get('id') ?? '';
  $: lang = $page.url.searchParams.get('locale') ?? 'en';
  $: translated = new Set(post?.available_locales ?? ['en']);

  const load = async (postId: string, locale: string) => {
    loading = true;
    error = '';
    try {
      // By id for the slug, then by slug: that lookup is the public one
      // (translated, with related articles) and lets editors see drafts.
      const record = await apiRequest<BlogPost>(`/blog/${encodeURIComponent(postId)}`);
      const query = locale !== 'en' ? `?locale=${locale}` : '';
      post = (await apiRequest<BlogPost>(`/blog/${encodeURIComponent(record.data.slug)}${query}`)).data;
    } catch (err) {
      post = null;
      error = err instanceof Error ? err.message : 'Unable to load this article.';
    } finally {
      loading = false;
    }
  };

  $: if (id) load(id, lang);
</script>

<svelte:head>
  <title>Article preview · Goldfinch CMS</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="sticky top-0 z-40 flex h-[52px] items-center gap-3 border-b border-white/10 bg-deep-green px-4 text-[13px] text-white">
  <a href="/admin/blog/{id}/edit" class="inline-flex items-center gap-1.5 font-semibold text-white/85 hover:text-white"><ArrowLeft size={15} /> Editor</a>
  <span class="h-5 w-px bg-white/20" aria-hidden="true"></span>
  <span class="font-semibold">Preview</span>
  {#if post}
    <span class="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide {post.status === 'published' ? 'bg-emerald-500/25 text-emerald-100' : 'bg-goldfinch-gold/25 text-goldfinch-gold'}">{post.status}</span>
  {/if}
  <span class="hidden text-white/55 md:inline">Saved version · save in the editor, then reload</span>
  <nav class="ml-auto flex items-center gap-1" aria-label="Preview language">
    {#each KNOWN_LOCALES as code}
      {#if code === 'en' || translated.has(code)}
        <a href="?id={id}{code === 'en' ? '' : `&locale=${code}`}" aria-current={lang === code ? 'true' : undefined}
          class="rounded-md px-2 py-1 font-semibold uppercase {lang === code ? 'bg-white text-deep-green' : 'text-white/75 hover:bg-white/10'}" title={NAMES[code]}>{code}</a>
      {/if}
    {/each}
    {#if post?.status === 'published'}
      <a href={postHref(post)} target="_blank" rel="noopener" class="ml-2 hidden font-semibold text-white/85 underline-offset-4 hover:underline sm:inline">Live page</a>
    {/if}
  </nav>
</div>

<!-- The breadcrumb bar pins under this preview bar instead of the site header. -->
<div style="--nav-h: 52px" class="min-h-screen bg-canvas">
  {#if !id}
    <p class="p-8 text-sm text-ink/60">Open Preview from an article in the editor.</p>
  {:else if loading && !post}
    <p class="p-8 text-sm text-ink/60">Loading the article…</p>
  {:else if error}
    <p class="p-8 text-sm text-clay">{error}</p>
  {:else if post}
    {#key `${post.id}-${lang}`}
      <JournalArticle {post} related={post.related ?? []} />
    {/key}
  {/if}
</div>
