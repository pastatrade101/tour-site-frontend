<script lang="ts">
  /**
   * Composes a landing page out of blocks.
   *
   * Every control here is generated from BLOCK_TYPES — the same list the public
   * renderer switches on. Adding a block type means editing that one file; this
   * editor grows a new form for it without being touched, and the two can never
   * disagree about a field name.
   */
  import { createEventDispatcher } from 'svelte';
  import { ArrowDown, ArrowUp, Plus, X } from '@lucide/svelte';
  import AdminFormInput from './AdminFormInput.svelte';
  import AdminRichText from './AdminRichText.svelte';
  import AdminSelect from './AdminSelect.svelte';
  import AdminTextArea from './AdminTextArea.svelte';
  import MediaPicker from './MediaPicker.svelte';
  import { BLOCK_TYPES, MONTHS, blockSpec, emptyBlock, type Block, type FieldSpec } from '$lib/safariPackageBlocks';

  // `any` on the value bag deliberately: these are jsonb fields of mixed type,
  // and a rich-text control has to bind straight into one.
  export let blocks: Array<Record<string, any> & { type: string }> = [];

  const dispatch = createEventDispatcher<{ change: Block[] }>();
  const push = () => {
    blocks = blocks;
    dispatch('change', blocks);
  };

  let addType = BLOCK_TYPES[0]?.type ?? '';

  const addBlock = () => {
    if (!addType) return;
    blocks = [...blocks, emptyBlock(addType)];
    push();
  };

  const removeBlock = (index: number) => {
    blocks = blocks.filter((_, i) => i !== index);
    push();
  };

  const move = (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= blocks.length) return;
    const copy = [...blocks];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    blocks = copy;
    push();
  };

  const setField = (index: number, key: string, value: unknown) => {
    blocks[index] = { ...blocks[index], [key]: value };
    push();
  };

  const itemRows = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? (value as Record<string, unknown>[]) : []);

  const addItem = (index: number, field: FieldSpec) => {
    const row: Record<string, unknown> = {};
    for (const sub of field.fields ?? []) row[sub.key] = sub.kind === 'lines' ? [] : '';
    setField(index, field.key, [...itemRows(blocks[index][field.key]), row]);
  };

  const removeItem = (index: number, field: FieldSpec, rowIndex: number) => {
    setField(index, field.key, itemRows(blocks[index][field.key]).filter((_, i) => i !== rowIndex));
  };

  const toggleMonth = (index: number, key: string, month: string) => {
    const current = Array.isArray(blocks[index][key]) ? (blocks[index][key] as string[]) : [];
    setField(index, key, current.includes(month) ? current.filter((m) => m !== month) : [...current, month]);
  };

  const label = 'block text-[11px] font-bold uppercase tracking-[0.12em] text-ink/55';
</script>

