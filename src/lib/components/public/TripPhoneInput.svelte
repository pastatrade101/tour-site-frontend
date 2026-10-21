<script lang="ts">
  import { tick } from 'svelte';
  import { ChevronDown, Search } from '@lucide/svelte';
  import { locale, t } from '$lib/i18n/ui';
  import { cleanPhoneInput } from '$lib/enquiry/validation';
  import { COUNTRY_DIAL_CODES, DIAL_CODES, PRIMARY_COUNTRY } from '$lib/enquiry/dialCodes';
  export let dialCode = '+255';
  export let phone = '';
  export let invalid = false;
  export let describedBy: string | undefined = undefined;
  let root: HTMLDivElement;
  let trigger: HTMLButtonElement;
  let searchInput: HTMLInputElement;
  let open = false;
  let query = '';
  // Every country; a shared code (+1, +44 …) shows the country picked, else its main one.
  let pickedIso = '';
  const flag = (iso: string) => String.fromCodePoint(...Array.from(iso, (char) => 127397 + char.charCodeAt(0)));
  $: names = new Intl.DisplayNames([$locale], { type: 'region' });
  $: options = COUNTRY_DIAL_CODES.map(([iso, code]) => ({ iso, code, flag: flag(iso), name: names.of(iso) || iso })).sort((a, b) => a.name.localeCompare(b.name, $locale));
  $: selected =
    options.find((country) => country.iso === pickedIso && country.code === dialCode) ||
    options.find((country) => country.iso === PRIMARY_COUNTRY[dialCode]) ||
    options.find((country) => country.code === dialCode) ||
    options[0];
  $: filtered = options.filter((country) => `${country.name} ${country.iso} ${country.code}`.toLocaleLowerCase($locale).includes(query.trim().toLocaleLowerCase($locale)));
  async function toggle() { open = !open; query = ''; if (open) { await tick(); searchInput?.focus({ preventScroll: true }); } }
  function close() { open = false; trigger?.focus({ preventScroll: true }); }
  /** Letters and symbols never reach the number, nor more digits than the country uses. */
  function typed(event: Event) {
    const field = event.currentTarget as HTMLInputElement;
    const cleaned = cleanPhoneInput(field.value, dialCode, DIAL_CODES);
    dialCode = cleaned.dialCode;
    phone = cleaned.phone;
    if (field.value !== phone) field.value = phone;
  }
  // As in TripDatePicker: focus going to nothing (iPhone taps, a dismissed
  // keyboard) is not leaving; a tap outside closes through pointerdown.
  function focusOut(event: FocusEvent) {
    const next = event.relatedTarget as Node | null;
    if (open && next && !root?.contains(next)) open = false;
  }
  function keydown(event: KeyboardEvent) {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-country]'));
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    }
  }
</script>

<svelte:window on:pointerdown={(event) => { if (open && !root?.contains(event.target as Node)) open = false; }} />

<div class="phone-field" bind:this={root} role="group" aria-label={$t('cta.whatsapp')} on:focusout={focusOut}>
  <div class="phone-row">
    <button bind:this={trigger} class="gf-input dial-trigger" type="button" aria-label={`${$t('form.country_code')}: ${selected.name} ${dialCode}`} aria-haspopup="dialog" aria-expanded={open} on:click={toggle}>
      <span aria-hidden="true">{selected.flag}</span><span>{dialCode}</span><ChevronDown size={15} />
    </button>
    <input class="gf-input phone-number" type="tel" inputmode="tel" value={phone} on:input={typed} on:input aria-invalid={invalid} aria-describedby={describedBy} autocomplete="tel-national" aria-label={$t('form.phone')} placeholder={$t('form.phone')} />
  </div>
  {#if open}
    <div class="country-menu" role="dialog" tabindex="-1" aria-label={$t('form.country_code')} on:keydown={keydown}>
      <div class="search-field">
        <Search size={16} aria-hidden="true" />
        <input bind:this={searchInput} class="gf-input" type="search" autocomplete="off" aria-label={$t('form.search_country_code')} placeholder={$t('form.search_country_code')} bind:value={query} />
      </div>
      <div class="country-list">
        {#each filtered as country}
          <button type="button" data-country class:chosen={country.iso === selected.iso} aria-pressed={country.iso === selected.iso} on:click={() => { dialCode = country.code; pickedIso = country.iso; close(); }}>
            <span aria-hidden="true">{country.flag}</span><span class="country-name">{country.name}</span><span>{country.code}</span>
          </button>
        {:else}<p class="empty">{$t('form.no_countries')}</p>{/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .phone-field { position: relative; min-width: 0; }
  .phone-row { display: flex; min-width: 0; }
  /* Keep split-field sizing and joined borders above parent form input styles. */
  .phone-field .phone-row .dial-trigger { display: flex; gap: 7px; align-items: center; justify-content: center; width: auto; flex: 0 0 auto; white-space: nowrap; padding-inline: 10px; border-radius: 8px 0 0 8px; }
  .phone-field .phone-row .phone-number { flex: 1 1 0; width: 0; min-width: 0; border-left: 0; border-radius: 0 8px 8px 0; }
  .country-menu { position: absolute; z-index: 30; top: calc(100% + 5px); inset-inline: 0; padding: 8px; background: white; color: #393d32; border: 1px solid #d6ceb6; border-radius: 8px; box-shadow: 0 12px 32px #0003; }
  .search-field { position: relative; }
  .search-field :global(svg) { position: absolute; top: 14px; left: 10px; z-index: 1; }
  .search-field .gf-input { padding-left: 34px; font-size: 14px; }
  .country-list { margin-top: 6px; max-height: 190px; overflow-y: auto; overscroll-behavior: contain; }
  .country-list button { display: flex; width: 100%; gap: 9px; padding: 9px 7px; border-radius: 5px; text-align: left; align-items: center; font-size: 14px; }
  .country-name { flex: 1; }
  .country-list button:hover, .chosen { background: #fff0ce; }
  button:focus-visible { outline: 2px solid rgb(var(--c-goldfinch-gold)); outline-offset: -2px; }
  .empty { padding: 12px 6px; font-size: 14px; }
</style>
