<script lang="ts">
  /**
   * Draws one block of a structured guide. The vocabulary matches the editor
   * ($lib/blogBlocks) and the API's sanitiser (backend utils/blog-guide.ts);
   * an unknown type, or a block with nothing in it, renders nothing.
   */
  import { ArrowRight, Check, ChevronDown, Compass } from '@lucide/svelte';
  import { t } from '$lib/i18n/ui';
  import { hasRichContent } from '$lib/richText';
  import { isExternal } from '$lib/journal';
  import type { BlogGuideBlock } from '$lib/types';
  import Img from '../Img.svelte';
  import RichText from '../RichText.svelte';
  import JournalIcon from './JournalIcon.svelte';

  export let block: BlogGuideBlock;

  type Row = Record<string, any> & { _id?: string };
  const rows = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : []);
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const lines = (value: unknown) => (Array.isArray(value) ? value.map(String).filter((line) => line.trim()) : []);

  $: type = block?.type;
  $: head = lines(block.head);
  $: tableRows = rows(block.rows).map((row) => lines(row.cells)).filter((cells) => cells.length);
  $: items = rows(block.items);
  $: links = rows(block.items).filter((row) => text(row.label) && text(row.href));
  $: checks = lines(block.items);
  $: checkName = `check-${block._id}`;
</script>

