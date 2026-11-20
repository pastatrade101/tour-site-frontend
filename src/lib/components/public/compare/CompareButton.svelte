<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Check, Plus } from '@lucide/svelte';
  import { MAX_COMPARE, type CompareKind } from '$lib/compare/model';
  import { compareState, toggleCompare, type ComparePick } from '$lib/compare/store';
  import { t } from '$lib/i18n/ui';

  /**
   * "Compare" on a card or a detail page, for any category. Adds the item to
   * the visitor's comparison (or takes it off again); the tray at the foot of
   * the screen shows what has been picked.
   */
  export let kind: CompareKind;
  export let pick: ComparePick;
  /** pill: sits on a card's photograph. full: stands beside a page's main buttons. */
  export let variant: 'pill' | 'full' = 'pill';
  /** A full button on a dark photograph or band. */
  export let onDark = false;
  /** Corner class for the full button, to match the buttons it stands beside. */
  export let shape = 'rounded-xl';

  let atLimit = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  $: added = $compareState.lists[kind].some((entry) => entry.key === pick.key);
  $: label = atLimit ? $t('compare.limit').replace('{n}', String(MAX_COMPARE)) : added ? $t('compare.added') : $t('ui.compare');
  $: spoken = (added ? $t('compare.remove_name') : $t('compare.add_name')).replace('{name}', pick.title);

  const toggle = (event: MouseEvent) => {
    // Cards are links: choosing to compare must never open the page.
    event.preventDefault();
    event.stopPropagation();
    if (!pick.key) return;
    if (toggleCompare(kind, pick) === 'full') {
      atLimit = true;
      clearTimeout(timer);
      timer = setTimeout(() => (atLimit = false), 2600);
    }
  };

  onDestroy(() => clearTimeout(timer));
</script>

{#if pick.key}
  {#if variant === 'full'}
    <button
      type="button"
      aria-pressed={added}
      aria-label={spoken}
      class={`inline-flex h-12 items-center justify-center gap-2 ${shape} border px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold ${
        added
          ? onDark
            ? 'border-white bg-white text-heading'
            : 'border-deep-green bg-deep-green text-white'
          : onDark
            ? 'border-white/30 text-white hover:bg-white/10'
            : 'border-ink/15 bg-surface text-ink/75 hover:bg-canvas'
      }`}
      on:click={toggle}
    >
      {#if added && !atLimit}<Check size={18} />{:else}<Plus size={18} />{/if}
      <span aria-live="polite">{label}</span>
    </button>
  {:else}
    <button
      type="button"
      aria-pressed={added}
      aria-label={spoken}
      class={`compare-pill inline-flex h-8 items-center gap-1 rounded-full pl-2 pr-3 text-[12px] font-semibold shadow-sm backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold ${
        added ? 'bg-deep-green text-white' : 'bg-surface/90 text-heading hover:bg-surface'
      }`}
      on:click={toggle}
    >
      {#if added && !atLimit}<Check size={14} strokeWidth={2.5} />{:else}<Plus size={14} strokeWidth={2.5} />{/if}
      <span aria-live="polite">{label}</span>
    </button>
  {/if}
{/if}
