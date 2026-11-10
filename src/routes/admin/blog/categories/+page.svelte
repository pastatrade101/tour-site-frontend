<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { ArrowDown, ArrowUp, Edit, ExternalLink, FolderTree, Languages, Plus, Search, Trash2, X } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { TOPIC_ICON_NAMES } from '$lib/blogBlocks';
  import type { BlogTopicGroup } from '$lib/types';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import AdminToolbar from '$lib/components/admin/AdminToolbar.svelte';
  import AdminTranslationTabs from '$lib/components/admin/AdminTranslationTabs.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import MediaPicker from '$lib/components/admin/MediaPicker.svelte';
  import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import JournalIcon from '$lib/components/public/journal/JournalIcon.svelte';

  type BlogCategory = {
    created_at?: string;
    description?: string | null;
    heading?: string | null;
    intro?: string | null;
    featured_heading?: string | null;
    image_url?: string | null;
    image_alt?: string | null;
    meta_title?: string | null;
    meta_description?: string | null;
    published_posts?: number;
    id: string;
    name: string;
    slug: string;
    sort_order: number;
    status: 'archived' | 'draft' | 'published';
    updated_at?: string;
  };

  type MediaItem = { file_name: string; file_url: string; id: string; thumbnail_url?: string | null };
  type Toast = { id: string; message: string; type: 'error' | 'success' };

  const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
  ];

  const textKeys = ['description', 'heading', 'intro', 'featured_heading', 'image_url', 'image_alt', 'meta_title', 'meta_description'] as const;

  const emptyForm = () => ({
    name: '', slug: '', sort_order: '0', status: 'draft' as BlogCategory['status'],
    description: '', heading: '', intro: '', featured_heading: '', image_url: '', image_alt: '', meta_title: '', meta_description: ''
  });

  let rows: BlogCategory[] = [];
  let mediaItems: MediaItem[] = [];
  let loading = true;
  let saving = false;
  let deleting = false;
  let error = '';
  let search = '';
  let statusFilter = 'all';
  let modalOpen = false;
  let confirmOpen = false;
  let slugManuallyEdited = false;
  let editingCategory: BlogCategory | null = null;
  let categoryToDelete: BlogCategory | null = null;
  let form = emptyForm();
  let toasts: Toast[] = [];

  // Topic lists of the category being edited.
  let topics: BlogTopicGroup[] = [];
  let topicsLoading = false;
  let newTopicTitle = '';
  let newTopicIcon = 'compass';
  let topicBusy = false;
  let translatingTopic = '';

  const slugify = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  $: if (modalOpen && !slugManuallyEdited) form.slug = slugify(form.name);

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };

  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };
  const failed = (err: unknown, fallback: string) => showToast(err instanceof Error ? err.message : fallback, 'error');

  const load = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.blogCategories.list({ search, status: statusFilter, limit: 100 });
      rows = res.data.items as BlogCategory[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load blog categories.';
    } finally {
      loading = false;
    }
  };

  const loadMedia = async () => {
    try {
      const media = await api.media.list({ file_type: 'image', limit: 200 });
      mediaItems = (media.data.items as MediaItem[]).filter((m) => m.file_url);
    } catch {
      mediaItems = [];
    }
  };

  const loadTopics = async (categoryId: string) => {
    topicsLoading = true;
    try {
      const res = await api.blogTopicGroups.list({ category_id: categoryId, limit: 100 });
      topics = [...res.data.items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    } catch (err) {
      topics = [];
      failed(err, 'Unable to load topics.');
    } finally {
      topicsLoading = false;
    }
  };

  const openCreate = () => {
    editingCategory = null;
    form = emptyForm();
    topics = [];
    slugManuallyEdited = false;
    modalOpen = true;
  };

  const openEdit = (cat: BlogCategory) => {
    editingCategory = cat;
    const next = emptyForm();
    for (const key of textKeys) next[key] = cat[key] ?? '';
    form = { ...next, name: cat.name, slug: cat.slug, sort_order: String(cat.sort_order ?? 0), status: cat.status };
    slugManuallyEdited = true;
    translatingTopic = '';
    modalOpen = true;
    loadTopics(cat.id);
  };

  const closeModal = () => { modalOpen = false; editingCategory = null; form = emptyForm(); topics = []; slugManuallyEdited = false; };

  const save = async () => {
    if (!form.name.trim()) { showToast('Name is required.', 'error'); return; }
    saving = true;
    const payload: Record<string, unknown> = { name: form.name.trim(), slug: form.slug.trim(), sort_order: Number(form.sort_order || 0), status: form.status };
    for (const key of textKeys) payload[key] = form[key].trim() || null;
    try {
      if (editingCategory) {
        await api.blogCategories.update(editingCategory.id, payload);
        showToast('Blog category updated.');
        closeModal();
      } else {
        const res = await api.blogCategories.create(payload);
        showToast('Category created. Now add the topic lists its articles fall under.');
        const created = res.data as BlogCategory | undefined;
        if (created?.id) openEdit(created);
        else closeModal();
      }
      await load();
    } catch (err) {
      failed(err, 'Unable to save blog category.');
    } finally {
      saving = false;
    }
  };

  const addTopic = async () => {
    if (!editingCategory || !newTopicTitle.trim()) return;
    topicBusy = true;
    try {
      const sort_order = topics.length ? Math.max(...topics.map((t) => t.sort_order ?? 0)) + 1 : 0;
      await api.blogTopicGroups.create({ category_id: editingCategory.id, title: newTopicTitle.trim(), icon: newTopicIcon, sort_order });
      newTopicTitle = '';
      newTopicIcon = 'compass';
      await loadTopics(editingCategory.id);
    } catch (err) {
      failed(err, 'Unable to add topic.');
    } finally {
      topicBusy = false;
    }
  };

  const saveTopic = async (topic: BlogTopicGroup, changes: Partial<BlogTopicGroup>) => {
    if (changes.title !== undefined && !changes.title.trim()) { showToast('A topic needs a title.', 'error'); return; }
    try {
      await api.blogTopicGroups.update(topic.id, changes);
      topics = topics.map((t) => (t.id === topic.id ? { ...t, ...changes } : t));
    } catch (err) {
      failed(err, 'Unable to save topic.');
    }
  };

  const moveTopic = async (index: number, step: -1 | 1) => {
    const other = index + step;
    if (other < 0 || other >= topics.length) return;
    const next = [...topics];
    [next[index], next[other]] = [next[other], next[index]];
    topics = next.map((t, i) => ({ ...t, sort_order: i }));
    topicBusy = true;
    try {
      await Promise.all(topics.map((t) => api.blogTopicGroups.update(t.id, { sort_order: t.sort_order })));
    } catch (err) {
      failed(err, 'Unable to reorder topics.');
    } finally {
      topicBusy = false;
    }
  };

  // Two clicks to remove: the first turns the bin into "Remove?" for four seconds.
  let armedTopic = '';
  let armTimer: ReturnType<typeof setTimeout> | undefined;
  const removeTopic = async (topic: BlogTopicGroup) => {
    clearTimeout(armTimer);
    if (armedTopic !== topic.id) {
      armedTopic = topic.id;
      armTimer = setTimeout(() => (armedTopic = ''), 4000);
      return;
    }
    armedTopic = '';
    try {
      await api.blogTopicGroups.remove(topic.id);
      topics = topics.filter((t) => t.id !== topic.id);
    } catch (err) {
      failed(err, 'Unable to remove topic.');
    }
  };

  const openDelete = (cat: BlogCategory) => { categoryToDelete = cat; confirmOpen = true; };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    deleting = true;
    try {
      await api.blogCategories.remove(categoryToDelete.id);
      showToast('Blog category deleted.');
      confirmOpen = false;
      categoryToDelete = null;
      await load();
    } catch (err) {
      failed(err, 'Unable to delete blog category.');
    } finally {
      deleting = false;
    }
  };

  const fmt = (v?: string) => v ? new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '-';

  onMount(() => { load(); loadMedia(); });
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Content Management"
    title="Travel Journal Categories"
    description="Each category is a page of the Travel Journal (/blog/safaris). A category without published articles shows as “Coming soon”."
    actionLabel="New Category"
    actionIcon={Plus}
    on:action={openCreate}
  />

  <AdminToolbar className="grid gap-3 md:grid-cols-[1fr_190px_auto] md:items-end">
    <label class="grid gap-2 text-sm font-medium text-ink">
      <span>Search</span>
      <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="text-ink/45" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Search categories..." on:keydown={(e) => e.key === 'Enter' && load()} />
      </span>
    </label>
    <AdminSelect label="Status" name="status_filter" bind:value={statusFilter} options={[{ label: 'All statuses', value: 'all' }, ...statusOptions]} />
    <AdminButton variant="secondary" on:click={load}>Apply</AdminButton>
  </AdminToolbar>

  {#if loading}
    <LoadingState message="Loading blog categories..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState
      title="No blog categories yet"
      message="Create your first blog category to organize articles by topic."
      actionLabel="New Category"
      icon={FolderTree}
      on:action={openCreate}
    />
  {:else}
    <div class="overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(57,61,50,0.06)]">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[820px] text-sm">
          <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">Name</th>
              <th class="px-4 py-3 text-left font-semibold">Slug</th>
              <th class="px-4 py-3 text-left font-semibold">Status</th>
              <th class="px-4 py-3 text-left font-semibold">On the site</th>
              <th class="px-4 py-3 text-left font-semibold">Sort</th>
              <th class="px-4 py-3 text-left font-semibold">Updated</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink/10">
            {#each rows as cat (cat.id)}
              <tr class="transition hover:bg-sand/25">
                <td class="px-4 py-4">
                  <div class="font-semibold text-ink">{cat.name}</div>
                  {#if cat.description}<p class="mt-0.5 line-clamp-1 text-xs text-ink/50">{cat.description}</p>{/if}
                </td>
                <td class="px-4 py-4 font-mono text-xs text-ink/60">{cat.slug}</td>
                <td class="px-4 py-4"><StatusBadge status={cat.status} /></td>
                <td class="px-4 py-4 text-ink/70">
                  {#if cat.status !== 'published'}
                    <span class="text-ink/45">Hidden</span>
                  {:else if cat.published_posts}
                    <a class="inline-flex items-center gap-1 font-medium text-forest hover:underline" href="/blog/{cat.slug}" target="_blank" rel="noopener">{cat.published_posts} article{cat.published_posts === 1 ? '' : 's'} <ExternalLink size={12} /></a>
                  {:else}
                    <span class="rounded-full bg-sand px-2 py-0.5 text-xs font-semibold text-heading">Coming soon</span>
                  {/if}
                </td>
                <td class="px-4 py-4 text-ink/60">{cat.sort_order}</td>
                <td class="px-4 py-4 text-ink/60">{fmt(cat.updated_at ?? cat.created_at)}</td>
                <td class="px-4 py-4">
                  <div class="flex justify-end gap-2">
                    <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(cat)}>
                      <Edit size={14} />Edit
                    </button>
                    <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(cat)}>
                      <Trash2 size={14} />Delete
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

{#if modalOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <div
      class="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[10px] border border-ink/10 bg-surface p-6 shadow-[0_24px_80px_rgba(57,61,50,0.18)]"
      transition:scale={{ duration: 160, start: 0.98 }}
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editingCategory ? 'Edit category' : 'New category'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editingCategory ? editingCategory.name : 'Create Journal Category'}</h2>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeModal}>
          <X size={18} />
        </button>
      </div>

      <form class="mt-6 grid gap-5" on:submit|preventDefault={save}>
        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="Name (card and breadcrumb)" name="name" bind:value={form.name} required placeholder="Safaris" />
          <label class="grid gap-2 text-sm font-medium text-ink">
            <span>Slug (/blog/…)</span>
            <input class="h-11 rounded-2xl border border-ink/10 bg-surface px-3 font-mono text-sm shadow-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" name="slug" bind:value={form.slug} required on:input={() => (slugManuallyEdited = true)} />
          </label>
        </div>

        <AdminTextArea label="Card text (on the Travel Journal page)" name="description" bind:value={form.description} rows={2} maxlength={300} placeholder="Park guides, costs, seasons and planning advice for a Tanzania safari." />

        <fieldset class="grid gap-4 rounded-[10px] border border-ink/10 p-4">
          <legend class="px-1 text-sm font-semibold text-heading">Category page</legend>
          <AdminFormInput label="Page heading (optional — the name is used when empty)" name="heading" bind:value={form.heading} placeholder="Tanzania Safari Guides" />
          <AdminTextArea label="Introduction under the heading" name="intro" bind:value={form.intro} rows={3} maxlength={1000} />
          <AdminFormInput label="Heading over the featured guides (optional)" name="featured_heading" bind:value={form.featured_heading} placeholder="Essential Safari Guides" />
          <div class="grid gap-4 sm:grid-cols-[1fr_1fr] sm:items-start">
            <MediaPicker label="Card photo (optional — the newest article photo is used when empty)" media={mediaItems} uploadFolder="blog" bind:value={form.image_url} />
            <AdminFormInput label="Describe the photo (alt text)" name="image_alt" bind:value={form.image_alt} />
          </div>
        </fieldset>

        <fieldset class="grid gap-4 rounded-[10px] border border-ink/10 p-4">
          <legend class="px-1 text-sm font-semibold text-heading">Search engines</legend>
          <AdminFormInput label="Meta title" name="meta_title" bind:value={form.meta_title} counter={60} />
          <AdminTextArea label="Meta description" name="meta_description" bind:value={form.meta_description} rows={2} counter={160} />
        </fieldset>

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminSelect label="Status" name="status" bind:value={form.status} options={statusOptions} />
          <AdminFormInput label="Sort order" name="sort_order" type="number" bind:value={form.sort_order} />
        </div>

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
          <AdminButton type="submit" disabled={saving}>
            {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
          </AdminButton>
        </div>
      </form>

      {#if editingCategory}
        <section class="mt-8 grid gap-4 border-t border-ink/10 pt-6" aria-labelledby="topic-lists">
          <div>
            <h3 id="topic-lists" class="text-lg font-bold text-ink">Topics</h3>
            <p class="mt-1 text-sm text-ink/55">“All Articles” on the category page is grouped under these headings, in this order. Pick an article's topic in the article form. Topics without published articles are hidden. Changes here save straight away.</p>
          </div>

          {#if topicsLoading}
            <p class="text-sm text-ink/55">Loading topics…</p>
          {:else}
            {#if topics.length}
              <ul class="grid gap-2">
                {#each topics as topic, index (topic.id)}
                  <li class="rounded-[10px] border border-ink/10 bg-canvas p-3">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-heading"><JournalIcon name={topic.icon} /></span>
                      <input class="h-10 min-w-[180px] flex-1 rounded-xl border border-ink/10 bg-surface px-3 text-sm outline-none focus:border-forest" aria-label="Topic title" value={topic.title}
                        on:change={(e) => saveTopic(topic, { title: e.currentTarget.value })} />
                      <select class="h-10 rounded-xl border border-ink/10 bg-surface px-2 text-sm" aria-label="Topic icon" value={topic.icon}
                        on:change={(e) => saveTopic(topic, { icon: e.currentTarget.value })}>
                        {#each TOPIC_ICON_NAMES as icon}<option value={icon}>{icon}</option>{/each}
                      </select>
                      <button type="button" class="grid size-9 place-items-center rounded-lg border border-ink/10 bg-surface disabled:opacity-30" aria-label="Move up" disabled={index === 0 || topicBusy} on:click={() => moveTopic(index, -1)}><ArrowUp size={14} /></button>
                      <button type="button" class="grid size-9 place-items-center rounded-lg border border-ink/10 bg-surface disabled:opacity-30" aria-label="Move down" disabled={index === topics.length - 1 || topicBusy} on:click={() => moveTopic(index, 1)}><ArrowDown size={14} /></button>
                      <button type="button" class="grid size-9 place-items-center rounded-lg border border-ink/10 bg-surface {translatingTopic === topic.id ? 'text-forest' : ''}" aria-label="Translate topic" aria-expanded={translatingTopic === topic.id} on:click={() => (translatingTopic = translatingTopic === topic.id ? '' : topic.id)}><Languages size={14} /></button>
                      <button type="button" class="grid h-9 min-w-9 place-items-center rounded-lg border px-2 {armedTopic === topic.id ? 'border-red-600 bg-red-600 text-xs font-semibold text-white' : 'border-red-200 bg-surface text-red-700'}" aria-label={armedTopic === topic.id ? 'Click again to remove this topic — its articles move to “Other articles”' : 'Remove topic'} title={armedTopic === topic.id ? 'Its articles stay published and move to “Other articles”' : 'Remove topic'} on:click={() => removeTopic(topic)}>{#if armedTopic === topic.id}Remove?{:else}<Trash2 size={14} />{/if}</button>
                    </div>
                    {#if translatingTopic === topic.id}
                      <div class="mt-3"><AdminTranslationTabs entityType="blog_topic_groups" entityId={topic.id} on:toast={(event) => showToast(event.detail.message, event.detail.type)} /></div>
                    {/if}
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="rounded-[10px] border border-dashed border-ink/15 p-4 text-sm text-ink/55">No topics yet. Without topics, all articles are listed under “Other articles”.</p>
            {/if}

            <form class="flex flex-wrap items-end gap-2" on:submit|preventDefault={addTopic}>
              <label class="grid min-w-[200px] flex-1 gap-1.5 text-sm font-medium text-ink">
                <span>New topic</span>
                <input class="h-10 rounded-xl border border-ink/10 bg-surface px-3 text-sm outline-none focus:border-forest" bind:value={newTopicTitle} placeholder="Planning & Costs" />
              </label>
              <label class="grid gap-1.5 text-sm font-medium text-ink">
                <span>Icon</span>
                <select class="h-10 rounded-xl border border-ink/10 bg-surface px-2 text-sm" bind:value={newTopicIcon}>
                  {#each TOPIC_ICON_NAMES as icon}<option value={icon}>{icon}</option>{/each}
                </select>
              </label>
              <AdminButton type="submit" variant="secondary" disabled={topicBusy || !newTopicTitle.trim()}><Plus size={14} /> Add topic</AdminButton>
            </form>
          {/if}
        </section>

        <section class="mt-8 border-t border-ink/10 pt-6">
          <AdminTranslationTabs entityType="blog_categories" entityId={editingCategory.id} on:toast={(event) => showToast(event.detail.message, event.detail.type)} />
        </section>
      {/if}
    </div>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete blog category"
  message={`Delete "${categoryToDelete?.name ?? 'this category'}"? Its topics are deleted too, and its articles lose their category.`}
  on:cancel={() => { confirmOpen = false; categoryToDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(57,61,50,0.18)]">
    Deleting category...
  </div>
{/if}
