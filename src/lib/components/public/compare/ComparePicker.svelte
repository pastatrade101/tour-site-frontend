<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { Check, Search, X } from '@lucide/svelte';
  import { apiRequest } from '$lib/api/client';
  import { KINDS } from '$lib/compare/kinds';
  import type { CompareKind } from '$lib/compare/model';
  import type { ComparePick } from '$lib/compare/store';
  import { t } from '$lib/i18n/ui';
  import Img from '$lib/components/public/Img.svelte';

  /**
   * Choosing what goes into a column, without leaving the comparison: to add
   * one more, or to swap one for another. Lists everything published in the
   * category, with a search box; what is already being compared is marked and
   * cannot be picked twice.
   */
  export let kind: CompareKind;
  /** Keys already in the comparison. */
  export let taken: string[] = [];
  /** What the dialog is for, in the reader's language ("Add a safari", "Replace Serengeti …"). */
  export let heading = '';

  const dispatch = createEventDispatcher<{ select: ComparePick; close: void }>();

  type Row = { pick: ComparePick; subtitle: string };

  let rows: Row[] = [];
  let loading = true;
  let failed = false;
  let query = '';
  let input: HTMLInputElement | null = null;
  let panel: HTMLElement | null = null;

  $: config = KINDS[kind];
  $: needle = query.trim().toLowerCase();
  $: visible = needle ? rows.filter((row) => `${row.pick.title} ${row.subtitle}`.toLowerCase().includes(needle)) : rows;

  const load = async () => {
    loading = true;
    failed = false;
    try {
      const response = await apiRequest<{ items?: unknown[] } | unknown[]>(config.listPath);
      const data = response.data;
      const records = Array.isArray(data) ? data : (data?.items ?? []);
      const ctx = { t: $t, extras: {} };
      rows = records
        .map((record) => ({ pick: config.toPick(record), subtitle: config.toItem(record, ctx).subtitle }))
        .filter((row) => row.pick.key && row.pick.title)
        .sort((a, b) => a.pick.title.localeCompare(b.pick.title));
    } catch {
      failed = true;
      rows = [];
    } finally {
      loading = false;
    }
  };

  const close = () => dispatch('close');

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    // Keep Tab inside the dialog while it is open.
    if (event.key !== 'Tab' || !panel) return;
    const focusable = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), input, a[href]')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  onMount(() => {
    const opener = document.activeElement as HTMLElement | null;
    const scroll = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    void load();
    void tick().then(() => input?.focus());
    return () => {
      document.documentElement.style.overflow = scroll;
      opener?.focus?.();
    };
  });
</script>

<svelte:window on:keydown={onKeydown} />

