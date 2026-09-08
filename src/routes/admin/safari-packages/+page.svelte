<script lang="ts">
  /**
   * Safari packages — compose a landing page from blocks.
   *
   * Two rules this screen exists to keep:
   *
   *  1. The edit form is ALWAYS built from the full record fetched by slug,
   *     never from the row in the list. The list projection has no `sections`,
   *     and a form seeded from it would save the page back with its content
   *     erased. If that fetch fails the form does not open.
   *
   *  2. A page is not indexable until somebody says so, and the differentiation
   *     guard tells them what the page is still missing. It warns; it never
   *     blocks.
   */
  import { onMount } from 'svelte';
  import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Plus } from '@lucide/svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import MediaPicker from '$lib/components/admin/MediaPicker.svelte';
  import SafariPackageBlocksEditor from '$lib/components/admin/SafariPackageBlocksEditor.svelte';
  import { api } from '$lib/api/client';
  import { assessPackageDifferentiation, type Assessment } from '$lib/packageDifferentiation';
  import { blocksForEditing, blocksForSaving, type Block } from '$lib/safariPackageBlocks';
  import type { SafariPackage, Tour } from '$lib/types';

  type Row = SafariPackage;

  let rows: Row[] = [];
  let tours: Tour[] = [];
  let loading = true;
  let listError = '';

  let open = false;
  let editingId: string | null = null;
  let opening = false;
  let saving = false;
  let formError = '';
  let toast = '';

  const blank = () => ({
    name: '',
    slug: '',
    tour_id: '',
    hero_eyebrow: '',
    hero_title: '',
    hero_subtitle: '',
    hero_image_url: '',
    status: 'draft',
    indexable: false,
    meta_title: '',
    meta_description: ''
  });

  let form = blank();
  let blocks: Block[] = [];
  /**
   * How many published days the linked tour has.
   *
   * Taken from the full record, or fetched when the editor picks a different
   * tour. It cannot come from the tour dropdown: that list is a projection and
   * carries no itinerary_days, so reading it there reported every page as
   * having no itinerary and the guard marked a complete page incomplete.
   */
  let linkedDayCount = 0;
  /** Cleared whenever the warning changes, so a stale tick cannot carry over. */
  let acknowledged = '';

  const loadList = async () => {
    loading = true;
    listError = '';
    try {
      // `status: 'all'` on purpose. The list helper defaults to published, and
      // every new page starts as a draft — without this an editor could not see,
      // let alone open, the page they had just created.
      const res = await api.safariPackages.list({ status: 'all', limit: 200 });
      rows = res.data.items ?? [];
    } catch (error) {
      listError = error instanceof Error ? error.message : 'Could not load safari packages.';
    } finally {
      loading = false;
    }
  };

  onMount(async () => {
    await loadList();
    try {
      const res = await api.tours.list({ status: 'published', limit: 200 });
      tours = (res.data.items ?? []) as Tour[];
    } catch {
      // The tour picker simply offers nothing; the page still saves.
    }
  });

  const startCreate = () => {
    editingId = null;
    form = blank();
    blocks = [];
    linkedDayCount = 0;
    formError = '';
    acknowledged = '';
    open = true;
  };

  const startEdit = async (row: Row) => {
    if (opening) return;
    opening = true;
    formError = '';
    try {
      // The FULL record. Never `row` — see the note at the top of this file.
      const res = await api.safariPackages.get(row.slug);
      const full = res.data;
      if (!full?.id) throw new Error('That package could not be loaded.');

      editingId = full.id;
      form = {
        name: full.name ?? '',
        slug: full.slug ?? '',
        tour_id: full.tour_id ?? '',
        hero_eyebrow: full.hero_eyebrow ?? '',
        hero_title: full.hero_title ?? '',
        hero_subtitle: full.hero_subtitle ?? '',
        hero_image_url: full.hero_image_url ?? '',
        status: full.status ?? 'draft',
        indexable: full.indexable === true,
        meta_title: full.meta_title ?? '',
        meta_description: full.meta_description ?? ''
      };
      blocks = blocksForEditing(full.sections);
      linkedDayCount = (full.tours?.itinerary_days ?? []).length;
      acknowledged = '';
      open = true;
    } catch (error) {
      // Refusing to open is the point: an empty form here saves an empty page.
      toast = error instanceof Error ? error.message : 'Could not open that package.';
    } finally {
      opening = false;
    }
  };

  /** Re-read the day count whenever the chosen tour changes. */
  const onTourChange = async () => {
    const tour = tours.find((item) => item.id === form.tour_id);
    if (!tour?.slug) {
      linkedDayCount = 0;
      return;
    }
    try {
      const res = await api.tours.get(tour.slug);
      linkedDayCount = ((res.data as { itinerary_days?: unknown[] })?.itinerary_days ?? []).length;
    } catch {
      linkedDayCount = 0;
    }
  };

  /**
   * Assessed against the draft in front of the editor, and only against pages
   * that are already published AND indexable — a draft is not competition.
   */
  $: rivals = rows
    .filter((row) => row.id !== editingId && row.status === 'published' && row.indexable === true)
    .map((row) => ({ slug: row.slug, name: row.name, sections: row.sections, hero_title: row.hero_title, hero_subtitle: row.hero_subtitle, meta_description: row.meta_description }));

  $: assessment = open
    ? assessPackageDifferentiation(
        {
          slug: form.slug || 'new-page',
          name: form.name,
          hero_eyebrow: form.hero_eyebrow,
          hero_title: form.hero_title,
          hero_subtitle: form.hero_subtitle,
          meta_title: form.meta_title,
          meta_description: form.meta_description,
          sections: blocksForSaving(blocks),
          itinerary_day_count: linkedDayCount
        },
        rivals
      )
    : (null as Assessment | null);

  /** A tick is tied to the exact warning it answered. */
  $: warningKey = assessment ? `${assessment.verdict}|${assessment.gaps.join('|')}` : '';
  $: needsAck = form.indexable && assessment?.requiresAcknowledgement === true && acknowledged !== warningKey;

  const save = async () => {
    if (saving) return;
    formError = '';
    if (form.name.trim().length < 2) {
      formError = 'Give the page a name.';
      return;
    }
    if (needsAck) {
      formError = 'This page reads as a near-duplicate. Tick the box to publish it anyway, or give it something of its own.';
      return;
    }

    saving = true;
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        tour_id: form.tour_id || null,
        hero_eyebrow: form.hero_eyebrow || null,
        hero_title: form.hero_title || null,
        hero_subtitle: form.hero_subtitle || null,
        hero_image_url: form.hero_image_url || null,
        sections: blocksForSaving(blocks),
        status: form.status,
        // A real boolean, always sent. Leaving it out would let the column keep
        // a value the editor has just turned off.
        indexable: form.indexable === true,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null
      };
      if (form.slug.trim()) payload.slug = form.slug.trim();

      if (editingId) await api.safariPackages.update(editingId, payload);
      else await api.safariPackages.create(payload);

      toast = editingId ? 'Package saved.' : 'Package created.';
      open = false;
      await loadList();
    } catch (error) {
      formError = error instanceof Error ? error.message : 'Could not save this package.';
    } finally {
      saving = false;
    }
  };

  const remove = async (row: Row) => {
    if (!confirm(`Delete “${row.name}”? The page stops resolving immediately.`)) return;
    try {
      await api.safariPackages.remove(row.id);
      toast = 'Package deleted.';
      await loadList();
    } catch (error) {
      toast = error instanceof Error ? error.message : 'Could not delete that package.';
    }
  };

  const VERDICT_STYLE: Record<string, string> = {
    strong: 'border-forest/30 bg-forest/[0.07] text-forest',
    moderate: 'border-goldfinch-gold/40 bg-goldfinch-gold/10 text-heading',
    weak: 'border-clay/30 bg-clay/[0.07] text-clay'
  };
