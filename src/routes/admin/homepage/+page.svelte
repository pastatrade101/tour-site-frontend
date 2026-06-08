<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import {
    ArrowDown,
    ArrowUp,
    Edit,
    Image as ImageIcon,
    LayoutTemplate,
    Plus,
    Save,
    Trash2,
    X
  } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  type Section = {
    button_text?: string | null;
    button_url?: string | null;
    content?: string | null;
    extra_data?: Record<string, unknown> | unknown[] | null;
    id: string;
    image_url?: string | null;
    is_active: boolean;
    section_key: string;
    sort_order: number;
    subtitle?: string | null;
    title?: string | null;
  };

  type MediaItem = { file_name: string; file_url: string; id: string };
  type Option = { label: string; value: string };
  type Toast = { id: string; message: string; type: 'error' | 'success' };
  type ImageMode = 'media' | 'none' | 'url';

  const recommendedKeys = [
    'hero',
    'featured_tours',
    'featured_destinations',
    'why_choose_us',
    'testimonials',
    'gallery_preview',
    'faq_preview',
    'blog_preview',
    'ai_advisor_cta',
    'final_cta'
  ];

  const imageModeOptions: Option[] = [
    { label: 'No image', value: 'none' },
    { label: 'Manual URL', value: 'url' },
    { label: 'Choose from Media Library', value: 'media' }
  ];

  const emptyForm = () => ({
    button_text: '',
    button_url: '',
    content: '',
    image_url: '',
    is_active: true,
    section_key: '',
    sort_order: '0',
    subtitle: '',
    title: ''
  });

  let rows: Section[] = [];
  let mediaItems: MediaItem[] = [];
  let mediaOptions: Option[] = [{ label: 'Select an image', value: '' }];

  let loading = true;
  let loadingMedia = false;
  let saving = false;
  let deleting = false;
  let reordering = false;
  let error = '';

  let modalOpen = false;
  let confirmOpen = false;
  let editing: Section | null = null;
  let toDelete: Section | null = null;
  let form = emptyForm();
  let extraDataText = '{}';
  let imageMode: ImageMode = 'none';
  let mediaId = '';
  let toasts: Toast[] = [];

  $: sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order || a.section_key.localeCompare(b.section_key));

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };

  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  const prettyKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const load = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.homepage.get({ all: true });
      rows = res.data as unknown as Section[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load homepage sections.';
    } finally {
      loading = false;
    }
  };

  const loadMedia = async () => {
    if (mediaItems.length || loadingMedia) return;
    loadingMedia = true;
    try {
      const res = await api.media.list({ file_type: 'image', limit: 200 });
      mediaItems = (res.data.items as unknown as MediaItem[]).filter((m) => m.file_url);
      mediaOptions = [{ label: 'Select an image', value: '' }, ...mediaItems.map((m) => ({ label: m.file_name, value: m.id }))];
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load media library.', 'error');
    } finally {
      loadingMedia = false;
    }
  };

  const nextOrder = () => (sorted.length ? Math.max(...sorted.map((s) => s.sort_order)) + 1 : 0);

  const openCreate = () => {
    editing = null;
    form = { ...emptyForm(), sort_order: String(nextOrder()) };
    extraDataText = '{}';
    imageMode = 'none';
    mediaId = '';
    modalOpen = true;
  };

  const openEdit = (section: Section) => {
    editing = section;
    form = {
      button_text: section.button_text ?? '',
      button_url: section.button_url ?? '',
      content: section.content ?? '',
      image_url: section.image_url ?? '',
      is_active: section.is_active,
      section_key: section.section_key,
      sort_order: String(section.sort_order ?? 0),
      subtitle: section.subtitle ?? '',
      title: section.title ?? ''
    };
    extraDataText = JSON.stringify(section.extra_data ?? {}, null, 2);
    imageMode = section.image_url ? 'url' : 'none';
    mediaId = '';
    modalOpen = true;
  };

  const closeModal = () => { modalOpen = false; editing = null; form = emptyForm(); extraDataText = '{}'; };

  const applyImageMode = async () => {
    if (imageMode === 'none') { form.image_url = ''; mediaId = ''; }
    if (imageMode === 'media') await loadMedia();
  };

  const applyMediaSelection = () => {
    const found = mediaItems.find((m) => m.id === mediaId);
    form.image_url = found?.file_url ?? '';
  };

  const save = async () => {
    if (!/^[a-z0-9_]{2,}$/.test(form.section_key.trim())) {
      showToast('Section key is required (lowercase letters, numbers, underscores).', 'error');
      return;
    }

    let extra: unknown = {};
    try {
      extra = extraDataText.trim() ? JSON.parse(extraDataText) : {};
    } catch {
      showToast('Extra data must be valid JSON.', 'error');
      return;
    }

    saving = true;
    const payload = {
      button_text: form.button_text.trim() || null,
      button_url: form.button_url.trim() || null,
      content: form.content.trim() || null,
      extra_data: extra,
      image_url: form.image_url.trim() || null,
      is_active: form.is_active,
      section_key: form.section_key.trim(),
      sort_order: Number(form.sort_order || 0),
      subtitle: form.subtitle.trim() || null,
      title: form.title.trim() || null
    };

    try {
      if (editing) {
        await api.homepage.updateSection(editing.id, payload);
        showToast('Section updated successfully.');
      } else {
        await api.homepage.createSection(payload);
        showToast('Section created successfully.');
      }
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save section.', 'error');
    } finally {
      saving = false;
    }
  };

  const toggleActive = async (section: Section) => {
    try {
      await api.homepage.updateSection(section.id, { is_active: !section.is_active });
      showToast(section.is_active ? 'Section deactivated.' : 'Section activated.');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to toggle section.', 'error');
    }
  };

  const move = async (section: Section, direction: 'down' | 'up') => {
    const idx = sorted.findIndex((s) => s.id === section.id);
    const swapWith = direction === 'up' ? sorted[idx - 1] : sorted[idx + 1];
    if (!swapWith) return;
    reordering = true;
    try {
      await Promise.all([
        api.homepage.updateSection(section.id, { sort_order: swapWith.sort_order }),
        api.homepage.updateSection(swapWith.id, { sort_order: section.sort_order })
      ]);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to reorder sections.', 'error');
    } finally {
      reordering = false;
    }
  };

  const openDelete = (section: Section) => { toDelete = section; confirmOpen = true; };

  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.homepage.removeSection(toDelete.id);
      showToast('Section deleted successfully.');
      confirmOpen = false;
      toDelete = null;
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete section.', 'error');
    } finally {
      deleting = false;
    }
  };

  onMount(load);
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Content Management"
    title="Homepage Sections"
    description="Manage homepage content blocks without editing code. Reorder, activate, and edit each section."
    actionLabel="New Section"
    actionIcon={Plus}
    on:action={openCreate}
  />

  {#if loading}
    <LoadingState message="Loading homepage sections..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState
      title="No homepage sections yet"
      message="Create your first homepage section. Use recommended keys like hero, featured_tours, or final_cta."
      actionLabel="New Section"
      icon={LayoutTemplate}
      on:action={openCreate}
    />
  {:else}
    <div class="grid gap-4">
      {#each sorted as section, index (section.id)}
        <article class={`grid gap-4 rounded-[24px] border bg-white p-5 shadow-[0_14px_44px_rgba(15,47,36,0.06)] lg:grid-cols-[auto_140px_1fr_auto] lg:items-center ${section.is_active ? 'border-ink/10' : 'border-dashed border-ink/20 opacity-75'}`} transition:fade={{ duration: 120 }}>
          <!-- reorder -->
          <div class="flex flex-row gap-1 lg:flex-col">
            <button class="grid h-8 w-8 place-items-center rounded-lg border border-ink/10 bg-white text-ink/55 transition hover:bg-sand/70 disabled:opacity-30" type="button" aria-label="Move up" disabled={index === 0 || reordering} on:click={() => move(section, 'up')}>
              <ArrowUp size={15} />
            </button>
            <button class="grid h-8 w-8 place-items-center rounded-lg border border-ink/10 bg-white text-ink/55 transition hover:bg-sand/70 disabled:opacity-30" type="button" aria-label="Move down" disabled={index === sorted.length - 1 || reordering} on:click={() => move(section, 'down')}>
              <ArrowDown size={15} />
            </button>
          </div>

          <!-- thumb -->
          <div class="aspect-video overflow-hidden rounded-xl bg-sand/40 ring-1 ring-ink/10">
            {#if section.image_url}
              <img class="h-full w-full object-cover" src={section.image_url} alt={section.title || section.section_key} />
            {:else}
              <div class="grid h-full w-full place-items-center text-ink/25"><ImageIcon size={22} /></div>
            {/if}
          </div>

          <!-- details -->
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-forest/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-forest">{section.section_key}</span>
              <span class="rounded-full bg-sand/70 px-2 py-0.5 text-[11px] font-semibold text-ink/55">Sort {section.sort_order}</span>
              {#if section.is_active}
                <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600 ring-1 ring-emerald-200/60">Active</span>
              {:else}
                <span class="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-bold text-ink/45">Inactive</span>
              {/if}
            </div>
            <h3 class="mt-2 truncate text-lg font-bold text-ink">{section.title || prettyKey(section.section_key)}</h3>
            {#if section.subtitle}<p class="mt-0.5 line-clamp-1 text-sm text-ink/60">{section.subtitle}</p>{/if}
            {#if section.button_text}
              <span class="mt-2 inline-flex items-center gap-1 rounded-lg bg-goldfinch-gold/20 px-2 py-0.5 text-[11px] font-semibold text-deep-green">Button: {section.button_text}</span>
            {/if}
          </div>

          <!-- actions -->
          <div class="flex flex-wrap items-center gap-2 lg:justify-end">
            <label class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs font-semibold text-ink shadow-sm">
              <input class="h-4 w-4 accent-forest" type="checkbox" checked={section.is_active} on:change={() => toggleActive(section)} />
              {section.is_active ? 'Active' : 'Inactive'}
            </label>
            <button class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(section)}>
              <Edit size={14} />Edit
            </button>
            <button class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(section)}>
              <Trash2 size={14} />Delete
            </button>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

{#if modalOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <form
      class="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[30px] border border-ink/10 bg-white p-6 shadow-[0_24px_80px_rgba(15,47,36,0.18)]"
      transition:scale={{ duration: 160, start: 0.98 }}
      on:submit|preventDefault={save}
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editing ? 'Edit section' : 'New section'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editing ? prettyKey(editing.section_key) : 'Create homepage section'}</h2>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-white text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeModal}>
          <X size={18} />
        </button>
      </div>

      <div class="mt-6 grid gap-4">
        <div>
          <AdminFormInput label="Section key" name="section_key" bind:value={form.section_key} placeholder="e.g. hero" required />
          {#if !editing}
            <div class="mt-2 flex flex-wrap gap-1.5">
              {#each recommendedKeys as key}
                <button class="rounded-full border border-ink/10 bg-sand/40 px-2.5 py-1 font-mono text-[11px] font-semibold text-ink/60 transition hover:border-forest/40 hover:bg-sand/70" type="button" on:click={() => (form.section_key = key)}>{key}</button>
              {/each}
            </div>
          {/if}
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="Title" name="title" bind:value={form.title} placeholder="Section heading" />
          <AdminFormInput label="Subtitle" name="subtitle" bind:value={form.subtitle} placeholder="Supporting line" />
        </div>

        <AdminTextArea label="Content" name="content" bind:value={form.content} rows={3} placeholder="Optional body text for this section." />

        <!-- image -->
        <div class="rounded-[22px] border border-ink/10 bg-sand/25 p-4">
          <div class="grid gap-4 sm:grid-cols-[220px_1fr]">
            <AdminSelect label="Image source" name="image_mode" bind:value={imageMode} options={imageModeOptions} on:change={applyImageMode} />
            {#if imageMode === 'media'}
              <AdminSelect label={loadingMedia ? 'Loading...' : 'Media Library'} name="media_id" bind:value={mediaId} options={mediaOptions} on:change={applyMediaSelection} />
            {:else if imageMode === 'url'}
              <AdminFormInput label="Image URL" name="image_url" bind:value={form.image_url} placeholder="https://..." />
            {:else}
              <div class="grid place-items-center rounded-2xl border border-dashed border-ink/15 bg-white/70 p-3 text-sm text-ink/50">No image.</div>
            {/if}
          </div>
          {#if form.image_url}
            <img class="mt-4 h-28 w-full rounded-2xl object-cover ring-1 ring-ink/10" src={form.image_url} alt="Section preview" />
          {/if}
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="Button text" name="button_text" bind:value={form.button_text} placeholder="e.g. Plan My Trip" />
          <AdminFormInput label="Button URL" name="button_url" bind:value={form.button_url} placeholder="e.g. /plan-my-trip" />
        </div>

        <label class="grid gap-2 text-sm font-medium text-ink">
          <span>Extra data (JSON)</span>
          <textarea class="min-h-[120px] rounded-2xl border border-ink/10 bg-white px-3 py-2 font-mono text-xs shadow-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" bind:value={extraDataText} spellcheck="false" placeholder={'{\n  "secondary_cta_text": "Talk to a Travel Advisor"\n}'}></textarea>
          <span class="text-xs text-ink/45">Advanced configuration stored as JSON (e.g. secondary CTA, feature lists).</span>
        </label>

        <div class="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <AdminFormInput label="Sort order" name="sort_order" type="number" bind:value={form.sort_order} />
          <label class="flex h-11 cursor-pointer items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 transition hover:bg-sand/30">
            <input class="h-4 w-4 accent-forest" type="checkbox" bind:checked={form.is_active} />
            <span class="text-sm font-semibold text-ink">Active (visible on site)</span>
          </label>
        </div>

        <!-- live preview -->
        <div class="overflow-hidden rounded-[22px] border border-ink/10">
          <div class="border-b border-ink/10 bg-sand/40 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Live preview</div>
          <div class="relative grid min-h-[150px] place-items-center bg-deep-green p-6 text-center text-white">
            {#if form.image_url}
              <img class="absolute inset-0 h-full w-full object-cover" src={form.image_url} alt="" />
              <div class="absolute inset-0 bg-deep-green/55"></div>
            {/if}
            <div class="relative z-10">
              <h3 class="text-xl font-extrabold">{form.title || prettyKey(form.section_key || 'section')}</h3>
              {#if form.subtitle}<p class="mx-auto mt-2 max-w-md text-sm text-white/80">{form.subtitle}</p>{/if}
              {#if form.button_text}
                <span class="mt-4 inline-flex h-10 items-center rounded-xl bg-goldfinch-gold px-5 text-sm font-bold text-deep-green">{form.button_text}</span>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Section'}
        </AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete homepage section"
  message={`Delete the "${toDelete?.section_key ?? 'this'}" section? This action soft-deletes the record.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,47,36,0.18)]">
    Deleting section...
  </div>
{/if}