<div class="picker-backdrop" transition:fade={{ duration: 140 }} on:click|self={close} role="presentation">
  <div class="picker" role="dialog" aria-modal="true" aria-label={heading} bind:this={panel} transition:fly={{ y: 16, duration: 200 }}>
    <header>
      <h2>{heading}</h2>
      <button type="button" class="picker-close" aria-label={$t('ui.close')} on:click={close}><X size={18} /></button>
    </header>

    <label class="picker-search">
      <Search size={16} aria-hidden="true" />
      <span class="sr-only">{$t('cta.search')}</span>
      <input bind:this={input} bind:value={query} type="search" placeholder={$t('compare.picker_search')} autocomplete="off" />
    </label>

    <div class="picker-list" data-lenis-prevent>
      {#if loading}
        <p class="picker-note">{$t('compare.picker_loading')}</p>
      {:else if failed}
        <p class="picker-note">{$t('compare.picker_failed')}</p>
        <button type="button" class="picker-retry" on:click={load}>{$t('compare.try_again')}</button>
      {:else if !visible.length}
        <p class="picker-note">{$t('compare.picker_none')}</p>
      {:else}
        <ul>
          {#each visible as row (row.pick.key)}
            {@const used = taken.includes(row.pick.key)}
            <li>
              <button type="button" disabled={used} on:click={() => dispatch('select', row.pick)}>
                <span class="picker-thumb">
                  {#if row.pick.image}<Img src={row.pick.image} alt="" width={128} sizes="64px" className="h-full w-full object-cover" />{/if}
                </span>
                <span class="picker-text">
                  <span class="picker-title">{row.pick.title}</span>
                  {#if row.subtitle}<span class="picker-sub">{row.subtitle}</span>{/if}
                </span>
                {#if used}<span class="picker-used"><Check size={13} />{$t('compare.added')}</span>{/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</div>

<style>
  .picker-backdrop { position: fixed; inset: 0; z-index: 70; display: grid; place-items: center; padding: 16px; background: rgb(20 22 16 / 0.55); backdrop-filter: blur(3px); }
  .picker { display: flex; flex-direction: column; width: min(560px, 100%); max-height: min(680px, calc(100dvh - 32px)); overflow: hidden; border-radius: 16px; background: rgb(var(--c-surface)); box-shadow: 0 30px 80px -24px rgb(0 0 0 / 0.5); }
  header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 16px 12px 20px; }
  h2 { margin: 0; color: rgb(var(--c-heading)); font-size: 18px; font-weight: 700; line-height: 1.25; }
  .picker-close { display: grid; flex: none; place-items: center; width: 40px; height: 40px; border-radius: 10px; color: rgb(var(--c-ink) / 0.6); }
  .picker-close:hover { background: rgb(var(--c-ink) / 0.07); color: rgb(var(--c-heading)); }
  .picker-search { display: flex; align-items: center; gap: 10px; height: 46px; margin: 0 20px 12px; padding: 0 14px; border: 1px solid rgb(var(--c-ink) / 0.15); border-radius: 10px; background: rgb(var(--c-canvas)); color: rgb(var(--c-ink) / 0.55); }
  .picker-search:focus-within { border-color: rgb(var(--c-forest)); }
  /* 16px so a phone does not zoom the page when the field takes focus. */
  .picker-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: rgb(var(--c-heading)); font-size: 16px; }
  .picker-list { flex: 1; min-height: 120px; overflow-y: auto; overscroll-behavior: contain; border-top: 1px solid rgb(var(--c-ink) / 0.08); padding: 6px 8px 10px; }
  ul { margin: 0; padding: 0; list-style: none; }
  li button { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 60px; padding: 6px 12px; border-radius: 10px; text-align: left; }
  li button:hover:not(:disabled), li button:focus-visible { background: rgb(var(--c-canvas)); }
  li button:disabled { cursor: default; opacity: 0.55; }
  .picker-thumb { flex: none; width: 60px; height: 46px; overflow: hidden; border-radius: 8px; background: rgb(var(--c-ink) / 0.08); }
  .picker-text { display: grid; flex: 1; gap: 2px; min-width: 0; }
  .picker-title { color: rgb(var(--c-heading)); font-size: 14px; font-weight: 650; line-height: 1.3; }
  .picker-sub { overflow: hidden; color: rgb(var(--c-ink) / 0.6); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
  .picker-used { display: inline-flex; flex: none; align-items: center; gap: 4px; color: rgb(var(--c-forest)); font-size: 12px; font-weight: 700; }
  .picker-note { margin: 0; padding: 26px 12px 8px; color: rgb(var(--c-ink) / 0.65); font-size: 14px; text-align: center; }
  .picker-retry { display: block; margin: 4px auto 14px; color: rgb(var(--c-forest)); font-size: 14px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
  .picker :global(:focus-visible) { outline: 2px solid rgb(var(--c-goldfinch-gold)); outline-offset: 2px; }
  /* The field's own border already shows focus. */
  .picker .picker-search input:focus-visible { outline: none; }
  @media (max-width: 639px) {
    .picker-backdrop { align-items: end; padding: 0; }
    .picker { width: 100%; max-height: 88dvh; border-radius: 18px 18px 0 0; }
  }
</style>
