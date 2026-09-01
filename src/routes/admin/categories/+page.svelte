<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { ArrowDown, ArrowUp, ChevronDown, Edit, Plus, Search, Trash2, X } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminFileUpload from '$lib/components/admin/AdminFileUpload.svelte';
  import MediaPicker from '$lib/components/admin/MediaPicker.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminStyleLandingEditor from '$lib/components/admin/AdminStyleLandingEditor.svelte';
  import AdminRichText from '$lib/components/admin/AdminRichText.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import AdminToolbar from '$lib/components/admin/AdminToolbar.svelte';
  import AdminTranslationTabs from '$lib/components/admin/AdminTranslationTabs.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import { hasRichContent, toMetaText } from '$lib/richText';
  import {
    defaultStyleLandingContent,
    parseStyleLandingJson,
    type StyleLandingContent
  } from '$lib/safariStyleLanding';

  type FitnessLevel = '' | 'easy' | 'moderate' | 'active' | 'challenging' | 'strenuous';

  type Category = {
    id: string;
    name: string;
    slug: string;
    short_description?: string | null;
    description?: string | null;
    who_its_for?: string | null;
    /** Legacy free text; read-only fallback until fitness_level is set. */
    fitness?: string | null;
    fitness_level?: FitnessLevel | null;
    min_days?: number | null;
    max_days?: number | null;
    best_months?: number[] | null;
    planning_notes?: Record<string, unknown> | null;
    landing_page_content?: StyleLandingContent | null;
    highlights?: string[] | null;
    icon_url?: string | null;
    image_url?: string | null;
    lottie_url?: string | null;
    status: 'draft' | 'published' | 'archived';
    is_featured?: boolean | null;
    sort_order: number;
    meta_title?: string | null;
    meta_description?: string | null;
    seo_image_url?: string | null;
    created_at?: string;
    updated_at?: string;
  };

  type CategoryForm = {
    best_months: number[];
    description: string;
    fitness_level: FitnessLevel;
    highlights: string[];
    icon_url: string;
    image_url: string;
    is_featured: boolean;
    lottie_url: string;
    max_days: string;
    meta_description: string;
    meta_title: string;
    min_days: string;
    name: string;
    seo_image_url: string;
    short_description: string;
    slug: string;
    sort_order: string;
    status: 'draft' | 'published' | 'archived';
    who_its_for: string;
    planning_costs: string;
    planning_route: string;
    landing_page_json: string;
  };

  type VisualType = 'none' | 'icon' | 'lottie';
  type LottieSource = 'upload' | 'url';

  type MediaItem = { file_name: string; file_url: string; id: string; thumbnail_url?: string | null };

  type Toast = {
    id: string;
    message: string;
    type: 'error' | 'success';
  };

  const emptyForm = (): CategoryForm => ({
    best_months: [],
    description: '',
    fitness_level: '',
    highlights: [''],
    icon_url: '',
    image_url: '',
    is_featured: false,
    lottie_url: '',
    max_days: '',
    meta_description: '',
    meta_title: '',
    min_days: '',
    name: '',
    seo_image_url: '',
    short_description: '',
    slug: '',
    sort_order: '0',
    status: 'draft',
    who_its_for: '',
    planning_costs: '',
    planning_route: '',
    landing_page_json: JSON.stringify(defaultStyleLandingContent(), null, 2)
  });

  const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
  ];

  const fitnessOptions = [
    { label: 'None', value: '' },
    { label: 'Easy', value: 'easy' },
    { label: 'Moderate', value: 'moderate' },
    { label: 'Active', value: 'active' },
    { label: 'Challenging', value: 'challenging' },
    { label: 'Strenuous', value: 'strenuous' }
  ];

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const visualTypeOptions = [
    { label: 'None', value: 'none' },
    { label: 'Icon', value: 'icon' },
    { label: 'Lottie animation', value: 'lottie' }
  ];

  const lottieSourceOptions = [
    { label: 'Upload Lottie JSON', value: 'upload' },
    { label: 'Paste Lottie URL', value: 'url' }
  ];

  let rows: Category[] = [];
  let mediaItems: MediaItem[] = [];
  let loadingMedia = false;
  let loading = true;
  let saving = false;
  let deleting = false;
  let error = '';
  let search = '';
  let status = 'all';
  let modalOpen = false;
  let confirmOpen = false;
  let slugManuallyEdited = false;
  let editingCategory: Category | null = null;
  let categoryToDelete: Category | null = null;
  let form = emptyForm();
  let visualType: VisualType = 'none';
  let lastVisualType: VisualType = 'none';
  let lottieSource: LottieSource = 'upload';
  let seoOpen = false;
  let toasts: Toast[] = [];

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  $: if (modalOpen && !slugManuallyEdited) {
    form.slug = slugify(form.name);
  }

  // Switching the visual type discards the other type's value, so a category
  // can never carry both an icon and a Lottie at once.
  $: if (modalOpen && visualType !== lastVisualType) {
    form.icon_url = '';
    form.lottie_url = '';
    lastVisualType = visualType;
  }

  // Cross-field rule surfaced while typing, not on submit.
  $: daysError =
    form.min_days && form.max_days && Number(form.max_days) < Number(form.min_days)
      ? 'Maximum days must be greater than or equal to minimum days.'
      : '';

  const loadMedia = async () => {
    if (mediaItems.length || loadingMedia) return;
    loadingMedia = true;
    try {
      const res = await api.media.list({ file_type: 'image', limit: 200 });
      mediaItems = (res.data.items as unknown as MediaItem[]).filter((m) => m.file_url);
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Unable to load media library.', 'error');
    } finally {
      loadingMedia = false;
    }
  };

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => {
      toasts = toasts.filter((toast) => toast.id !== id);
    }, 3500);
  };

  const dismissToast = (event: CustomEvent<string>) => {
    toasts = toasts.filter((toast) => toast.id !== event.detail);
  };

  const loadCategories = async () => {
    loading = true;
    error = '';

    try {
      const response = await api.categories.list({
        limit: 50,
        search,
        status
      });
      rows = response.data.items as Category[];
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load categories.';
    } finally {
      loading = false;
    }
  };

  const openCreateModal = async () => {
    editingCategory = null;
    form = emptyForm();
    visualType = 'none';
    lastVisualType = visualType;
    lottieSource = 'upload';
    seoOpen = false;
    slugManuallyEdited = false;
    modalOpen = true;
    await loadMedia();
  };

  const openEditModal = async (category: Category) => {
    editingCategory = category;
    form = {
      best_months: Array.isArray(category.best_months) ? category.best_months.map(Number).filter((m) => m >= 1 && m <= 12) : [],
      description: category.description ?? '',
      fitness_level: (category.fitness_level ?? '') as FitnessLevel,
      highlights: Array.isArray(category.highlights) && category.highlights.length ? category.highlights.map(String) : [''],
      icon_url: category.icon_url ?? '',
      image_url: category.image_url ?? '',
      is_featured: Boolean(category.is_featured),
      lottie_url: category.lottie_url ?? '',
      max_days: category.max_days != null ? String(category.max_days) : '',
      meta_description: category.meta_description ?? '',
      meta_title: category.meta_title ?? '',
      min_days: category.min_days != null ? String(category.min_days) : '',
      name: category.name,
      seo_image_url: category.seo_image_url ?? '',
      short_description: category.short_description ?? '',
      slug: category.slug,
      sort_order: String(category.sort_order ?? 0),
      status: category.status ?? 'draft',
      who_its_for: category.who_its_for ?? '',
      planning_costs: String((category.planning_notes as Record<string, unknown> | null)?.costs ?? ''),
      planning_route: String((category.planning_notes as Record<string, unknown> | null)?.route ?? ''),
      landing_page_json: JSON.stringify(category.landing_page_content ?? defaultStyleLandingContent(category), null, 2)
    };
    visualType = category.lottie_url ? 'lottie' : category.icon_url ? 'icon' : 'none';
    lastVisualType = visualType;
    lottieSource = 'url';
    // Open the SEO section only when there is something in it to see.
    seoOpen = Boolean(category.meta_title || category.meta_description || category.seo_image_url);
    slugManuallyEdited = true;
    modalOpen = true;
    await loadMedia();
  };

  const closeModal = () => {
    modalOpen = false;
    editingCategory = null;
    slugManuallyEdited = false;
    form = emptyForm();
    visualType = 'none';
    lastVisualType = visualType;
    lottieSource = 'upload';
    seoOpen = false;
  };

  const toggleMonth = (month: number) => {
    form.best_months = form.best_months.includes(month)
      ? form.best_months.filter((m) => m !== month)
      : [...form.best_months, month].sort((a, b) => a - b);
  };

  const moveHighlight = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= form.highlights.length) return;
    const next = [...form.highlights];
    [next[index], next[target]] = [next[target], next[index]];
    form.highlights = next;
  };

  // Highlights are individually editable bullets, matching the tours form. An
  // empty bullet is a placeholder row, not content, so it is dropped on save.
  const cleanHighlights = () =>
    form.highlights.map((item) => String(item ?? '').trim()).filter((item) => hasRichContent(item));

  const addHighlight = () => {
    form.highlights = [...form.highlights, ''];
  };

  const removeHighlight = (index: number) => {
    const next = form.highlights.filter((_, currentIndex) => currentIndex !== index);
    form.highlights = next.length ? next : [''];
  };

  $: landingPageValidation = parseStyleLandingJson(form.landing_page_json);
  $: landingPageError = landingPageValidation.errors[0] ?? '';

  /**
   * What a generated template is built from. Everything already typed into the
   * form above, so "start from a template" produces a page about THIS style
   * rather than a generic one the operator has to rewrite from scratch.
   */
  $: landingSeed = {
    name: form.name,
    short_description: form.short_description,
    description: form.description,
    highlights: cleanHighlights(),
    image_url: form.image_url,
    best_months: form.best_months,
    planning_notes: { costs: form.planning_costs, route: form.planning_route }
  };

  // Legacy `fitness` free text is deliberately absent: the API no longer
  // accepts it, and leaving it out of the update payload is what keeps the
  // stored text intact as a public-page fallback.
  const payload = () => ({
    best_months: form.best_months,
    description: form.description || null,
    fitness_level: form.fitness_level || null,
    highlights: cleanHighlights(),
    icon_url: visualType === 'icon' ? form.icon_url || null : null,
    image_url: form.image_url.trim() || null,
    is_featured: form.is_featured,
    lottie_url: visualType === 'lottie' ? form.lottie_url || null : null,
    max_days: form.max_days ? Number(form.max_days) : null,
    meta_description: form.meta_description || null,
    meta_title: form.meta_title || null,
    min_days: form.min_days ? Number(form.min_days) : null,
    name: form.name.trim(),
    seo_image_url: form.seo_image_url.trim() || null,
    short_description: form.short_description.trim() || null,
    slug: form.slug.trim(),
    sort_order: Number(form.sort_order || 0),
    status: form.status,
    who_its_for: form.who_its_for || null,
    planning_notes:
      form.planning_costs.trim() || form.planning_route.trim()
        ? { costs: form.planning_costs.trim() || null, route: form.planning_route.trim() || null }
        : null,
    landing_page_content: landingPageValidation.data
  });

  const saveCategory = async () => {
    if (saving) return;
    if (daysError) {
      showToast(daysError, 'error');
      return;
    }
    if (form.status === 'published' && landingPageValidation.errors.length) {
      showToast(`Landing page is incomplete: ${landingPageValidation.errors[0]}`, 'error');
      return;
    }
    if (form.landing_page_json.trim() && landingPageValidation.errors.length) {
      showToast(landingPageValidation.errors[0], 'error');
      return;
    }
    saving = true;

    try {
      if (editingCategory) {
        await api.categories.update(editingCategory.id, payload());
        showToast('Category updated successfully.');
      } else {
        await api.categories.create(payload());
        showToast('Category created successfully.');
      }

      closeModal();
      await loadCategories();
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Unable to save category.', 'error');
    } finally {
      saving = false;
    }
  };

  const openDeleteConfirm = (category: Category) => {
    categoryToDelete = category;
    confirmOpen = true;
  };

  const deleteCategory = async () => {
    if (!categoryToDelete) return;
    deleting = true;

    try {
      await api.categories.remove(categoryToDelete.id);
      showToast('Category deleted successfully.');
      confirmOpen = false;
      categoryToDelete = null;
      await loadCategories();
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Unable to delete category.', 'error');
    } finally {
      deleting = false;
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  };

  onMount(loadCategories);
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
<AdminPageHeader
  eyebrow="Tour Management"
  title="Tour Categories"
  description="Manage tour package categories, visual badges, sort order, publishing status, and SEO metadata."
  actionLabel="New Category"
  actionIcon={Plus}
  on:action={openCreateModal}
/>

<AdminToolbar className="grid gap-3 md:grid-cols-[1fr_190px_auto] md:items-end">
  <label class="grid gap-2 text-sm font-medium text-ink">
    <span>Search</span>
    <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
      <Search size={16} class="text-ink/45" />
      <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Search categories..." on:keydown={(event) => event.key === 'Enter' && loadCategories()} />
    </span>
  </label>

  <AdminSelect label="Status" name="status_filter" bind:value={status} options={[{ label: 'All statuses', value: 'all' }, ...statusOptions]} />

  <AdminButton variant="secondary" on:click={loadCategories}>Apply</AdminButton>
</AdminToolbar>

{#if loading}
  <LoadingState message="Loading categories..." />
{:else if error}
  <ErrorState message={error} />
{:else if rows.length === 0}
  <AdminEmptyState
    title="No categories found"
    message="Create your first tour category to organize Goldfinch tour packages and prepare reusable CMS navigation."
    actionLabel="Create category"
    on:action={openCreateModal}
  />
{:else}
  <div class="overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(57,61,50,0.06)]">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[920px] text-start text-sm">
        <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
          <tr>
            <th class="px-4 py-3 font-semibold">Name</th>
            <th class="px-4 py-3 font-semibold">Slug</th>
            <th class="px-4 py-3 font-semibold">Status</th>
            <th class="px-4 py-3 font-semibold">Sort</th>
            <th class="px-4 py-3 font-semibold">Updated</th>
            <th class="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink/10">
          {#each rows as category}
            <tr class="transition hover:bg-sand/25">
              <td class="px-4 py-4">
                <div class="font-semibold text-ink">{category.name}</div>
                <p class="mt-1 line-clamp-1 text-xs text-ink/55">{toMetaText(category.description || 'No description yet.', 120)}</p>
              </td>
              <td class="px-4 py-4 text-ink/65">{category.slug}</td>
              <td class="px-4 py-4"><StatusBadge status={category.status} /></td>
              <td class="px-4 py-4 text-ink/65">{category.sort_order ?? 0}</td>
              <td class="px-4 py-4 text-ink/65">{formatDate(category.updated_at ?? category.created_at)}</td>
              <td class="px-4 py-4">
                <div class="flex justify-end gap-2">
                  <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEditModal(category)}>
                    <Edit size={14} />
                    Edit
                  </button>
                  <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDeleteConfirm(category)}>
                    <Trash2 size={14} />
                    Delete
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
    <div class="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[10px] border border-ink/10 bg-surface p-6 shadow-[0_24px_80px_rgba(57,61,50,0.18)]" transition:scale={{ duration: 160, start: 0.98 }}>
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editingCategory ? 'Edit category' : 'New category'}</p>
          <h2 class="mt-2 text-2xl font-bold tracking-normal text-ink">{editingCategory ? editingCategory.name : 'Create Tour Category'}</h2>
        </div>
        <button class="grid h-10 w-10 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close modal" on:click={closeModal}>
          <X size={18} />
        </button>
      </div>

      <form class="mt-6 grid gap-5" on:submit|preventDefault={saveCategory}>
        <!-- ── 1 · Basic information ─────────────────────────────────────── -->
        <section class="grid gap-4 rounded-[8px] border border-ink/10 bg-sand/20 p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Basic information</p>

          <div class="grid gap-4 md:grid-cols-2">
            <AdminFormInput label="Name" name="name" bind:value={form.name} required placeholder="Wildlife Safari" />

            <label class="grid gap-1.5">
              <span class="text-[13px] font-semibold text-ink/65">Slug</span>
              <input
                class="h-11 rounded-md border border-ink/15 bg-black/[0.02] px-3.5 text-sm text-ink outline-none transition hover:border-ink/25 focus:border-forest focus:bg-surface focus:ring-2 focus:ring-forest/20"
                name="slug"
                bind:value={form.slug}
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                title="Lowercase letters, numbers and single hyphens, e.g. wildlife-safari"
                on:input={() => (slugManuallyEdited = true)}
              />
              <span class="text-[11px] text-ink/40">Auto-generated from the name until you edit it.</span>
            </label>
          </div>

          <AdminTextArea
            label="Short description"
            name="short_description"
            bind:value={form.short_description}
            rows={2}
            maxlength={250}
            placeholder="Experience Tanzania's iconic wildlife destinations through expertly designed safari journeys."
          />

          <AdminRichText label="Description" name="description" bind:value={form.description} rows={7} placeholder="Full category introduction for the public experience page." />

          <AdminTextArea label="Who it's for" name="who_its_for" bind:value={form.who_its_for} rows={2} placeholder="Ideal for first-time safari travellers, couples, families and wildlife enthusiasts." />

          <!--
            The two planning facts that have no home of their own. Best months,
            trip length and fitness already have fields below; the parks a style
            visits are read from its published tours, so they cannot go stale.
          -->
          <AdminRichText
            label="Travel costs — how to plan"
            name="planning_costs"
            bind:value={form.planning_costs}
            rows={4}
            placeholder="What a trip of this style typically costs and what drives the price. A short list often reads better than a paragraph — park fees, lodge standard, season, group size."
          />
          <AdminRichText
            label="Route planning — how to plan"
            name="planning_route"
            bind:value={form.planning_route}
            rows={4}
            placeholder="How the route is usually put together for this style — where to start, how long to stay, what to leave out."
          />
          <p class="-mt-1 text-xs text-ink/55">Both optional, and both take bullets. Each appears as its own card on the style page; leave one blank and it is hidden.</p>
        </section>

        <!-- ── 2 · The safari-style page, as a form ─────────────────────── -->
        <AdminStyleLandingEditor
          bind:json={form.landing_page_json}
          seed={landingSeed}
          on:toast={(e) => showToast(e.detail.message, e.detail.tone)}
        />

        <!-- ── 3 · Travel information ────────────────────────────────────── -->
        <section class="grid gap-4 rounded-[8px] border border-ink/10 bg-sand/20 p-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Travel information</p>
            <p class="mt-1 text-xs text-ink/55">Shown on the public /experiences/{form.slug || 'slug'} page. Leave blank to hide.</p>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <AdminSelect label="Fitness level" name="fitness_level" bind:value={form.fitness_level} options={fitnessOptions} />
            <AdminFormInput label="Recommended minimum days" name="min_days" type="number" min={1} bind:value={form.min_days} placeholder="3" />
            <AdminFormInput label="Recommended maximum days" name="max_days" type="number" min={1} bind:value={form.max_days} placeholder="10" />
          </div>
          {#if daysError}
            <p class="-mt-2 text-xs font-semibold text-clay">{daysError}</p>
          {/if}
          {#if editingCategory?.fitness && !form.fitness_level}
            <p class="-mt-2 text-xs text-ink/45">
              Legacy fitness text — “{editingCategory.fitness}” — still shows publicly until you pick a level here.
            </p>
          {/if}

          <div class="grid gap-1.5">
            <span class="text-[13px] font-semibold text-ink/65">Best months</span>
            <div class="flex flex-wrap gap-1.5">
              {#each MONTHS as month, monthIndex}
                {@const monthNumber = monthIndex + 1}
                {@const selected = form.best_months.includes(monthNumber)}
                <button
                  class={`h-9 rounded-full border px-3 text-xs font-bold transition ${selected ? 'border-deep-green bg-deep-green text-white' : 'border-ink/15 bg-surface text-ink/65 hover:border-forest/40 hover:text-heading'}`}
                  type="button"
                  aria-pressed={selected}
                  on:click={() => toggleMonth(monthNumber)}
                >
                  {month}
                </button>
              {/each}
            </div>
          </div>

          <div class="grid gap-1.5">
              <div class="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span class="text-[13px] font-semibold text-ink/65">Highlights</span>
                  <p class="mt-0.5 text-xs text-ink/45">Each item renders as its own ticked line.</p>
                </div>
                <button
                  class="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/10 bg-surface px-3 text-xs font-bold text-ink transition hover:border-forest/25 hover:bg-sand/55"
                  type="button"
                  on:click={addHighlight}
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              <div class="grid gap-3">
                {#each form.highlights as _highlight, index}
                  <div class="grid gap-2 rounded-[8px] border border-ink/10 bg-surface p-3 sm:grid-cols-[1fr_auto] sm:items-start">
                    <AdminRichText
                      label={`Highlight ${index + 1}`}
                      name={`highlight_${index}`}
                      bind:value={form.highlights[index]}
                      rows={2}
                      headings="none"
                      placeholder="e.g. The Great Migration river crossings"
                    />
                    <div class="flex gap-1.5 sm:mt-6">
                      <button
                        class="grid h-10 w-9 place-items-center rounded-md border border-ink/10 bg-surface text-ink/60 transition hover:text-heading disabled:opacity-30"
                        type="button"
                        aria-label={`Move highlight ${index + 1} up`}
                        disabled={index === 0}
                        on:click={() => moveHighlight(index, -1)}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        class="grid h-10 w-9 place-items-center rounded-md border border-ink/10 bg-surface text-ink/60 transition hover:text-heading disabled:opacity-30"
                        type="button"
                        aria-label={`Move highlight ${index + 1} down`}
                        disabled={index === form.highlights.length - 1}
                        on:click={() => moveHighlight(index, 1)}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        class="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-surface px-3 text-xs font-bold text-red-700 transition hover:bg-red-50"
                        type="button"
                        on:click={() => removeHighlight(index)}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
        </section>

        <!-- ── 4 · Media ─────────────────────────────────────────────────── -->
        <section class="grid gap-4 rounded-[8px] border border-ink/10 bg-sand/20 p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Media</p>

          <div class="grid gap-4 lg:grid-cols-2">
            <div class="grid content-start gap-4">
              <div>
                <h3 class="text-base font-semibold text-ink">Category image</h3>
                <p class="mt-1 text-sm text-ink/55">Primary image for cards, headers and the Tours menu. Media Library, upload or URL.</p>
              </div>
              <MediaPicker label="Category image" media={mediaItems} uploadFolder="categories/images" aspect="aspect-[16/9]" bind:value={form.image_url} />
            </div>

            <div class="grid content-start gap-4">
              <div>
                <h3 class="text-base font-semibold text-ink">Icon or animation</h3>
                <p class="mt-1 text-sm text-ink/55">Optional badge visual. One type at a time.</p>
              </div>

              <AdminSelect label="Visual type" name="visual_type" bind:value={visualType} options={visualTypeOptions} />

              {#if visualType === 'icon'}
                <!-- The Media Picker is all three sources in one control:
                     library, upload and paste-URL. -->
                <MediaPicker label="Icon" media={mediaItems} uploadFolder="categories/icons" aspect="aspect-square" fit="object-contain" bind:value={form.icon_url} />
              {:else if visualType === 'lottie'}
                <AdminSelect label="Source" name="lottie_source" bind:value={lottieSource} options={lottieSourceOptions} />
                {#if lottieSource === 'upload'}
                  <AdminFileUpload
                    label="Upload Lottie JSON"
                    accept="application/json,text/json,.json"
                    folder="categories/lottie"
                    kind="lottie"
                    value={form.lottie_url}
                    helper="Use a valid Lottie .json file."
                    on:uploaded={(event) => {
                      form.lottie_url = event.detail.url;
                      showToast('Lottie file uploaded successfully.');
                    }}
                    on:error={(event) => showToast(event.detail, 'error')}
                  />
                {:else}
                  <AdminFormInput label="Lottie URL" name="lottie_url" bind:value={form.lottie_url} placeholder="https://..." />
                {/if}
              {/if}
            </div>
          </div>
        </section>

        <!-- ── 5 · Publishing ────────────────────────────────────────────── -->
        <section class="grid gap-4 rounded-[8px] border border-ink/10 bg-sand/20 p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Publishing</p>
          <div class="grid gap-4 md:grid-cols-3">
            <AdminSelect label="Status" name="status" bind:value={form.status} options={statusOptions} />
            <AdminFormInput label="Sort order" name="sort_order" type="number" min={0} bind:value={form.sort_order} />
            <label class="flex items-center gap-3 self-end rounded-md border border-ink/10 bg-surface px-4 py-3 text-sm font-semibold text-ink">
              <input class="h-4 w-4 rounded border-ink/20 text-forest focus:ring-forest" type="checkbox" bind:checked={form.is_featured} />
              Featured category
            </label>
          </div>
          <p class="-mt-2 text-xs text-ink/45">Featured marks this category for homepage and promotional sections. Sort order only controls list position — lower first.</p>
        </section>

        <!-- ── 6 · SEO (collapsed until needed) ──────────────────────────── -->
        <section class="rounded-[8px] border border-ink/10 bg-sand/20">
          <button
            class="flex w-full items-center justify-between gap-3 p-4 text-left"
            type="button"
            aria-expanded={seoOpen}
            on:click={() => (seoOpen = !seoOpen)}
          >
            <span class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">SEO</span>
            <ChevronDown size={16} class={`text-ink/45 transition-transform ${seoOpen ? 'rotate-180' : ''}`} />
          </button>
          {#if seoOpen}
            <div class="grid gap-4 border-t border-ink/10 p-4">
              <div class="grid gap-4 md:grid-cols-2">
                <div class="grid content-start gap-4">
                  <AdminFormInput label="SEO title" name="meta_title" bind:value={form.meta_title} counter={60} placeholder="Falls back to the category name." />
                  <AdminTextArea label="SEO description" name="meta_description" bind:value={form.meta_description} rows={3} counter={160} placeholder="Falls back to the short description." />
                </div>
                <MediaPicker label="Social / Open Graph image" media={mediaItems} uploadFolder="categories/seo" aspect="aspect-[16/9]" bind:value={form.seo_image_url} />
              </div>
              <p class="text-xs text-ink/45">All optional. Empty fields fall back to the category name, short description and category image.</p>
            </div>
          {/if}
        </section>

        <!-- ── 7 · Translations (existing categories only — needs an id) ── -->
        {#if editingCategory}
          <AdminTranslationTabs
            entityType="tour_categories"
            entityId={editingCategory.id}
            on:toast={(event) => showToast(event.detail.message, event.detail.type ?? 'success')}
          />
        {/if}

        <div class="flex justify-end gap-3 pt-2">
          <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
          <AdminButton type="submit" disabled={saving}>
            {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
          </AdminButton>
        </div>
      </form>
    </div>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete category"
  message={`Delete "${categoryToDelete?.name ?? 'this category'}"? This will soft delete it when supported by the database.`}
  on:cancel={() => {
    confirmOpen = false;
    categoryToDelete = null;
  }}
  on:confirm={deleteCategory}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(57,61,50,0.18)]">
    Deleting category...
  </div>
{/if}
