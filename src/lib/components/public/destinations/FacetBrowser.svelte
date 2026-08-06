<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { X } from '@lucide/svelte';
  import type { FacetGroup } from '$lib/destinationFacets';

  /**
   * Two-tier destination filter.
   *
   *   Tier one  — the facet GROUPS (Experience / Region / Wildlife / Length of
   *               stay) as one segmented track with a single sliding marker.
   *               Not a row of bordered buttons: the track is the container and
   *               the marker moves between the labels inside it.
   *   Tier two  — only the facets belonging to the group that is open, as
   *               capsules carrying the facet's own icon, its label and how many
   *               destinations match.
   *
   * Presentational only. Every group, facet, label, icon and count is handed in
   * by the page (built by `$lib/destinationFacets` from real CMS fields) and
   * handed straight back out through events — this file computes nothing about a
   * destination and invents nothing about one. The only numbers it ever prints
   * are the counts it was given.
   *
   * A facet whose count is 0 is disabled in place rather than removed, so the
   * row never reflows underneath the pointer while you read it.
   *
   * Counts are keyed `${groupKey}:${facetKey}`; the "All" capsule reads
   * `${groupKey}:` and simply shows no number when the page did not supply one.
   */
  export let groups: FacetGroup[] = [];
  export let activeGroup = '';
  export let activeFacet = '';
  export let counts: Record<string, number> = {};

  const dispatch = createEventDispatcher<{ group: string; facet: string; clear: void }>();

  type Capsule = {
    key: string;
    label: string;
    icon: string;
    count: number | null;
    active: boolean;
    disabled: boolean;
  };

  // One browser per page, so fixed ids are enough to wire tabs to their panel.
  const TAB_ID = 'gf-facet-tab';
  const PANEL_ID = 'gf-facet-panel';

  let railEl: HTMLDivElement | null = null;
  let trackEl: HTMLDivElement | null = null;
  let tabEls: HTMLButtonElement[] = [];
  let markerX = 0;
  let markerW = 0;
  let measured = false;
  let mounted = false;

  const buildCapsules = (
    group: FacetGroup | null,
    tally: Record<string, number>,
    facetKey: string
  ): Capsule[] => {
    if (!group) return [];
    const read = (key: string) => {
      const value = tally[`${group.key}:${key}`];
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    };

    const all: Capsule = {
      key: '',
      label: 'All',
      icon: '',
      count: read(''),
      active: !facetKey,
      disabled: false
    };

    return [
      all,
      ...group.facets.map((facet) => {
        const count = read(facet.key);
        const active = facet.key === facetKey;
        // Never disable the facet that is currently on — that would strand the
        // visitor inside a filter they can no longer switch off from here.
        return { key: facet.key, label: facet.label, icon: facet.icon, count, active, disabled: count === 0 && !active };
      })
    ];
  };

  // The marker is measured rather than assumed, so the group labels keep their
  // natural widths instead of being forced into equal columns.
  const measure = () => {
    const tab = tabEls[currentIndex];
    if (!trackEl || !tab) return;
    const track = trackEl.getBoundingClientRect();
    const box = tab.getBoundingClientRect();
    const x = box.left - track.left;
    const w = box.width;
    if (Math.abs(x - markerX) < 0.5 && Math.abs(w - markerW) < 0.5 && measured) return;
    markerX = x;
    markerW = w;
    measured = w > 0;
  };

  const remeasure = () => {
    if (!mounted) return;
    void tick().then(measure);
  };

  // Keeps the open group visible on a narrow rail without ever scrolling the page.
  const revealActiveTab = () => {
    const tab = tabEls[currentIndex];
    if (!railEl || !tab) return;
    if (railEl.scrollWidth <= railEl.clientWidth) return;
    const rail = railEl.getBoundingClientRect();
    const box = tab.getBoundingClientRect();
    railEl.scrollLeft += box.left - rail.left - (rail.width - box.width) / 2;
  };

  const selectGroup = (key: string) => {
    dispatch('group', key);
  };

  const selectFacet = (capsule: Capsule) => {
    if (capsule.disabled) return;
    // Tapping the facet that is already on clears it, so the capsule is a toggle
    // and the row is never a trap you can only leave through "Clear".
    dispatch('facet', capsule.active && capsule.key ? '' : capsule.key);
  };

  const moveTo = (index: number) => {
    const group = tabs[index];
    if (!group) return;
    dispatch('group', group.key);
    void tick().then(() => tabEls[index]?.focus());
  };

  const onTabKeydown = (event: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    if (last < 0) return;
    let next: number;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;
    event.preventDefault();
    moveTo(next);
  };

  $: tabs = groups.filter((group) => Boolean(group?.key));
  $: currentIndex = Math.max(
    0,
    tabs.findIndex((group) => group.key === activeGroup)
  );
  $: current = tabs[currentIndex] ?? null;
  $: capsules = buildCapsules(current, counts, activeFacet);
  $: activeLabel = current?.facets.find((facet) => facet.key === activeFacet)?.label ?? '';
  // Re-measure whenever the open group or the set of groups changes.
  $: if (mounted && (current?.key || tabs.length)) remeasure();

  onMount(() => {
    mounted = true;
    measure();
    revealActiveTab();

    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    // Mounting in a background tab (or inside a collapsed parent) measures zero
    // widths, so take the reading again the moment the page is actually shown.
    document.addEventListener('visibilitychange', onResize);

    // The serif/sans faces swap in after first paint and shift label widths.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    void fonts?.ready.then(measure).catch(() => {});

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && trackEl) {
      observer = new ResizeObserver(() => measure());
      observer.observe(trackEl);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onResize);
      observer?.disconnect();
      mounted = false;
    };
  });
