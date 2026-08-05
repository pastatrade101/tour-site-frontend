<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import {
    AlertCircle,
    BadgeCheck,
    CheckCircle2,
    Edit,
    Eye,
    FileText,
    Film,
    Image as ImageIcon,
    ImagePlus,
    Images,
    Info,
    LayoutGrid,
    List,
    Link2,
    MapPin,
    Map as MapIcon,
    Plus,
    Search,
    SlidersHorizontal,
    Sparkles,
    Tag,
    Trash2,
    Upload,
    UploadCloud,
    X
  } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import MediaPicker from '$lib/components/admin/MediaPicker.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import AdminToolbar from '$lib/components/admin/AdminToolbar.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import { imgUrl } from '$lib/img';

  type Relation = { id: string; name?: string; slug: string; title?: string } | null;

  type GalleryItem = {
    alt_text?: string | null;
    caption?: string | null;
    created_at?: string;
    destination_id?: string | null;
    destinations?: Relation;
    id: string;
    image_url: string;
    media_type: 'document' | 'image' | 'video';
    sort_order: number;
    status: 'archived' | 'draft' | 'published';
    title?: string | null;
    tour_id?: string | null;
    tours?: Relation;
  };

  type MediaItem = { file_name: string; file_url: string; id: string; thumbnail_url?: string | null };
  type Option = { label: string; value: string };
  type Toast = { id: string; message: string; type: 'error' | 'success' };
  type ViewMode = 'grid' | 'list';

  const statusOptions: Option[] = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
  ];

  const mediaTypeOptions: Option[] = [
    { label: 'Image', value: 'image' },
    { label: 'Video', value: 'video' },
    { label: 'Document', value: 'document' }
  ];

  const emptyForm = () => ({
    alt_text: '',
    caption: '',
    destination_id: '',
    image_url: '',
    media_type: 'image' as GalleryItem['media_type'],
    sort_order: '0',
    status: 'draft' as GalleryItem['status'],
    title: '',
    tour_id: ''
  });

  let rows: GalleryItem[] = [];
  let mediaItems: MediaItem[] = [];
  let destinationOptions: Option[] = [{ label: 'No destination', value: '' }];
  let tourOptions: Option[] = [{ label: 'No tour', value: '' }];
  let destinationFilterOptions: Option[] = [{ label: 'All destinations', value: 'all' }];
  let tourFilterOptions: Option[] = [{ label: 'All tours', value: 'all' }];

  let loading = true;
  let loadingMedia = false;
  let saving = false;
  let deleting = false;
  let error = '';

  let search = '';
  let statusFilter = 'all';
  let mediaTypeFilter = 'all';
  let destinationFilter = 'all';
  let tourFilter = 'all';
  let viewMode: ViewMode = 'grid';

  let modalOpen = false;
  let confirmOpen = false;
  let editing: GalleryItem | null = null;
  let toDelete: GalleryItem | null = null;
  let form = emptyForm();
  let toasts: Toast[] = [];

  // backend orders by sort_order; apply stable secondary sort by created_at
  $: sorted = [...rows].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
  });
  $: publishedCount = rows.filter((item) => item.status === 'published').length;
  $: draftCount = rows.filter((item) => item.status === 'draft').length;
  $: archivedCount = rows.filter((item) => item.status === 'archived').length;
  $: linkedCount = rows.filter((item) => item.destination_id || item.tour_id || item.destinations || item.tours).length;
  $: needsAltCount = rows.filter((item) => !item.alt_text?.trim()).length;
  $: hasActiveFilters = Boolean(search.trim() || statusFilter !== 'all' || mediaTypeFilter !== 'all' || destinationFilter !== 'all' || tourFilter !== 'all');
  $: selectedDestinationLabel = destinationOptions.find((option) => option.value === form.destination_id)?.label ?? '';
  $: selectedTourLabel = tourOptions.find((option) => option.value === form.tour_id)?.label ?? '';
  $: previewTitle = form.title.trim() || 'Untitled gallery moment';
  $: previewCaption = form.caption.trim() || 'Add a concise caption to help visitors understand the scene.';
  $: previewRelation = selectedDestinationLabel || selectedTourLabel || 'Not linked yet';
  $: formChecklist = [
    { label: 'Image selected', done: Boolean(form.image_url.trim()) },
    { label: 'Title added', done: Boolean(form.title.trim()) },
    { label: 'Alt text added', done: Boolean(form.alt_text.trim()) },
    { label: 'Caption added', done: Boolean(form.caption.trim()) },
    { label: 'Linked to context', done: Boolean(form.destination_id || form.tour_id) },
    { label: 'Publish state chosen', done: Boolean(form.status) }
  ];
  $: formReadyCount = formChecklist.filter((item) => item.done).length;

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };

  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  const relationLabel = (rel: Relation | undefined, key: 'name' | 'title') => {
    if (rel && typeof rel === 'object') return String(rel[key] ?? '');
    return '';
  };

  const itemRelation = (item: GalleryItem) => {
    const destination = relationLabel(item.destinations, 'name');
    const tour = relationLabel(item.tours, 'title');
    if (destination && tour) return `${destination} · ${tour}`;
    return destination || tour || 'Unlinked';
  };

  const itemQuality = (item: GalleryItem) => {
    const missing: string[] = [];
    if (!item.alt_text?.trim()) missing.push('alt text');
    if (!item.caption?.trim()) missing.push('caption');
    if (!item.destination_id && !item.tour_id && !item.destinations && !item.tours) missing.push('context');
    return missing;
  };

  const mediaTypeDescription = (type: GalleryItem['media_type']) => {
    if (type === 'video') return 'For hosted video thumbnails or video URLs.';
    if (type === 'document') return 'For guide PDFs, maps, or downloadable files.';
    return 'Best for public gallery, homepage preview, destinations, and tours.';
  };

  const clearFilters = async () => {
    search = '';
    statusFilter = 'all';
    mediaTypeFilter = 'all';
    destinationFilter = 'all';
    tourFilter = 'all';
    await load();
  };

  const copyTitleToAlt = () => {
    if (!form.title.trim()) {
      showToast('Add a title first, then it can be reused for alt text.', 'error');
      return;
    }
    form.alt_text = form.title.trim();
  };

  const setFormStatus = (status: string) => { form.status = status as GalleryItem['status']; };
  const setFormMediaType = (type: string) => { form.media_type = type as GalleryItem['media_type']; };

  const load = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.gallery.list({
        search,
        status: statusFilter,
        media_type: mediaTypeFilter === 'all' ? undefined : mediaTypeFilter,
        destination_id: destinationFilter === 'all' ? undefined : destinationFilter,
        tour_id: tourFilter === 'all' ? undefined : tourFilter,
        limit: 200
      });
      rows = res.data.items as unknown as GalleryItem[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load gallery items.';
    } finally {
      loading = false;
    }
  };

  const loadRelations = async () => {
    try {
      const [dest, tour] = await Promise.all([
        api.destinations.list({ limit: 200, status: 'all' }),
        api.tours.list({ limit: 200, status: 'all' })
      ]);
      const destinations = dest.data.items.map((d) => ({ label: String(d.name ?? d.slug ?? 'Untitled'), value: String(d.id) }));
      const tours = tour.data.items.map((t) => ({ label: String(t.title ?? t.slug ?? 'Untitled'), value: String(t.id) }));
      destinationOptions = [{ label: 'No destination', value: '' }, ...destinations];
      tourOptions = [{ label: 'No tour', value: '' }, ...tours];
      destinationFilterOptions = [{ label: 'All destinations', value: 'all' }, ...destinations];
      tourFilterOptions = [{ label: 'All tours', value: 'all' }, ...tours];
    } catch {
      // non-critical
    }
  };

  const loadMedia = async () => {
    if (mediaItems.length || loadingMedia) return;
    loadingMedia = true;
    try {
      const res = await api.media.list({ file_type: 'image', limit: 200 });
      mediaItems = (res.data.items as unknown as MediaItem[]).filter((m) => m.file_url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load media library.', 'error');
    } finally {
      loadingMedia = false;
    }
  };

  const openCreate = async () => {
    editing = null;
    form = emptyForm();
    modalOpen = true;
    await loadMedia();
  };

  const openEdit = async (item: GalleryItem) => {
    editing = item;
    form = {
      alt_text: item.alt_text ?? '',
      caption: item.caption ?? '',
      destination_id: item.destination_id ?? '',
      image_url: item.image_url,
      media_type: item.media_type,
      sort_order: String(item.sort_order ?? 0),
      status: item.status,
      title: item.title ?? '',
      tour_id: item.tour_id ?? ''
    };
    modalOpen = true;
    await loadMedia();
  };

  const closeModal = () => { modalOpen = false; editing = null; form = emptyForm(); };

  const payload = () => ({
    alt_text: form.alt_text.trim() || null,
    caption: form.caption.trim() || null,
    destination_id: form.destination_id || null,
    image_url: form.image_url.trim(),
    media_type: form.media_type,
    sort_order: Number(form.sort_order || 0),
    status: form.status,
    title: form.title.trim() || null,
    tour_id: form.tour_id || null
  });

  const save = async () => {
    if (!form.image_url.trim()) { showToast('Image URL is required. Select from Media Library or paste a URL.', 'error'); return; }
    saving = true;
    try {
      if (editing) {
        await api.gallery.update(editing.id, payload());
        showToast('Gallery item updated successfully.');
      } else {
        await api.gallery.create(payload());
        showToast('Gallery item created successfully.');
      }
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save gallery item.', 'error');
    } finally {
      saving = false;
    }
  };

  const openDelete = (item: GalleryItem) => { toDelete = item; confirmOpen = true; };

  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.gallery.remove(toDelete.id);
      showToast('Gallery item deleted successfully.');
      confirmOpen = false;
      toDelete = null;
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete gallery item.', 'error');
    } finally {
      deleting = false;
    }
  };

  const mediaTypeMeta = (type: GalleryItem['media_type']) => {
    if (type === 'video') return { icon: Film, classes: 'bg-purple-50 text-purple-600 ring-purple-200/60' };
    if (type === 'document') return { icon: FileText, classes: 'bg-slate-100 text-slate-600 ring-slate-200/70' };
    return { icon: ImageIcon, classes: 'bg-sky-50 text-sky-600 ring-sky-200/60' };
  };

  // ── bulk upload: add many images at once, one gallery item per image ────────
  type BulkFile = { id: string; name: string; title: string; status: 'uploading' | 'done' | 'error'; url?: string; thumb?: string; error?: string };

  let bulkOpen = false;
  let bulkFiles: BulkFile[] = [];
  let bulkShared = { status: 'draft' as GalleryItem['status'], media_type: 'image' as GalleryItem['media_type'], destination_id: '', tour_id: '', sort_order: '0' };
  let bulkCreating = false;
  let bulkDragging = false;
  let bulkInput: HTMLInputElement;

  $: bulkReady = bulkFiles.filter((f) => f.status === 'done' && f.url);
  $: bulkUploading = bulkFiles.some((f) => f.status === 'uploading');
  $: failedBulkCount = bulkFiles.filter((file) => file.status === 'error').length;

  const prettyTitle = (name: string) => name.replace(/\.[^./\\]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

  const openBulk = () => {
    bulkFiles = [];
    bulkShared = { status: 'draft', media_type: 'image', destination_id: '', tour_id: '', sort_order: '0' };
    bulkOpen = true;
  };
  const closeBulk = () => { bulkOpen = false; bulkFiles = []; };
  const removeBulk = (id: string) => { bulkFiles = bulkFiles.filter((f) => f.id !== id); };
  const setBulk = (id: string, patch: Partial<BulkFile>) => { bulkFiles = bulkFiles.map((f) => (f.id === id ? { ...f, ...patch } : f)); };

  const uploadOne = async (bf: BulkFile, file: File) => {
    try {
      const res = await api.upload.image(file, 'gallery');
      const data = res.data as { url: string; media?: { thumbnail_url?: string | null } };
      setBulk(bf.id, { status: 'done', url: data.url, thumb: data.media?.thumbnail_url ?? data.url });
    } catch (err) {
      setBulk(bf.id, { status: 'error', error: err instanceof Error ? err.message : 'Upload failed.' });
    }
  };

  const addFiles = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) { showToast('Only image files can be added.', 'error'); return; }
    if (images.length !== files.length) showToast('Skipped non-image files.', 'error');
    const entries = images.map((file) => ({ file, bf: { id: crypto.randomUUID(), name: file.name, title: prettyTitle(file.name), status: 'uploading' as const } as BulkFile }));
    bulkFiles = [...bulkFiles, ...entries.map((e) => e.bf)];
    // upload with a small concurrency pool so many files don't hammer the server
    const queue = [...entries];
    const worker = async () => { let n; while ((n = queue.shift())) await uploadOne(n.bf, n.file); };
    await Promise.all([worker(), worker(), worker()]);
  };

  const onBulkFiles = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    await addFiles(files);
  };
  const onBulkDrop = async (event: DragEvent) => {
    bulkDragging = false;
    await addFiles(Array.from(event.dataTransfer?.files ?? []));
  };

  const createBulk = async () => {
    const ready = bulkFiles.filter((f) => f.status === 'done' && f.url);
    if (!ready.length) { showToast('Upload at least one image first.', 'error'); return; }
    bulkCreating = true;
    const base = Number(bulkShared.sort_order || 0);
    let ok = 0, failed = 0;
    for (let i = 0; i < ready.length; i++) {
      const bf = ready[i];
      try {
        await api.gallery.create({
          alt_text: bf.title.trim() || null,
          caption: null,
          destination_id: bulkShared.destination_id || null,
          image_url: bf.url!.trim(),
          media_type: bulkShared.media_type,
          sort_order: base + i,
          status: bulkShared.status,
          title: bf.title.trim() || null,
          tour_id: bulkShared.tour_id || null
        });
        ok++;
      } catch {
        failed++;
      }
    }
    bulkCreating = false;
    if (ok) showToast(`${ok} gallery item${ok === 1 ? '' : 's'} created${failed ? ` · ${failed} failed` : ''}.`, failed ? 'error' : 'success');
    else showToast('Unable to create gallery items.', 'error');
    if (ok) { closeBulk(); await load(); }
  };

  onMount(async () => {
    await Promise.all([load(), loadRelations()]);
  });
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Content Management"
    title="Gallery"
    description="Curate published images for the gallery page, destination pages, and tour pages — separate from the Media Library."
    secondaryLabel="Bulk Upload"
    actionLabel="New Gallery Item"
    actionIcon={Plus}
    on:secondary={openBulk}
    on:action={openCreate}
  />

  {#if !loading && !error}
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div class="overflow-hidden rounded-[10px] border border-ink/10 bg-surface p-4 shadow-[0_14px_40px_rgba(57,61,50,0.06)]">
        <div class="flex items-center justify-between gap-3">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Current view</p>
          <span class="grid h-9 w-9 place-items-center rounded-[8px] bg-forest/10 text-forest"><Images size={17} /></span>
        </div>
        <p class="mt-4 text-3xl font-extrabold tracking-tight text-heading">{sorted.length}</p>
        <p class="mt-1 text-sm text-ink/55">gallery record{sorted.length === 1 ? '' : 's'} loaded</p>
      </div>
      <div class="overflow-hidden rounded-[10px] border border-ink/10 bg-surface p-4 shadow-[0_14px_40px_rgba(57,61,50,0.06)]">
        <div class="flex items-center justify-between gap-3">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Publishing</p>
          <span class="grid h-9 w-9 place-items-center rounded-[8px] bg-goldfinch-gold/20 text-heading"><BadgeCheck size={17} /></span>
        </div>
        <p class="mt-4 text-3xl font-extrabold tracking-tight text-heading">{publishedCount}</p>
        <p class="mt-1 text-sm text-ink/55">{draftCount} draft · {archivedCount} archived</p>
      </div>
      <div class="overflow-hidden rounded-[10px] border border-ink/10 bg-surface p-4 shadow-[0_14px_40px_rgba(57,61,50,0.06)]">
        <div class="flex items-center justify-between gap-3">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Linked context</p>
          <span class="grid h-9 w-9 place-items-center rounded-[8px] bg-sky-50 text-sky-700"><Link2 size={17} /></span>
        </div>
        <p class="mt-4 text-3xl font-extrabold tracking-tight text-heading">{linkedCount}</p>
        <p class="mt-1 text-sm text-ink/55">{Math.max(sorted.length - linkedCount, 0)} still unlinked</p>
      </div>
      <div class="overflow-hidden rounded-[10px] border border-ink/10 bg-surface p-4 shadow-[0_14px_40px_rgba(57,61,50,0.06)]">
        <div class="flex items-center justify-between gap-3">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Needs attention</p>
          <span class="grid h-9 w-9 place-items-center rounded-[8px] bg-red-50 text-red-600"><AlertCircle size={17} /></span>
        </div>
        <p class="mt-4 text-3xl font-extrabold tracking-tight text-heading">{needsAltCount}</p>
        <p class="mt-1 text-sm text-ink/55">missing alt text</p>
      </div>
    </div>
  {/if}

  <AdminToolbar className="grid gap-4">
    <div class="grid gap-3 xl:grid-cols-[minmax(240px,1.35fr)_repeat(4,minmax(130px,0.8fr))_auto_auto] xl:items-end">
      <label class="grid gap-2 text-sm font-medium text-ink">
        <span>Search</span>
        <span class="flex h-11 items-center gap-2 rounded-[8px] border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
          <Search size={16} class="text-ink/45" />
          <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Title, caption, alt text..." on:keydown={(e) => e.key === 'Enter' && load()} />
        </span>
      </label>
      <AdminSelect label="Status" name="status_filter" bind:value={statusFilter} options={[{ label: 'All statuses', value: 'all' }, ...statusOptions]} />
      <AdminSelect label="Type" name="media_type_filter" bind:value={mediaTypeFilter} options={[{ label: 'All types', value: 'all' }, ...mediaTypeOptions]} />
      <AdminSelect label="Destination" name="destination_filter" bind:value={destinationFilter} options={destinationFilterOptions} />
      <AdminSelect label="Tour" name="tour_filter" bind:value={tourFilter} options={tourFilterOptions} />
      <AdminButton variant="secondary" on:click={load}>
        <SlidersHorizontal size={15} /> Apply
      </AdminButton>
      <AdminButton variant="ghost" disabled={!hasActiveFilters} on:click={clearFilters}>Clear</AdminButton>
    </div>

    {#if hasActiveFilters}
      <div class="flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
        <span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/40">Active filters</span>
        {#if search.trim()}<span class="rounded-[8px] bg-forest/10 px-2.5 py-1 text-xs font-semibold text-forest">Search: {search.trim()}</span>{/if}
        {#if statusFilter !== 'all'}<span class="rounded-[8px] bg-sand px-2.5 py-1 text-xs font-semibold capitalize text-ink/70">{statusFilter}</span>{/if}
        {#if mediaTypeFilter !== 'all'}<span class="rounded-[8px] bg-sky-50 px-2.5 py-1 text-xs font-semibold capitalize text-sky-700">{mediaTypeFilter}</span>{/if}
        {#if destinationFilter !== 'all'}<span class="rounded-[8px] bg-forest/10 px-2.5 py-1 text-xs font-semibold text-forest">{destinationFilterOptions.find((option) => option.value === destinationFilter)?.label}</span>{/if}
        {#if tourFilter !== 'all'}<span class="rounded-[8px] bg-goldfinch-gold/20 px-2.5 py-1 text-xs font-semibold text-heading">{tourFilterOptions.find((option) => option.value === tourFilter)?.label}</span>{/if}
      </div>
    {/if}
  </AdminToolbar>

  {#if !loading && !error && rows.length > 0}
    <div class="flex flex-col gap-3 rounded-[10px] border border-ink/10 bg-surface p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap items-center gap-2 text-sm text-ink/55">
        <span class="font-semibold text-ink">{sorted.length} item{sorted.length === 1 ? '' : 's'}</span>
        <span class="hidden h-1 w-1 rounded-full bg-ink/25 sm:block"></span>
        <span>{needsAltCount ? `${needsAltCount} need alt text` : 'Accessibility copy complete in this view'}</span>
      </div>
      <div class="flex w-fit gap-1 rounded-[8px] border border-ink/10 bg-sand/35 p-1 shadow-sm">
        <button class={`grid h-9 w-9 place-items-center rounded-md transition ${viewMode === 'grid' ? 'bg-forest text-white' : 'text-ink/50 hover:bg-surface'}`} type="button" aria-label="Grid view" on:click={() => (viewMode = 'grid')}>
          <LayoutGrid size={16} />
        </button>
        <button class={`grid h-9 w-9 place-items-center rounded-md transition ${viewMode === 'list' ? 'bg-forest text-white' : 'text-ink/50 hover:bg-surface'}`} type="button" aria-label="List view" on:click={() => (viewMode = 'list')}>
          <List size={16} />
        </button>
      </div>
    </div>
  {/if}

  {#if loading}
    <LoadingState message="Loading gallery..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState
      title="No gallery items yet"
      message="Publish your first gallery image. Pick from the Media Library or paste a URL, then link it to a destination or tour."
      actionLabel="New Gallery Item"
      icon={Images}
      on:action={openCreate}
    />
  {:else if viewMode === 'grid'}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each sorted as item (item.id)}
        {@const meta = mediaTypeMeta(item.media_type)}
        {@const missing = itemQuality(item)}
        <article class="group overflow-hidden rounded-[10px] border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(57,61,50,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-forest/25 hover:shadow-[0_22px_60px_rgba(57,61,50,0.12)]" transition:fade={{ duration: 120 }}>
          <div class="relative aspect-[4/3] overflow-hidden bg-sand/40">
            <img class="h-full w-full object-cover transition duration-500 group-hover:scale-105" src={imgUrl(item.image_url, 700)} alt={item.alt_text || item.title || 'Gallery image'} loading="lazy" />
            <div class="absolute inset-0 bg-gradient-to-t from-ink/78 via-ink/12 to-transparent opacity-85 transition duration-300 group-hover:opacity-100"></div>
            <div class="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
              <span class={`inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 backdrop-blur ${meta.classes}`}>
                <svelte:component this={meta.icon} size={11} />{item.media_type}
              </span>
              <StatusBadge status={item.status} />
            </div>
            <div class="absolute bottom-0 left-0 right-0 p-3 text-white">
              <p class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/72">
                <Link2 size={11} /> {itemRelation(item)}
              </p>
              <h3 class="mt-1 line-clamp-2 text-base font-extrabold leading-tight">{item.title || 'Untitled'}</h3>
              {#if item.caption}
                <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-white/78">{item.caption}</p>
              {/if}
            </div>
          </div>
          <div class="grid gap-3 p-4">
            <div class="flex flex-wrap gap-1.5">
              <span class="inline-flex items-center gap-1 rounded-[8px] bg-sand/70 px-2 py-1 text-[11px] font-semibold text-ink/55"><Tag size={11} /> Sort {item.sort_order}</span>
              {#if relationLabel(item.destinations, 'name')}
                <span class="inline-flex items-center gap-1 rounded-[8px] bg-forest/10 px-2 py-1 text-[11px] font-semibold text-forest"><MapPin size={11} />{relationLabel(item.destinations, 'name')}</span>
              {/if}
              {#if relationLabel(item.tours, 'title')}
                <span class="inline-flex items-center gap-1 rounded-[8px] bg-goldfinch-gold/20 px-2 py-1 text-[11px] font-semibold text-heading"><MapIcon size={11} />{relationLabel(item.tours, 'title')}</span>
              {/if}
            </div>
            {#if missing.length}
              <div class="flex flex-wrap gap-1.5">
                {#each missing as label}
                  <span class="inline-flex items-center gap-1 rounded-[8px] bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700"><AlertCircle size={11} /> Missing {label}</span>
                {/each}
              </div>
            {:else}
              <span class="inline-flex w-fit items-center gap-1 rounded-[8px] bg-forest/10 px-2 py-1 text-[11px] font-semibold text-forest"><CheckCircle2 size={11} /> Ready for public pages</span>
            {/if}
            <div class="flex gap-2 border-t border-ink/10 pt-3">
              <button class="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/45 hover:bg-sand/60" type="button" on:click={() => openEdit(item)}>
                <Edit size={13} />Edit
              </button>
              <a class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink/70 shadow-sm transition hover:border-forest/35 hover:bg-sand/60" href={item.image_url} target="_blank" rel="noreferrer" aria-label="Open image">
                <Eye size={13} />
              </a>
              <button class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(item)} aria-label="Delete gallery item">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {:else}
    <div class="overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(57,61,50,0.06)]">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-sm">
          <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">Preview</th>
              <th class="px-4 py-3 text-left font-semibold">Title</th>
              <th class="px-4 py-3 text-left font-semibold">Type</th>
              <th class="px-4 py-3 text-left font-semibold">Linked to</th>
              <th class="px-4 py-3 text-left font-semibold">Status</th>
              <th class="px-4 py-3 text-left font-semibold">Sort</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink/10">
            {#each sorted as item (item.id)}
              {@const missing = itemQuality(item)}
              <tr class="transition hover:bg-sand/25">
                <td class="px-4 py-3">
                  <img class="h-12 w-16 rounded-md object-cover ring-1 ring-ink/10" src={imgUrl(item.image_url, 240)} alt={item.alt_text || item.title || 'Gallery image'} loading="lazy" />
                </td>
                <td class="px-4 py-3">
                  <div class="font-semibold text-ink">{item.title || 'Untitled'}</div>
                  {#if item.caption}<p class="line-clamp-1 max-w-xs text-xs text-ink/50">{item.caption}</p>{/if}
                  {#if missing.length}<p class="mt-1 text-[11px] font-semibold text-red-700">Missing {missing.join(', ')}</p>{/if}
                </td>
                <td class="px-4 py-3 capitalize text-ink/65">{item.media_type}</td>
                <td class="px-4 py-3 text-ink/65">
                  {#if itemRelation(item) !== 'Unlinked'}<div class="max-w-xs truncate text-xs">{itemRelation(item)}</div>{:else}<span class="text-ink/35">—</span>{/if}
                </td>
                <td class="px-4 py-3"><StatusBadge status={item.status} /></td>
                <td class="px-4 py-3 text-ink/65">{item.sort_order}</td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-2">
                    <button class="inline-flex h-9 items-center gap-2 rounded-md border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(item)}>
                      <Edit size={14} />Edit
                    </button>
                    <button class="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(item)}>
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
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-3 backdrop-blur-sm sm:p-4" transition:fade={{ duration: 140 }}>
    <form
      class="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-surface shadow-[0_28px_90px_rgba(57,61,50,0.2)]"
      transition:scale={{ duration: 160, start: 0.98 }}
      on:submit|preventDefault={save}
    >
      <div class="flex items-start justify-between gap-4 border-b border-ink/10 bg-gradient-to-r from-sand/70 via-surface to-surface p-5 sm:p-6">
        <div class="flex min-w-0 gap-3">
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-forest text-white shadow-sm"><ImagePlus size={20} /></span>
          <div class="min-w-0">
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editing ? 'Edit gallery item' : 'New gallery item'}</p>
            <h2 class="mt-1 text-2xl font-extrabold tracking-tight text-heading">{editing ? 'Update gallery record' : 'Create a gallery record'}</h2>
            <p class="mt-1 max-w-2xl text-sm text-ink/60">Select an image, write visitor-facing copy, link it to a destination or tour, then choose whether it should publish now.</p>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <span class="hidden rounded-[8px] bg-surface px-3 py-1.5 text-xs font-bold text-ink/65 ring-1 ring-ink/10 sm:inline-flex">{formReadyCount}/{formChecklist.length} ready</span>
          <button class="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeModal}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div class="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[390px_1fr]">
        <aside class="border-b border-ink/10 bg-sand/25 p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <div class="grid gap-4 lg:sticky lg:top-0">
            <section class="rounded-[10px] border border-ink/10 bg-surface p-4 shadow-sm">
              <div class="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-bold text-ink">Image source</p>
                  <p class="text-xs text-ink/50">Choose from Media Library, upload, or paste a URL.</p>
                </div>
                {#if loadingMedia}<span class="text-xs font-semibold text-ink/45">Loading...</span>{/if}
              </div>
              <MediaPicker label="Gallery image" media={mediaItems} uploadFolder="gallery" aspect="aspect-[4/3]" bind:value={form.image_url} />
            </section>

            <section class="overflow-hidden rounded-[10px] border border-ink/10 bg-heading shadow-[0_18px_50px_rgba(57,61,50,0.16)]">
              <div class="relative aspect-[4/3] bg-ink">
                {#if form.image_url}
                  <img class="h-full w-full object-cover" src={imgUrl(form.image_url, 900)} alt={form.alt_text || previewTitle} />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/82 via-black/24 to-transparent"></div>
                  <div class="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
                    <span class="inline-flex items-center gap-1 rounded-[8px] bg-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white ring-1 ring-white/25 backdrop-blur">
                      <ImageIcon size={11} /> {form.media_type}
                    </span>
                    <span class="rounded-[8px] bg-goldfinch-gold px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-heading">{form.status}</span>
                  </div>
                  <div class="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <p class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70"><Link2 size={11} /> {previewRelation}</p>
                    <h3 class="mt-1 line-clamp-2 text-xl font-extrabold leading-tight">{previewTitle}</h3>
                    <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-white/78">{previewCaption}</p>
                  </div>
                {:else}
                  <div class="grid h-full place-items-center p-6 text-center text-white/70">
                    <div>
                      <span class="mx-auto grid h-12 w-12 place-items-center rounded-[10px] bg-white/10"><ImageIcon size={24} /></span>
                      <p class="mt-3 text-sm font-bold text-white">Live preview appears here</p>
                      <p class="mt-1 text-xs leading-relaxed text-white/55">Pick an image first, then this card shows how the gallery moment will feel on public pages.</p>
                    </div>
                  </div>
                {/if}
              </div>
            </section>

            <section class="rounded-[10px] border border-ink/10 bg-surface p-4 shadow-sm">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-bold text-ink">Creation checklist</p>
                  <p class="text-xs text-ink/50">{formReadyCount} of {formChecklist.length} completed</p>
                </div>
                <span class="grid h-9 w-9 place-items-center rounded-[8px] bg-forest/10 text-forest"><CheckCircle2 size={17} /></span>
              </div>
              <div class="mt-3 grid gap-2">
                {#each formChecklist as item}
                  <div class="flex items-center gap-2 text-sm">
                    <span class={`grid h-5 w-5 place-items-center rounded-full ${item.done ? 'bg-forest text-white' : 'bg-sand text-ink/35'}`}>
                      {#if item.done}<CheckCircle2 size={12} />{:else}<span class="h-1.5 w-1.5 rounded-full bg-current"></span>{/if}
                    </span>
                    <span class={item.done ? 'font-semibold text-ink' : 'text-ink/50'}>{item.label}</span>
                  </div>
                {/each}
              </div>
            </section>
          </div>
        </aside>

        <div class="grid content-start gap-4 p-4 sm:p-5">
          <section class="rounded-[10px] border border-ink/10 bg-surface p-4 shadow-sm">
            <div class="flex flex-col gap-2 border-b border-ink/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="flex items-center gap-2 text-sm font-extrabold text-heading"><Sparkles size={16} class="text-forest" /> Story and accessibility</p>
                <p class="mt-1 text-xs text-ink/50">This text appears in public gallery overlays and improves SEO/accessibility.</p>
              </div>
              <button class="inline-flex h-8 w-fit items-center gap-1.5 rounded-md border border-ink/10 bg-sand/35 px-3 text-xs font-bold text-ink/65 transition hover:border-forest/25 hover:bg-forest/5" type="button" on:click={copyTitleToAlt}>
                <BadgeCheck size={13} /> Use title as alt text
              </button>
            </div>
            <div class="mt-4 grid gap-4">
              <AdminFormInput label="Title" name="title" bind:value={form.title} placeholder="e.g. Sunrise over the Serengeti" />
              <AdminTextArea label="Caption" name="caption" bind:value={form.caption} rows={3} placeholder="A short human caption that explains the moment, place, or mood." />
              <AdminFormInput label="Alt text" name="alt_text" bind:value={form.alt_text} placeholder="Describe the image for screen readers and search engines" />
            </div>
          </section>

          <section class="rounded-[10px] border border-ink/10 bg-surface p-4 shadow-sm">
            <div class="flex items-start justify-between gap-3 border-b border-ink/10 pb-4">
              <div>
                <p class="flex items-center gap-2 text-sm font-extrabold text-heading"><SlidersHorizontal size={16} class="text-forest" /> Publishing controls</p>
                <p class="mt-1 text-xs text-ink/50">{mediaTypeDescription(form.media_type)}</p>
              </div>
              <StatusBadge status={form.status} />
            </div>
            <div class="mt-4 grid gap-4 lg:grid-cols-2">
              <div class="grid gap-2">
                <span class="text-[13px] font-semibold text-ink/65">Media type</span>
                <div class="grid grid-cols-3 gap-2">
                  {#each mediaTypeOptions as option}
                    <button
                      type="button"
                      class={`grid min-h-20 place-items-center gap-1 rounded-[8px] border px-2 py-2 text-center transition ${form.media_type === option.value ? 'border-forest bg-forest text-white shadow-sm' : 'border-ink/10 bg-black/[0.02] text-ink/65 hover:border-forest/30 hover:bg-sand/45'}`}
                      on:click={() => setFormMediaType(option.value)}
                    >
                      {#if option.value === 'video'}<Film size={18} />{:else if option.value === 'document'}<FileText size={18} />{:else}<ImageIcon size={18} />{/if}
                      <span class="text-xs font-bold">{option.label}</span>
                    </button>
                  {/each}
                </div>
              </div>
              <div class="grid gap-2">
                <span class="text-[13px] font-semibold text-ink/65">Status</span>
                <div class="grid gap-2">
                  {#each statusOptions as option}
                    <button
                      type="button"
                      class={`flex min-h-11 items-center justify-between gap-3 rounded-[8px] border px-3 text-left transition ${form.status === option.value ? 'border-forest bg-forest/10 text-heading ring-2 ring-forest/10' : 'border-ink/10 bg-black/[0.02] text-ink/65 hover:border-forest/30 hover:bg-sand/45'}`}
                      on:click={() => setFormStatus(option.value)}
                    >
                      <span>
                        <span class="block text-sm font-bold">{option.label}</span>
                        <span class="block text-[11px] text-ink/45">
                          {#if option.value === 'published'}Visible on public pages{:else if option.value === 'archived'}Hidden but kept in CMS{:else}Saved privately until ready{/if}
                        </span>
                      </span>
                      {#if form.status === option.value}<CheckCircle2 size={17} class="text-forest" />{/if}
                    </button>
                  {/each}
                </div>
              </div>
            </div>
          </section>

          <section class="rounded-[10px] border border-ink/10 bg-surface p-4 shadow-sm">
            <div class="border-b border-ink/10 pb-4">
              <p class="flex items-center gap-2 text-sm font-extrabold text-heading"><Link2 size={16} class="text-forest" /> Link this moment</p>
              <p class="mt-1 text-xs text-ink/50">Linking helps the gallery surface relevant photos on destination and tour pages.</p>
            </div>
            <div class="mt-4 grid gap-4 lg:grid-cols-2">
              <AdminSelect label="Linked destination" name="destination_id" bind:value={form.destination_id} options={destinationOptions} />
              <AdminSelect label="Linked tour" name="tour_id" bind:value={form.tour_id} options={tourOptions} />
            </div>
            <div class="mt-4 flex items-start gap-2 rounded-[8px] bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-800 ring-1 ring-sky-100">
              <Info size={14} class="mt-0.5 shrink-0" />
              <span>Use one link when the image is general, or both when it belongs to a specific tour inside a destination.</span>
            </div>
          </section>

          <section class="rounded-[10px] border border-ink/10 bg-surface p-4 shadow-sm">
            <div class="grid gap-4 sm:grid-cols-[1fr_180px] sm:items-end">
              <div>
                <p class="flex items-center gap-2 text-sm font-extrabold text-heading"><Tag size={16} class="text-forest" /> Display order</p>
                <p class="mt-1 text-xs text-ink/50">Lower numbers appear first when the backend returns gallery items by sort order.</p>
              </div>
              <AdminFormInput label="Sort order" name="sort_order" type="number" bind:value={form.sort_order} />
            </div>
          </section>
        </div>
      </div>

      <div class="flex flex-col-reverse gap-3 border-t border-ink/10 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p class="text-xs text-ink/50">{form.image_url.trim() ? 'Image selected. Review copy and publishing status before saving.' : 'Select an image to enable a complete gallery record.'}</p>
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
          <AdminButton type="submit" disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Gallery Item'}
          </AdminButton>
        </div>
      </div>
    </form>
  </div>
{/if}

{#if bulkOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-3 backdrop-blur-sm sm:p-4" transition:fade={{ duration: 140 }}>
    <div class="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-surface shadow-[0_28px_90px_rgba(57,61,50,0.2)]" transition:scale={{ duration: 160, start: 0.98 }}>
      <div class="flex items-start justify-between gap-4 border-b border-ink/10 bg-gradient-to-r from-sand/70 via-surface to-surface p-5 sm:p-6">
        <div class="flex min-w-0 gap-3">
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-forest text-white shadow-sm"><UploadCloud size={21} /></span>
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Bulk upload</p>
            <h2 class="mt-1 text-2xl font-extrabold tracking-tight text-heading">Create many gallery items</h2>
            <p class="mt-1 max-w-2xl text-sm text-ink/60">Upload a batch, edit generated titles, then create one gallery record per image using the shared settings.</p>
          </div>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeBulk}>
          <X size={18} />
        </button>
      </div>

      <div class="grid min-h-0 gap-5 overflow-y-auto p-4 sm:p-5 lg:grid-cols-[330px_1fr]">
        <aside class="grid content-start gap-4">
          <section class="rounded-[10px] border border-ink/10 bg-surface p-4 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-extrabold text-heading">Batch status</p>
                <p class="mt-1 text-xs text-ink/50">Create is enabled after uploads finish.</p>
              </div>
              <span class="grid h-9 w-9 place-items-center rounded-[8px] bg-forest/10 text-forest"><Images size={17} /></span>
            </div>
            <div class="mt-4 grid grid-cols-3 gap-2 text-center">
              <div class="rounded-[8px] bg-sand/60 p-3">
                <p class="text-xl font-extrabold text-heading">{bulkFiles.length}</p>
                <p class="text-[11px] font-semibold text-ink/45">Added</p>
              </div>
              <div class="rounded-[8px] bg-forest/10 p-3">
                <p class="text-xl font-extrabold text-forest">{bulkReady.length}</p>
                <p class="text-[11px] font-semibold text-forest/70">Ready</p>
              </div>
              <div class="rounded-[8px] bg-red-50 p-3">
                <p class="text-xl font-extrabold text-red-700">{failedBulkCount}</p>
                <p class="text-[11px] font-semibold text-red-700/70">Failed</p>
              </div>
            </div>
          </section>

          <section class="rounded-[10px] border border-ink/10 bg-surface p-4 shadow-sm">
            <p class="text-sm font-extrabold text-heading">Shared settings</p>
            <p class="mt-1 text-xs text-ink/50">Applied to every gallery record created from this batch.</p>
            <div class="mt-4 grid gap-4">
              <AdminSelect label="Status" name="bulk_status" bind:value={bulkShared.status} options={statusOptions} />
              <AdminSelect label="Media type" name="bulk_media_type" bind:value={bulkShared.media_type} options={mediaTypeOptions} />
              <AdminFormInput label="Starting sort order" name="bulk_sort" type="number" bind:value={bulkShared.sort_order} />
              <AdminSelect label="Linked destination" name="bulk_destination" bind:value={bulkShared.destination_id} options={destinationOptions} />
              <AdminSelect label="Linked tour" name="bulk_tour" bind:value={bulkShared.tour_id} options={tourOptions} />
            </div>
          </section>
        </aside>

        <div class="grid content-start gap-4">
          <button
            type="button"
            class={`relative overflow-hidden rounded-[10px] border-2 border-dashed px-6 py-10 text-center transition ${bulkDragging ? 'border-forest bg-forest/5' : 'border-ink/20 bg-sand/20 hover:border-forest/50 hover:bg-sand/40'}`}
            on:click={() => bulkInput.click()}
            on:dragover|preventDefault={() => (bulkDragging = true)}
            on:dragleave|preventDefault={() => (bulkDragging = false)}
            on:drop|preventDefault={onBulkDrop}
          >
            <span class="mx-auto grid h-14 w-14 place-items-center rounded-[10px] bg-forest text-white shadow-sm"><UploadCloud size={28} /></span>
            <span class="mt-4 block text-base font-extrabold text-heading">Drop images here or click to browse</span>
            <span class="mt-1 block text-sm text-ink/55">PNG, JPG or WebP. Select many files at once; titles are generated from file names.</span>
            {#if bulkUploading}
              <span class="mt-4 inline-flex items-center gap-2 rounded-[8px] bg-surface px-3 py-1.5 text-xs font-bold text-ink ring-1 ring-ink/10">
                <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-forest/20 border-t-forest"></span>
                Uploading files
              </span>
            {/if}
          </button>

          {#if bulkFiles.length}
            <section class="rounded-[10px] border border-ink/10 bg-surface p-4 shadow-sm">
              <div class="flex flex-col gap-2 border-b border-ink/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm font-extrabold text-heading">Review image titles</p>
                  <p class="mt-1 text-xs text-ink/50">Each title becomes the gallery title and alt text unless edited here.</p>
                </div>
                <p class="text-xs font-bold text-ink/50">{bulkReady.length} ready{#if bulkUploading} · uploading{/if}</p>
              </div>
              <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {#each bulkFiles as f (f.id)}
                  <div class="overflow-hidden rounded-[10px] border border-ink/10 bg-surface shadow-sm transition hover:border-forest/25 hover:shadow-[0_14px_36px_rgba(57,61,50,0.08)]">
                    <div class="relative aspect-[4/3] bg-sand/40">
                      {#if f.thumb || f.url}
                        <img class="h-full w-full object-cover" src={imgUrl(f.thumb || f.url, 500)} alt={f.title} loading="lazy" />
                      {:else}
                        <span class="grid h-full w-full place-items-center text-ink/30"><ImageIcon size={28} /></span>
                      {/if}
                      {#if f.status === 'uploading'}
                        <span class="absolute inset-0 grid place-items-center bg-ink/45">
                          <span class="h-7 w-7 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                        </span>
                      {/if}
                      <span class={`absolute left-3 top-3 rounded-[8px] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${f.status === 'done' ? 'bg-forest text-white' : f.status === 'error' ? 'bg-red-600 text-white' : 'bg-white/90 text-heading'}`}>
                        {f.status === 'done' ? 'Ready' : f.status === 'error' ? 'Failed' : 'Uploading'}
                      </span>
                      <button type="button" class="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-[8px] bg-white/90 text-ink shadow-sm transition hover:bg-red-50 hover:text-red-700" aria-label="Remove" on:click={() => removeBulk(f.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div class="grid gap-2 p-3">
                      <label class="grid gap-1.5">
                        <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/40">Gallery title</span>
                        <input
                          class="w-full rounded-md border border-ink/12 bg-black/[0.02] px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest focus:bg-surface focus:ring-2 focus:ring-forest/15"
                          value={f.title}
                          placeholder="Image title"
                          aria-label="Image title"
                          on:input={(e) => setBulk(f.id, { title: (e.currentTarget as HTMLInputElement).value })}
                        />
                      </label>
                      {#if f.status === 'error'}
                        <span class="truncate text-xs font-semibold text-red-600" title={f.error}>Upload failed: {f.error}</span>
                      {:else if f.status === 'done'}
                        <span class="inline-flex w-fit items-center gap-1 rounded-[8px] bg-forest/10 px-2 py-1 text-[11px] font-semibold text-forest"><CheckCircle2 size={11} /> Ready to create</span>
                      {:else}
                        <span class="text-xs text-ink/45">Uploading image...</span>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </section>
          {:else}
            <section class="grid min-h-48 place-items-center rounded-[10px] border border-ink/10 bg-surface p-6 text-center shadow-sm">
              <div>
                <span class="mx-auto grid h-12 w-12 place-items-center rounded-[10px] bg-sand text-ink/45"><Images size={22} /></span>
                <p class="mt-3 text-sm font-bold text-ink">No images selected yet</p>
                <p class="mt-1 text-xs text-ink/50">Use the upload area above to start a batch.</p>
              </div>
            </section>
          {/if}
        </div>
      </div>

      <div class="flex flex-col-reverse gap-3 border-t border-ink/10 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <button type="button" class="inline-flex h-10 items-center gap-1.5 rounded-md border border-ink/12 bg-surface px-4 text-sm font-semibold text-ink/75 transition hover:bg-sand disabled:opacity-60" on:click={() => bulkInput.click()} disabled={bulkCreating}>
          <Upload size={15} /> Add more
        </button>
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <AdminButton variant="secondary" type="button" on:click={closeBulk}>Cancel</AdminButton>
          <AdminButton type="button" disabled={bulkCreating || bulkUploading || bulkReady.length === 0} on:click={createBulk}>
            {bulkCreating ? 'Creating…' : `Create ${bulkReady.length} gallery item${bulkReady.length === 1 ? '' : 's'}`}
          </AdminButton>
        </div>
      </div>
    </div>
  </div>
  <input class="hidden" type="file" accept="image/png,image/jpeg,image/webp" multiple bind:this={bulkInput} on:change={onBulkFiles} />
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete gallery item"
  message={`Delete "${toDelete?.title || 'this gallery item'}"? This action soft-deletes the record.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(57,61,50,0.18)]">
    Deleting gallery item...
  </div>
{/if}
