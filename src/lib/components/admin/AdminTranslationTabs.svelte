<script lang="ts">
  /**
   * Reusable translation manager: mount inside any entity edit form with an
   * entityType + entityId and it handles the rest — language tabs with live
   * status, per-field editors from the backend registry, copy-from-default,
   * AI translation (always lands as needs-review), and publish with server
   * validation. The default language tab is read-only here because its source
   * of truth is the main form above it.
   */
  import { createEventDispatcher } from 'svelte';
  import { AlertTriangle, Check, Copy, Globe, Loader2, Sparkles } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from './AdminButton.svelte';
  import AdminFormInput from './AdminFormInput.svelte';
  import AdminRichText from './AdminRichText.svelte';
  import AdminTextArea from './AdminTextArea.svelte';
  import type { EntityTranslations, TranslationStatus } from '$lib/types';

  export let entityType: string;
  export let entityId: string;

  const dispatch = createEventDispatcher<{ toast: { message: string; type?: 'success' | 'error' } }>();
  const toast = (message: string, type: 'success' | 'error' = 'success') => dispatch('toast', { message, type });

  let data: EntityTranslations | null = null;
  let active = '';
  let loading = true;
  let busy = '';
  // Working copy of the active language's fields.
  let draft: Record<string, string | string[]> = {};

  const STATUS_LABELS: Record<TranslationStatus, string> = {
    not_started: 'Not started',
    draft: 'Draft',
    translated: 'Translated',
    needs_review: 'Needs review',
    published: 'Published'
  };

  const load = async () => {
    loading = true;
    try {
      const res = await api.translations.forEntity(entityType, entityId);
      data = res.data;
      if (!active) active = data.languages.find((l) => !l.is_default && l.enabled)?.code ?? data.default_language;
      pickUp();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to load translations.', 'error');
    } finally {
      loading = false;
    }
  };

  const pickUp = () => {
    if (!data) return;
    const record = data.translations[active];
    draft = structuredClone(record?.fields ?? {});
    for (const field of data.fields) {
      if (draft[field.key] === undefined) draft[field.key] = field.kind === 'rich_list' ? [] : '';
    }
  };

  const selectLanguage = (code: string) => {
    active = code;
    pickUp();
  };

  const listToText = (value: string | string[] | undefined): string =>
    (Array.isArray(value) ? value : []).map((item) => item.replace(/<[^>]*>/g, ' ').trim()).filter(Boolean).join('\n');
  const textToList = (value: string): string[] => value.split('\n').map((line) => line.trim()).filter(Boolean);

  const save = async (status: TranslationStatus) => {
    if (!data || busy) return;
    busy = status;
    try {
      const res = await api.translations.save(entityType, entityId, active, {
        fields: draft,
        translation_status: status
      });
      data.translations[active] = res.data;
      data = data;
      pickUp();
      toast(status === 'published' ? 'Translation published.' : `Saved as ${STATUS_LABELS[status].toLowerCase()}.`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to save the translation.', 'error');
    } finally {
      busy = '';
    }
  };

  const copyFromDefault = async () => {
    if (busy) return;
    busy = 'copy';
    try {
      const res = await api.translations.copyFromDefault(entityType, entityId, active);
      data!.translations[active] = res.data;
      data = data;
      pickUp();
      toast('Empty fields filled from the default language.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Copy failed.', 'error');
    } finally {
      busy = '';
    }
  };

  const aiTranslate = async () => {
    if (busy) return;
    busy = 'ai';
    try {
      const res = await api.translations.aiTranslate(entityType, entityId, active);
      if (res.data) {
        data!.translations[active] = res.data;
        data = data;
        pickUp();
        toast('AI translation saved — review before publishing.');
      } else {
        toast(res.message);
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'AI translation failed.', 'error');
    } finally {
      busy = '';
    }
  };

  $: if (entityType && entityId) void load();
  $: activeRecord = data?.translations[active];
  $: isDefault = data?.default_language === active;

  const badge = (code: string): string => {
    if (!data) return '';
    const record = data.translations[code];
    if (code === data.default_language) return '✓';
    if (!record || record.translation_status === 'not_started') return '—';
    if (record.translation_status === 'published') return '✓';
    return `${record.completeness}%`;
  };
</script>

<section class="grid gap-4 rounded-[8px] border border-ink/10 bg-sand/20 p-4">
  <div class="flex items-center gap-2">
    <Globe size={15} class="text-forest/70" />
    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Translations</p>
    {#if loading}<Loader2 size={14} class="animate-spin text-ink/40" />{/if}
  </div>

  {#if data}
    <div class="flex flex-wrap gap-1.5" role="tablist" aria-label="Translation languages">
      {#each data.languages.filter((l) => l.enabled) as language (language.code)}
        {@const record = data.translations[language.code]}
        <button
          class={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition ${active === language.code ? 'border-deep-green bg-deep-green text-white' : 'border-ink/15 bg-surface text-ink/70 hover:border-forest/40 hover:text-heading'}`}
          type="button"
          role="tab"
          aria-selected={active === language.code}
          on:click={() => selectLanguage(language.code)}
        >
          {language.name}
          <span class={active === language.code ? 'text-goldfinch-gold' : 'text-ink/40'}>{badge(language.code)}</span>
          {#if record?.outdated}<AlertTriangle size={12} class="text-clay" />{/if}
        </button>
      {/each}
    </div>

    {#if isDefault}
      <p class="rounded-[8px] border border-dashed border-ink/15 bg-surface px-3 py-3 text-sm text-ink/60">
        {data.languages.find((l) => l.code === active)?.name} is the source language — its content is edited in the form above and mirrors here automatically.
      </p>
    {:else if activeRecord}
      <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink/60">
        <span class="rounded-full bg-surface px-2.5 py-1 ring-1 ring-ink/10">{STATUS_LABELS[activeRecord.translation_status]}</span>
        <span class="rounded-full bg-surface px-2.5 py-1 ring-1 ring-ink/10">{activeRecord.completeness}% of required fields</span>
        {#if activeRecord.missing_required.length}
          <span class="text-clay">Missing: {activeRecord.missing_required.join(', ')}</span>
        {/if}
      </div>

      {#if activeRecord.outdated}
        <p class="flex items-start gap-2 rounded-[8px] border border-clay/25 bg-clay/[0.06] px-3 py-2.5 text-sm text-clay">
          <AlertTriangle size={15} class="mt-0.5 shrink-0" />
          The source content has changed since this translation was saved — review it against the current text.
        </p>
      {/if}

      <div class="grid gap-4">
        {#each data.fields as field (field.key)}
          {#if field.kind === 'rich'}
            <AdminRichText label={`${field.label}${field.required ? ' *' : ''}`} name={`tr_${field.key}`} bind:value={draft[field.key] as string} rows={5} />
          {:else if field.kind === 'textarea'}
            <AdminTextArea label={`${field.label}${field.required ? ' *' : ''}`} name={`tr_${field.key}`} bind:value={draft[field.key] as string} rows={3} />
          {:else if field.kind === 'rich_list'}
            <label class="grid gap-1.5">
              <span class="text-[13px] font-semibold text-ink/65">{field.label} <span class="font-normal text-ink/40">(one per line)</span></span>
              <textarea
                class="rounded-md border border-ink/15 bg-black/[0.02] px-3.5 py-2.5 text-sm text-ink outline-none transition hover:border-ink/25 focus:border-forest focus:bg-surface focus:ring-2 focus:ring-forest/20"
                rows={4}
                value={listToText(draft[field.key])}
                on:input={(event) => (draft[field.key] = textToList(event.currentTarget.value))}
              ></textarea>
            </label>
          {:else}
            <AdminFormInput label={`${field.label}${field.required ? ' *' : ''}`} name={`tr_${field.key}`} bind:value={draft[field.key] as string} />
          {/if}
        {/each}
      </div>

      <div class="flex flex-wrap gap-2 border-t border-ink/10 pt-4">
        <AdminButton type="button" variant="secondary" disabled={Boolean(busy)} on:click={() => save('draft')}>
          {busy === 'draft' ? 'Saving…' : 'Save draft'}
        </AdminButton>
        <AdminButton type="button" variant="secondary" disabled={Boolean(busy)} on:click={copyFromDefault}>
          <Copy size={14} /> {busy === 'copy' ? 'Copying…' : `Copy from ${data.languages.find((l) => l.code === data?.default_language)?.name ?? 'default'}`}
        </AdminButton>
        <AdminButton type="button" variant="secondary" disabled={Boolean(busy)} on:click={aiTranslate}>
          <Sparkles size={14} /> {busy === 'ai' ? 'Translating…' : 'Translate missing with AI'}
        </AdminButton>
        <AdminButton type="button" variant="secondary" disabled={Boolean(busy)} on:click={() => save('needs_review')}>
          {busy === 'needs_review' ? 'Saving…' : 'Mark for review'}
        </AdminButton>
        <AdminButton type="button" disabled={Boolean(busy)} on:click={() => save('published')}>
          <Check size={14} /> {busy === 'published' ? 'Publishing…' : 'Publish'}
        </AdminButton>
      </div>
    {/if}
  {:else if !loading}
    <p class="text-sm text-ink/55">Translations are unavailable right now.</p>
  {/if}
</section>
