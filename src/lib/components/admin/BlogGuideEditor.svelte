<script lang="ts">
  /**
   * Builds a structured Travel Journal guide: an opening (quick answer, intro,
   * "At a glance"), sections made of blocks, and a closing call to action.
   * Every block form is generated from GUIDE_BLOCK_TYPES — the same list the
   * public renderer and the API sanitiser follow.
   */
  import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from '@lucide/svelte';
  import AdminFormInput from './AdminFormInput.svelte';
  import AdminLinkPicker from './AdminLinkPicker.svelte';
  import AdminRichText from './AdminRichText.svelte';
  import AdminTextArea from './AdminTextArea.svelte';
  import MediaPicker from './MediaPicker.svelte';
  import JournalIcon from '$lib/components/public/journal/JournalIcon.svelte';
  import {
    GUIDE_BLOCK_TYPES, GUIDE_ICON_NAMES, emptyGuideBlock, emptyGuideRow, emptySection, guideBlockSpec,
    type EditableGuide, type GuideBlockSpec, type GuideField
  } from '$lib/blogBlocks';
  import type { LinkGroup } from '$lib/internalLinks';

  type MediaItem = { file_name: string; file_url: string; id: string; thumbnail_url?: string | null };

  export let guide: EditableGuide;
  export let media: MediaItem[] = [];
  export let linkGroups: LinkGroup[] = [];
  export let linksLoading = false;

  let open: Record<string, boolean> = {};
  let addType: Record<string, string> = {};

  $: sections = guide.sections;
  const touch = () => { guide = guide; };

  const move = <T,>(list: T[], index: number, step: number) => {
    const target = index + step;
    if (target < 0 || target >= list.length) return list;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  };

  const addSection = () => {
    const section = emptySection();
    guide.sections = [...sections, section];
    open[section._id] = true;
  };
  // Removing takes two clicks: the first turns the bin into "Remove?" for
  // four seconds. (The browser's own confirm box is easy to click through and
  // some browsers suppress it.)
  let armed = '';
  let armTimer: ReturnType<typeof setTimeout> | undefined;
  const confirmThen = (key: string, action: () => void) => {
    clearTimeout(armTimer);
    if (armed !== key) {
      armed = key;
      armTimer = setTimeout(() => (armed = ''), 4000);
      return;
    }
    armed = '';
    action();
  };

  const removeSection = (index: number) =>
    confirmThen(`s:${sections[index]._id}`, () => { guide.sections = sections.filter((_, i) => i !== index); });
  const moveSection = (index: number, step: number) => { guide.sections = move(sections, index, step); };

  const addBlock = (sectionIndex: number) => {
    const section = sections[sectionIndex];
    const type = addType[section._id] || 'text';
    section.blocks = [...section.blocks, emptyGuideBlock(type)];
    touch();
  };
  const removeBlock = (sectionIndex: number, blockIndex: number) => {
    const section = sections[sectionIndex];
    confirmThen(`b:${section.blocks[blockIndex]._id}`, () => {
      section.blocks = section.blocks.filter((_, i) => i !== blockIndex);
      touch();
    });
  };
  const moveBlock = (sectionIndex: number, blockIndex: number, step: number) => {
    sections[sectionIndex].blocks = move(sections[sectionIndex].blocks, blockIndex, step);
    touch();
  };

  const rowsOf = (value: unknown): Record<string, any>[] => (Array.isArray(value) ? value : []);
  const addRow = (block: Record<string, any>, spec: GuideBlockSpec) => {
    block[spec.items!.key] = [...rowsOf(block[spec.items!.key]), emptyGuideRow(spec)];
    touch();
  };
  const removeRow = (block: Record<string, any>, spec: GuideBlockSpec, rowIndex: number) => {
    block[spec.items!.key] = rowsOf(block[spec.items!.key]).filter((_, i) => i !== rowIndex);
    touch();
  };
  const moveRow = (block: Record<string, any>, spec: GuideBlockSpec, rowIndex: number, step: number) => {
    block[spec.items!.key] = move(rowsOf(block[spec.items!.key]), rowIndex, step);
    touch();
  };

  const linesText = (value: unknown) => (Array.isArray(value) ? value.join('\n') : '');
  const toLines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean);
  const setLines = (target: Record<string, any>, key: string, event: Event) => {
    target[key] = toLines((event.currentTarget as HTMLTextAreaElement).value);
    touch();
  };
  const cellCount = (block: Record<string, any>, row: Record<string, any>) =>
    Math.max(Array.isArray(block.head) ? block.head.length : 0, rowsOf(row.cells).length, 2);
  const setCell = (row: Record<string, any>, index: number, event: Event) => {
    const cells = [...(Array.isArray(row.cells) ? row.cells : [])];
    cells[index] = (event.currentTarget as HTMLInputElement).value;
    row.cells = cells;
    touch();
  };
  const setValue = (target: Record<string, any>, key: string, value: unknown) => {
    target[key] = value;
    touch();
  };

  $: takeawaysText = linesText(guide.takeaways);
  const field = 'h-10 w-full rounded-md border border-ink/15 bg-surface px-3 text-sm text-heading outline-none transition focus:border-goldfinch-gold focus:ring-2 focus:ring-goldfinch-gold/20';
  const sectionTitle = (title: string, index: number) => title.trim() || `Untitled section ${index + 1}`;
