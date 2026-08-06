<script lang="ts">
  import { RefreshCw } from '@lucide/svelte';
  import { currency, initCurrency, setCurrency } from '$lib/currency';

  export let compact = false;
  export let mobile = false;

  const flags: Record<string, string> = {
    USD: '🇺🇸',
    EUR: '🇪🇺',
    GBP: '🇬🇧',
    TZS: '🇹🇿',
    KES: '🇰🇪',
    ZAR: '🇿🇦',
    AUD: '🇦🇺',
    CAD: '🇨🇦'
  };

  const regionFlag = (locale: string) => {
    const region = locale.split('-').pop()?.toUpperCase() ?? '';
    if (!/^[A-Z]{2}$/.test(region)) return '';
    return String.fromCodePoint(...[...region].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
  };

  const flagFor = (code: string, locale: string) => flags[code] ?? regionFlag(locale);

  const onChange = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    setCurrency((event.currentTarget as HTMLSelectElement).value);
  };

  const ensureReady = () => {
    if (!$currency.loading && $currency.status === 'missing') void initCurrency();
  };

  $: options = $currency.supportedCurrencies.filter((item) => item.enabled);
</script>

<label class={`group grid min-w-0 gap-1 ${mobile ? 'w-full' : ''}`}>
  <span class={compact ? 'sr-only' : 'text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45'}>Currency</span>
  <span class={`relative inline-flex min-w-0 items-center rounded-[8px] border border-ink/12 bg-surface text-ink shadow-sm transition focus-within:border-goldfinch-gold focus-within:ring-2 focus-within:ring-goldfinch-gold/25 ${compact ? 'h-10' : 'h-11'} ${mobile ? 'w-full' : ''}`}>
    <select
      class={`h-full min-w-0 appearance-none bg-transparent py-0 pl-3 pr-9 text-sm font-extrabold tracking-normal text-heading outline-none ${mobile ? 'w-full' : compact ? 'w-[112px]' : 'w-[170px]'}`}
      aria-label="Select display currency"
      value={$currency.selectedCurrency}
      aria-busy={$currency.loading}
      disabled={!options.length}
      on:change={onChange}
      on:click|stopPropagation
      on:pointerdown|stopPropagation
      on:focus={ensureReady}
    >
      {#each options as item (item.code)}
        <option value={item.code} disabled={!item.available}>
          {flagFor(item.code, item.locale)} {item.code}{compact ? '' : ` · ${item.name}`}
        </option>
      {/each}
    </select>
    <span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40">
      {#if $currency.loading}
        <RefreshCw size={14} class="animate-spin" />
      {:else}
        <span aria-hidden="true">▾</span>
      {/if}
    </span>
  </span>
</label>
