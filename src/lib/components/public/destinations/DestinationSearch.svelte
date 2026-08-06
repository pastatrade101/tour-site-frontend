<script lang="ts">
  import { Search, X } from '@lucide/svelte';

  /**
   * The destinations search field — a raised card that straddles the bottom edge
   * of the hero on desktop and sits directly beneath it on mobile.
   *
   * Presentational only. Filtering, URL state and analytics stay with the page:
   * this component owns nothing but the text, handed back through `bind:value`.
   * The only number it ever shows is `resultCount` — how many destinations the
   * page is currently rendering. Nothing else about a destination is counted,
   * scored or ranked anywhere in this file, because nothing else exists.
   */
  export let value = '';
  export let resultCount = 0;
  export let placeholder = 'Search destinations, parks, islands or wildlife…';
  /** Example terms shown as one-tap shortcuts. Nothing renders when empty. */
  export let suggestions: string[] = [];

  let inputEl: HTMLInputElement | null = null;

  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

  // A suggestion behaves as a toggle: tapping the term you are already searching
  // clears it, so the row never becomes a trap you can only escape via the X.
  const applyTerm = (term: string) => {
    value = same(value, term) ? '' : term;
    inputEl?.focus();
  };

  const clear = () => {
    value = '';
    inputEl?.focus();
  };

  $: query = value.trim();
  $: countLabel =
    resultCount > 0
      ? `${resultCount} ${query ? 'matching ' : ''}destination${resultCount === 1 ? '' : 's'}`
      : query
        ? 'No matching destinations'
        : 'No destinations';

  const pill =
    'inline-flex h-11 shrink-0 snap-start items-center whitespace-nowrap rounded-full border px-4 text-[13px] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold sm:h-9';
</script>

<div class="relative z-10 mx-auto w-full max-w-[860px] md:-mt-7">
  <form
    class="group flex h-[52px] w-full items-center gap-3 rounded-[10px] border border-ink/10 bg-surface pl-5 pr-2 shadow-soft transition duration-200 focus-within:border-goldfinch-gold/70 focus-within:ring-2 focus-within:ring-goldfinch-gold/35 md:h-14 md:gap-4 md:pl-6 md:pr-3"
    role="search"
    aria-label="Search destinations"
    on:submit|preventDefault={() => inputEl?.blur()}
  >
    <Search
      size={20}
      strokeWidth={2}
      class="shrink-0 text-ink/35 transition-colors duration-200 group-focus-within:text-goldfinch-gold"
      aria-hidden="true"
    />

    <input
      bind:this={inputEl}
      bind:value
      class="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink/40 md:text-lg"
      type="search"
      inputmode="search"
      enterkeyhint="search"
      autocomplete="off"
      spellcheck="false"
      aria-label="Search destinations"
      {placeholder}
    />

    {#if value}
      <button
        type="button"
        class="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/45 transition duration-200 hover:bg-sand/70 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
        aria-label="Clear search"
        on:click={clear}
      >
        <X size={18} aria-hidden="true" />
      </button>
    {/if}
  </form>

  <div class="mt-3 flex flex-col gap-2.5 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
    {#if suggestions.length}
      <!-- Mobile gets a scroll rail rather than a wrapping block of chips, so the
           row stays one line tall and never pushes the grid down the page. -->
      <div
        class="no-scrollbar -mx-1 flex snap-x snap-mandatory items-center gap-2 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        <span class="hidden shrink-0 pr-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40 sm:inline">
          Try
        </span>
        {#each suggestions as term (term)}
          {@const active = same(value, term)}
          <button
            type="button"
            class="{pill} {active
              ? 'border-goldfinch-gold bg-goldfinch-gold/12 text-heading'
              : 'border-ink/12 bg-surface text-ink/65 hover:border-goldfinch-gold/55 hover:text-heading'}"
            aria-pressed={active}
            on:click={() => applyTerm(term)}
          >
            {term}
          </button>
        {/each}
      </div>
    {/if}

    <p
      class="order-first flex shrink-0 items-center gap-2 text-[13px] font-medium text-ink/55 sm:order-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-goldfinch-gold" aria-hidden="true"></span>
      {countLabel}
    </p>
  </div>
</div>

<style>
  .no-scrollbar {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }

  /* WebKit draws its own clear affordance on type="search"; ours is a real,
     labelled button, so the native one would just be a second unlabelled X. */
  input[type='search']::-webkit-search-cancel-button,
  input[type='search']::-webkit-search-decoration {
    -webkit-appearance: none;
    appearance: none;
  }
</style>
