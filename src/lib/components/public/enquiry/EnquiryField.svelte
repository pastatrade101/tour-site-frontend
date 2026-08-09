<script lang="ts">
  /**
   * Renders one configured field.
   *
   * Every control carries a real <label> tied to its input — a placeholder is
   * never the only label, because it disappears the moment someone types and
   * leaves screen-reader users with an unnamed box.
   */
  import { Minus, Plus } from '@lucide/svelte';
  import CountrySelect from '$lib/components/public/CountrySelect.svelte';
  import type { Field, FormValues } from '$lib/enquiry/types';

  export let field: Field;
  export let values: FormValues;
  export let error = '';

  const id = `f_${field.key}`;
  const errorId = `${id}_error`;
  const hintId = `${id}_hint`;

  $: value = values[field.key];
  $: describedBy = [field.hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;

  const setValue = (next: FormValues[string]) => {
    values = { ...values, [field.key]: next };
  };

  const toggleMulti = (option: string) => {
    const current = Array.isArray(value) ? ([...value] as string[]) : [];
    const at = current.indexOf(option);
    if (at >= 0) current.splice(at, 1);
    else current.push(option);
    setValue(current);
  };

  const step = (delta: number) => {
    const min = field.min ?? 0;
    const max = field.max ?? 99;
    const next = Math.min(max, Math.max(min, Number(value ?? min) + delta));
    setValue(next);

    // Keep the ages array the same length as the number of children.
    if (field.key === 'children') {
      const ages = Array.isArray(values.child_ages) ? ([...values.child_ages] as number[]) : [];
      ages.length = next;
      values = { ...values, children: next, child_ages: ages };
    }
  };

  const setAge = (index: number, raw: string) => {
    const ages = Array.isArray(values.child_ages) ? ([...values.child_ages] as (number | undefined)[]) : [];
    ages[index] = raw === '' ? undefined : Math.max(0, Math.min(17, Number(raw)));
    values = { ...values, child_ages: ages as number[] };
  };

  // Shared control styling: white fields on the forest-green panel.
  const INPUT =
    'w-full rounded-[10px] border bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-ink/40 focus:ring-2 focus:ring-goldfinch-gold';
</script>

<div class="grid gap-2" class:sm:col-span-1={field.half} class:sm:col-span-2={!field.half} data-field={field.key}>
  {#if field.kind !== 'checkbox'}
    <label class="text-[13px] font-semibold text-white/90" for={id}>
      {field.label}
      {#if field.required}<span class="text-goldfinch-gold" aria-hidden="true">*</span><span class="sr-only">(required)</span>{/if}
    </label>
    {#if field.hint}
      <p id={hintId} class="-mt-1 text-[12px] leading-5 text-white/55">{field.hint}</p>
    {/if}
  {/if}

  {#if field.kind === 'chips' || field.kind === 'chips-multi'}
    {@const multi = field.kind === 'chips-multi'}
    {@const selected = multi ? ((value as string[]) ?? []) : []}
    <div
      class="flex flex-wrap gap-2"
      role={multi ? 'group' : 'radiogroup'}
      aria-labelledby={id}
      aria-describedby={describedBy}
    >
      {#each field.options ?? [] as option}
        {@const active = multi ? selected.includes(option.value) : value === option.value}
        <button
          type="button"
          role={multi ? 'checkbox' : 'radio'}
          aria-checked={active}
          class="rounded-full border px-3.5 py-2 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green"
          class:border-goldfinch-gold={active}
          class:bg-goldfinch-gold={active}
          class:text-heading={active}
          class:border-white-25={!active}
          class:text-white={!active}
          class:hover:bg-white-10={!active}
          on:click={() => (multi ? toggleMulti(option.value) : setValue(option.value))}
        >
          {option.label}
        </button>
      {/each}
    </div>
    <!-- A hidden input keeps the group reachable by its label id. -->
    <span {id} class="sr-only">{field.label}</span>

  {:else if field.kind === 'number'}
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/25 text-white transition hover:bg-white/10 disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
        aria-label={`Decrease ${field.label}`}
        disabled={Number(value ?? field.min ?? 0) <= (field.min ?? 0)}
        on:click={() => step(-1)}
      >
        <Minus size={16} />
      </button>
      <input
        {id}
        class="{INPUT} w-20 border-transparent text-center font-bold"
        class:border-red-400={error}
        type="number"
        inputmode="numeric"
        min={field.min ?? 0}
        max={field.max ?? 99}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : undefined}
        value={Number(value ?? field.min ?? 0)}
        on:input={(event) => setValue(Number(event.currentTarget.value))}
      />
      <button
        type="button"
        class="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/25 text-white transition hover:bg-white/10 disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
        aria-label={`Increase ${field.label}`}
        disabled={Number(value ?? 0) >= (field.max ?? 99)}
        on:click={() => step(1)}
      >
        <Plus size={16} />
      </button>
    </div>

  {:else if field.kind === 'child-ages'}
    <div class="flex flex-wrap gap-2">
      {#each Array(Number(values.children ?? 0)) as _, index}
        <label class="flex items-center gap-2 rounded-[10px] border border-white/20 bg-white/5 px-2.5 py-1.5">
          <span class="text-[12px] font-semibold text-white/70">Child {index + 1}</span>
          <input
            class="w-14 rounded-[7px] border-0 bg-white px-2 py-1 text-center text-[14px] font-bold text-ink outline-none focus:ring-2 focus:ring-goldfinch-gold"
            type="number"
            min="0"
            max="17"
            inputmode="numeric"
            aria-label={`Age of child ${index + 1}`}
            value={(values.child_ages as number[] | undefined)?.[index] ?? ''}
            on:input={(event) => setAge(index, event.currentTarget.value)}
          />
        </label>
      {/each}
    </div>

  {:else if field.kind === 'textarea'}
    <textarea
      {id}
      class="{INPUT} min-h-[96px] resize-y"
      class:border-transparent={!error}
      class:border-red-400={error}
      rows="3"
      placeholder={field.placeholder ?? ''}
      aria-describedby={describedBy}
      aria-invalid={error ? 'true' : undefined}
      value={String(value ?? '')}
      on:input={(event) => setValue(event.currentTarget.value)}
    ></textarea>

  {:else if field.kind === 'select'}
    <select
      {id}
      class="{INPUT} appearance-none"
      class:border-transparent={!error}
      class:border-red-400={error}
      aria-describedby={describedBy}
      aria-invalid={error ? 'true' : undefined}
      value={String(value ?? '')}
      on:change={(event) => setValue(event.currentTarget.value)}
    >
      <option value="">Please choose…</option>
      {#each field.options ?? [] as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>

  {:else if field.kind === 'country'}
    <div class="rounded-[10px] bg-white" class:ring-2={!!error} class:ring-red-400={!!error}>
      <CountrySelect {id} value={String(value ?? '')} invalid={!!error} on:change={(event) => setValue(event.detail)} />
    </div>

  {:else if field.kind === 'checkbox'}
    <label class="flex items-start gap-3 rounded-[10px] border border-white/20 bg-white/5 px-3.5 py-3">
      <input
        {id}
        class="mt-0.5 h-4 w-4 shrink-0 rounded border-white/40 text-goldfinch-gold focus:ring-goldfinch-gold"
        type="checkbox"
        aria-describedby={describedBy}
        checked={value === true}
        on:change={(event) => setValue(event.currentTarget.checked)}
      />
      <span>
        <span class="block text-[13px] font-semibold text-white/90">{field.label}</span>
        {#if field.hint}<span id={hintId} class="mt-0.5 block text-[12px] leading-5 text-white/55">{field.hint}</span>{/if}
      </span>
    </label>

  {:else}
    <input
      {id}
      class={INPUT}
      class:border-transparent={!error}
      class:border-red-400={error}
      type={field.kind === 'month' ? 'month' : field.kind}
      placeholder={field.placeholder ?? ''}
      aria-describedby={describedBy}
      aria-invalid={error ? 'true' : undefined}
      value={String(value ?? '')}
      on:input={(event) => setValue(event.currentTarget.value)}
    />
  {/if}

  {#if error}
    <p id={errorId} class="text-[12px] font-semibold text-red-300" role="alert">{error}</p>
  {/if}
</div>

<style>
  .border-white-25 {
    border-color: rgb(255 255 255 / 0.25);
  }
  .hover\:bg-white-10:hover {
    background-color: rgb(255 255 255 / 0.1);
  }
</style>