</script>

{#if current}
  <div class="w-full">
    <!-- Tier one: groups. One track, one marker. -->
    <div bind:this={railEl} class="no-scrollbar -mx-1 -my-1 flex snap-x snap-mandatory overflow-x-auto px-1 py-1">
      <div
        bind:this={trackEl}
        class="relative inline-flex shrink-0 items-center gap-0.5 rounded-full bg-sand/60 p-1 ring-1 ring-inset ring-ink/[0.08]"
        role="tablist"
        aria-label="Browse destinations by"
      >
        <span
          class="gf-marker pointer-events-none absolute bottom-1 left-0 top-1 rounded-full bg-surface shadow-card ring-1 ring-goldfinch-gold/45"
          style={`transform: translateX(${markerX}px); width: ${markerW}px; opacity: ${measured ? 1 : 0}`}
          aria-hidden="true"
        ></span>

        {#each tabs as group, index (group.key)}
          <button
            bind:this={tabEls[index]}
            type="button"
            role="tab"
            id={`${TAB_ID}-${group.key}`}
            aria-controls={PANEL_ID}
            aria-selected={index === currentIndex ? 'true' : 'false'}
            tabindex={index === currentIndex ? 0 : -1}
            class={`relative z-[1] inline-flex h-11 shrink-0 snap-start items-center whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold sm:h-10 sm:px-5 sm:text-[13.5px] ${
              index === currentIndex ? 'text-heading' : 'text-ink/55 hover:text-ink/85'
            }`}
            on:click={() => selectGroup(group.key)}
            on:keydown={(event) => onTabKeydown(event, index)}
          >
            {group.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Tier two: the open group's facets. -->
    <div id={PANEL_ID} role="tabpanel" aria-labelledby={`${TAB_ID}-${current.key}`} class="mt-5">
      <!-- The row is held at the height of the Clear button so that the capsules
           below do not shift down the page the first time a facet is chosen. -->
      <div class="mb-3 flex min-h-[44px] items-center gap-4 sm:min-h-[36px]">
        {#if current.hint}
          <p class="font-serif text-[13.5px] italic leading-snug text-ink/55">{current.hint}</p>
        {/if}

        {#if activeFacet}
          <button
            type="button"
            class="gf-clear ml-auto inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-clay transition duration-200 hover:bg-clay/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold sm:h-9"
            aria-label={activeLabel ? `Clear the ${activeLabel} filter` : 'Clear filter'}
            on:click={() => dispatch('clear')}
          >
            <X size={14} strokeWidth={2.5} aria-hidden="true" />
            Clear
          </button>
        {/if}
      </div>

      {#key current.key}
        <div class="gf-tier no-scrollbar -mx-1 -my-1 flex snap-x snap-mandatory items-center gap-2 overflow-x-auto px-1 py-1">
          {#each capsules as capsule (capsule.key)}
            <button
              type="button"
              class={`inline-flex h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[13px] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:h-10 ${
                capsule.active
                  ? 'border-goldfinch-gold bg-goldfinch-gold text-heading shadow-card'
                  : capsule.disabled
                    ? 'cursor-not-allowed border-dashed border-ink/15 bg-transparent text-ink/40'
                    : 'border-ink/12 bg-surface text-ink/70 hover:border-goldfinch-gold/55 hover:text-heading'
              }`}
              aria-pressed={capsule.active ? 'true' : 'false'}
              disabled={capsule.disabled}
              on:click={() => selectFacet(capsule)}
            >
              {#if capsule.icon}
                <span class={`text-[13px] leading-none ${capsule.disabled ? 'opacity-45' : 'opacity-90'}`} aria-hidden="true">
                  {capsule.icon}
                </span>
              {/if}
              <span>{capsule.label}</span>
              {#if capsule.count !== null}
                <!-- The count is deliberately lighter than the label: it is a
                     detail of the facet, not a headline number. -->
                <span class={`text-[12px] font-normal tabular-nums ${capsule.active ? 'opacity-70' : 'opacity-60'}`}>
                  {capsule.count}
                </span>
              {/if}
            </button>
          {/each}
        </div>
      {/key}
    </div>
  </div>
{/if}

<style>
  /* Mobile scrolls both tiers sideways; a visible scrollbar under a row of
     capsules reads as a dashboard, so it is hidden and snap points do the work. */
  .no-scrollbar {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }

  .gf-marker {
    transition:
      transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
      width 240ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 200ms ease-out;
  }

  .gf-tier {
    animation: gf-tier-in 200ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .gf-clear {
    animation: gf-fade-in 180ms ease-out both;
  }

  @keyframes gf-tier-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes gf-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* The marker still moves — it just arrives instantly instead of gliding. */
  @media (prefers-reduced-motion: reduce) {
    .gf-marker {
      transition: none;
    }
    .gf-tier,
    .gf-clear {
      animation: none;
    }
  }
</style>
