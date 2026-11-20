<script lang="ts">
  import { Check, ExternalLink, Minus } from '@lucide/svelte';
  import type { Cell } from '$lib/compare/model';
  import { currency, formatUsd } from '$lib/currency';
  import { t } from '$lib/i18n/ui';

  /**
   * One answer in the comparison: a line of text, a list, a price, a rating,
   * a yes/no or a link. An item that does not say gets "Not stated" — an empty
   * cell would read as "no", and that is not what the record says.
   */
  export let cell: Cell | null;
  /** For lists: entries every compared item has, lower-cased. */
  export let common: string[] = [];
  /** Hide those shared entries (the "only differences" view). */
  export let hideCommon = false;
  /** This is the one value in its row to point out; `bestLabel` says why. */
  export let best = false;
  export let bestLabel = '';

  $: shared = new Set(common);
  $: entries =
    cell?.type === 'list'
      ? cell.items.map((item) => ({ item, shared: shared.has(item.toLowerCase()) }))
      : [];
  $: shownEntries = hideCommon ? entries.filter((entry) => !entry.shared) : entries;
  $: hiddenShared = entries.length - shownEntries.length;
</script>

{#if !cell}
  <span class="blank">{$t('compare.not_stated')}</span>
{:else if cell.type === 'text'}
  <span class="value">{cell.text}</span>
{:else if cell.type === 'money'}
  <span class="value strong">{formatUsd(cell.usd, $currency)}</span>
  {#if best && bestLabel}<span class="best">{bestLabel}</span>{/if}
{:else if cell.type === 'score'}
  <span class="score" class:top={best}>
    <span class="score-number"><strong>{cell.value}</strong><span aria-hidden="true">/{cell.max}</span><span class="sr-only"> {$t('compare.out_of').replace('{max}', String(cell.max))}</span></span>
    <span class="score-track" aria-hidden="true"><span style={`width: ${Math.round((cell.value / cell.max) * 100)}%`}></span></span>
  </span>
  {#if best && bestLabel}<span class="best">{bestLabel}</span>{/if}
{:else if cell.type === 'flag'}
  <span class="flag" class:no={!cell.value}>
    {#if cell.value}<Check size={15} strokeWidth={2.5} aria-hidden="true" />{$t('plan_my_trip_form.opt_yes')}{:else}<Minus size={15} aria-hidden="true" />{$t('plan_my_trip_form.opt_no')}{/if}
  </span>
{:else if cell.type === 'links'}
  <ul class="links">
    {#each cell.items as link (link.href)}
      <li>
        {#if link.href.startsWith('/')}
          <a href={link.href}>{link.label}</a>
        {:else}
          <a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}<ExternalLink size={13} aria-hidden="true" /></a>
        {/if}
      </li>
    {/each}
  </ul>
{:else if cell.type === 'list'}
  {#if shownEntries.length}
    <ul class="entries">
      {#each shownEntries as entry (entry.item)}
        <li class:shared={entry.shared}>{entry.item}</li>
      {/each}
    </ul>
  {/if}
  {#if cell.more}<span class="more">{$t('compare.n_more').replace('{n}', String(cell.more))}</span>{/if}
  {#if hiddenShared > 0}<span class="more">{$t(hiddenShared === 1 ? 'compare.n_shared_one' : 'compare.n_shared').replace('{n}', String(hiddenShared))}</span>{/if}
{/if}

<style>
  .blank { color: rgb(var(--c-ink) / 0.42); font-style: italic; }
  .value { color: inherit; }
  .strong { font-size: 1.08em; font-weight: 700; color: rgb(var(--c-heading)); }
  .best { display: block; margin-top: 4px; color: rgb(var(--c-forest)); font-size: 12px; font-weight: 700; }
  .score { display: grid; gap: 6px; max-width: 150px; }
  .score-number { color: rgb(var(--c-ink) / 0.6); font-size: 12px; }
  .score-number strong { margin-right: 1px; color: rgb(var(--c-heading)); font-size: 16px; font-weight: 700; }
  .score-track { display: block; height: 5px; overflow: hidden; border-radius: 999px; background: rgb(var(--c-ink) / 0.1); }
  .score-track span { display: block; height: 100%; border-radius: inherit; background: rgb(var(--c-ink) / 0.4); }
  .score.top .score-track span { background: rgb(var(--c-goldfinch-gold)); }
  .flag { display: inline-flex; align-items: center; gap: 6px; color: rgb(var(--c-forest)); font-weight: 600; }
  .flag.no { color: rgb(var(--c-ink) / 0.6); font-weight: 500; }
  ul { display: grid; gap: 5px; margin: 0; padding: 0; list-style: none; }
  .entries li { position: relative; padding-left: 14px; }
  .entries li::before { content: ''; position: absolute; top: 0.62em; left: 0; width: 5px; height: 5px; border-radius: 1px; background: rgb(var(--c-goldfinch-gold)); }
  /* What every item has is said quietly; what only some have is what the eye should land on. */
  .entries li.shared { color: rgb(var(--c-ink) / 0.5); }
  .entries li.shared::before { background: rgb(var(--c-ink) / 0.25); }
  .links a { display: inline-flex; align-items: center; gap: 5px; color: rgb(var(--c-forest)); font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
  .more { display: block; margin-top: 6px; color: rgb(var(--c-ink) / 0.5); font-size: 12px; }
</style>
