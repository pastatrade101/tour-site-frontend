<script lang="ts">
  /**
   * Translating one record — a tour, a category, a destination, a lodge.
   *
   * The previous version asked someone to translate without showing them what
   * they were translating: the English lived in the form above, so the job was
   * scroll up, remember a paragraph, scroll down, type it. The API had been
   * returning the source text the whole time and nothing displayed it.
   *
   * Now it reads the way the itinerary translator does — English on the left,
   * the translation on the right, field by field, with the fields that are
   * still missing marked where they actually are rather than listed by name in
   * a sentence.
   *
   * Same props and the same toast event as before, so every form that mounts
   * this keeps working untouched.
   */
  import { createEventDispatcher } from 'svelte';
  import { AlertTriangle, Check, ChevronDown, Copy, Globe, Loader2, Sparkles } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminRichText from './AdminRichText.svelte';
  import { toPlainText } from '$lib/richText';
  import type { EntityTranslations, TranslationStatus } from '$lib/types';

  export let entityType: string;
  export let entityId: string;

  const dispatch = createEventDispatcher<{ toast: { message: string; type?: 'success' | 'error' } }>();
  const toast = (message: string, type: 'success' | 'error' = 'success') => dispatch('toast', { message, type });

  let data: EntityTranslations | null = null;
  let active = '';
  let loading = true;
  let busy = '';
  let draft: Record<string, string | string[]> = {};
  let open = true;

  const STATUS_LABELS: Record<TranslationStatus, string> = {
    not_started: 'Not started',
    draft: 'Draft',
    translated: 'Translated',
    needs_review: 'Needs review',
    published: 'Live'
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
    draft = structuredClone(data.translations[active]?.fields ?? {});
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

  /** The English, as readable text — rich fields are shown without their tags. */
  const sourceText = (key: string, kind: string): string => {
    const value = data?.source?.[key];
    if (Array.isArray(value)) return value.map((v) => toPlainText(String(v)) || String(v)).filter(Boolean).join('\n');
    const raw = String(value ?? '');
    if (!raw.trim()) return '';
    return kind === 'rich' ? toPlainText(raw) || raw : raw;
  };

  const filled = (key: string): boolean => {
    const value = draft[key];
    return Array.isArray(value) ? value.length > 0 : String(value ?? '').trim().length > 0;
  };

  /** Progress against the required fields only — the ones that gate publishing. */
  $: requiredFields = (data?.fields ?? []).filter((f) => f.required);
  $: doneRequired = requiredFields.filter((f) => filled(f.key)).length;
  $: canPublish = requiredFields.length > 0 && doneRequired === requiredFields.length;

  const save = async (status: TranslationStatus) => {
    if (!data || busy) return;
    busy = status;
    try {
      const res = await api.translations.save(entityType, entityId, active, { fields: draft, translation_status: status });
      data.translations[active] = res.data;
      data = data;
      pickUp();
      toast(status === 'published' ? 'Published — this is now live for that language.' : `Saved as ${STATUS_LABELS[status].toLowerCase()}.`);
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
      toast('Filled with the English text — translate over it.');
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
        toast('Drafted — read it before publishing.');
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
  $: languageName = (code: string) => data?.languages.find((l) => l.code === code)?.name ?? code;

  const fieldClass =
    'h-10 w-full min-w-0 rounded-md border border-ink/15 bg-surface px-3 text-sm text-heading outline-none transition focus:border-goldfinch-gold focus:ring-2 focus:ring-goldfinch-gold/20';
  const areaClass =
    'w-full rounded-md border border-ink/15 bg-surface px-3 py-2.5 text-sm leading-6 text-heading outline-none transition focus:border-goldfinch-gold focus:ring-2 focus:ring-goldfinch-gold/20';
  const srcBox = 'whitespace-pre-line rounded-md border border-ink/10 bg-sand/25 px-3 py-2.5 text-sm leading-6 text-ink/70';
</script>

<section class="grid gap-3 rounded-[8px] border border-ink/10 bg-surface p-4">
  <button class="flex items-center gap-2 text-left" type="button" on:click={() => (open = !open)}>
    <ChevronDown size={16} class={`shrink-0 text-ink/40 transition ${open ? 'rotate-180' : ''}`} />
    <Globe size={15} class="text-forest/70" />
    <span class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Translations</span>
    {#if loading}<Loader2 size={14} class="animate-spin text-ink/40" />{/if}
    {#if data && !isDefault && activeRecord}
      <span class="ml-auto text-xs font-semibold {canPublish ? 'text-emerald-600' : 'text-ink/50'}">
        {languageName(active)} · {doneRequired} of {requiredFields.length} required fields
      </span>
    {/if}
  </button>

  {#if open}
    {#if data}
      <!-- One chip per language, each saying what state it is in rather than a
           bare tick or percentage that has to be decoded. -->
      <div class="flex flex-wrap gap-1.5 border-b border-ink/10 pb-3" role="tablist" aria-label="Translation languages">
        {#each data.languages.filter((l) => l.enabled) as language (language.code)}
          {@const record = data.translations[language.code]}
          {@const isSource = language.code === data.default_language}
          {@const live = record?.translation_status === 'published'}
          <button
            class={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-bold transition ${active === language.code ? 'border-deep-green bg-deep-green text-white' : 'border-ink/15 bg-surface text-ink/70 hover:border-forest/40 hover:text-heading'}`}
            type="button"
            role="tab"
            aria-selected={active === language.code}
            on:click={() => selectLanguage(language.code)}
          >
            {language.name}
            <span
              class={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                active === language.code
                  ? 'bg-white/15 text-white'
                  : isSource || live
                    ? 'bg-emerald-50 text-emerald-700'
                    : record && record.completeness > 0
                      ? 'bg-goldfinch-gold/25 text-heading'
                      : 'bg-ink/[0.06] text-ink/45'
              }`}
            >
              {isSource ? 'Source' : live ? 'Live' : !record || record.translation_status === 'not_started' ? 'To do' : `${record.completeness}%`}
            </span>
            {#if record?.outdated}<AlertTriangle size={12} class="text-clay" />{/if}
          </button>
        {/each}
      </div>

      {#if isDefault}
        <p class="rounded-[8px] border border-dashed border-ink/15 px-3 py-3 text-sm text-ink/60">
          {languageName(active)} is the original. It is written in the form above and appears here for the other languages to be translated
          from.
        </p>
      {:else if activeRecord}
        {#if activeRecord.outdated}
          <p class="flex items-start gap-2 rounded-[8px] border border-clay/25 bg-clay/[0.06] px-3 py-2.5 text-sm text-clay">
            <AlertTriangle size={15} class="mt-0.5 shrink-0" />
            The English has changed since this was translated. Read it against the current text before publishing again.
          </p>
        {/if}

        <div class="flex flex-wrap gap-2">
          <button
            class="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/15 bg-surface px-3 text-xs font-semibold text-heading transition hover:bg-sand/50 disabled:opacity-50"
            type="button"
            disabled={Boolean(busy)}
            on:click={copyFromDefault}><Copy size={13} /> {busy === 'copy' ? 'Copying…' : 'Copy the English'}</button
          >
          <button
            class="inline-flex h-9 items-center gap-1.5 rounded-md border border-forest/25 bg-surface px-3 text-xs font-bold text-forest transition hover:bg-sand/50 disabled:opacity-50"
            type="button"
            disabled={Boolean(busy)}
            on:click={aiTranslate}
          >
            {#if busy === 'ai'}<Loader2 size={13} class="animate-spin" />{:else}<Sparkles size={13} />{/if}
            Draft with AI
          </button>
          <span class="self-center text-[11px] leading-5 text-ink/45">
            Machine drafts are a starting point. Nothing is live until you publish.
          </span>
        </div>

        <div class="grid gap-4">
          {#each data.fields as field (field.key)}
            {@const src = sourceText(field.key, field.kind)}
            {@const missing = Boolean(field.required) && !filled(field.key)}
            <div class="grid gap-2 lg:grid-cols-2 lg:gap-4">
              <!-- The English, shown and never editable. Its source of truth is
                   the form above; editing it here would fork the record. -->
              <div class="grid gap-1.5">
                <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/40">
                  {languageName(data.default_language)} · {field.label}
                </span>
                {#if src.trim()}
                  <div class={srcBox}>{src}</div>
                {:else}
                  <div class="rounded-md border border-dashed border-ink/12 px-3 py-2.5 text-sm italic text-ink/35">
                    Empty in {languageName(data.default_language)} — nothing to translate.
                  </div>
                {/if}
              </div>

              <div class="grid gap-1.5">
                <span class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-forest/70">
                  {languageName(active)} · {field.label}
                  {#if missing}
                    <!-- Marked where the field is, rather than named in a list
                         at the top that has to be matched up by eye. -->
                    <span class="rounded-full bg-goldfinch-gold/25 px-1.5 py-0.5 text-[9px] font-bold normal-case tracking-normal text-heading">
                      Needed to publish
                    </span>
                  {/if}
                </span>

                {#if !src.trim()}
                  <div class="rounded-md border border-dashed border-ink/12 px-3 py-2.5 text-sm italic text-ink/35">—</div>
                {:else if field.kind === 'rich'}
                  <AdminRichText label="" name={`tr_${field.key}`} rows={5} headings="none" bind:value={draft[field.key] as string} />
                {:else if field.kind === 'textarea'}
                  <textarea class={areaClass} rows="3" bind:value={draft[field.key] as string}></textarea>
                {:else if field.kind === 'rich_list'}
                  <textarea
                    class={areaClass}
                    rows="4"
                    value={listToText(draft[field.key])}
                    on:input={(event) => (draft[field.key] = textToList(event.currentTarget.value))}
                  ></textarea>
                  <span class="text-[11px] text-ink/45">One per line, matching the English above.</span>
                {:else}
                  <input class={fieldClass} bind:value={draft[field.key] as string} />
                {/if}
              </div>
            </div>
          {/each}
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2 border-t border-ink/10 pt-3">
          {#if !canPublish}
            <span class="mr-auto flex items-center gap-1.5 text-[11px] text-ink/50">
              <AlertTriangle size={12} class="text-goldfinch-gold" />
              {requiredFields.length - doneRequired}
              {requiredFields.length - doneRequired === 1 ? 'field is' : 'fields are'} still needed before this can go live.
            </span>
          {/if}
          <button
            class="inline-flex h-9 items-center rounded-md border border-ink/15 px-3 text-xs font-semibold text-heading transition hover:bg-sand/50 disabled:opacity-50"
            type="button"
            disabled={Boolean(busy)}
            on:click={() => save('draft')}>{busy === 'draft' ? 'Saving…' : 'Save draft'}</button
          >
          <button
            class="inline-flex h-9 items-center rounded-md border border-ink/15 px-3 text-xs font-semibold text-heading transition hover:bg-sand/50 disabled:opacity-50"
            type="button"
            disabled={Boolean(busy)}
            on:click={() => save('needs_review')}>{busy === 'needs_review' ? 'Saving…' : 'Ask for review'}</button
          >
          <button
            class="inline-flex h-9 items-center gap-1.5 rounded-md bg-forest px-4 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            type="button"
            disabled={Boolean(busy) || !canPublish}
            on:click={() => save('published')}
          >
            {#if busy === 'published'}<Loader2 size={13} class="animate-spin" />{:else}<Check size={13} />{/if}
            Publish
          </button>
        </div>
      {/if}
    {:else if !loading}
      <p class="text-sm text-ink/55">Translations are unavailable right now.</p>
    {/if}
  {/if}
</section>
