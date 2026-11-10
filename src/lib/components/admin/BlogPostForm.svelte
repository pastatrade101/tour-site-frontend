<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { ArrowLeft, ExternalLink, FileText, LayoutList, Save } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from './AdminButton.svelte';
  import AdminFormInput from './AdminFormInput.svelte';
  import AdminPageHeader from './AdminPageHeader.svelte';
  import AdminSelect from './AdminSelect.svelte';
  import MediaPicker from './MediaPicker.svelte';
  import AdminRichText from './AdminRichText.svelte';
  import AdminTextArea from './AdminTextArea.svelte';
  import ToastStack from './ToastStack.svelte';
  import AdminTranslationTabs from './AdminTranslationTabs.svelte';
  import BlogGuideEditor from './BlogGuideEditor.svelte';
  import { emptyGuide, normaliseGuide, type EditableGuide } from '$lib/blogBlocks';
  import { internalLinks, type LinkGroup } from '$lib/internalLinks';
  import type { BlogPost } from '$lib/types';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  export let mode: 'create' | 'edit' = 'create';
  export let postId = '';

  type PublishStatus = 'archived' | 'draft' | 'published';
  type Option = { label: string; value: string };
  type Toast = { id: string; message: string; type: 'error' | 'success' };
  type MediaItem = { file_name: string; file_url: string; id: string; thumbnail_url?: string | null };

  const statusOptions: Option[] = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
  ];

  let loading = mode === 'edit';
  let loadingOptions = true;
  let saving = false;
  let error = '';
  let slugManuallyEdited = false;
  let toasts: Toast[] = [];

  let categoryOptions: Option[] = [{ label: 'No category', value: '' }];
  let mediaItems: MediaItem[] = [];
  let topicOptions: Option[] = [{ label: 'No topic', value: '' }];
  let topicsFor = '';
  let publishedPosts: BlogPost[] = [];
  let linkGroups: LinkGroup[] = [];
  let linksLoading = true;
  let categorySlugs: Record<string, string> = {};

  /** "simple" = one rich-text body; "guide" = sections of blocks (the Travel Journal template). */
  let layout: 'simple' | 'guide' = 'simple';
  let guide: EditableGuide = emptyGuide();

  let form = {
    author_name: '',
    category_id: '',
    content: '',
    excerpt: '',
    featured_image_url: '',
    meta_description: '',
    meta_title: '',
    og_image_url: '',
    published_at: '',
    slug: '',
    status: 'draft' as PublishStatus,
    title: '',
    topic_group_id: '',
    featured: false,
    featured_image_alt: '',
    image_credit: '',
    related_post_ids: [] as string[]
  };

  // Topic groups belong to a category, so the list follows the chosen category.
  const loadTopics = async (categoryId: string) => {
    topicsFor = categoryId;
    if (!categoryId) { topicOptions = [{ label: 'No topic', value: '' }]; return; }
    try {
      const res = await api.blogTopicGroups.list({ category_id: categoryId, limit: 100 });
      if (topicsFor !== categoryId) return;
      topicOptions = [{ label: 'No topic', value: '' }, ...(res.data.items ?? []).map((group) => ({ label: group.title, value: group.id }))];
      if (form.topic_group_id && !topicOptions.some((option) => option.value === form.topic_group_id)) form.topic_group_id = '';
    } catch {
      topicOptions = [{ label: 'No topic', value: '' }];
    }
  };
  $: if (!loading && form.category_id !== topicsFor) void loadTopics(form.category_id);

  // Where this article is read once published: under its category.
  $: liveHref = form.slug ? (categorySlugs[form.category_id] ? `/blog/${categorySlugs[form.category_id]}/${form.slug}` : `/blog/${form.slug}`) : '';
  $: relatedChoices = publishedPosts.filter((post) => post.id !== postId);
  const toggleRelated = (id: string) => {
    form.related_post_ids = form.related_post_ids.includes(id)
      ? form.related_post_ids.filter((item) => item !== id)
      : [...form.related_post_ids, id].slice(0, 3);
  };

  // ─── helpers ──────────────────────────────────────────────────────────────

  const slugify = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  $: if (!slugManuallyEdited) form.slug = slugify(form.title);
  // Preview the fallbacks the public site applies when an editor leaves an
  // optional SEO field blank (title, then excerpt, then featured image). They
  // are worked out on every page view rather than saved, so they follow the
  // article as it is edited and each language uses its own translated title.
  $: seoTitlePreview = form.meta_title.trim() || (form.title.trim() ? `${form.title.trim()} | Goldfinch Adventures` : 'Add an article title');
  $: seoDescriptionPreview = form.meta_description.trim() || form.excerpt.trim() || 'Add an excerpt or a meta description';
  $: seoShareImage = form.og_image_url.trim() || form.featured_image_url.trim();

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };

  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  // ─── data loading ─────────────────────────────────────────────────────────

  const loadOptions = async () => {
    loadingOptions = true;
    try {
      const [cats, media, posts] = await Promise.all([
        api.blogCategories.list({ status: 'all', limit: 100 }),
        api.media.list({ file_type: 'image', limit: 200 }),
        api.blog.list({ status: 'published', view: 'card', limit: 200 })
      ]);
      publishedPosts = posts.data.items ?? [];
      internalLinks().then((groups) => { linkGroups = groups; }).catch(() => {}).finally(() => { linksLoading = false; });

      categorySlugs = Object.fromEntries(cats.data.items.map((c) => [String(c.id), String(c.slug ?? '')]));
      categoryOptions = [
        { label: 'No category', value: '' },
        ...cats.data.items.map((c) => ({ label: String(c.name ?? c.slug ?? 'Untitled'), value: String(c.id) }))
      ];

      mediaItems = (media.data.items as MediaItem[]).filter((m) => m.file_url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load options.', 'error');
    } finally {
      loadingOptions = false;
    }
  };

  const loadPost = async () => {
    if (mode !== 'edit' || !postId) return;
    loading = true;
    error = '';
    try {
      const res = await api.blog.get(postId);
      const post = res.data as Record<string, unknown>;

      form = {
        author_name: String(post.author_name ?? ''),
        category_id: String(post.category_id ?? ''),
        content: String(post.content ?? ''),
        excerpt: String(post.excerpt ?? ''),
        featured_image_url: String(post.featured_image_url ?? ''),
        meta_description: String(post.meta_description ?? ''),
        meta_title: String(post.meta_title ?? ''),
        og_image_url: String(post.og_image_url ?? ''),
        published_at: post.published_at ? String(post.published_at).slice(0, 16) : '',
        slug: String(post.slug ?? ''),
        status: (post.status ?? 'draft') as PublishStatus,
        title: String(post.title ?? ''),
        topic_group_id: String(post.topic_group_id ?? ''),
        featured: post.featured === true,
        featured_image_alt: String(post.featured_image_alt ?? ''),
        image_credit: String(post.image_credit ?? ''),
        related_post_ids: Array.isArray(post.related_post_ids) ? post.related_post_ids.map(String) : []
      };
      guide = normaliseGuide(post.guide);
      layout = guide.sections.length ? 'guide' : 'simple';

      slugManuallyEdited = true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load blog post.';
    } finally {
      loading = false;
    }
  };

  // ─── save ─────────────────────────────────────────────────────────────────

  const save = async () => {
    if (!form.title.trim()) { showToast('Title is required.', 'error'); return; }
    if (!form.slug.trim()) { showToast('Slug is required.', 'error'); return; }

    saving = true;

    const payload: Record<string, unknown> = {
      author_name: form.author_name.trim() || null,
      category_id: form.category_id || null,
      content: form.content.trim() || null,
      excerpt: form.excerpt.trim() || null,
      featured_image_url: form.featured_image_url.trim() || null,
      meta_description: form.meta_description.trim() || null,
      meta_title: form.meta_title.trim() || null,
      og_image_url: form.og_image_url.trim() || null,
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
      slug: form.slug.trim(),
      status: form.status,
      title: form.title.trim(),
      topic_group_id: form.topic_group_id || null,
      featured: form.featured,
      featured_image_alt: form.featured_image_alt.trim() || null,
      image_credit: form.image_credit.trim() || null,
      related_post_ids: form.related_post_ids,
      // A simple article keeps its opening and closing text but has no sections.
      guide: { ...guide, sections: layout === 'guide' ? guide.sections : [] }
    };
    if (layout === 'guide' && !guide.sections.some((section) => section.title.trim())) {
      showToast('Give the guide at least one section with a heading.', 'error');
      saving = false;
      return;
    }

    try {
      if (mode === 'edit' && postId) {
        await api.blog.update(postId, payload);
        showToast('Blog post updated successfully.');
      } else {
        await api.blog.create(payload);
        showToast('Blog post created successfully.');
        setTimeout(() => goto('/admin/blog'), 1000);
        return;
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save blog post.', 'error');
    } finally {
      saving = false;
    }
  };

  onMount(async () => {
    await Promise.all([loadOptions(), loadPost()]);
  });
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Content Management"
    title={mode === 'edit' ? 'Edit Blog Post' : 'New Blog Post'}
    description={mode === 'edit' ? 'Update the post content, SEO, and publishing settings.' : 'Write a new travel article, destination guide, or planning resource.'}
  />

  {#if loading}
    <LoadingState message="Loading blog post..." />
  {:else if error}
    <ErrorState message={error} />
  {:else}
    <form class="grid gap-6" on:submit|preventDefault={save}>

      <!-- main content card -->
      <div class="grid gap-5 rounded-[10px] border border-ink/10 bg-surface p-6 shadow-[0_18px_50px_rgba(57,61,50,0.06)]">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Post content</p>
          <h2 class="mt-1 text-lg font-bold text-ink">Title, slug, excerpt & body</h2>
        </div>

        <div class="grid gap-4">
          <AdminFormInput label="Title" name="title" bind:value={form.title} placeholder="e.g. The Ultimate Guide to Serengeti Migration Season" required />

          <label class="grid gap-2 text-sm font-medium text-ink">
            <span>Slug</span>
            <input
              class="h-11 rounded-2xl border border-ink/10 bg-surface px-3 font-mono text-sm shadow-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15"
              name="slug"
              bind:value={form.slug}
              required
              on:input={() => (slugManuallyEdited = true)}
            />
            <span class="text-xs text-ink/45">Auto-generated from title. Edit to customize.</span>
          </label>

          <AdminTextArea label="Excerpt" name="excerpt" bind:value={form.excerpt} rows={3} placeholder="Short summary shown on blog listing pages and in search results (150–200 chars recommended)." />

          <div class="grid gap-2">
            <span class="text-sm font-medium text-ink">Layout</span>
            <div class="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Article layout">
              <button type="button" role="radio" aria-checked={layout === 'simple'} on:click={() => (layout = 'simple')}
                class="flex items-start gap-3 rounded-[10px] border p-4 text-left transition {layout === 'simple' ? 'border-goldfinch-gold bg-goldfinch-gold/10' : 'border-ink/10 hover:bg-canvas'}">
                <FileText size={18} class="mt-0.5 shrink-0 text-heading" />
                <span><span class="block font-semibold text-heading">Simple article</span><span class="mt-0.5 block text-sm text-ink/60">One body of text. Its H2 headings become the "On this page" list.</span></span>
              </button>
              <button type="button" role="radio" aria-checked={layout === 'guide'} on:click={() => (layout = 'guide')}
                class="flex items-start gap-3 rounded-[10px] border p-4 text-left transition {layout === 'guide' ? 'border-goldfinch-gold bg-goldfinch-gold/10' : 'border-ink/10 hover:bg-canvas'}">
                <LayoutList size={18} class="mt-0.5 shrink-0 text-heading" />
                <span><span class="block font-semibold text-heading">Structured guide</span><span class="mt-0.5 block text-sm text-ink/60">Quick answer, "At a glance", sections of tables, notes, steps, FAQs and a closing box.</span></span>
              </button>
            </div>
          </div>

          {#if layout === 'guide'}
            <BlogGuideEditor bind:guide media={mediaItems} {linkGroups} {linksLoading} />
          {:else}
            <AdminRichText label="Content" name="content" bind:value={form.content} rows={20} headings="h2h3" placeholder="Write your full article here." />
          {/if}
        </div>
      </div>

      <!-- sidebar settings -->
      <div class="grid gap-6 xl:grid-cols-[1fr_360px]">
        <!-- images -->
        <div class="grid gap-5 rounded-[10px] border border-ink/10 bg-surface p-6 shadow-[0_18px_50px_rgba(57,61,50,0.06)]">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Featured image</p>
            <h2 class="mt-1 text-lg font-bold text-ink">Post thumbnail</h2>
          </div>

          <MediaPicker label="Featured image" media={mediaItems} uploadFolder="blog" bind:value={form.featured_image_url} />
          <AdminFormInput label="Describe the photo (alt text)" name="featured_image_alt" bind:value={form.featured_image_alt} placeholder="Elephants crossing a river in Tarangire National Park" />
          <AdminFormInput label="Photo credit (optional)" name="image_credit" bind:value={form.image_credit} placeholder="Photo: name of photographer" />
        </div>

        <!-- publish settings -->
        <div class="grid content-start gap-5 rounded-[10px] border border-ink/10 bg-surface p-6 shadow-[0_18px_50px_rgba(57,61,50,0.06)]">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Publish settings</p>
            <h2 class="mt-1 text-lg font-bold text-ink">Status & details</h2>
          </div>

          <div class="grid gap-4">
            <AdminSelect label="Status" name="status" bind:value={form.status} options={statusOptions} />
            <AdminSelect
              label="Category"
              name="category_id"
              bind:value={form.category_id}
              options={loadingOptions ? [{ label: 'Loading...', value: '' }] : categoryOptions}
            />
            <AdminSelect label="Topic (list it falls under on the category page)" name="topic_group_id" bind:value={form.topic_group_id} options={topicOptions} />
            <label class="flex items-start gap-3 rounded-lg border border-ink/10 bg-canvas px-3 py-3 text-sm">
              <input type="checkbox" class="mt-0.5 size-4 accent-[rgb(var(--c-deep-green))]" bind:checked={form.featured} />
              <span><span class="font-semibold text-ink">Featured guide</span><span class="block text-ink/55">Shown in the top row of its category page (the newest three featured).</span></span>
            </label>
            <AdminFormInput label="Author name" name="author_name" bind:value={form.author_name} placeholder="e.g. Goldfinch Team" />
            <AdminFormInput label="Published at" name="published_at" type="datetime-local" bind:value={form.published_at} />
          </div>
        </div>
      </div>

      <!-- SEO card -->
      <div class="grid gap-5 rounded-[10px] border border-ink/10 bg-surface p-6 shadow-[0_18px_50px_rgba(57,61,50,0.06)]">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Search engine optimisation</p>
          <h2 class="mt-1 text-lg font-bold text-ink">SEO & Open Graph</h2>
          <p class="mt-1 text-sm text-ink/55">These fields improve how the post appears in search results and social sharing previews.</p>
        </div>

        <div class="grid gap-4">
          <div class="grid gap-4 md:grid-cols-2">
            <AdminFormInput label="Meta title" name="meta_title" bind:value={form.meta_title} placeholder="Override title for search results (55–60 chars)" />
            <AdminTextArea label="Meta description" name="meta_description" bind:value={form.meta_description} rows={3} placeholder="Summary shown in search snippets (150–160 chars)" />
          </div>

          <MediaPicker label="OG image (1200×630 recommended)" media={mediaItems} uploadFolder="blog" bind:value={form.og_image_url} />

          <div class="grid gap-2 rounded-lg border border-ink/10 bg-canvas px-4 py-3 text-sm">
            <p class="font-semibold text-ink">Search and sharing preview</p>
            <p class="truncate font-medium text-forest">{seoTitlePreview} <span class="text-ink/45">({seoTitlePreview.length} chars)</span></p>
            <p class="line-clamp-2 text-ink/65">{seoDescriptionPreview} <span class="text-ink/45">({seoDescriptionPreview.length} chars)</span></p>
            <p class={seoShareImage ? 'text-forest' : 'text-amber-700'}>{seoShareImage ? 'Share image ready' : 'No share image selected — the featured image will be used if one is set.'}</p>
          </div>
        </div>
      </div>

      <!-- related reading -->
      <div class="grid gap-4 rounded-[10px] border border-ink/10 bg-surface p-6 shadow-[0_18px_50px_rgba(57,61,50,0.06)]">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Continue exploring</p>
          <h2 class="mt-1 text-lg font-bold text-ink">Related articles ({form.related_post_ids.length}/3)</h2>
          <p class="mt-1 text-sm text-ink/55">Shown at the end of the article, in the order picked. With none picked, the newest articles from the same category are shown.</p>
        </div>
        {#if relatedChoices.length}
          <div class="grid max-h-72 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
            {#each relatedChoices as item (item.id)}
              {@const picked = form.related_post_ids.indexOf(item.id)}
              <label class="flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 text-sm {picked >= 0 ? 'border-goldfinch-gold bg-goldfinch-gold/10' : 'border-ink/10'}">
                <input type="checkbox" class="mt-0.5 size-4 shrink-0" checked={picked >= 0} disabled={picked < 0 && form.related_post_ids.length >= 3} on:change={() => toggleRelated(item.id)} />
                <span class="min-w-0"><span class="block font-medium text-ink">{#if picked >= 0}<b class="mr-1 text-forest">{picked + 1}.</b>{/if}{item.title}</span>{#if item.blog_categories?.name}<span class="text-xs text-ink/50">{item.blog_categories.name}</span>{/if}</span>
              </label>
            {/each}
          </div>
        {:else}
          <p class="text-sm text-ink/55">No other published articles yet.</p>
        {/if}
      </div>

      {#if mode === 'edit' && postId}
        <div class="rounded-[10px] border border-ink/10 bg-surface p-6 shadow-[0_18px_50px_rgba(57,61,50,0.06)]">
          <AdminTranslationTabs entityType="blog_posts" entityId={postId} on:toast={(event) => showToast(event.detail.message, event.detail.type)} />
        </div>
      {/if}

      <!-- footer actions -->
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[8px] border border-ink/10 bg-surface px-6 py-4 shadow-sm">
        <a class="inline-flex items-center gap-2 text-sm font-semibold text-ink/60 transition hover:text-ink" href="/admin/blog">
          <ArrowLeft size={16} />
          Back to blog posts
        </a>
        {#if mode === 'edit' && postId}
          <a class="inline-flex items-center gap-2 text-sm font-semibold text-forest hover:text-heading" href="/admin/blog/preview?id={postId}" target="_blank" rel="noopener" title="Shows the saved version, in any language it is translated into">Preview <ExternalLink size={14} /></a>
        {/if}
        {#if mode === 'edit' && form.status === 'published' && liveHref}
          <a class="inline-flex items-center gap-2 text-sm font-semibold text-forest hover:text-heading" href={liveHref} target="_blank" rel="noopener">View on site <ExternalLink size={14} /></a>
        {/if}
        <AdminButton type="submit" disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Post'}
        </AdminButton>
      </div>
    </form>
  {/if}
</div>
