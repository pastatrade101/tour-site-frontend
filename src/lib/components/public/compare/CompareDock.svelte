<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, Trash2, X } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { KINDS } from '$lib/compare/kinds';
  import { COMPARE_KINDS, MAX_COMPARE, MIN_COMPARE, type CompareKind } from '$lib/compare/model';
  import { clearCompare, compareListHref, compareState, removeFromCompare, restoreCompare, showCompareKind } from '$lib/compare/store';
  import { stripLocale } from '$lib/i18n';
  import { t } from '$lib/i18n/ui';
  import Img from '$lib/components/public/Img.svelte';

  /**
   * The visitor's picks, following them from page to page: one safari comes
   * off a destination page, another off the tours list. Picking a second never
   * costs the first, and the comparison is always one press away.
   *
   * It shows one category at a time — the page's own when there is one,
   * otherwise the one last added to — with a small switch when there are
   * picks in more than one.
   */
  onMount(restoreCompare);

  $: path = stripLocale($page.url.pathname);
  // Not on the comparison itself (it has its own controls), nor where a form or a private page owns the screen.
  $: hidden = /^\/(admin|plan-my-trip|booking|quote|trip)(\/|$)/.test(path) || /^\/compare\/(tours|accommodation|destinations|guides)\/?$/.test(path);
  // On a page about one category the tray shows that category's picks, when there are any; elsewhere, the one last added to.
  $: here = (
    path.startsWith('/tours') || path.startsWith('/safari-packages')
      ? 'tours'
      : path.startsWith('/accommodation')
        ? 'accommodation'
        : path.startsWith('/destinations')
          ? 'destinations'
          : path.startsWith('/about')
            ? 'guides'
            : null
  ) as CompareKind | null;
  $: kind = here && $compareState.lists[here].length ? here : $compareState.active;
  $: picks = kind ? $compareState.lists[kind] : [];
  $: others = COMPARE_KINDS.filter((entry) => entry !== kind && $compareState.lists[entry].length > 0);
  $: shown = $compareState.ready && !hidden && kind !== null && picks.length > 0;
  $: enough = picks.length >= MIN_COMPARE;
  $: href = kind ? compareListHref($compareState, kind) : '/compare';

  const name = (entry: CompareKind) => $t(KINDS[entry].nameKey);

  /**
   * How much room the tray takes, published for the round buttons (WhatsApp,
   * saved trips, back to top) so they sit above it whatever its height: it
   * grows a line when there are picks in other categories too.
   */
  const publishHeight = (node: HTMLElement) => {
    const root = document.documentElement;
    const publish = () => root.style.setProperty('--compare-dock-height', `${Math.round(node.getBoundingClientRect().height) + 12}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(node);
    return {
      destroy() {
        observer.disconnect();
        root.style.removeProperty('--compare-dock-height');
      }
    };
  };
</script>

{#if shown && kind}
  {@const active = kind}
  <aside class="compare-dock" aria-label={$t('compare.dock_label')} use:publishHeight>
    <div class="dock-inner">
      <div class="dock-count">
        <strong>{$t('ui.compare')}: {name(active)}</strong>
        <span class="dock-count-long">{$t('compare.n_of_max').replace('{n}', String(picks.length)).replace('{max}', String(MAX_COMPARE))}</span>
        <span class="dock-count-short" aria-hidden="true">{picks.length}/{MAX_COMPARE}</span>
      </div>

      <ul class="dock-picks" class:crowded={picks.length > 3}>
        {#each picks as item (item.key)}
          <li>
            <span class="dock-thumb">
              {#if item.image}<Img src={item.image} alt="" width={96} sizes="48px" className="h-full w-full object-cover" />{/if}
            </span>
            <span class="dock-name" title={item.title}>{item.title}</span>
            <button type="button" class="dock-drop" aria-label={$t('compare.remove_name').replace('{name}', item.title)} on:click={() => removeFromCompare(active, item.key)}>
              <X size={14} />
            </button>
          </li>
        {/each}
      </ul>

      <div class="dock-actions">
        <button type="button" class="dock-clear" aria-label={$t('filter.clear')} on:click={() => clearCompare(active)}>
          <span class="dock-clear-text">{$t('filter.clear')}</span><Trash2 class="dock-clear-icon" size={17} aria-hidden="true" />
        </button>
        {#if enough}
          <a class="dock-go" {href} data-cta="compare" data-cta-location="compare_dock">
            {$t('ui.compare')}<span class="dock-go-count">{picks.length}</span><ArrowRight size={16} />
          </a>
        {:else}
          <span class="dock-hint">{$t('compare.add_one_more')}</span>
        {/if}
      </div>
    </div>

    {#if others.length}
      <div class="dock-others">
        <span>{$t('compare.also_picked')}</span>
        {#each others as other (other)}
          <button type="button" on:click={() => showCompareKind(other)}>{name(other)} · {$compareState.lists[other].length}</button>
        {/each}
      </div>
    {/if}
  </aside>
{/if}

<style>
  /* Lifted clear of the bars other pages pin to the foot of the screen. */
  .compare-dock {
    position: fixed;
    left: 50%;
    bottom: calc(12px + env(safe-area-inset-bottom) + var(--package-dock-space, 0px));
    z-index: 45;
    width: min(880px, calc(100% - 24px));
    transform: translateX(-50%);
    border: 1px solid rgb(var(--c-ink) / 0.12);
    border-radius: 16px;
    background: rgb(var(--c-surface) / 0.97);
    box-shadow: 0 18px 44px -18px rgb(57 61 50 / 0.45);
    backdrop-filter: blur(10px);
    animation: dock-in 260ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes dock-in {
    from { transform: translate(-50%, 120%); }
  }
  .dock-inner { display: flex; align-items: center; gap: 14px; padding: 8px 8px 8px 16px; }
  .dock-count { display: grid; flex: none; gap: 1px; line-height: 1.25; }
  .dock-count strong { color: rgb(var(--c-heading)); font-size: 13px; font-weight: 700; }
  .dock-count span { color: rgb(var(--c-ink) / 0.6); font-size: 12px; }
  .dock-picks { display: flex; flex: 1; gap: 6px; min-width: 0; margin: 0; padding: 0; list-style: none; }
  .dock-picks li { display: flex; flex: 1 1 0; align-items: center; gap: 8px; min-width: 0; max-width: 190px; height: 46px; padding: 4px 2px 4px 4px; border: 1px solid rgb(var(--c-ink) / 0.1); border-radius: 10px; background: rgb(var(--c-canvas)); }
  .dock-thumb { flex: none; width: 44px; height: 36px; overflow: hidden; border-radius: 7px; background: rgb(var(--c-ink) / 0.08); }
  .dock-name { display: -webkit-box; flex: 1; min-width: 0; overflow: hidden; color: rgb(var(--c-heading)); font-size: 12px; font-weight: 600; line-height: 1.3; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; }
  .dock-drop { display: grid; flex: none; place-items: center; width: 28px; height: 28px; border-radius: 6px; color: rgb(var(--c-ink) / 0.55); }
  .dock-drop:hover { background: rgb(var(--c-ink) / 0.08); color: rgb(var(--c-heading)); }
  /* Four picks leave no room for four titles: the photographs carry it, each with its own remove button. */
  .dock-picks.crowded li { flex: none; padding-right: 2px; }
  .dock-picks.crowded .dock-name { display: none; }
  .dock-actions { display: flex; flex: none; align-items: center; gap: 10px; }
  .dock-clear { min-height: 40px; padding: 0 4px; color: rgb(var(--c-ink) / 0.6); font-size: 13px; font-weight: 600; }
  .dock-clear:hover { color: rgb(var(--c-heading)); }
  .dock-clear :global(.dock-clear-icon), .dock-count-short { display: none; }
  .dock-hint { max-width: 150px; padding-right: 8px; color: rgb(var(--c-ink) / 0.6); font-size: 12px; line-height: 1.3; text-align: right; }
  .dock-go { display: inline-flex; align-items: center; gap: 8px; height: 46px; padding: 0 16px; border-radius: 10px; background: rgb(var(--c-goldfinch-gold)); color: rgb(var(--c-heading)); font-size: 14px; font-weight: 800; white-space: nowrap; transition: filter 160ms ease-out; }
  .dock-go:hover { filter: brightness(1.05); }
  .dock-go-count { display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: rgb(var(--c-heading)); color: rgb(var(--c-surface)); font-size: 12px; font-weight: 700; }
  .dock-others { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; padding: 7px 16px 9px; border-top: 1px solid rgb(var(--c-ink) / 0.08); color: rgb(var(--c-ink) / 0.55); font-size: 12px; }
  .dock-others button { color: rgb(var(--c-forest)); font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
  .compare-dock :global(:focus-visible) { outline: 2px solid rgb(var(--c-goldfinch-gold)); outline-offset: 2px; }

  /* Narrower than the tray plus the round buttons either side of it: those move up to clear it. */
  @media (max-width: 1279px) {
    :global(html:has(.compare-dock)) { --compare-dock-space: var(--compare-dock-height, 74px); }
  }
  /* Tablets: the same, without the titles. */
  @media (max-width: 959px) {
    .dock-picks li { flex: none; padding-right: 2px; }
    .dock-name { display: none; }
  }
  /* A safari page pins its own booking bar to the foot of a phone or tablet. */
  @media (max-width: 1023px) {
    :global(html:has(.tour-mobile-cta)) .compare-dock { bottom: calc(84px + env(safe-area-inset-bottom)); }
  }
  /* Phones: the photographs are the list; titles would leave a word and a half each. */
  @media (max-width: 719px) {
    .dock-inner { gap: 8px; padding: 8px 8px 8px 10px; }
    .dock-count { order: 2; flex: 1 1 0; min-width: 0; }
    .dock-count strong, .dock-count-long, .dock-clear-text, .dock-go-count, .dock-others { display: none; }
    .dock-count-short { display: block; color: rgb(var(--c-heading)); font-size: 13px; font-weight: 700; }
    .dock-clear { display: grid; place-items: center; width: 40px; padding: 0; }
    .dock-clear :global(.dock-clear-icon) { display: block; }
    .dock-picks { order: 1; flex: none; gap: 0; }
    .dock-picks li { flex: none; width: auto; max-width: none; height: auto; padding: 0; border: 0; background: none; }
    .dock-picks li + li { margin-left: -10px; }
    .dock-name, .dock-drop { display: none; }
    .dock-thumb { width: 38px; height: 38px; border: 2px solid rgb(var(--c-surface)); border-radius: 9px; }
    .dock-actions { order: 3; gap: 4px; }
    .dock-hint { max-width: 110px; padding-right: 4px; }
    .dock-go { padding: 0 12px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .compare-dock { animation: none; }
    .dock-go { transition: none; }
  }
</style>