</script>

<div class="grid gap-6">
  <!-- Opening -->
  <div class="grid gap-4 rounded-[10px] border border-ink/10 bg-canvas/40 p-5">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Opening</p>
      <p class="mt-1 text-sm text-ink/60">Shown under the title, before the main photo.</p>
    </div>
    <AdminTextArea label="Quick answer" name="guide_quick_answer" bind:value={guide.quick_answer} rows={3} placeholder="The short, direct answer to the question in the title." />
    <AdminRichText label="Introduction" name="guide_intro" bind:value={guide.intro} rows={6} headings="none" />
    <label class="grid gap-2 text-sm font-medium text-ink">
      <span>At a glance <span class="font-normal text-ink/50">— one point per line, shown numbered</span></span>
      <textarea class="min-h-[96px] rounded-md border border-ink/15 bg-surface px-3 py-2 text-sm outline-none focus:border-goldfinch-gold" value={takeawaysText} on:change={(event) => { guide.takeaways = toLines(event.currentTarget.value); }}></textarea>
    </label>
  </div>

  <!-- Sections -->
  <div class="grid gap-3">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Sections</p>
        <p class="mt-1 text-sm text-ink/60">Each section is an H2 with its own entry in "On this page".</p>
      </div>
      <button type="button" class="inline-flex items-center gap-1.5 rounded-md bg-deep-green px-3 py-2 text-sm font-semibold text-white hover:bg-forest" on:click={addSection}><Plus size={15} />Add section</button>
    </div>

    {#if !sections.length}
      <p class="rounded-[10px] border border-dashed border-ink/20 p-6 text-center text-sm text-ink/60">No sections yet. Add the first one to start the guide.</p>
    {/if}

    {#each sections as section, sectionIndex (section._id)}
      <div class="rounded-[10px] border border-ink/10 bg-surface">
        <div class="flex items-center gap-2 px-4 py-3">
          <button type="button" class="flex min-w-0 flex-1 items-center gap-2 text-left" on:click={() => (open[section._id] = !open[section._id])} aria-expanded={!!open[section._id]}>
            <ChevronDown size={16} class="shrink-0 transition-transform {open[section._id] ? 'rotate-180' : ''}" />
            <span class="text-xs font-bold text-ink/40">{sectionIndex + 1}</span>
            <span class="truncate font-semibold text-heading">{sectionTitle(section.title, sectionIndex)}</span>
            <span class="shrink-0 text-xs text-ink/45">{section.blocks.length} block{section.blocks.length === 1 ? '' : 's'}</span>
          </button>
          <button type="button" class="rounded p-1.5 text-ink/50 hover:bg-canvas disabled:opacity-30" title="Move up" disabled={sectionIndex === 0} on:click={() => moveSection(sectionIndex, -1)}><ArrowUp size={15} /></button>
          <button type="button" class="rounded p-1.5 text-ink/50 hover:bg-canvas disabled:opacity-30" title="Move down" disabled={sectionIndex === sections.length - 1} on:click={() => moveSection(sectionIndex, 1)}><ArrowDown size={15} /></button>
          <button type="button" class="rounded p-1.5 text-red-600/70 hover:bg-red-50 {armed === `s:${section._id}` ? 'bg-red-600 px-2 text-xs font-semibold text-white hover:bg-red-700' : ''}" title="Remove section" aria-label={armed === `s:${section._id}` ? 'Click again to remove this section' : 'Remove section'} on:click={() => removeSection(sectionIndex)}>{#if armed === `s:${section._id}`}Remove?{:else}<Trash2 size={15} />{/if}</button>
        </div>

        {#if open[section._id]}
          <div class="grid gap-4 border-t border-ink/10 p-4">
            <div class="grid gap-4 md:grid-cols-[2fr_1fr]">
              <AdminFormInput label="Section heading (H2)" name="section_title_{section._id}" bind:value={section.title} placeholder="What exactly are you paying for?" />
              <AdminFormInput label="Short name in “On this page” (optional)" name="section_toc_{section._id}" bind:value={section.toc_label} placeholder="Cost components" />
            </div>

            {#each section.blocks as block, blockIndex (block._id)}
              {@const spec = guideBlockSpec(block.type)}
              <div class="rounded-md border border-ink/10 bg-canvas/40 p-4">
                <div class="mb-3 flex items-center gap-2">
                  <span class="rounded bg-sand px-2 py-0.5 text-xs font-bold text-heading">{spec?.label ?? block.type}</span>
                  <span class="min-w-0 flex-1 truncate text-xs text-ink/50">{spec?.blurb ?? ''}</span>
                  <button type="button" class="rounded p-1 text-ink/50 hover:bg-surface disabled:opacity-30" title="Move up" disabled={blockIndex === 0} on:click={() => moveBlock(sectionIndex, blockIndex, -1)}><ArrowUp size={14} /></button>
                  <button type="button" class="rounded p-1 text-ink/50 hover:bg-surface disabled:opacity-30" title="Move down" disabled={blockIndex === section.blocks.length - 1} on:click={() => moveBlock(sectionIndex, blockIndex, 1)}><ArrowDown size={14} /></button>
                  <button type="button" class="rounded p-1 text-red-600/70 hover:bg-red-50 {armed === `b:${block._id}` ? 'bg-red-600 px-2 text-xs font-semibold text-white hover:bg-red-700' : ''}" title="Remove block" aria-label={armed === `b:${block._id}` ? 'Click again to remove this block' : 'Remove block'} on:click={() => removeBlock(sectionIndex, blockIndex)}>{#if armed === `b:${block._id}`}Remove?{:else}<Trash2 size={14} />{/if}</button>
                </div>

                {#if spec}
                  <div class="grid gap-3">
                    {#each spec.fields as f (f.key)}
                      {@const fieldSpec = f as GuideField}
                      {#if fieldSpec.kind === 'rich'}
                        <AdminRichText label={fieldSpec.label} name="{block._id}_{fieldSpec.key}" bind:value={block[fieldSpec.key]} rows={8} headings="h3" hint={fieldSpec.hint ?? ''} />
                      {:else if fieldSpec.kind === 'textarea'}
                        <AdminTextArea label={fieldSpec.label} name="{block._id}_{fieldSpec.key}" bind:value={block[fieldSpec.key]} rows={3} placeholder={fieldSpec.placeholder ?? ''} />
                      {:else if fieldSpec.kind === 'lines'}
                        <label class="grid gap-2 text-sm font-medium text-ink">
                          <span>{fieldSpec.label}{#if fieldSpec.hint}<span class="font-normal text-ink/50"> — {fieldSpec.hint}</span>{/if}</span>
                          <textarea class="min-h-[84px] rounded-md border border-ink/15 bg-surface px-3 py-2 text-sm outline-none focus:border-goldfinch-gold" value={linesText(block[fieldSpec.key])} on:change={(event) => setLines(block, fieldSpec.key, event)}></textarea>
                        </label>
                      {:else if fieldSpec.kind === 'image'}
                        <MediaPicker label={fieldSpec.label} {media} uploadFolder="blog" bind:value={block[fieldSpec.key]} />
                      {:else if fieldSpec.kind === 'href'}
                        <div class="grid gap-2 text-sm font-medium text-ink">
                          <span>{fieldSpec.label}{#if fieldSpec.hint}<span class="font-normal text-ink/50"> — {fieldSpec.hint}</span>{/if}</span>
                          <AdminLinkPicker value={block[fieldSpec.key] ?? ''} groups={linkGroups} loading={linksLoading} on:change={(event) => setValue(block, fieldSpec.key, event.detail)} />
                        </div>
                      {:else}
                        <AdminFormInput label={fieldSpec.label} name="{block._id}_{fieldSpec.key}" bind:value={block[fieldSpec.key]} placeholder={fieldSpec.placeholder ?? ''} />
                      {/if}
                    {/each}

                    {#if spec.items}
                      {@const list = spec.items}
                      <div class="grid gap-2">
                        {#each rowsOf(block[list.key]) as row, rowIndex (row._id)}
                          <div class="grid gap-2 rounded-md border border-ink/10 bg-surface p-3">
                            <div class="flex items-center gap-2">
                              <span class="flex-1 text-xs font-bold uppercase tracking-wide text-ink/50">{list.label} {rowIndex + 1}</span>
                              <button type="button" class="rounded p-1 text-ink/50 hover:bg-canvas disabled:opacity-30" title="Move up" disabled={rowIndex === 0} on:click={() => moveRow(block, spec, rowIndex, -1)}><ArrowUp size={13} /></button>
                              <button type="button" class="rounded p-1 text-ink/50 hover:bg-canvas disabled:opacity-30" title="Move down" disabled={rowIndex === rowsOf(block[list.key]).length - 1} on:click={() => moveRow(block, spec, rowIndex, 1)}><ArrowDown size={13} /></button>
                              <button type="button" class="rounded p-1 text-red-600/70 hover:bg-red-50" title="Remove" on:click={() => removeRow(block, spec, rowIndex)}><Trash2 size={13} /></button>
                            </div>
                            {#each list.fields as rf (rf.key)}
                              {#if rf.kind === 'cells'}
                                <div class="grid gap-2" style="grid-template-columns: repeat({cellCount(block, row)}, minmax(0, 1fr));">
                                  {#each Array.from({ length: cellCount(block, row) }) as _, cellIndex (cellIndex)}
                                    <input class={field} aria-label={(Array.isArray(block.head) && block.head[cellIndex]) || `Column ${cellIndex + 1}`} placeholder={(Array.isArray(block.head) && block.head[cellIndex]) || `Column ${cellIndex + 1}`} value={rowsOf(row.cells)[cellIndex] ?? ''} on:change={(event) => setCell(row, cellIndex, event)} />
                                  {/each}
                                </div>
                              {:else if rf.kind === 'rich'}
                                <AdminRichText label={rf.label} name="{row._id}_{rf.key}" bind:value={row[rf.key]} rows={5} headings="none" compact />
                              {:else if rf.kind === 'icon'}
                                <div class="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={rf.label}>
                                  {#each GUIDE_ICON_NAMES as icon (icon)}
                                    <button type="button" role="radio" aria-checked={row[rf.key] === icon} title={icon} class="grid size-9 place-items-center rounded-md border {row[rf.key] === icon ? 'border-goldfinch-gold bg-goldfinch-gold/15 text-heading' : 'border-ink/10 text-ink/55 hover:bg-canvas'}" on:click={() => setValue(row, rf.key, icon)}><JournalIcon name={icon} size={16} /></button>
                                  {/each}
                                </div>
                              {:else if rf.kind === 'href'}
                                <AdminLinkPicker value={row[rf.key] ?? ''} groups={linkGroups} loading={linksLoading} on:change={(event) => setValue(row, rf.key, event.detail)} />
                              {:else}
                                <AdminFormInput label={rf.label} name="{row._id}_{rf.key}" bind:value={row[rf.key]} />
                              {/if}
                            {/each}
                          </div>
                        {/each}
                        <button type="button" class="inline-flex w-fit items-center gap-1.5 rounded-md border border-ink/15 px-3 py-1.5 text-sm font-semibold text-heading hover:bg-surface" on:click={() => addRow(block, spec)}><Plus size={14} />Add {list.label.toLowerCase()}</button>
                      </div>
                    {/if}
                  </div>
                {:else}
                  <p class="text-sm text-ink/60">This block type is no longer available; it will not be shown on the site.</p>
                {/if}
              </div>
            {/each}

            <div class="flex flex-wrap items-center gap-2">
              <select class="{field} w-auto" bind:value={addType[section._id]} aria-label="Block type to add">
                {#each GUIDE_BLOCK_TYPES as type (type.type)}<option value={type.type}>{type.label}</option>{/each}
              </select>
              <button type="button" class="inline-flex items-center gap-1.5 rounded-md border border-ink/15 px-3 py-2 text-sm font-semibold text-heading hover:bg-canvas" on:click={() => addBlock(sectionIndex)}><Plus size={14} />Add block</button>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Closing -->
  <div class="grid gap-4 rounded-[10px] border border-ink/10 bg-canvas/40 p-5">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Closing box</p>
        <p class="mt-1 text-sm text-ink/60">The call to action after the last section. Leave the heading empty to use the standard "Ready to plan your trip?" box.</p>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <AdminFormInput label="Heading" name="cta_heading" bind:value={guide.final_cta.heading} placeholder="Find a safari that fits your budget" />
        <AdminFormInput label="Button" name="cta_button" bind:value={guide.final_cta.button} placeholder="Plan My Trip" />
      </div>
      <AdminTextArea label="Text" name="cta_text" bind:value={guide.final_cta.text} rows={2} />
      <div class="grid gap-4 md:grid-cols-2">
        <div class="grid gap-2 text-sm font-medium text-ink"><span>Button link <span class="font-normal text-ink/50">— empty opens Plan My Trip</span></span>
          <AdminLinkPicker value={guide.final_cta.href ?? ''} groups={linkGroups} loading={linksLoading} on:change={(event) => { guide.final_cta.href = event.detail; }} />
        </div>
        <div class="grid gap-2 text-sm font-medium text-ink"><span>Second link (optional)</span>
          <AdminLinkPicker value={guide.final_cta.secondary_href ?? ''} groups={linkGroups} loading={linksLoading} on:change={(event) => { guide.final_cta.secondary_href = event.detail; }} />
        </div>
      </div>
      <AdminFormInput label="Second link text" name="cta_secondary_label" bind:value={guide.final_cta.secondary_label} placeholder="Explore safaris from Zanzibar" />
  </div>
</div>
