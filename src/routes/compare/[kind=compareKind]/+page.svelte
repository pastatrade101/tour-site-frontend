<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, Check, ChevronDown, ChevronRight, Equal, Link2, Plus, Repeat, X } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { KINDS } from '$lib/compare/kinds';
  import { COMPARE_KINDS, MAX_COMPARE, MIN_COMPARE, buildComparison, compareHref, narrowComparison, type BuiltRow, type CompareKind } from '$lib/compare/model';
  import { firstImage, type CompareItem } from '$lib/compare/shared';
  import { compareListHref, compareState, restoreCompare, setCompareList, type ComparePick } from '$lib/compare/store';
  import CompareCell from '$lib/components/public/compare/CompareCell.svelte';
  import ComparePicker from '$lib/components/public/compare/ComparePicker.svelte';
  import Img from '$lib/components/public/Img.svelte';
  import WhatsAppIcon from '$lib/components/public/WhatsAppIcon.svelte';
  import { localizeUrl } from '$lib/i18n';
  import { locale, t } from '$lib/i18n/ui';
  import type { PageData } from './$types';

  /**
   * Two to four items of one category, side by side. The same page serves
   * safaris, places to stay, destinations and guides: the category supplies
   * its rows ($lib/compare/<category>.ts) and everything else here is shared.
   *
   * Every cell is the item's own data. A row no item fills is left out, and an
   * item that does not say reads "Not stated" rather than a guess.
   */
  export let data: PageData;

  $: kind = data.kind as CompareKind;
  $: config = KINDS[kind];
  $: ctx = { t: $t, extras: data.extras ?? {} };
  $: records = data.records as unknown[];
  $: items = records.map((record) => config.toItem(record, ctx)) as CompareItem<unknown>[];
  $: keys = items.map((item) => item.key);
  $: enough = items.length >= MIN_COMPARE;
  $: built = buildComparison(config.sections(records, ctx), records);

  let onlyDifferences = false;
  let copied = false;
  let picker: { replace: string | null } | null = null;

  /* ── Phones show two at a time; with three or four, each column's title picks which. ── */
  let chosen: [number, number] = [0, 1];
  $: pair = ((): [number, number] => {
    let [a, b] = chosen;
    if (a >= items.length) a = 0;
    if (b >= items.length || b === a) b = a === 0 ? 1 : 0;
    return [a, b];
  })();
  $: narrow = enough ? narrowComparison(built, pair) : built;
  const choose = (slot: 0 | 1, index: number) => {
    const next: [number, number] = [...pair];
    // Picking what the other column shows swaps the two.
    if (next[1 - slot] === index) next[1 - slot] = next[slot];
    next[slot] = index;
    chosen = next;
  };

  const visibleRows = (rows: BuiltRow[], differencesOnly: boolean) => (differencesOnly ? rows.filter((row) => !row.same) : rows);
  const bestLabel = (row: BuiltRow) => (row.end === 'low' ? $t('compare.lowest_here') : row.end === 'high' ? $t('compare.highest_here') : '');

  /* ── The address is the comparison: every change goes through it. ── */
  const open = (next: string[]) =>
    goto(localizeUrl(compareHref(kind, next), $locale), { replaceState: true, noScroll: true, keepFocus: true });

  const picksFor = (next: string[], extra?: ComparePick): ComparePick[] =>
    next.flatMap((key) => {
      const index = keys.indexOf(key);
      if (index >= 0) return [config.toPick(records[index])];
      return extra && extra.key === key ? [extra] : [];
    });

  const drop = (key: string) => {
    const rest = keys.filter((entry) => entry !== key);
    setCompareList(kind, picksFor(rest));
    void open(rest);
  };

  const choosePick = (event: CustomEvent<ComparePick>) => {
    const pick = event.detail;
    const replacing = picker?.replace ?? null;
    picker = null;
    if (keys.includes(pick.key)) return;
    const next = replacing ? keys.map((key) => (key === replacing ? pick.key : key)) : [...keys, pick.key].slice(0, MAX_COMPARE);
    setCompareList(kind, picksFor(next, pick));
    void open(next);
  };

  /**
   * Keeps the tray in step with the address. An address with items that
   * still exist is the truth (a shared link, a swap); an address with none
   * picks up what the visitor had already chosen in this category.
   */
  let synced = '';
  $: if (browser && $compareState.ready) {
    const stamp = `${kind}:${keys.join(',')}:${data.missing}:${data.derived ? data.derived.tourKeys.join(',') : ''}`;
    if (stamp !== synced) {
      synced = stamp;
      const stored = $compareState.lists[kind].map((pick) => pick.key);
      if (data.derived) {
        // Shown from the compared safaris, not chosen: the tray is not filled with them.
        // The visitor's own picks in this category, if any, win.
        if (stored.length) void open(stored);
      } else if (keys.length) {
        if (stored.join(',') !== keys.join(',')) setCompareList(kind, records.map((record) => config.toPick(record)));
      } else if (!data.missing && stored.length) {
        // A link whose items have all gone is left alone: it must not wipe what the visitor had picked.
        void open(stored);
      } else if (!data.missing && config.fromTour && $compareState.lists.tours.length) {
        // Nothing picked here, but safaris are being compared: start from what those safaris say.
        void goto(localizeUrl(fromToursHref(kind, $compareState.lists.tours.map((pick) => pick.key)), $locale), { replaceState: true, noScroll: true });
      }
    }
  }

  /** Another category, opened on what the compared safaris say about it. */
  const fromToursHref = (entry: CompareKind, tours: string[]) => `/compare/${entry}?tours=${tours.map(encodeURIComponent).join(',')}`;
  // The safaris in play: the ones on this page, the ones this page was built from, or the visitor's picks.
  $: safarisInPlay = kind === 'tours' ? keys : (data.derived?.tourKeys ?? $compareState.lists.tours.map((pick) => pick.key));
  $: tabHref = (entry: CompareKind): string => {
    if (entry === kind) return sharePath;
    if ($compareState.lists[entry].length || !KINDS[entry].fromTour || safarisInPlay.length < 1) return compareListHref($compareState, entry);
    return fromToursHref(entry, safarisInPlay);
  };

  $: sharePath = localizeUrl(compareHref(kind, keys), $locale);
  $: shareUrl = `${data.origin}${sharePath}`;
  $: shareText = `${$t(config.titleKey)}: ${items.map((item) => item.title).join(' / ')} ${shareUrl}`;
  $: askHref = `/plan-my-trip?${new URLSearchParams({ from: 'compare', topic: `${$t(config.titleKey)}: ${items.map((item) => item.title).join(' / ')}`.slice(0, 180) }).toString()}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      copied = true;
      setTimeout(() => (copied = false), 2200);
    } catch {
      copied = false;
    }
  };

  const pickerHeading = (state: { replace: string | null }) => {
    const current = state.replace ? items.find((item) => item.key === state.replace) : null;
    return current ? $t('compare.replace_name').replace('{name}', current.title) : $t(config.addKey);
  };

  /* The column titles stay in view under the site header, whatever its height. */
  let top = 0;
  onMount(() => {
    restoreCompare();
    const header = document.querySelector<HTMLElement>('header.mobile-nav-header');
    if (!header) return;
    const measure = () => (top = Math.round(header.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  });

</script>

<main class="compare-page" class:portrait={config.portrait} style={`--compare-top: ${top}px`}>
  <div class="container-shell">
    <nav aria-label="Breadcrumb" class="crumbs">
      <ol>
        <li><a href="/compare">{$t('ui.compare')}</a><ChevronRight size={14} aria-hidden="true" /></li>
        <li aria-current="page">{$t(config.nameKey)}</li>
      </ol>
    </nav>

    <header class="head">
      <div>
        <h1>{$t(config.titleKey)}</h1>
        <p>{$t(config.introKey)}</p>
      </div>
      {#if enough}
        <div class="share">
          <button type="button" class="ghost" on:click={copyLink} aria-live="polite">
            {#if copied}<Check size={16} aria-hidden="true" />{$t('compare.link_copied')}{:else}<Link2 size={16} aria-hidden="true" />{$t('compare.copy_link')}{/if}
          </button>
          <a class="ghost" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" data-track-location="compare_share">
            <WhatsAppIcon size={16} />{$t('compare.send_whatsapp')}
          </a>
        </div>
      {/if}
    </header>

    <!-- One comparison per category: the others keep what was picked in them. -->
    <nav class="kinds" aria-label={$t('compare.kinds_label')}>
      {#each COMPARE_KINDS as entry (entry)}
        {@const total = entry === kind && !data.derived ? keys.length : $compareState.lists[entry].length}
        <a href={tabHref(entry)} aria-current={entry === kind ? 'page' : undefined} data-sveltekit-noscroll>
          {$t(KINDS[entry].nameKey)}{#if total}<span>{total}</span>{/if}
        </a>
      {/each}
    </nav>

    {#if data.derived && items.length}
      <div class="derived">
        <p>
          <strong>{$t(`compare.derived_${kind}`)}</strong>
          {data.derived.tours.join(' · ')}
        </p>
        <p>
          {$t('compare.derived_change')}
          {#if data.derived.more.length}{$t('compare.derived_more').replace('{list}', data.derived.more.join(', '))}{/if}
        </p>
      </div>
    {/if}

    {#if data.missing}
      <p class="note">{$t(data.missing === 1 ? 'compare.missing_one' : 'compare.missing_many').replace('{n}', String(data.missing))}</p>
    {/if}

    {#if !enough}
      <div class="empty">
        <h2>{items.length === 1 ? $t('compare.empty_one_title') : $t('compare.empty_title')}</h2>
        <p>
          {items.length === 1
            ? $t('compare.empty_one_text').replace('{name}', items[0].title)
            : $t('compare.empty_text').replace('{max}', String(MAX_COMPARE))}
        </p>
        <div class="empty-actions">
          <button type="button" class="primary" on:click={() => (picker = { replace: null })}><Plus size={17} aria-hidden="true" />{$t(config.addKey)}</button>
          <a class="ghost" href={config.browseHref}>{$t('compare.browse_all')}<ArrowRight size={16} aria-hidden="true" /></a>
          {#if items.length === 1}
            <!-- The one thing chosen can still be taken off from here. -->
            <button type="button" class="ghost" on:click={() => drop(items[0].key)} aria-label={$t('compare.remove_name').replace('{name}', items[0].title)}><X size={15} aria-hidden="true" />{$t('compare.remove')}</button>
          {/if}
        </div>
      </div>
    {:else}
      <div class="tools">
        <label class="switch">
          <input type="checkbox" bind:checked={onlyDifferences} disabled={!built.matching} />
          <span class="track" aria-hidden="true"></span>
          {$t('compare.only_differences')}
        </label>
        <p class="tally desk" aria-live="polite">
          <span class="dot differs" aria-hidden="true"></span>{$t(built.differing === 1 ? 'compare.n_difference' : 'compare.n_differences').replace('{n}', String(built.differing))}
          <span class="dot agrees" aria-hidden="true"></span>{$t('compare.n_same').replace('{n}', String(built.matching))}
        </p>
        <p class="tally phone-only" aria-live="polite">
          <span class="dot differs" aria-hidden="true"></span>{$t(narrow.differing === 1 ? 'compare.n_difference' : 'compare.n_differences').replace('{n}', String(narrow.differing))}
          <span class="dot agrees" aria-hidden="true"></span>{$t('compare.n_same').replace('{n}', String(narrow.matching))}
        </p>
        {#if items.length < MAX_COMPARE}
          <button type="button" class="add" on:click={() => (picker = { replace: null })}><Plus size={16} aria-hidden="true" />{$t(config.addKey)}</button>
        {/if}
      </div>

      <!-- ── Phones: two at a time, each label above its two answers. ── -->
      <div class="phone">
        <div class="phone-photos">
          {#each pair as index, slot (slot)}
            {@const item = items[index]}
            <svelte:element this={item.href ? 'a' : 'span'} class="phone-photo" href={item.href} aria-hidden="true" tabindex="-1">
              {#if firstImage(item.record, item.imageFields)}
                <Img record={item.record} fields={item.imageFields} alt="" width={420} sizes="46vw" className="h-full w-full object-cover" />
              {:else if item.image}
                <Img src={item.image} alt="" width={420} sizes="46vw" className="h-full w-full object-cover" />
              {/if}
            </svelte:element>
          {/each}
        </div>
        <div class="phone-heads">
          {#each pair as index, slot (slot)}
            {@const item = items[index]}
            <div class="phone-head">
              <div class="phone-title">
                <span>{item.title}</span>
                {#if items.length > 2}
                  <ChevronDown size={16} aria-hidden="true" />
                  <select aria-label={$t('compare.column_n').replace('{n}', String(slot + 1))} value={String(index)} on:change={(event) => choose(slot === 0 ? 0 : 1, Number(event.currentTarget.value))}>
                    {#each items as option, i (option.key)}<option value={String(i)}>{option.title}</option>{/each}
                  </select>
                {/if}
              </div>
              <div class="phone-controls">
                <button type="button" on:click={() => (picker = { replace: item.key })} aria-label={$t('compare.replace_name').replace('{name}', item.title)}><Repeat size={15} aria-hidden="true" /></button>
                <button type="button" on:click={() => drop(item.key)} aria-label={$t('compare.remove_name').replace('{name}', item.title)}><X size={16} aria-hidden="true" /></button>
              </div>
            </div>
          {/each}
        </div>
        {#if items.length > 2}<p class="phone-note">{$t('compare.showing_two').replace('{n}', String(items.length))}</p>{/if}

        {#each narrow.sections as section (section.id)}
          {@const rows = visibleRows(section.rows, onlyDifferences)}
          {#if rows.length}
            <section class="phone-section" aria-label={$t(section.title)}>
              <h2>{$t(section.title)}</h2>
              {#each rows as row (row.id)}
                <div class="phone-row" class:same={row.same}>
                  <p class="phone-label">
                    {#if row.same}<Equal size={13} aria-hidden="true" />{:else}<span class="dot differs" aria-hidden="true"></span>{/if}
                    {row.labelText ?? $t(row.label)}
                    {#if row.same}<span class="sr-only"> — {$t('compare.same_for_all')}</span>{/if}
                  </p>
                  <div class="phone-vals">
                    {#each row.cells as cell, slot (slot)}
                      <div><CompareCell {cell} common={row.common} hideCommon={onlyDifferences} best={row.best === slot} bestLabel={bestLabel(row)} /></div>
                    {/each}
                  </div>
                </div>
              {/each}
            </section>
          {/if}
        {/each}

        <div class="phone-cta">
          {#each pair as index, slot (slot)}
            {@const item = items[index]}
            <div>
              <a class="primary" href={item.enquire.href} target={item.enquire.external ? '_blank' : undefined} rel={item.enquire.external ? 'noopener noreferrer' : undefined} data-cta="plan_my_trip" data-cta-location="compare">{item.enquire.label}</a>
              {#if item.href}<a class="details" href={item.href}>{item.hrefLabel}<ArrowRight size={14} aria-hidden="true" /></a>{/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- ── Wider screens: the table. It scrolls, the page does not; the row labels stay put. ── -->
      <div class="scroll" role="region" aria-label={$t(config.titleKey)} tabindex="-1">
        <table style={`--cols: ${items.length}`}>
          <thead>
            <tr>
              <th class="corner" scope="col"><span class="sr-only">{$t('compare.detail')}</span></th>
              {#each items as item (item.key)}
                <th scope="col">
                  <div class="col">
                    <svelte:element this={item.href ? 'a' : 'span'} class="shot" href={item.href} tabindex="-1" aria-hidden="true">
                      {#if firstImage(item.record, item.imageFields)}
                        <Img record={item.record} fields={item.imageFields} alt="" width={520} sizes="(max-width: 1100px) 30vw, 300px" className="h-full w-full object-cover" />
                      {:else if item.image}
                        <Img src={item.image} alt="" width={520} sizes="(max-width: 1100px) 30vw, 300px" className="h-full w-full object-cover" />
                      {/if}
                    </svelte:element>
                    {#if item.href}<a class="name" href={item.href}>{item.title}</a>{:else}<span class="name">{item.title}</span>{/if}
                    {#if item.subtitle}<p class="sub">{item.subtitle}</p>{/if}
                    <div class="col-actions">
                      <button type="button" on:click={() => (picker = { replace: item.key })} aria-label={$t('compare.replace_name').replace('{name}', item.title)}><Repeat size={14} aria-hidden="true" />{$t('compare.replace')}</button>
                      <button type="button" class="remove" on:click={() => drop(item.key)} aria-label={$t('compare.remove_name').replace('{name}', item.title)}><X size={14} aria-hidden="true" />{$t('compare.remove')}</button>
                    </div>
                  </div>
                </th>
              {/each}
            </tr>
          </thead>
          {#each built.sections as section (section.id)}
            {@const rows = visibleRows(section.rows, onlyDifferences)}
            {#if rows.length}
              <tbody>
                <tr class="band"><th scope="colgroup" colspan={items.length + 1}><span>{$t(section.title)}</span></th></tr>
                {#each rows as row (row.id)}
                  <tr class:same={row.same}>
                    <th scope="row">
                      <span class="row-label">
                        {#if row.same}<Equal size={13} aria-hidden="true" />{:else}<span class="dot differs" aria-hidden="true"></span>{/if}
                        <span>{row.labelText ?? $t(row.label)}{#if row.same}<span class="sr-only"> — {$t('compare.same_for_all')}</span>{/if}</span>
                      </span>
                    </th>
                    {#each row.cells as cell, column (items[column].key)}
                      <td class:best={row.best === column}>
                        <CompareCell {cell} common={row.common} hideCommon={onlyDifferences} best={row.best === column} bestLabel={bestLabel(row)} />
                      </td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            {/if}
          {/each}
          <tbody>
            <tr class="cta">
              <th scope="row"><span class="sr-only">{$t('compare.next_step')}</span></th>
              {#each items as item (item.key)}
                <td>
                  <a class="primary" href={item.enquire.href} target={item.enquire.external ? '_blank' : undefined} rel={item.enquire.external ? 'noopener noreferrer' : undefined} data-cta="plan_my_trip" data-cta-location="compare">{item.enquire.label}</a>
                  {#if item.href}<a class="details" href={item.href}>{item.hrefLabel}<ArrowRight size={14} aria-hidden="true" /></a>{/if}
                </td>
              {/each}
            </tr>
          </tbody>
        </table>
      </div>

      {#if onlyDifferences && built.matching}
        <p class="note after desk">{$t('compare.hidden_same').replace('{n}', String(built.matching))}</p>
      {/if}
      {#if onlyDifferences && narrow.matching}
        <p class="note after phone-only">{$t('compare.hidden_same').replace('{n}', String(narrow.matching))}</p>
      {/if}

      <aside class="ask">
        <div>
          <h2>{$t('compare.ask_title')}</h2>
          <p>{$t('compare.ask_text')}</p>
        </div>
        <a class="primary" href={askHref} data-cta="plan_my_trip" data-cta-location="compare_ask">{$t('compare.ask_cta')}<ArrowRight size={16} aria-hidden="true" /></a>
      </aside>
    {/if}
  </div>
</main>

{#if picker}
  <ComparePicker {kind} taken={keys} heading={pickerHeading(picker)} on:select={choosePick} on:close={() => (picker = null)} />
{/if}

<style>
  .compare-page { padding: 28px 0 96px; background: rgb(var(--c-canvas)); color: rgb(var(--c-ink)); }
  .crumbs ol { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0; padding: 0; list-style: none; color: rgb(var(--c-ink) / 0.6); font-size: 13px; }
  .crumbs li { display: inline-flex; align-items: center; gap: 6px; }
  .crumbs a:hover { color: rgb(var(--c-heading)); text-decoration: underline; text-underline-offset: 3px; }
  .crumbs [aria-current] { color: rgb(var(--c-heading)); font-weight: 600; }

  .head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 18px 32px; margin-top: 16px; }
  h1 { margin: 0; color: rgb(var(--c-heading)); font-size: clamp(30px, 4vw, 44px); font-weight: 700; line-height: 1.08; letter-spacing: -0.02em; }
  .head p { max-width: 62ch; margin: 12px 0 0; color: rgb(var(--c-ink) / 0.7); font-size: 16px; line-height: 1.65; }
  .share { display: flex; flex-wrap: wrap; gap: 8px; }
  .ghost { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 16px; border: 1px solid rgb(var(--c-ink) / 0.15); border-radius: 10px; background: rgb(var(--c-surface)); color: rgb(var(--c-heading)); font-size: 14px; font-weight: 600; white-space: nowrap; transition: border-color 160ms ease-out; }
  .ghost:hover { border-color: rgb(var(--c-forest) / 0.45); }
  .primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 46px; padding: 8px 18px; border-radius: 10px; background: rgb(var(--c-goldfinch-gold)); color: rgb(var(--c-heading)); font-size: 14px; font-weight: 800; text-align: center; transition: filter 160ms ease-out; }
  .primary:hover { filter: brightness(1.05); }

  .kinds { display: flex; gap: 4px; margin-top: 26px; overflow-x: auto; border-bottom: 1px solid rgb(var(--c-ink) / 0.12); scrollbar-width: none; }
  .kinds::-webkit-scrollbar { display: none; }
  .kinds a { display: inline-flex; flex: none; align-items: center; gap: 8px; min-height: 46px; margin-bottom: -1px; padding: 0 14px; border-bottom: 2px solid transparent; color: rgb(var(--c-ink) / 0.65); font-size: 14px; font-weight: 600; white-space: nowrap; }
  .kinds a:hover { color: rgb(var(--c-heading)); }
  .kinds a[aria-current] { border-bottom-color: rgb(var(--c-goldfinch-gold)); color: rgb(var(--c-heading)); }
  .kinds a span { display: grid; place-items: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: rgb(var(--c-ink) / 0.1); color: rgb(var(--c-heading)); font-size: 11px; font-weight: 700; }
  .kinds a[aria-current] span { background: rgb(var(--c-heading)); color: rgb(var(--c-surface)); }

  .derived { margin-top: 18px; padding: 14px 16px; border-left: 3px solid rgb(var(--c-goldfinch-gold)); border-radius: 0 10px 10px 0; background: rgb(var(--c-surface)); font-size: 14px; line-height: 1.6; }
  .derived p { margin: 0; color: rgb(var(--c-ink) / 0.7); }
  .derived p + p { margin-top: 2px; font-size: 13px; }
  .derived strong { margin-right: 6px; color: rgb(var(--c-heading)); font-weight: 700; }
  .note { margin: 18px 0 0; color: rgb(var(--c-ink) / 0.65); font-size: 14px; }
  .note.after { margin-top: 12px; }

  .empty { display: grid; justify-items: start; gap: 12px; max-width: 640px; margin-top: 30px; padding: 30px; border: 1px solid rgb(var(--c-ink) / 0.1); border-radius: 14px; background: rgb(var(--c-surface)); }
  .empty h2 { margin: 0; color: rgb(var(--c-heading)); font-size: 22px; font-weight: 700; line-height: 1.2; }
  .empty p { margin: 0; color: rgb(var(--c-ink) / 0.7); font-size: 15px; line-height: 1.65; }
  .empty-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }

  .tools { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 22px; margin-top: 22px; }
  .switch { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; color: rgb(var(--c-heading)); font-size: 14px; font-weight: 600; cursor: pointer; }
  .switch input { position: absolute; opacity: 0; pointer-events: none; }
  .switch .track { position: relative; width: 38px; height: 22px; border-radius: 11px; background: rgb(var(--c-ink) / 0.22); transition: background-color 180ms ease-out; }
  .switch .track::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgb(39 36 31 / 0.25); transition: translate 180ms cubic-bezier(0.22, 1, 0.36, 1); }
  .switch input:checked + .track { background: rgb(var(--c-forest)); }
  .switch input:checked + .track::after { translate: 16px 0; }
  .switch input:focus-visible + .track { outline: 2px solid rgb(var(--c-goldfinch-gold)); outline-offset: 2px; }
  .switch:has(input:disabled) { opacity: 0.5; cursor: default; }
  .tally { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0; color: rgb(var(--c-ink) / 0.65); font-size: 13px; }
  .tally .dot:not(:first-child) { margin-left: 10px; }
  .dot { display: inline-block; flex: none; width: 7px; height: 7px; border-radius: 50%; }
  .dot.differs { background: rgb(var(--c-goldfinch-gold)); }
  .dot.agrees { background: rgb(var(--c-ink) / 0.25); }
  .add { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; margin-left: auto; padding: 0 14px; border: 1px dashed rgb(var(--c-ink) / 0.3); border-radius: 10px; color: rgb(var(--c-heading)); font-size: 14px; font-weight: 600; }
  .add:hover { border-color: rgb(var(--c-forest)); border-style: solid; }

  .scroll { margin-top: 12px; overflow-x: auto; border: 1px solid rgb(var(--c-ink) / 0.1); border-radius: 14px; background: rgb(var(--c-surface)); scrollbar-width: thin; }
  table { width: 100%; min-width: calc(180px + var(--cols) * 230px); table-layout: fixed; border-collapse: collapse; }
  th, td { padding: 15px 18px; border-bottom: 1px solid rgb(var(--c-ink) / 0.08); color: rgb(var(--c-heading)); font-size: 14px; font-weight: 400; line-height: 1.55; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
  td + td, th + td, thead th + th { border-left: 1px solid rgb(var(--c-ink) / 0.06); }
  tbody th[scope='row'], .corner { position: sticky; left: 0; z-index: 1; width: 180px; background: rgb(var(--c-canvas)); color: rgb(var(--c-ink) / 0.7); font-size: 13px; font-weight: 600; }
  .corner { z-index: 2; }
  thead th { padding-bottom: 16px; background: rgb(var(--c-surface)); }
  .col { display: grid; gap: 8px; }
  .shot { display: block; aspect-ratio: 16 / 10; overflow: hidden; border-radius: 10px; background: rgb(var(--c-ink) / 0.08); }
  .shot :global(img) { transition: scale 300ms ease-out; }
  a.shot:hover :global(img) { scale: 1.03; }
  .portrait .shot { aspect-ratio: 4 / 5; max-width: 220px; }
  .portrait .shot :global(img), .portrait .phone-photo :global(img) { object-position: center top; }
  .name { display: -webkit-box; overflow: hidden; margin-top: 4px; color: rgb(var(--c-heading)); font-size: 16px; font-weight: 700; line-height: 1.3; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; }
  a.name:hover { color: rgb(var(--c-clay)); }
  .sub { margin: 0; color: rgb(var(--c-ink) / 0.6); font-size: 12px; line-height: 1.4; }
  .col-actions { display: flex; flex-wrap: wrap; gap: 4px 14px; }
  .col-actions button { display: inline-flex; align-items: center; gap: 5px; min-height: 32px; color: rgb(var(--c-ink) / 0.65); font-size: 12px; font-weight: 600; }
  .col-actions button:hover { color: rgb(var(--c-forest)); }
  .col-actions button.remove:hover { color: #a3392b; }
  .band th { position: static; padding: 11px 18px; background: rgb(var(--c-sand) / 0.55); color: rgb(var(--c-heading)); font-size: 13px; font-weight: 700; letter-spacing: 0.02em; }
  .band th span { position: sticky; left: 18px; }
  .row-label { display: flex; align-items: baseline; gap: 8px; }
  .row-label .dot { translate: 0 -1px; }
  .row-label :global(svg) { flex: none; translate: 0 2px; color: rgb(var(--c-ink) / 0.35); }
  /* Rows the items agree on step back; the ones that differ are what the page is for. */
  tr.same td { color: rgb(var(--c-ink) / 0.6); }
  tr.same th[scope='row'] { color: rgb(var(--c-ink) / 0.5); font-weight: 500; }
  td.best { background: rgb(var(--c-goldfinch-gold) / 0.09); }
  .cta td, .cta th { border-bottom: 0; }
  .cta .primary { width: 100%; }
  .details { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; margin-top: 6px; color: rgb(var(--c-forest)); font-size: 14px; font-weight: 600; }
  .details:hover { color: rgb(var(--c-heading)); }

  .ask { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px 28px; margin-top: 28px; padding: 24px 26px; border-radius: 14px; background: rgb(var(--c-deep-green)); color: #fff; }
  .ask h2 { margin: 0; color: #fff; font-size: 20px; font-weight: 700; line-height: 1.25; }
  .ask p { max-width: 60ch; margin: 6px 0 0; color: rgb(255 255 255 / 0.78); font-size: 14px; line-height: 1.6; }

  .compare-page :global(:focus-visible) { outline: 2px solid rgb(var(--c-goldfinch-gold)); outline-offset: 2px; }

  /* Phones get their own layout; the table is for wider screens. */
  .phone, .phone-only { display: none; }
  @media (max-width: 767px) {
    .compare-page { padding: 18px 0 110px; }
    .share { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; }
    .tools { gap: 4px 16px; }
    .add { margin-left: 0; }
    .scroll, .desk { display: none; }
    .phone { display: block; margin-top: 10px; }
    .phone-only { display: flex; }
    .note.phone-only { display: block; }
    .phone-photos, .phone-heads, .phone-vals, .phone-cta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .portrait .phone-photo { aspect-ratio: 4 / 5; }
    .phone-photo { display: block; aspect-ratio: 4 / 3; overflow: hidden; border-radius: 10px; background: rgb(var(--c-ink) / 0.08); }
    /* The two titles stay in view, under the site header. */
    .phone-heads { position: sticky; top: var(--compare-top, 0px); z-index: 3; margin: 0 -16px; padding: 10px 16px; border-bottom: 1px solid rgb(var(--c-ink) / 0.1); background: rgb(var(--c-canvas)); }
    .phone-head { display: grid; gap: 2px; min-width: 0; }
    .phone-title { position: relative; display: flex; align-items: flex-start; gap: 2px; min-width: 0; color: rgb(var(--c-heading)); }
    .phone-title > span { display: -webkit-box; overflow: hidden; font-size: 14px; font-weight: 700; line-height: 1.3; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; }
    .phone-title :global(svg) { flex: none; margin-top: 1px; color: rgb(var(--c-ink) / 0.55); }
    /* The native picker covers the title, so tapping it opens the list. */
    .phone-title select { position: absolute; inset: 0; width: 100%; opacity: 0; font-size: 16px; cursor: pointer; }
    .phone-title:has(select:focus-visible) { outline: 2px solid rgb(var(--c-goldfinch-gold)); outline-offset: 2px; border-radius: 4px; }
    .phone-controls { display: flex; gap: 2px; margin-left: -8px; }
    .phone-controls button { display: grid; place-items: center; width: 36px; height: 32px; border-radius: 8px; color: rgb(var(--c-ink) / 0.6); }
    .phone-controls button:active { background: rgb(var(--c-ink) / 0.08); }
    .phone-note { margin: 10px 0 0; color: rgb(var(--c-ink) / 0.6); font-size: 12px; }
    .phone-section h2 { margin: 26px 0 0; padding-bottom: 8px; color: rgb(var(--c-heading)); font-size: 16px; font-weight: 700; }
    .phone-row { padding: 12px 0 14px; border-top: 1px solid rgb(var(--c-ink) / 0.1); }
    .phone-label { display: flex; align-items: center; gap: 7px; margin: 0 0 6px; color: rgb(var(--c-ink) / 0.7); font-size: 12px; font-weight: 600; }
    .phone-label :global(svg) { color: rgb(var(--c-ink) / 0.35); }
    .phone-vals { color: rgb(var(--c-heading)); font-size: 14px; line-height: 1.5; overflow-wrap: anywhere; }
    .phone-row.same .phone-vals { color: rgb(var(--c-ink) / 0.6); }
    .phone-cta { margin-top: 8px; padding-top: 18px; border-top: 1px solid rgb(var(--c-ink) / 0.1); }
    .phone-cta .primary { width: 100%; padding-inline: 10px; }
    .phone-cta .details { width: 100%; justify-content: center; text-align: center; }
    .ask { padding: 22px 20px; }
    .ask .primary { width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .shot :global(img), .switch .track, .switch .track::after, .ghost, .primary { transition: none; }
  }
</style>
