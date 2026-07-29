<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { CheckCircle2, ExternalLink, RotateCcw, Search, Signpost, TriangleAlert, Trash2, X } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminToolbar from '$lib/components/admin/AdminToolbar.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  type ErrorLog = {
    id: string;
    url: string;
    error_type: string;
    referrer?: string | null;
    resolved_to?: string | null;
    count: number;
    error_message?: string | null;
    is_resolved: boolean;
    first_seen_at?: string;
    last_seen_at?: string;
  };
  type Option = { label: string; value: string };
  type Toast = { id: string; message: string; type: 'error' | 'success' };

  const statusFilterOptions: Option[] = [
    { label: 'Unresolved', value: 'false' },
    { label: 'Resolved', value: 'true' },
    { label: 'All', value: 'all' }
  ];
  const typeFilterOptions: Option[] = [
    { label: 'All types', value: 'all' },
    { label: '404', value: '404' },
    { label: '500', value: '500' }
  ];
  const statusCodeOptions: Option[] = [
    { label: '301 — Permanent', value: '301' },
    { label: '302 — Temporary', value: '302' },
    { label: '307 — Temporary (keep method)', value: '307' },
    { label: '308 — Permanent (keep method)', value: '308' }
  ];

  let rows: ErrorLog[] = [];
  let loading = true;
  let error = '';
  let search = '';
  let statusFilter = 'false';
  let typeFilter = 'all';

  let confirmOpen = false;
  let toDelete: ErrorLog | null = null;
  let deleting = false;
  let toasts: Toast[] = [];

  // one-click "create redirect from this 404"
  let redirectModalOpen = false;
  let redirectSource: ErrorLog | null = null;
  let redirectForm = { from_path: '', to_path: '', status_code: '301' };
  let savingRedirect = false;

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };
  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  const pathOf = (url: string) => (url || '').split('?')[0];

  const fmtDate = (s?: string) => {
    if (!s) return '—';
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  $: unresolvedCount = rows.filter((r) => !r.is_resolved).length;
  $: totalHits = rows.reduce((sum, r) => sum + (Number(r.count) || 0), 0);

  const load = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.errors.list({
        search,
        error_type: typeFilter === 'all' ? undefined : typeFilter,
        is_resolved: statusFilter === 'all' ? undefined : statusFilter,
        limit: 200
      });
      rows = res.data.items as unknown as ErrorLog[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load error logs.';
    } finally {
      loading = false;
    }
  };

  const setResolved = async (r: ErrorLog, resolved: boolean, resolvedTo?: string | null) => {
    try {
      await api.errors.update(r.id, { is_resolved: resolved, resolved_to: resolvedTo ?? r.resolved_to ?? null });
      showToast(resolved ? 'Marked as resolved.' : 'Reopened.');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update.', 'error');
    }
  };

  const openRedirect = (r: ErrorLog) => {
    redirectSource = r;
    redirectForm = { from_path: pathOf(r.url), to_path: '', status_code: '301' };
    redirectModalOpen = true;
  };
  const closeRedirect = () => { redirectModalOpen = false; redirectSource = null; };

  const saveRedirect = async () => {
    const from = redirectForm.from_path.trim();
    const to = redirectForm.to_path.trim();
    if (!from.startsWith('/')) { showToast('From path must start with "/".', 'error'); return; }
    if (!to) { showToast('Destination is required.', 'error'); return; }
    if (from === to) { showToast('From and To cannot be the same path.', 'error'); return; }
    savingRedirect = true;
    try {
      await api.redirects.create({ from_path: from, to_path: to, status_code: Number(redirectForm.status_code), is_active: true, note: 'Created from Error logs' });
      if (redirectSource) await api.errors.update(redirectSource.id, { is_resolved: true, resolved_to: to });
      showToast('Redirect created and error resolved.');
      closeRedirect();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to create redirect.', 'error');
    } finally {
      savingRedirect = false;
    }
  };

  const openDelete = (r: ErrorLog) => { toDelete = r; confirmOpen = true; };
  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.errors.remove(toDelete.id);
      showToast('Log deleted.');
      confirmOpen = false;
      toDelete = null;
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete.', 'error');
    } finally {
      deleting = false;
    }
  };

  onMount(load);
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1300px] gap-6">
  <AdminPageHeader
    eyebrow="Administration"
    title="Error Logs"
    description="Broken links visitors hit (aggregated by URL). Resolve one by creating a redirect in a single click — the server then sends future visitors straight to the new page."
  />

  <div class="grid gap-4 sm:grid-cols-3">
    <div class="rounded-[10px] border border-ink/10 bg-surface p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-ink/50">Unresolved</p>
      <p class="mt-1 text-2xl font-bold text-ink">{unresolvedCount}</p>
    </div>
    <div class="rounded-[10px] border border-ink/10 bg-surface p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-ink/50">Logged (shown)</p>
      <p class="mt-1 text-2xl font-bold text-ink">{rows.length}</p>
    </div>
    <div class="rounded-[10px] border border-ink/10 bg-surface p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-ink/50">Total hits</p>
      <p class="mt-1 text-2xl font-bold text-ink">{totalHits}</p>
    </div>
  </div>

  <AdminToolbar className="grid gap-3 lg:grid-cols-[1fr_160px_160px_auto] lg:items-end">
    <label class="grid gap-2 text-sm font-medium text-ink">
      <span>Search</span>
      <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="text-ink/45" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="URL contains..." on:keydown={(e) => e.key === 'Enter' && load()} />
      </span>
    </label>
    <AdminSelect label="Status" name="status_filter" bind:value={statusFilter} options={statusFilterOptions} />
    <AdminSelect label="Type" name="type_filter" bind:value={typeFilter} options={typeFilterOptions} />
    <AdminButton variant="secondary" on:click={load}>Apply</AdminButton>
  </AdminToolbar>

  {#if loading}
    <LoadingState message="Loading error logs..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState
      title="No broken links 🎉"
      message="Nothing here means visitors aren't hitting dead URLs. New 404s will show up automatically as they happen."
      icon={TriangleAlert}
    />
  {:else}
    <div class="overflow-x-auto rounded-[10px] border border-ink/10 bg-surface shadow-[0_14px_44px_rgba(57,61,50,0.06)]">
      <table class="w-full min-w-[820px] text-left text-sm">
        <thead class="border-b border-ink/10 bg-sand/40 text-xs font-semibold uppercase tracking-wide text-ink/55">
          <tr>
            <th class="px-4 py-3">URL</th>
            <th class="px-4 py-3">Type</th>
            <th class="px-4 py-3">Hits</th>
            <th class="px-4 py-3">Last seen</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as r (r.id)}
            <tr class="border-b border-ink/[0.06] last:border-0" transition:fade={{ duration: 100 }}>
              <td class="px-4 py-3">
                <span class="font-mono text-[13px] font-semibold text-ink">{r.url}</span>
                {#if r.referrer}<p class="mt-0.5 max-w-[260px] truncate text-xs text-ink/45">from {r.referrer}</p>{/if}
                {#if r.resolved_to}<p class="mt-0.5 text-xs text-forest">→ {r.resolved_to}</p>{/if}
              </td>
              <td class="px-4 py-3"><span class="rounded-md bg-sand/70 px-2 py-0.5 text-xs font-bold text-ink/70">{r.error_type}</span></td>
              <td class="px-4 py-3"><span class="font-bold text-ink">{r.count}</span></td>
              <td class="px-4 py-3 whitespace-nowrap text-xs text-ink/60">{fmtDate(r.last_seen_at)}</td>
              <td class="px-4 py-3">
                {#if r.is_resolved}
                  <span class="rounded-full bg-forest/10 px-2 py-0.5 text-[11px] font-semibold text-forest">Resolved</span>
                {:else}
                  <span class="rounded-full bg-goldfinch-gold/15 px-2 py-0.5 text-[11px] font-semibold text-heading">Open</span>
                {/if}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-2">
                  <button class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-forest/10 px-3 text-xs font-semibold text-forest transition hover:bg-forest/20" type="button" on:click={() => openRedirect(r)}>
                    <Signpost size={13} />Create redirect
                  </button>
                  {#if r.is_resolved}
                    <button class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:bg-sand/70" type="button" on:click={() => setResolved(r, false)}>
                      <RotateCcw size={13} />Reopen
                    </button>
                  {:else}
                    <button class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => setResolved(r, true)}>
                      <CheckCircle2 size={13} />Resolve
                    </button>
                  {/if}
                  <button class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-surface text-red-700 shadow-sm transition hover:bg-red-50" type="button" aria-label="Delete" on:click={() => openDelete(r)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

{#if redirectModalOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <form
      class="w-full max-w-lg overflow-y-auto rounded-[10px] border border-ink/10 bg-surface p-6 shadow-[0_24px_80px_rgba(57,61,50,0.18)]"
      transition:scale={{ duration: 160, start: 0.98 }}
      on:submit|preventDefault={saveRedirect}
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Fix broken link</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">Create redirect</h2>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeRedirect}>
          <X size={18} />
        </button>
      </div>

      <p class="mt-4 text-sm text-ink/60">Send everyone who hits this broken URL to a working page. This also marks the error resolved.</p>

      <div class="mt-5 grid gap-4">
        <AdminFormInput label="From path" name="from_path" bind:value={redirectForm.from_path} placeholder="/old-page" required />
        <AdminFormInput label="Redirect to" name="to_path" bind:value={redirectForm.to_path} placeholder="/destinations" required />
        <AdminSelect label="Status code" name="status_code" bind:value={redirectForm.status_code} options={statusCodeOptions} />
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AdminButton variant="secondary" type="button" on:click={closeRedirect}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={savingRedirect}>{savingRedirect ? 'Saving...' : 'Create & Resolve'}</AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete log"
  message={`Delete the log for "${toDelete?.url ?? 'this URL'}"? This is permanent.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(57,61,50,0.18)]">
    Deleting log...
  </div>
{/if}
