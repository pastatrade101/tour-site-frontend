<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Minus, Plus } from '@lucide/svelte';
  import { t } from '$lib/i18n/ui';

  /**
   * A count with a minus and a plus either side of it.
   *
   * The number in the middle stays a real number box: it can still be typed
   * and cleared, a screen reader reads it as the field it is, and whatever
   * checks the form already runs on the number keep working unchanged. The
   * buttons are a shortcut to it, not a replacement for it.
   *
   * Its border, focus and error colours follow the form it sits in when that
   * form names them (--pf-border, --pf-focus, --pf-invalid).
   */
  export let id: string;
  /** The field's own name, so each button can say what it changes. */
  export let label: string;
  export let value: number | null | undefined = undefined;
  export let min = 0;
  export let max = 99;
  /**
   * Where an empty count begins. Shown greyed in the empty box, and the first
   * press of the plus lands on it. Left out, an empty box starts at `min`.
   */
  export let start: number | undefined = undefined;
  export let disabled = false;
  export let invalid = false;
  export let describedBy: string | undefined = undefined;

  // `input` (typing) is passed straight on; `change` is a press of a button.
  const dispatch = createEventDispatcher<{ change: number }>();
  const clamp = (count: number) => Math.min(max, Math.max(min, count));

  $: count = typeof value === 'number' && Number.isFinite(value) ? value : null;
  $: first = clamp(Math.trunc(start ?? min));

  function move(delta: number) {
    value = count === null ? first : clamp(Math.trunc(count) + delta);
    dispatch('change', value);
  }
</script>

<div class="stepper" class:invalid class:off={disabled}>
  <button type="button" aria-label={$t('pg_plan_my_trip.fewer_label').replace('{label}', label)} disabled={disabled || count === null || count <= min} on:click={() => move(-1)}>
    <Minus size={16} aria-hidden="true" />
  </button>
  <!-- data-focus: where the form sends the cursor when this field needs fixing. -->
  <input {id} data-focus type="number" {min} step="1" inputmode="numeric" bind:value {disabled} placeholder={start === undefined ? '–' : String(first)} aria-invalid={invalid} aria-describedby={describedBy} on:input />
  <button type="button" aria-label={$t('pg_plan_my_trip.more_label').replace('{label}', label)} disabled={disabled || (count !== null && count >= max)} on:click={() => move(1)}>
    <Plus size={16} aria-hidden="true" />
  </button>
</div>

<style>
  .stepper { display: grid; grid-template-columns: 46px minmax(0, 1fr) 46px; height: var(--stepper-height, 46px); overflow: hidden; border: 1px solid var(--pf-border, rgb(var(--c-goldfinch-gold) / .45)); border-radius: 5px; background: #fff; color: rgb(var(--c-deep-green)); }
  .stepper:focus-within { outline: 2px solid var(--pf-focus, rgb(var(--c-goldfinch-gold))); outline-offset: 2px; }
  .stepper.invalid { border-color: var(--pf-invalid, #f2b8a6); outline: 2px solid var(--pf-invalid, #f2b8a6); }
  .stepper.off { background: #e6e6df; opacity: .65; }
  button { display: grid; place-items: center; background: #f6f1e4; color: inherit; transition: background-color 160ms ease; }
  button:first-child { border-right: 1px solid var(--pf-border, rgb(var(--c-goldfinch-gold) / .3)); }
  button:last-child { border-left: 1px solid var(--pf-border, rgb(var(--c-goldfinch-gold) / .3)); }
  button:hover:not(:disabled) { background: #fff0ce; }
  button:active:not(:disabled) { background: #ffe5a8; }
  button:focus-visible { outline: none; box-shadow: inset 0 0 0 2px rgb(var(--c-goldfinch-gold)); }
  button:disabled { color: rgb(57 61 50 / .3); cursor: default; }
  .stepper.off button { background: transparent; }
  input { width: 100%; min-width: 0; padding: 0 4px; border: 0; outline: none; background: transparent; color: inherit; font-size: var(--stepper-font-size, 15px); font-weight: 600; text-align: center; appearance: textfield; -moz-appearance: textfield; }
  input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { margin: 0; -webkit-appearance: none; }
  input::placeholder { color: rgb(57 61 50 / .42); font-weight: 400; opacity: 1; }
</style>