</script>

<AdminPageHeader title="Safari packages" description="Landing pages composed from content blocks." />

{#if toast}
  <p class="mb-4 rounded-[10px] border border-ink/12 bg-sand/50 px-4 py-3 text-sm text-heading">{toast}</p>
{/if}

<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
  <p class="text-sm text-ink/60">{rows.length} page{rows.length === 1 ? '' : 's'}</p>
  <button type="button" class="inline-flex h-10 items-center gap-1.5 rounded bg-goldfinch-gold px-4 text-sm font-bold text-heading transition hover:brightness-105" on:click={startCreate}>
    <Plus size={15} /> New package
  </button>
</div>

{#if loading}
  <p class="text-sm text-ink/60">Loading…</p>
{:else if listError}
  <p class="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{listError}</p>
{:else if !rows.length}
  <p class="rounded-[10px] border border-ink/12 bg-sand/35 px-4 py-4 text-sm text-ink/70">
    No safari packages yet. Create one to start a landing page.
  </p>
{:else}
  <div class="overflow-x-auto rounded-[12px] border border-ink/12">
    <table class="w-full min-w-[720px] border-collapse text-left text-sm">
      <thead class="bg-sand/50">
        <tr>
          <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-ink/60">Page</th>
          <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-ink/60">Status</th>
          <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-ink/60">Indexable</th>
          <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-ink/60">Blocks</th>
          <th class="px-4 py-3"></th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.id)}
          <tr class="border-t border-ink/8">
            <td class="px-4 py-3">
              <span class="font-semibold text-heading">{row.name}</span>
              <span class="mt-0.5 block text-[12px] text-ink/50">/{row.slug}</span>
            </td>
            <td class="px-4 py-3 capitalize text-ink/70">{row.status}</td>
            <td class="px-4 py-3">
              {#if row.indexable === true}
                <span class="rounded bg-forest/10 px-2 py-1 text-[11px] font-bold text-forest">Indexable</span>
              {:else}
                <span class="rounded bg-ink/8 px-2 py-1 text-[11px] font-bold text-ink/55">No index</span>
              {/if}
            </td>
            <td class="px-4 py-3 text-ink/60">{(row.sections ?? []).length}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2">
                <a class="rounded border border-ink/15 px-2.5 py-1.5 text-[12px] font-semibold text-forest transition hover:border-goldfinch-gold" href={`/${row.slug}`} target="_blank" rel="noopener noreferrer">
                  View <ExternalLink size={12} class="inline" />
                </a>
                <button type="button" class="rounded border border-ink/15 px-2.5 py-1.5 text-[12px] font-semibold text-heading transition hover:border-goldfinch-gold disabled:opacity-40" disabled={opening} on:click={() => startEdit(row)}>
                  {#if opening}<Loader2 size={12} class="inline animate-spin" />{/if} Edit
                </button>
                <button type="button" class="rounded border border-ink/15 px-2.5 py-1.5 text-[12px] font-semibold text-red-600 transition hover:border-red-300" on:click={() => remove(row)}>Delete</button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

{#if open}
  <section class="mt-8 grid gap-6 rounded-[14px] border border-ink/12 bg-canvas p-5 md:p-6">
    <h2 class="font-serif text-2xl font-semibold text-heading">{editingId ? 'Edit package' : 'New package'}</h2>

    <div class="grid gap-4 md:grid-cols-2">
      <AdminFormInput label="Name" name="name" required bind:value={form.name} placeholder="2-Day Safari from Zanzibar" />
      <AdminFormInput label="Slug" name="slug" bind:value={form.slug} placeholder="Left blank, made from the name" />
      <AdminFormInput label="Hero eyebrow" name="hero_eyebrow" bind:value={form.hero_eyebrow} />
      <AdminFormInput label="Hero heading" name="hero_title" bind:value={form.hero_title} />
    </div>

    <AdminTextArea label="Hero subtitle" name="hero_subtitle" rows={2} bind:value={form.hero_subtitle} />
    <MediaPicker label="Hero image" bind:value={form.hero_image_url} on:change={(event) => (form.hero_image_url = event.detail ?? '')} />

    <div class="grid gap-4 md:grid-cols-2">
      <AdminSelect
        label="Linked tour"
        name="tour_id"
        bind:value={form.tour_id}
        on:change={onTourChange}
        options={[{ label: 'No tour linked', value: '' }, ...tours.map((tour) => ({ label: tour.title, value: tour.id }))]}
      />
      <AdminSelect
        label="Status"
        name="status"
        bind:value={form.status}
        options={[
          { label: 'Draft', value: 'draft' },
          { label: 'Published', value: 'published' },
          { label: 'Archived', value: 'archived' }
        ]}
      />
    </div>
    <p class="-mt-2 text-[12px] text-ink/55">
      The day-by-day block renders the linked tour's published days. Without a tour it draws nothing.
    </p>

    <div class="grid gap-4 md:grid-cols-2">
      <AdminFormInput label="Meta title" name="meta_title" bind:value={form.meta_title} />
      <AdminTextArea label="Meta description" name="meta_description" rows={2} bind:value={form.meta_description} />
    </div>

    <!-- ── Content blocks ─────────────────────────────────────────────── -->
    <div>
      <h3 class="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-ink/55">Page content</h3>
      <SafariPackageBlocksEditor bind:blocks />
    </div>

    <!-- ── Search visibility ──────────────────────────────────────────── -->
    <div class="grid gap-3 rounded-[12px] border border-ink/12 bg-surface p-4">
      <label class="flex items-start gap-3">
        <input type="checkbox" class="mt-1 h-4 w-4 rounded border-ink/30 text-goldfinch-gold focus:ring-goldfinch-gold" bind:checked={form.indexable} />
        <span>
          <span class="block text-sm font-semibold text-heading">Let search engines index this page</span>
          <span class="mt-0.5 block text-[12px] leading-5 text-ink/55">
            Off by default. Turn it on once the page says something the others do not — it controls both the page's robots tag and whether the sitemap offers it.
          </span>
        </span>
      </label>

      {#if assessment}
        <div class={`rounded-[10px] border p-3 ${VERDICT_STYLE[assessment.verdict]}`}>
          <p class="flex items-center gap-2 text-sm font-bold capitalize">
            {#if assessment.verdict === 'strong'}<CheckCircle2 size={15} />{:else}<AlertTriangle size={15} />{/if}
            {assessment.verdict} differentiation
          </p>
          {#if assessment.gaps.length}
            <ul class="mt-2 grid gap-1 text-[12.5px] leading-5">
              {#each assessment.gaps as gap (gap)}<li>• {gap}</li>{/each}
            </ul>
          {/if}
          {#if assessment.strengths.length}
            <details class="mt-2">
              <summary class="cursor-pointer text-[12px] font-semibold opacity-75">What this page does have</summary>
              <ul class="mt-1.5 grid gap-1 text-[12.5px] leading-5 opacity-90">
                {#each assessment.strengths as strength (strength)}<li>• {strength}</li>{/each}
              </ul>
            </details>
          {/if}
        </div>

        {#if form.indexable && assessment.requiresAcknowledgement}
          <label class="flex items-start gap-3 rounded-[10px] border border-clay/30 bg-clay/[0.06] p-3">
            <input
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-clay/40 text-clay focus:ring-clay"
              checked={acknowledged === warningKey}
              on:change={(event) => (acknowledged = event.currentTarget.checked ? warningKey : '')}
            />
            <span class="text-[12.5px] leading-5 text-clay">
              I have read the above and want this page indexed anyway.
            </span>
          </label>
        {/if}
      {/if}
    </div>

    {#if formError}
      <p class="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>
    {/if}

    <div class="flex flex-wrap gap-3">
      <button type="button" class="inline-flex h-11 items-center gap-2 rounded bg-goldfinch-gold px-5 text-sm font-bold text-heading transition hover:brightness-105 disabled:opacity-60" disabled={saving} on:click={save}>
        {#if saving}<Loader2 size={15} class="animate-spin" />{/if}
        {editingId ? 'Save changes' : 'Create package'}
      </button>
      <button type="button" class="inline-flex h-11 items-center rounded border border-ink/20 px-5 text-sm font-semibold text-heading transition hover:bg-sand/50" on:click={() => (open = false)}>
        Cancel
      </button>
    </div>
  </section>
{/if}
