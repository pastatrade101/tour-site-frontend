<script lang="ts">
  /**
   * The Advisor's Note — the same section wherever it appears: the homepage,
   * the tours listing, a safari-style page, About. Content comes from the one
   * `advisor_note` homepage section via advisorNoteProps(), so there is one
   * note to edit and one promise being made.
   */
  import { Check, Compass, SlidersHorizontal } from '@lucide/svelte';
  import { cdnUrl } from '$lib/img';
  import { t } from '$lib/i18n/ui';
  import en from '$lib/locales/en.json';
  import Img from '../Img.svelte';
  import RichText from '../RichText.svelte';
  import type { AdvisorColumn } from '$lib/advisorNote';

  /*
   * Every text prop defaults to `undefined`, meaning "nothing supplied", and
   * falls back to the note's own copy in the visitor's language. An empty
   * string is an editor's deliberate blank (see advisorNoteProps) and stays
   * blank.
   */
  export let eyebrow: string | undefined = undefined;
  export let title: string | undefined = undefined;
  export let body: string | undefined = undefined;
  export let imageUrl = '';
  export let authorName = 'Deo Robert';
  export let authorRole: string | undefined = undefined;
  export let footnote: string | undefined = undefined;
  export let columns: AdvisorColumn[] | undefined = undefined;

  const DEFAULT_COLUMNS = [
    {
      icon_url: '/images/icons-home/icon-big-choices.png',
      titleKey: 'home_advisor_note.big_choices',
      itemKeys: [
        'home_advisor_note.big_choice_when',
        'home_advisor_note.big_choice_places',
        'home_advisor_note.big_choice_combine',
        'home_advisor_note.big_choice_accommodation'
      ]
    },
    {
      icon_url: '/images/icons-home/icon-quiet-details.png',
      titleKey: 'home_advisor_note.quiet_details',
      itemKeys: [
        'home_advisor_note.quiet_detail_vehicle',
        'home_advisor_note.quiet_detail_coast',
        'home_advisor_note.quiet_detail_family',
        'home_advisor_note.quiet_detail_interests'
      ]
    }
  ];

  /*
   * The CMS keeps this note's lists in extra_data, which content translations
   * do not reach yet, and the live record still holds the default copy word for
   * word. A line that is exactly one of these defaults is still our own copy,
   * so it is shown in the visitor's language; anything an editor has rewritten
   * is shown as written.
   */
  const COPY_KEYS = [
    'home_advisor_note.eyebrow',
    'home_advisor_note.title',
    'home_advisor_note.body',
    'home_advisor_note.author_role',
    'home_advisor_note.footnote',
    ...DEFAULT_COLUMNS.flatMap((column) => [column.titleKey, ...column.itemKeys])
  ];
  const ENGLISH = en as Record<string, string>;
  const KEY_FOR_ENGLISH = new Map(
    COPY_KEYS.filter((key) => ENGLISH[key]).map((key) => [ENGLISH[key], key] as const)
  );

  $: localize = (value: string): string => {
    const key = value ? KEY_FOR_ENGLISH.get(value.trim()) : undefined;
    return key ? $t(key) : value;
  };

  $: eyebrowText = eyebrow === undefined ? $t('home_advisor_note.eyebrow') : localize(eyebrow);
  $: titleText = title === undefined ? $t('home_advisor_note.title') : localize(title);
  $: bodyText = body === undefined ? $t('home_advisor_note.body') : localize(body);
  $: authorRoleText = authorRole === undefined ? $t('home_advisor_note.author_role') : localize(authorRole);
  $: footnoteText = footnote === undefined ? $t('home_advisor_note.footnote') : localize(footnote);
  let sourceColumns: AdvisorColumn[] = [];
  $: sourceColumns =
    columns === undefined
      ? DEFAULT_COLUMNS.map((column) => ({
          icon_url: column.icon_url,
          title: $t(column.titleKey),
          items: column.itemKeys.map((key) => $t(key))
        }))
      : columns;

  const FALLBACK_ICONS = [Compass, SlidersHorizontal];
  const initials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'G';

  $: visibleColumns = (sourceColumns ?? [])
    .filter((column) => column?.title?.trim())
    .map((column) => ({
      ...column,
      title: localize(column.title),
      items: (column.items ?? []).filter((item) => item?.trim()).map((item) => localize(item))
    }))
    .filter((column) => column.items.length)
    .slice(0, 2);
</script>

<section class="home-advisor-note py-14 md:py-20">
  <div class="container-shell">
    <div class="grid overflow-hidden rounded-2xl shadow-[0_10px_32px_-12px_rgba(57,61,50,0.28)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div class="relative flex flex-col bg-[#393D32] p-9 md:p-11">
        <span class="font-serif text-7xl leading-[0.7] text-goldfinch-gold opacity-90" aria-hidden="true">“</span>
        {#if eyebrowText}
          <span class="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">{eyebrowText}</span>
        {/if}
        {#if titleText}
          <h2 class="mt-3 font-serif text-[28px] font-semibold leading-[1.15] text-white md:text-[30px]">{titleText}</h2>
        {/if}
        {#if bodyText}
          <RichText value={bodyText} className="mt-3.5 text-sm leading-relaxed text-white/70" />
        {/if}

        <div class="mt-8 flex items-center gap-3 border-t border-white/[0.14] pt-6 sm:mt-auto">
          {#if imageUrl}
            <Img
              src={imageUrl}
              alt={authorName}
              width={96}
              height={96}
              sizes="48px"
              className="h-12 w-12 shrink-0 rounded-full border-2 border-goldfinch-gold object-cover object-top"
            />
          {:else}
            <span class="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-goldfinch-gold bg-white/10 font-serif text-sm font-semibold text-white">
              {initials(authorName)}
            </span>
          {/if}
          <div>
            <div class="text-[13.5px] font-semibold text-white">{authorName}</div>
            <div class="mt-0.5 text-xs text-white/60">{authorRoleText}</div>
          </div>
        </div>
      </div>

      <div class="bg-canvas p-9 md:p-11">
        {#if visibleColumns.length}
          <div class="grid gap-9 sm:grid-cols-2">
            {#each visibleColumns as column, index (column.title)}
              {@const FallbackIcon = FALLBACK_ICONS[index % FALLBACK_ICONS.length]}
              <div>
                <div class="flex items-center gap-2.5">
                  {#if column.icon_url}
                    <img src={cdnUrl(column.icon_url)} alt="" loading="lazy" class="h-11 w-11 object-contain" />
                  {:else}
                    <span class="grid h-11 w-11 place-items-center text-clay"><FallbackIcon size={32} strokeWidth={1.4} /></span>
                  {/if}
                  <h3 class="font-serif text-lg font-semibold text-heading">{column.title}</h3>
                </div>
                <div class="mb-4 mt-2.5 h-[2px] w-7 bg-goldfinch-gold" aria-hidden="true"></div>
                <ul class="flex flex-col gap-4">
                  {#each column.items as item, itemIndex (itemIndex)}
                    <li class="flex gap-2.5 text-[13.5px] leading-relaxed text-ink/65">
                      <span class="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-goldfinch-gold bg-white">
                        <Check size={10} strokeWidth={3} class="text-clay" aria-hidden="true" />
                      </span>
                      <span>{item}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/each}
          </div>
        {/if}

        {#if footnoteText}
          <div class="mt-7 flex gap-1 border-t border-dashed border-[#E3DCCB] pt-5 font-serif text-[15px] italic text-heading">
            <span aria-hidden="true">“</span>
            <RichText value={footnoteText} />
            <span aria-hidden="true">”</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
</section>
