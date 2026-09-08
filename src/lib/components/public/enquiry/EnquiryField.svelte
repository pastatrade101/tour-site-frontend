<script lang="ts">
  /**
   * Renders one configured field.
   *
   * Every control carries a real <label> tied to its input — a placeholder is
   * never the only label, because it disappears the moment someone types and
   * leaves screen-reader users with an unnamed box.
   */
  import { Check, Minus, Plus } from '@lucide/svelte';
  import CountrySelect from '$lib/components/public/CountrySelect.svelte';
  import Img from '$lib/components/public/Img.svelte';
  import { DIAL_CODES, splitDialCode } from '$lib/dialCodes';
  import type { Field, FormValues } from '$lib/enquiry/types';

  export let field: Field;
  export let values: FormValues;
  export let error = '';

  const id = `f_${field.key}`;
  const errorId = `${id}_error`;
  const hintId = `${id}_hint`;

  $: value = values[field.key];
  $: describedBy = [field.hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;

  /** An optional textarea shows only its "add" button until it is opened. */
  let expanded = false;
  $: collapsedOptional = field.kind === 'textarea-optional' && !expanded && !String(value ?? '').length;

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

  /*
   * The dial code and the number are one answer — the column stores "+255 712…"
   * — so they are written back joined. Split on the way in as well, or reopening
   * a part-filled form would silently reset the code to Tanzania.
   */
  // The code is held here rather than read back out of the stored value: an
  // empty phone stores nothing at all, so a code chosen before the number was
  // typed would otherwise snap back to the default on the next keystroke.
  let dialCode = splitDialCode(String(values[field.key] ?? '')).code;
  $: phoneNumber = splitDialCode(String(value ?? '')).number;
  const setPhone = (code: string, number: string) => {
    dialCode = code;
    const digits = number.trim();
    setValue(digits ? `${code} ${digits}` : '');
  };

  const setAge = (index: number, raw: string) => {
    const ages = Array.isArray(values.child_ages) ? ([...values.child_ages] as (number | undefined)[]) : [];
    ages[index] = raw === '' ? undefined : Math.max(0, Math.min(17, Number(raw)));
    values = { ...values, child_ages: ages as number[] };
  };

  // Shared control styling: white fields on the forest-green panel.
  // Every single-line control is the same height, radius and type size, so a
  // row of mixed inputs reads as one band rather than a ragged stack.
  const INPUT =
    'w-full rounded-[10px] border bg-white px-3.5 text-[14.5px] text-ink outline-none transition placeholder:text-ink/40 focus:ring-2 focus:ring-goldfinch-gold';
  const H = 'h-11';
</script>

<div class="grid gap-1.5 content-start" class:sm:col-span-1={field.half} class:sm:col-span-2={!field.half} data-field={field.key}>
  {#if field.kind !== 'checkbox' && !collapsedOptional}
    <label class="text-[13px] font-semibold text-white/90" for={id}>
      {field.label}
      {#if field.required}<span class="text-goldfinch-gold" aria-hidden="true">*</span><span class="sr-only">(required)</span>{/if}
    </label>
    {#if field.hint}
      <p id={hintId} class="-mt-0.5 text-[11.5px] leading-4 text-white/50">{field.hint}</p>
    {/if}
  {/if}

  {#if field.kind === 'chips' || field.kind === 'chips-multi'}
    {@const multi = field.kind === 'chips-multi'}
    {@const selected = multi ? ((value as string[]) ?? []) : []}
    <div
      class="flex flex-wrap gap-1.5"
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
          class="enquiry-chip inline-flex h-9 items-center rounded border px-3.5 text-[12.5px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green"
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

  {:else if field.kind === 'cards'}
    <!-- A choice worth looking at rather than reading: the picture carries the
         difference between comfort levels faster than any label can. Cards with
         no image are not a fallback state — plenty of choices have no
         photograph, and the card is complete without one. -->
    <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby={id} aria-describedby={describedBy}>
      {#each field.options ?? [] as option (option.value)}
        {@const active = value === option.value}
        <button
          type="button"
          role="radio"
          aria-checked={active}
          class="group relative overflow-hidden rounded-[10px] border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green {active
            ? 'border-goldfinch-gold bg-goldfinch-gold/10 ring-2 ring-goldfinch-gold/30'
            : 'border-white/20 hover:border-goldfinch-gold/70'}"
          on:click={() => setValue(option.value)}
        >
          {#if option.image}
            <span class="relative block h-[72px] w-full overflow-hidden sm:h-[82px]">
              <Img
                src={option.image}
                alt=""
                width={320}
                pictureClass="block h-full w-full"
                className="h-full w-full object-cover"
              />
              {#if active}
                <span class="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-goldfinch-gold text-heading shadow">
                  <Check size={12} strokeWidth={3} />
                </span>
              {/if}
            </span>
          {/if}
          <span class="block px-2.5 py-2">
            <span class="flex items-center gap-1.5">
              <span class="text-[13px] font-semibold leading-tight text-white">{option.label}</span>
              {#if active && !option.image}
                <Check size={13} strokeWidth={3} class="shrink-0 text-goldfinch-gold" />
              {/if}
            </span>
            {#if option.description}
              <span class="mt-0.5 block text-[11px] leading-snug text-white/60">{option.description}</span>
            {/if}
          </span>
        </button>
      {/each}
    </div>
    <span {id} class="sr-only">{field.label}</span>

  {:else if field.kind === 'phone'}
    <div class="grid grid-cols-[112px_minmax(0,1fr)] gap-2">
      <select
        class="{INPUT} {H} appearance-none border-transparent px-2.5 font-semibold"
        aria-label="Country dialling code"
        value={dialCode}
        on:change={(event) => setPhone(event.currentTarget.value, phoneNumber)}
      >
        {#each DIAL_CODES as entry (entry.code + entry.label)}
          <option value={entry.code}>{entry.label}</option>
        {/each}
      </select>
      <input
        {id}
        class="{INPUT} {H}"
        class:border-transparent={!error}
        class:border-red-400={error}
        type="tel"
        inputmode="tel"
        placeholder={field.placeholder ?? '712 345 678'}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : undefined}
        value={phoneNumber}
        on:input={(event) => setPhone(dialCode, event.currentTarget.value)}
      />
    </div>

  {:else if field.kind === 'number'}
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/25 text-white transition hover:bg-white/10 active:scale-95 disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
        aria-label={`Decrease ${field.label}`}
        disabled={Number(value ?? field.min ?? 0) <= (field.min ?? 0)}
        on:click={() => step(-1)}
      >
        <Minus size={16} />
      </button>
      <input
        {id}
        class="{INPUT} {H} w-16 border-transparent text-center font-bold"
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
        class="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/25 text-white transition hover:bg-white/10 active:scale-95 disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
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
        <label class="flex h-10 items-center gap-2 rounded-[10px] border border-white/20 bg-white/5 px-2.5">
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

  {:else if field.kind === 'number-plain'}
    <input
      {id}
      class="{INPUT} {H}"
      class:border-transparent={!error}
      class:border-red-400={error}
      type="number"
      inputmode="numeric"
      min={field.min ?? 0}
      max={field.max ?? 99}
      placeholder={field.placeholder ?? ''}
      aria-describedby={describedBy}
      aria-invalid={error ? 'true' : undefined}
      value={value === undefined || value === '' ? '' : String(value)}
      on:input={(event) => setValue(event.currentTarget.value === '' ? '' : Number(event.currentTarget.value))}
    />

  {:else if field.kind === 'textarea-optional'}
    <!-- Optional and out of the way until it is wanted. A textarea sitting open
         on a form reads as another thing to fill in. -->
    {#if expanded || String(value ?? '').length}
      <textarea
        {id}
        class="{INPUT} min-h-[80px] py-2 resize-y border-transparent"
        rows="3"
        placeholder={field.placeholder ?? ''}
        aria-describedby={describedBy}
        value={String(value ?? '')}
        on:input={(event) => setValue(event.currentTarget.value)}
      ></textarea>
    {:else}
      <button
        type="button"
        class="inline-flex w-fit items-center gap-1.5 rounded-[10px] border border-dashed border-white/35 px-3 py-2 text-[13px] font-semibold text-white/75 transition hover:border-goldfinch-gold hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
        on:click={() => (expanded = true)}
      >
        <Plus size={14} /> Add {field.label.toLowerCase()}
      </button>
    {/if}

  {:else if field.kind === 'textarea'}
    <textarea
      {id}
      class="{INPUT} min-h-[66px] py-2 resize-y"
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
      class="{INPUT} {H} appearance-none"
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
    <label class="flex items-start gap-2.5 rounded-[10px] border border-white/15 bg-white/5 px-3 py-2.5 transition hover:bg-white/[0.08]">
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
      class="{INPUT} {H}"
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

  /* Chips get a small lift on press and a settle on selection — enough to
     confirm the tap without moving anything around it. */
  .enquiry-chip {
    will-change: transform;
  }

  .enquiry-chip:active {
    transform: scale(0.96);
  }

  .enquiry-chip[aria-checked='true'] {
    animation: chip-pick 180ms ease-out;
  }

  @keyframes chip-pick {
    0% {
      transform: scale(0.94);
    }
    60% {
      transform: scale(1.03);
    }
    100% {
      transform: scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .enquiry-chip,
    .enquiry-chip:active,
    .enquiry-chip[aria-checked='true'] {
      animation: none;
      transform: none;
      transition: none;
    }
  }
</style>