<div class="grid gap-4">
  {#each blocks as block, index (index)}
    {@const spec = blockSpec(block.type)}
    <section class="rounded-[12px] border border-ink/12 bg-surface">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-3">
        <div class="min-w-0">
          <p class="text-sm font-bold text-heading">
            {index + 1}. {spec?.label ?? block.type}
            {#if !spec}
              <!-- Saved by a newer editor, or by hand. Kept, not silently dropped. -->
              <span class="ml-2 rounded bg-clay/10 px-2 py-0.5 text-[11px] font-semibold text-clay">unknown type “{block.type}”</span>
            {/if}
          </p>
          {#if spec}<p class="mt-0.5 text-[12px] text-ink/55">{spec.blurb}</p>{/if}
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <button type="button" class="grid h-8 w-8 place-items-center rounded border border-ink/15 text-ink/60 transition hover:text-heading disabled:opacity-30" disabled={index === 0} aria-label="Move up" on:click={() => move(index, -1)}>
            <ArrowUp size={15} />
          </button>
          <button type="button" class="grid h-8 w-8 place-items-center rounded border border-ink/15 text-ink/60 transition hover:text-heading disabled:opacity-30" disabled={index === blocks.length - 1} aria-label="Move down" on:click={() => move(index, 1)}>
            <ArrowDown size={15} />
          </button>
          <button type="button" class="grid h-8 w-8 place-items-center rounded border border-ink/15 text-ink/45 transition hover:text-red-600" aria-label="Remove block" on:click={() => removeBlock(index)}>
            <X size={15} />
          </button>
        </div>
      </header>

      {#if spec}
        <div class="grid gap-4 p-4">
          {#each spec.fields as field (field.key)}
            {#if field.kind === 'text'}
              <AdminFormInput
                label={field.label}
                name={`b${index}_${field.key}`}
                placeholder={field.placeholder ?? ''}
                bind:value={blocks[index][field.key]}
              />
            {:else if field.kind === 'textarea'}
              <AdminTextArea
                label={field.label}
                name={`b${index}_${field.key}`}
                rows={3}
                placeholder={field.placeholder ?? ''}
                bind:value={blocks[index][field.key]}
              />
            {:else if field.kind === 'richtext'}
              <AdminRichText
                label={field.label}
                name={`b${index}_${field.key}`}
                rows={8}
                hint={field.hint ?? ''}
                bind:value={blocks[index][field.key]}
              />
            {:else if field.kind === 'image'}
              <MediaPicker
                label={field.label}
                value={String(block[field.key] ?? '')}
                on:change={(event) => setField(index, field.key, event.detail ?? '')}
              />
            {:else if field.kind === 'lines'}
              <div class="grid gap-1">
                <AdminTextArea
                  label={field.label}
                  name={`b${index}_${field.key}`}
                  rows={4}
                  bind:value={blocks[index][field.key]}
                />
                <span class="text-[11px] text-ink/45">{field.hint ?? 'One per line.'}</span>
              </div>
            {:else if field.kind === 'months'}
              <div class="grid gap-1.5">
                <span class={label}>{field.label}</span>
                <div class="flex flex-wrap gap-1.5">
                  {#each MONTHS as month (month)}
                    {@const on = Array.isArray(block[field.key]) && (block[field.key] as string[]).includes(month)}
                    <button
                      type="button"
                      class={`rounded border px-2.5 py-1.5 text-[12px] font-semibold transition ${on ? 'border-goldfinch-gold bg-goldfinch-gold/15 text-heading' : 'border-ink/15 text-ink/60 hover:border-goldfinch-gold/50'}`}
                      on:click={() => toggleMonth(index, field.key, month)}
                    >
                      {month.slice(0, 3)}
                    </button>
                  {/each}
                </div>
              </div>
            {:else if field.kind === 'items'}
              <div class="grid gap-2">
                <span class={label}>{field.label}</span>
                {#if field.hint}<span class="-mt-1 text-[11px] text-ink/45">{field.hint}</span>{/if}
                {#each itemRows(block[field.key]) as row, rowIndex (rowIndex)}
                  <div class="grid gap-3 rounded-[10px] border border-ink/10 bg-canvas p-3">
                    <div class="flex items-center justify-between">
                      <span class="text-[11px] font-bold uppercase tracking-wider text-ink/45">{rowIndex + 1}</span>
                      <button type="button" class="rounded p-1 text-ink/40 transition hover:text-red-600" aria-label="Remove" on:click={() => removeItem(index, field, rowIndex)}>
                        <X size={14} />
                      </button>
                    </div>
                    {#each field.fields ?? [] as sub (sub.key)}
                      {#if sub.kind === 'textarea'}
                        <AdminTextArea
                          label={sub.label}
                          name={`b${index}_${field.key}_${rowIndex}_${sub.key}`}
                          rows={2}
                          bind:value={blocks[index][field.key][rowIndex][sub.key]}
                        />
                      {:else if sub.kind === 'image'}
                        <MediaPicker
                          label={sub.label}
                          value={String(row[sub.key] ?? '')}
                          on:change={(event) => {
                            blocks[index][field.key][rowIndex][sub.key] = event.detail ?? '';
                            push();
                          }}
                        />
                      {:else if sub.kind === 'lines'}
                        <div class="grid gap-1">
                          <AdminTextArea
                            label={sub.label}
                            name={`b${index}_${field.key}_${rowIndex}_${sub.key}`}
                            rows={3}
                            bind:value={blocks[index][field.key][rowIndex][sub.key]}
                          />
                          <span class="text-[11px] text-ink/45">{sub.hint ?? 'One per line.'}</span>
                        </div>
                      {:else}
                        <AdminFormInput
                          label={sub.label}
                          name={`b${index}_${field.key}_${rowIndex}_${sub.key}`}
                          placeholder={sub.placeholder ?? ''}
                          bind:value={blocks[index][field.key][rowIndex][sub.key]}
                        />
                      {/if}
                    {/each}
                  </div>
                {/each}
                <button type="button" class="inline-flex h-9 w-fit items-center gap-1.5 rounded border border-ink/15 px-3 text-xs font-semibold text-heading transition hover:bg-sand/50" on:click={() => addItem(index, field)}>
                  <Plus size={13} /> Add
                </button>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </section>
  {/each}

  <div class="flex flex-wrap items-end gap-3 rounded-[12px] border border-dashed border-ink/20 p-4">
    <div class="min-w-[220px] flex-1">
      <AdminSelect
        label="Add a block"
        name="add_block_type"
        bind:value={addType}
        options={BLOCK_TYPES.map((spec) => ({ label: spec.label, value: spec.type }))}
      />
    </div>
    <button type="button" class="inline-flex h-11 items-center gap-1.5 rounded bg-goldfinch-gold px-4 text-sm font-bold text-heading transition hover:brightness-105" on:click={addBlock}>
      <Plus size={15} /> Add block
    </button>
  </div>
</div>