{#if type === 'text' && hasRichContent(block.body)}
  <RichText value={block.body} />
{:else if type === 'table' && tableRows.length}
  <figure class="journal-table my-6">
    <table class="hidden w-full table-fixed border-collapse text-left text-[16px] md:table">
      {#if text(block.caption)}<caption class="sr-only">{block.caption}</caption>{/if}
      {#if head.length}
        <thead class="bg-canvas"><tr>{#each head as cell, i (i)}<th scope="col" class="border-b-2 border-ink/10 px-4 py-4 align-top text-sm font-semibold text-heading">{cell}</th>{/each}</tr></thead>
      {/if}
      <tbody>
        {#each tableRows as cells, r (r)}
          <tr>
            {#each cells as cell, i (i)}
              {#if i === 0}<th scope="row" class="border-b border-ink/10 px-4 py-5 align-top font-semibold leading-relaxed text-heading">{cell}</th>
              {:else}<td class="border-b border-ink/10 px-4 py-5 align-top leading-relaxed">{cell}</td>{/if}
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
    <!-- Phones read each row as a small card instead of a squeezed table. -->
    <div class="divide-y divide-ink/10 border-y border-ink/10 md:hidden">
      {#each tableRows as cells, r (r)}
        <div class="py-4">
          <h3 class="mb-3 font-serif text-[19px] font-semibold text-heading">{cells[0]}</h3>
          <dl class="space-y-3">
            {#each cells.slice(1) as cell, i (i)}
              <div><dt class="text-[13px] font-semibold text-heading">{head[i + 1] ?? ''}</dt><dd class="mt-1">{cell}</dd></div>
            {/each}
          </dl>
        </div>
      {/each}
    </div>
    {#if text(block.caption) || text(block.note)}
      <figcaption class="mt-3 text-[14px] italic leading-relaxed text-ink/60">{text(block.note) || block.caption}</figcaption>
    {/if}
  </figure>
{:else if type === 'advisor_note' && text(block.body)}
  <aside class="my-7 border-l-2 border-heading/70 bg-canvas px-5 py-5 md:px-6">
    <div class="mb-2 flex items-center gap-2 text-heading"><Compass size={16} aria-hidden="true" /><span class="text-xs font-semibold uppercase tracking-[0.12em]">{text(block.label) || $t('journal.advisor_note')}</span></div>
    <p class="text-[16px] leading-[1.75] text-ink/75">{block.body}</p>
    {#if text(block.attribution)}<p class="mt-3 text-sm text-ink/60">— {block.attribution}</p>{/if}
  </aside>
{:else if type === 'pullquote' && text(block.text)}
  <blockquote class="my-8 border-l-2 border-goldfinch-gold pl-5 font-serif text-[21px] font-medium leading-relaxed text-heading md:text-[23px]">{block.text}</blockquote>
{:else if type === 'image' && text(block.image_url)}
  <figure class="my-7">
    <Img src={block.image_url} alt={text(block.alt)} width={1200} sizes="(max-width: 900px) 92vw, 820px" className="aspect-[16/10] w-full rounded-[10px] object-cover" />
    {#if text(block.caption)}<figcaption class="mt-2 text-[13px] text-ink/60">{block.caption}</figcaption>{/if}
  </figure>
{:else if type === 'icon_list' && items.some((item) => text(item.label))}
  <div class="my-6">
    {#if text(block.title)}<p class="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-heading">{block.title}</p>{/if}
    <ul class="grid gap-x-6 gap-y-3 border-y border-ink/10 py-5 sm:grid-cols-2">
      {#each items.filter((item) => text(item.label)) as item (item._id)}
        <li class="flex items-start gap-3 text-[15px] font-medium text-heading"><JournalIcon name={item.icon} size={17} class="mt-0.5 shrink-0 text-ink/55" /><span>{item.label}</span></li>
      {/each}
    </ul>
  </div>
{:else if type === 'questions' && items.some((item) => text(item.title))}
  <ol class="my-6 divide-y divide-ink/10 border-y border-ink/10">
    {#each items.filter((item) => text(item.title)) as item (item._id)}
      <li class="flex gap-3 py-5">
        <Check size={17} class="mt-1.5 shrink-0 text-heading" aria-hidden="true" />
        <div class="min-w-0"><h3 class="mb-2 font-serif text-[19px] font-semibold text-heading md:text-[21px]">{item.title}</h3><RichText value={item.body} /></div>
      </li>
    {/each}
  </ol>
{:else if type === 'steps' && items.some((item) => text(item.title))}
  <ol class="my-8">
    {#each items.filter((item) => text(item.title)) as item, i (item._id)}
      <li class="relative grid grid-cols-[36px_minmax(0,1fr)] gap-4 pb-10 last:pb-0 md:gap-5">
        {#if i < items.filter((entry) => text(entry.title)).length - 1}<span class="absolute bottom-0 left-[18px] top-11 border-l border-ink/15" aria-hidden="true"></span>{/if}
        <span class="mt-0.5 flex size-9 items-center justify-center rounded-full bg-heading text-base font-semibold text-white" aria-hidden="true">{i + 1}</span>
        <div class="min-w-0"><h3 class="mb-3 font-serif text-[19px] font-semibold text-heading md:text-[21px]">{item.title}</h3><RichText value={item.body} /></div>
      </li>
    {/each}
  </ol>
{:else if type === 'comparison' && items.some((item) => text(item.title))}
  {@const options = items.filter((item) => text(item.title))}
  <div class="my-7 border-y border-ink/10 {options.length === 2 ? 'grid md:grid-cols-2 md:gap-x-8' : ''}">
    {#each options as item, i (item._id)}
      <div class="py-6 {i > 0 ? 'border-t border-ink/10' : ''} {options.length === 2 ? 'md:border-t-0' : 'md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-6'}">
        <h3 class="mb-3 font-serif text-[19px] font-semibold text-heading md:mb-0">{item.title}</h3>
        <div class={options.length === 2 ? 'md:mt-3' : ''}><RichText value={item.body} /></div>
      </div>
    {/each}
  </div>
{:else if type === 'checkboxes' && checks.length}
  <fieldset class="my-6 border-y border-ink/10 py-5">
    <legend class="px-1 text-sm font-semibold text-heading">{text(block.title) || $t('journal.checklist')}</legend>
    <div class="grid gap-x-6 gap-y-1 md:grid-cols-2">
      {#each checks as item, i (i)}
        <label class="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-[16px] font-normal normal-case leading-relaxed tracking-normal">
          <input type="checkbox" name={checkName} class="mt-1.5 size-4 shrink-0 accent-[rgb(var(--c-heading))]" />
          <span class="min-w-0">{item}</span>
        </label>
      {/each}
    </div>
  </fieldset>
{:else if type === 'faq' && items.some((item) => text(item.question))}
  <div class="my-6 divide-y divide-ink/10 rounded-[12px] border border-ink/10">
    {#each items.filter((item) => text(item.question)) as item (item._id)}
      <details class="group px-5 py-1">
        <summary class="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-[16px] font-semibold text-heading [&::-webkit-details-marker]:hidden">
          {item.question}<ChevronDown size={16} class="shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div class="pb-4"><RichText value={item.answer} /></div>
      </details>
    {/each}
  </div>
{:else if type === 'cta' && text(block.heading)}
  <aside class="my-8 rounded-[12px] border border-ink/10 bg-canvas p-5 md:p-6">
    <h3 class="font-serif text-[19px] font-semibold text-heading">{block.heading}</h3>
    {#if text(block.text)}<p class="mt-1.5 text-[15.5px] leading-relaxed text-ink/70">{block.text}</p>{/if}
    <a
      href={text(block.href) || '/plan-my-trip'}
      target={isExternal(text(block.href)) ? '_blank' : undefined}
      rel={isExternal(text(block.href)) ? 'noopener noreferrer' : undefined}
      class="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-goldfinch-gold px-5 py-3 text-[15px] font-semibold text-heading transition-colors hover:bg-gold-hover sm:w-auto"
    >{text(block.button) || $t('cta.plan_my_trip')}<ArrowRight size={16} /></a>
  </aside>
{:else if type === 'links' && links.length}
  <aside class="my-6 border-l-[3px] border-goldfinch-gold pl-4">
    {#if text(block.text)}<p class="text-[16px] text-heading">{block.text}</p>{/if}
    <div class="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[15px]">
      {#each links as link (link._id)}
        <a href={link.href} target={isExternal(link.href) ? '_blank' : undefined} rel={isExternal(link.href) ? 'noopener noreferrer' : undefined} class="inline-flex items-center gap-1 font-semibold text-clay hover:underline">{link.label}<ArrowRight size={14} /></a>
      {/each}
    </div>
  </aside>
{/if}
