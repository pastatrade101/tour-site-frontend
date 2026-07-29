<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { CalendarRange, Edit, Eye, EyeOff, MapPin, Plus, Trash2, X } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import MediaPicker from '$lib/components/admin/MediaPicker.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import type { MigrationEntry } from '$lib/types';

  type MediaItem = { file_name: string; file_url: string; id: string; thumbnail_url?: string | null };
  type Option = { label: string; value: string };
  type Toast = { id: string; message: string; type: 'error' | 'success' };

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthOptions: Option[] = MONTHS.map((m) => ({ label: m, value: m }));

  const emptyForm = () => ({
    month: 'January',
    location: '',
    note: '',
    image_url: '',
    display_order: '0',
    is_published: true
  });

  let rows: MigrationEntry[] = [];
  let mediaItems: MediaItem[] = [];

  let loading = true;
  let loadingMedia = false;
  let saving = false;
  let deleting = false;
  let error = '';

  let modalOpen = false;
  let confirmOpen = false;
  let editing: MigrationEntry | null = null;
  let toDelete: MigrationEntry | null = null;
  let form = emptyForm();
  let toasts: Toast[] = [];

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };
  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  const load = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.migrationCalendar.list({ limit: 50 });
      rows = res.data.items as unknown as MigrationEntry[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load migration calendar.';
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
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load media library.', 'error');
    } finally {
      loadingMedia = false;
    }
  };

  const openCreate = () => {
    editing = null;
    form = emptyForm();
    void loadMedia();
    modalOpen = true;
  };

  const openEdit = (e: MigrationEntry) => {
    editing = e;
    form = {
      month: e.month || 'January',
      location: e.location ?? '',
      note: e.note ?? '',
      image_url: e.image_url ?? '',
      display_order: String(e.display_order ?? 0),
      is_published: e.is_published !== false
    };
    void loadMedia();
    modalOpen = true;
  };

  const closeModal = () => { modalOpen = false; editing = null; form = emptyForm(); };

  const payload = () => ({
    month: form.month,
    location: form.location.trim(),
    note: form.note.trim(),
    image_url: form.image_url.trim(),
    display_order: Number(form.display_order || 0),
    is_published: form.is_published
  });

  const save = async () => {
    if (!form.month) { showToast('Month is required.', 'error'); return; }
    saving = true;
    try {
      if (editing) {
        await api.migrationCalendar.update(editing.id, payload());
        showToast('Entry updated successfully.');
      } else {
        await api.migrationCalendar.create(payload());
        showToast('Entry created successfully.');
      }
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save entry.', 'error');
    } finally {
      saving = false;
    }
  };

  const togglePublished = async (e: MigrationEntry) => {
    try {
      await api.migrationCalendar.update(e.id, { is_published: e.is_published === false });
      showToast(e.is_published === false ? 'Entry published.' : 'Entry hidden.');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update visibility.', 'error');
    }
  };

  const openDelete = (e: MigrationEntry) => { toDelete = e; confirmOpen = true; };

  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.migrationCalendar.remove(toDelete.id);
      showToast('Entry deleted successfully.');
      confirmOpen = false;
      toDelete = null;
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete entry.', 'error');
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
    title="Migration Calendar"
    description="The Serengeti Great Migration month-by-month guide shown on the home page. Published entries appear in display order; the visitor's current month is auto-highlighted."
    actionLabel="New Entry"
    actionIcon={Plus}
    on:action={openCreate}
  />

  {#if loading}
    <LoadingState message="Loading migration calendar..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState
      title="No calendar entries yet"
      message="Add month-by-month entries to guide travellers on where the herds are through the year."
      actionLabel="New Entry"
      icon={CalendarRange}
      on:action={openCreate}
    />
  {:else}
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {#each rows as e (e.id)}
        <article class="flex flex-col overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-[0_14px_44px_rgba(57,61,50,0.06)]" transition:fade={{ duration: 120 }}>
          {#if e.image_url}
            <div class="relative aspect-[16/10] overflow-hidden">
              <img class="h-full w-full object-cover" src={e.image_url} alt={e.month} />
              <span class="absolute left-3 top-3 rounded-full bg-heading/85 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white backdrop-blur">{e.month}</span>
            </div>
          {/if}
          <div class="flex flex-1 flex-col gap-2 p-5">
            <div class="flex items-center justify-between gap-2">
              {#if !e.image_url}<span class="text-lg font-bold text-heading">{e.month}</span>{/if}
              <div class="ml-auto flex items-center gap-2">
                <span class="rounded-full bg-sand/70 px-2 py-0.5 text-[11px] font-semibold text-ink/55">Order {e.display_order ?? 0}</span>
                {#if e.is_published === false}
                  <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Hidden</span>
                {:else}
                  <span class="rounded-full bg-forest/10 px-2 py-0.5 text-[11px] font-semibold text-forest">Published</span>
                {/if}
              </div>
            </div>
            {#if e.location}
              <p class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest"><MapPin size={14} />{e.location}</p>
            {/if}
            {#if e.note}
              <p class="line-clamp-3 text-sm leading-6 text-ink/70">{e.note}</p>
            {/if}

            <div class="mt-auto flex flex-wrap gap-2 border-t border-ink/10 pt-3">
              <button class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-forest/10 px-3 text-xs font-semibold text-forest transition hover:bg-forest/20" type="button" on:click={() => togglePublished(e)}>
                {#if e.is_published === false}<Eye size={13} />Publish{:else}<EyeOff size={13} />Hide{/if}
              </button>
              <button class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(e)}>
                <Edit size={13} />Edit
              </button>
              <button class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(e)}>
                <Trash2 size={13} />Delete
              </button>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

{#if modalOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <form
      class="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[10px] border border-ink/10 bg-surface p-6 shadow-[0_24px_80px_rgba(57,61,50,0.18)]"
      transition:scale={{ duration: 160, start: 0.98 }}
      on:submit|preventDefault={save}
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editing ? 'Edit entry' : 'New entry'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editing ? 'Update month' : 'Add month'}</h2>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeModal}>
          <X size={18} />
        </button>
      </div>

      <div class="mt-6 grid gap-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <AdminSelect label="Month" name="month" bind:value={form.month} options={monthOptions} />
          <AdminFormInput label="Location" name="location" bind:value={form.location} placeholder="e.g. Ndutu / southern Serengeti" />
        </div>

        <AdminTextArea label="Note" name="note" bind:value={form.note} rows={4} placeholder="What's happening with the migration this month?" />

        <div class="rounded-[8px] border border-ink/10 bg-sand/25 p-4">
          <MediaPicker label="Image (optional)" media={mediaItems} uploadFolder="migration-calendar" aspect="aspect-[16/10]" bind:value={form.image_url} />
        </div>

        <div class="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <AdminFormInput label="Display order" name="display_order" type="number" bind:value={form.display_order} />
          <label class="flex h-11 cursor-pointer items-center gap-3 rounded-2xl border border-ink/10 bg-surface px-4 transition hover:bg-sand/30">
            <input class="h-4 w-4 accent-forest" type="checkbox" bind:checked={form.is_published} />
            <span class="text-sm font-semibold text-ink">Published</span>
          </label>
        </div>
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Entry'}
        </AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete entry"
  message={`Delete the "${toDelete?.month ?? 'this'}" migration entry? This action soft-deletes the record.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(57,61,50,0.18)]">
    Deleting entry...
  </div>
{/if}
