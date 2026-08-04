<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import {
    Edit,
    FileText,
    Film,
    Image as ImageIcon,
    Images,
    LayoutGrid,
    List,
    MapPin,
    Map as MapIcon,
    Plus,
    Search,
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

  <AdminToolbar className="grid gap-3 lg:grid-cols-[1fr_repeat(4,150px)_auto] lg:items-end">
    <label class="grid gap-2 text-sm font-medium text-ink">
      <span>Search</span>
      <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="text-ink/45" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Title, caption, alt text..." on:keydown={(e) => e.key === 'Enter' && load()} />
      </span>
    </label>
    <AdminSelect label="Status" name="status_filter" bind:value={statusFilter} options={[{ label: 'All statuses', value: 'all' }, ...statusOptions]} />
    <AdminSelect label="Type" name="media_type_filter" bind:value={mediaTypeFilter} options={[{ label: 'All types', value: 'all' }, ...mediaTypeOptions]} />
    <AdminSelect label="Destination" name="destination_filter" bind:value={destinationFilter} options={destinationFilterOptions} />
    <AdminSelect label="Tour" name="tour_filter" bind:value={tourFilter} options={tourFilterOptions} />
    <AdminButton variant="secondary" on:click={load}>Apply</AdminButton>
  </AdminToolbar>

  {#if !loading && !error && rows.length > 0}
    <div class="flex items-center justify-between">
      <p class="text-sm text-ink/55">{sorted.length} item{sorted.length === 1 ? '' : 's'}</p>
      <div class="flex gap-1 rounded-xl border border-ink/10 bg-surface p-1 shadow-sm">
        <button class={`grid h-9 w-9 place-items-center rounded-lg transition ${viewMode === 'grid' ? 'bg-forest text-white' : 'text-ink/50 hover:bg-sand/60'}`} type="button" aria-label="Grid view" on:click={() => (viewMode = 'grid')}>
          <LayoutGrid size={16} />
        </button>
        <button class={`grid h-9 w-9 place-items-center rounded-lg transition ${viewMode === 'list' ? 'bg-forest text-white' : 'text-ink/50 hover:bg-sand/60'}`} type="button" aria-label="List view" on:click={() => (viewMode = 'list')}>
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
        <article class="group overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-[0_12px_36px_rgba(57,61,50,0.06)]" transition:fade={{ duration: 120 }}>
          <div class="relative aspect-[4/3] overflow-hidden bg-sand/40">
            <img class="h-full w-full object-cover transition duration-300 group-hover:scale-105" src={item.image_url} alt={item.alt_text || item.title || 'Gallery image'} loading="lazy" />
            <span class={`absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${meta.classes}`}>
              <svelte:component this={meta.icon} size={10} />{item.media_type}
            </span>
            <span class="absolute right-2.5 top-2.5"><StatusBadge status={item.status} /></span>
          </div>
          <div class="grid gap-2 p-4">
            <p class="truncate font-semibold text-ink">{item.title || 'Untitled'}</p>
            {#if item.caption}<p class="line-clamp-1 text-xs text-ink/55">{item.caption}</p>{/if}
            <div class="flex flex-wrap gap-1.5">
              <span class="rounded-full bg-sand/70 px-2 py-0.5 text-[11px] font-semibold text-ink/55">Sort {item.sort_order}</span>
              {#if relationLabel(item.destinations, 'name')}
                <span class="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-[11px] font-semibold text-forest"><MapPin size={10} />{relationLabel(item.destinations, 'name')}</span>
              {/if}
              {#if relationLabel(item.tours, 'title')}
                <span class="inline-flex items-center gap-1 rounded-full bg-goldfinch-gold/20 px-2 py-0.5 text-[11px] font-semibold text-heading"><MapIcon size={10} />{relationLabel(item.tours, 'title')}</span>
              {/if}
            </div>
            <div class="mt-1 flex gap-2">
              <button class="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(item)}>
                <Edit size={13} />Edit
              </button>
              <button class="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(item)}>
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
              <tr class="transition hover:bg-sand/25">
                <td class="px-4 py-3">
                  <img class="h-12 w-16 rounded-lg object-cover ring-1 ring-ink/10" src={item.image_url} alt={item.alt_text || item.title || 'Gallery image'} loading="lazy" />
                </td>
                <td class="px-4 py-3">
                  <div class="font-semibold text-ink">{item.title || 'Untitled'}</div>
                  {#if item.caption}<p class="line-clamp-1 max-w-xs text-xs text-ink/50">{item.caption}</p>{/if}
                </td>
                <td class="px-4 py-3 capitalize text-ink/65">{item.media_type}</td>
                <td class="px-4 py-3 text-ink/65">
                  {#if relationLabel(item.destinations, 'name')}<div class="text-xs">{relationLabel(item.destinations, 'name')}</div>{/if}
                  {#if relationLabel(item.tours, 'title')}<div class="text-xs text-ink/50">{relationLabel(item.tours, 'title')}</div>{/if}
                  {#if !relationLabel(item.destinations, 'name') && !relationLabel(item.tours, 'title')}<span class="text-ink/35">—</span>{/if}
                </td>
                <td class="px-4 py-3"><StatusBadge status={item.status} /></td>
                <td class="px-4 py-3 text-ink/65">{item.sort_order}</td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-2">
                    <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(item)}>
                      <Edit size={14} />Edit
                    </button>
                    <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(item)}>
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
    <form
      class="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[10px] border border-ink/10 bg-surface p-6 shadow-[0_24px_80px_rgba(57,61,50,0.18)]"
      transition:scale={{ duration: 160, start: 0.98 }}
      on:submit|preventDefault={save}
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editing ? 'Edit gallery item' : 'New gallery item'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editing ? 'Update image' : 'Publish image'}</h2>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeModal}>
          <X size={18} />
        </button>
      </div>

      <div class="mt-6 grid gap-4 lg:grid-cols-[300px_1fr]">
        <!-- image picker + preview -->
        <div class="grid content-start gap-3 rounded-[8px] border border-ink/10 bg-sand/25 p-4">
          <MediaPicker label="Image" media={mediaItems} uploadFolder="gallery" aspect="aspect-[4/3]" bind:value={form.image_url} />
        </div>

        <!-- fields -->
        <div class="grid content-start gap-4">
          <AdminFormInput label="Title" name="title" bind:value={form.title} placeholder="e.g. Sunrise over the Serengeti" />
          <AdminFormInput label="Alt text" name="alt_text" bind:value={form.alt_text} placeholder="Describe the image for accessibility & SEO" />
          <AdminTextArea label="Caption" name="caption" bind:value={form.caption} rows={2} placeholder="Optional caption shown beneath the image" />

          <div class="grid gap-4 sm:grid-cols-2">
            <AdminSelect label="Media type" name="media_type" bind:value={form.media_type} options={mediaTypeOptions} />
            <AdminSelect label="Status" name="status" bind:value={form.status} options={statusOptions} />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <AdminSelect label="Linked destination (optional)" name="destination_id" bind:value={form.destination_id} options={destinationOptions} />
            <AdminSelect label="Linked tour (optional)" name="tour_id" bind:value={form.tour_id} options={tourOptions} />
          </div>

          <AdminFormInput label="Sort order" name="sort_order" type="number" bind:value={form.sort_order} />
        </div>
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Gallery Item'}
        </AdminButton>
      </div>
    </form>
  </div>
{/if}

{#if bulkOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <div class="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-surface shadow-[0_24px_80px_rgba(57,61,50,0.18)]" transition:scale={{ duration: 160, start: 0.98 }}>
      <div class="flex items-start justify-between gap-4 border-b border-ink/10 p-6">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Bulk upload</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">Add multiple images</h2>
          <p class="mt-1 text-sm text-ink/60">Upload many images at once — each becomes its own gallery item using the shared settings below.</p>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeBulk}>
          <X size={18} />
        </button>
      </div>

      <div class="grid gap-5 overflow-y-auto p-6">
        <!-- shared settings applied to every uploaded image -->
        <div class="grid gap-4 rounded-[8px] border border-ink/10 bg-sand/25 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <AdminSelect label="Status" name="bulk_status" bind:value={bulkShared.status} options={statusOptions} />
          <AdminSelect label="Media type" name="bulk_media_type" bind:value={bulkShared.media_type} options={mediaTypeOptions} />
          <AdminFormInput label="Starting sort order" name="bulk_sort" type="number" bind:value={bulkShared.sort_order} />
          <AdminSelect label="Linked destination (optional)" name="bulk_destination" bind:value={bulkShared.destination_id} options={destinationOptions} />
          <AdminSelect label="Linked tour (optional)" name="bulk_tour" bind:value={bulkShared.tour_id} options={tourOptions} />
        </div>

        <!-- dropzone -->
        <button
          type="button"
          class={`grid place-items-center gap-2 rounded-[10px] border-2 border-dashed px-6 py-10 text-center transition ${bulkDragging ? 'border-forest bg-forest/5' : 'border-ink/20 bg-sand/20 hover:border-forest/50 hover:bg-sand/40'}`}
          on:click={() => bulkInput.click()}
          on:dragover|preventDefault={() => (bulkDragging = true)}
          on:dragleave|preventDefault={() => (bulkDragging = false)}
          on:drop|preventDefault={onBulkDrop}
        >
          <UploadCloud size={28} class="text-forest" />
          <span class="text-sm font-semibold text-ink">Click to choose images, or drag & drop</span>
          <span class="text-xs text-ink/50">PNG, JPG or WebP — you can select many at once</span>
        </button>

        {#if bulkFiles.length}
          <div class="grid gap-3">
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold text-ink">{bulkFiles.length} image{bulkFiles.length === 1 ? '' : 's'} · <span class="text-forest">{bulkReady.length} ready</span>{#if bulkUploading} · <span class="text-ink/50">uploading…</span>{/if}</p>
            </div>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {#each bulkFiles as f (f.id)}
                <div class="flex gap-3 rounded-[8px] border border-ink/10 bg-surface p-2.5 shadow-sm">
                  <div class="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-sand/40">
                    {#if f.thumb || f.url}
                      <img class="h-full w-full object-cover" src={f.thumb || f.url} alt={f.title} loading="lazy" />
                    {:else}
                      <span class="grid h-full w-full place-items-center text-ink/30"><ImageIcon size={20} /></span>
                    {/if}
                    {#if f.status === 'uploading'}
                      <span class="absolute inset-0 grid place-items-center bg-ink/40">
                        <span class="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                      </span>
                    {/if}
                  </div>
                  <div class="grid min-w-0 flex-1 content-start gap-1.5">
                    <input
                      class="w-full rounded-md border border-ink/12 bg-surface px-2 py-1.5 text-xs font-medium text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                      value={f.title}
                      placeholder="Image title"
                      aria-label="Image title"
                      on:input={(e) => setBulk(f.id, { title: (e.currentTarget as HTMLInputElement).value })}
                    />
                    {#if f.status === 'error'}
                      <span class="truncate text-[11px] font-semibold text-red-600" title={f.error}>Failed — {f.error}</span>
                    {:else if f.status === 'done'}
                      <span class="text-[11px] font-semibold text-forest">Ready</span>
                    {:else}
                      <span class="text-[11px] text-ink/45">Uploading…</span>
                    {/if}
                  </div>
                  <button type="button" class="grid h-7 w-7 shrink-0 place-items-center self-start rounded-lg border border-ink/10 text-ink/50 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600" aria-label="Remove" on:click={() => removeBulk(f.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="flex flex-col-reverse gap-3 border-t border-ink/10 p-6 sm:flex-row sm:justify-between">
        <button type="button" class="inline-flex h-11 items-center gap-1.5 rounded-xl border border-ink/12 bg-surface px-4 text-sm font-semibold text-ink/75 transition hover:bg-sand disabled:opacity-60" on:click={() => bulkInput.click()} disabled={bulkCreating}>
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
