<script lang="ts">
  /**
   * The safari-style page, as a form.
   *
   * This content was previously edited as raw JSON in a code box. It produced a
   * correct document and asked a travel operator to be a programmer to get
   * there: one missing comma and the page would not publish, with an error
   * naming a key rather than a thing on the page.
   *
   * Same document, written in plain fields. Every group below is one band on
   * the public page, in the order a visitor scrolls past it, and each is
   * described by what it does rather than what it is called in the data.
   *
   * The JSON has not gone anywhere — it is the last section, collapsed, for
   * pasting a page in wholesale or checking what was produced.
   */
  import { afterUpdate, createEventDispatcher } from 'svelte';
  import { AlertTriangle, Braces, Check, ChevronDown, Copy, GripVertical, Plus, Sparkles, X } from '@lucide/svelte';
  import AdminRichText from './AdminRichText.svelte';
  import {
    defaultStyleLandingContent,
    parseStyleLandingJson,
    styleLandingContentErrors,
    type StyleLandingContent
  } from '$lib/safariStyleLanding';

  /** The document, as the JSON string the parent form already stores. */
  export let json = '';
  /**
   * Everything the operator has already typed about this style. A generated
   * template is built from it, so it reads as a page about THIS safari rather
   * than a generic one to be rewritten.
   */
  export let seed: Record<string, unknown> = {};

  const dispatch = createEventDispatcher<{ change: string; toast: { message: string; tone: 'success' | 'error' } }>();

  let content: StyleLandingContent = defaultStyleLandingContent(seed);
  let showJson = false;
  let lastPushed = '';

  /**
   * Parse whatever the parent holds into an editable object.
   *
   * Only re-reads when the string changed from outside — otherwise every
   * keystroke would round-trip through JSON and reset the caret.
   */
  $: if (json !== lastPushed) {
    const parsed = parseStyleLandingJson(json);
    if (parsed.data) content = parsed.data;
    else if (!json.trim()) content = defaultStyleLandingContent(seed);
    lastPushed = json;
  }

  /**
   * Serialise on ANY change to the document, not only on inputs that remember
   * to call push().
   *
   * The rich-text fields propagate through bind:value rather than events, so an
   * explicit handler on them does nothing — their edits would reach `content`
   * and never reach the JSON that actually gets saved. Watching the object
   * itself covers every field the same way.
   */
  // Deliberately afterUpdate rather than a reactive statement: `json` feeds
  // `content` above, so serialising reactively would close the loop and Svelte
  // refuses to compile it. Running after the update breaks the cycle, and the
  // equality check stops the write from causing another pass.
  afterUpdate(() => {
    const next = JSON.stringify(content, null, 2);
    if (next !== lastPushed) {
      lastPushed = next;
      json = next;
      dispatch('change', next);
    }
  });

  /** Kept so list edits mutate-then-notify in one step. */
  const push = () => {
    content = content;
  };

  $: errors = styleLandingContentErrors(content);
  $: ready = errors.length === 0;

  const generate = () => {
    content = defaultStyleLandingContent(seed);
    push();
    dispatch('toast', { message: 'Filled in with a complete starting page. Edit the wording before publishing.', tone: 'success' });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
      dispatch('toast', { message: 'Page content copied.', tone: 'success' });
    } catch {
      dispatch('toast', { message: 'Could not copy to the clipboard.', tone: 'error' });
    }
  };

  // ── List helpers ────────────────────────────────────────────────────────
  //
  // Several of these lists are exactly-four by contract — the layout has four
  // slots and renders four. A fifth does not appear on the page and blocks
  // publishing with an error naming an array index, which is precisely the
  // experience this editor exists to remove. So the buttons enforce it instead
  // of letting someone find out at save time.
  const EXACT_FOUR = 4;

  const addTo = (list: unknown[], item: unknown, max?: number) => {
    if (max !== undefined && list.length >= max) return;
    list.push(item);
    content = content;
    push();
  };
  const removeAt = (list: unknown[], index: number, min = 0) => {
    if (list.length <= min) return;
    list.splice(index, 1);
    content = content;
    push();
  };

  /** "3 of 4" — so the requirement is visible before it is violated. */
  const countLabel = (have: number, need: number) =>
    have === need ? `${need} of ${need}` : `${have} of ${need} — ${have < need ? 'add ' + (need - have) : 'remove ' + (have - need)}`;

  /**
   * Which sections are still missing something.
   *
   * Derived from the same validator that blocks publishing, so the badge on a
   * section and the reason publishing is refused can never disagree.
   */
  const SECTION_KEYS: Record<string, string[]> = {
    hero: ['hero'],
    trust: ['trustChips'],
    overview: ['overview'],
    planner: ['planner'],
    tours: ['tourCollection'],
    guide: ['planningGuide'],
    advisor: ['advisor'],
    steps: ['howItsPlanned'],
    reviews: ['reviews'],
    faq: ['faq'],
    cta: ['finalCta']
  };
  $: incomplete = (key: string) =>
    errors.some((e) => (SECTION_KEYS[key] ?? []).some((prefix) => e.toLowerCase().includes(prefix.toLowerCase())));

  /**
   * How many SECTIONS need work, not how many validation lines failed.
   *
   * One empty hero produces six errors and is still one thing to go and fix;
   * saying "6 sections need filling in" when there are only eleven sections in
   * total reads as far worse than it is.
   */
  $: sectionsIncomplete = Object.keys(SECTION_KEYS).filter((key) => incomplete(key)).length;

  let open: Record<string, boolean> = { hero: true };
  const toggle = (key: string) => (open = { ...open, [key]: !open[key] });

  const field = 'h-10 w-full min-w-0 rounded-md border border-ink/15 bg-surface px-3 text-sm text-heading outline-none transition focus:border-goldfinch-gold focus:ring-2 focus:ring-goldfinch-gold/20';
  const area = 'w-full rounded-md border border-ink/15 bg-surface px-3 py-2.5 text-sm leading-6 text-heading outline-none transition focus:border-goldfinch-gold focus:ring-2 focus:ring-goldfinch-gold/20';
  const label = 'text-[13px] font-semibold text-ink/65';
  const hint = 'text-[11px] leading-5 text-ink/45';
</script>

<section class="grid gap-3 rounded-[8px] border border-goldfinch-gold/35 bg-goldfinch-gold/[0.06] p-4">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <Sparkles size={17} class="text-forest" />
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">The page visitors see</p>
      </div>
      <p class="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
        Each section below is one band on the safari-style page, in the order someone scrolls past it. Fill in the wording; the page
        builds itself. Everything is required before this style can be published.
      </p>
    </div>
    <div class="flex shrink-0 flex-wrap gap-2">
      <button
        class="inline-flex h-10 items-center gap-2 rounded-md border border-forest/25 bg-surface px-3 text-xs font-bold text-forest transition hover:bg-sand/60"
        type="button"
        on:click={generate}><Sparkles size={14} /> Start from a template</button
      >
      <button
        class="inline-flex h-10 items-center gap-2 rounded-md border border-ink/10 bg-surface px-3 text-xs font-bold text-ink transition hover:bg-sand/60"
        type="button"
        on:click={copy}><Copy size={14} /> Copy</button
      >
    </div>
  </div>

  <!-- Status, in terms of what is missing rather than which key failed. -->
  <div
    class={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-xs ${ready ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}
  >
    {#if ready}
      <Check size={15} class="mt-0.5 shrink-0" />
      <span>Every section is filled in. This style is ready to publish.</span>
    {:else}
      <AlertTriangle size={15} class="mt-0.5 shrink-0" />
      <span>
        <strong>{sectionsIncomplete} {sectionsIncomplete === 1 ? 'section still needs' : 'sections still need'} filling in</strong>
        before this can be published. They are marked below.
      </span>
    {/if}
  </div>

  <div class="grid gap-2">
    <!-- ── Hero ─────────────────────────────────────────────────────────── -->
    <div class="overflow-hidden rounded-md border border-ink/12 bg-surface">
      <button class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sand/30" type="button" on:click={() => toggle('hero')}>
        <ChevronDown size={16} class={`shrink-0 text-ink/40 transition ${open.hero ? 'rotate-180' : ''}`} />
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-bold text-heading">1 · The big opening</span>
          <span class="block text-[11px] text-ink/50">The full-screen image, headline and two buttons at the top.</span>
        </span>
        {#if incomplete('hero')}<span class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Needs filling</span>{/if}
      </button>
      {#if open.hero}
        <div class="grid gap-3 border-t border-ink/10 p-4">
          <label class="grid gap-1.5">
            <span class={label}>Small line above the headline</span>
            <input class={field} bind:value={content.hero.eyebrow} on:input={push} placeholder="e.g. Fly-in safaris from Zanzibar" />
          </label>
          <label class="grid gap-1.5">
            <span class={label}>Headline</span>
            <input class={field} bind:value={content.hero.headline} on:input={push} placeholder="The biggest words on the page" />
          </label>
          <label class="grid gap-1.5">
            <span class={label}>Sentence underneath</span>
            <textarea class={area} rows="2" bind:value={content.hero.subheadline} on:input={push}></textarea>
          </label>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="grid gap-1.5">
              <span class={label}>Main button</span>
              <input class={field} bind:value={content.hero.primaryCtaLabel} on:input={push} placeholder="Plan my safari" />
            </label>
            <label class="grid gap-1.5">
              <span class={label}>Second button</span>
              <input class={field} bind:value={content.hero.secondaryCtaLabel} on:input={push} placeholder="See the trips" />
            </label>
          </div>
          <label class="grid gap-1.5">
            <span class={label}>Reassurance line</span>
            <input class={field} bind:value={content.hero.trustLine} on:input={push} placeholder="e.g. No deposit to talk to us" />
            <span class={hint}>Small print under the buttons.</span>
          </label>
        </div>
      {/if}
    </div>

    <!-- ── Trust chips ──────────────────────────────────────────────────── -->
    <div class="overflow-hidden rounded-md border border-ink/12 bg-surface">
      <button class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sand/30" type="button" on:click={() => toggle('trust')}>
        <ChevronDown size={16} class={`shrink-0 text-ink/40 transition ${open.trust ? 'rotate-180' : ''}`} />
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-bold text-heading">2 · Reasons to trust you</span>
          <span class="block text-[11px] text-ink/50">Four short badges under the hero. Four words each, not sentences.</span>
        </span>
        {#if incomplete('trust')}<span class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Needs filling</span>{/if}
      </button>
      {#if open.trust}
        <div class="grid gap-2 border-t border-ink/10 p-4">
          {#each content.trustChips as _, i}
            <div class="flex items-center gap-2">
              <GripVertical size={14} class="shrink-0 text-ink/20" />
              <input class={field} bind:value={content.trustChips[i]} on:input={push} placeholder="e.g. Licensed local operator" />
              <button class="shrink-0 rounded-md p-2 text-ink/35 transition hover:text-red-600 disabled:opacity-30" type="button" aria-label="Remove" disabled={content.trustChips.length <= EXACT_FOUR} on:click={() => removeAt(content.trustChips, i, EXACT_FOUR)}>
                <X size={15} />
              </button>
            </div>
          {/each}
          <div class="mt-1 flex items-center gap-3">
            <button class="inline-flex h-9 w-fit items-center gap-1.5 rounded-md border border-ink/15 px-3 text-xs font-semibold text-heading transition hover:bg-sand/50 disabled:opacity-40" type="button" disabled={content.trustChips.length >= EXACT_FOUR} on:click={() => addTo(content.trustChips, '', EXACT_FOUR)}>
              <Plus size={13} /> Add another
            </button>
            <span class="text-[11px] font-semibold {content.trustChips.length === EXACT_FOUR ? 'text-emerald-600' : 'text-amber-700'}">{countLabel(content.trustChips.length, EXACT_FOUR)}</span>
          </div>
        </div>
      {/if}
    </div>

    <!-- ── Overview ─────────────────────────────────────────────────────── -->
    <div class="overflow-hidden rounded-md border border-ink/12 bg-surface">
      <button class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sand/30" type="button" on:click={() => toggle('overview')}>
        <ChevronDown size={16} class={`shrink-0 text-ink/40 transition ${open.overview ? 'rotate-180' : ''}`} />
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-bold text-heading">3 · What this kind of safari is</span>
          <span class="block text-[11px] text-ink/50">The explaining paragraphs, next to a photo.</span>
        </span>
        {#if incomplete('overview')}<span class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Needs filling</span>{/if}
      </button>
      {#if open.overview}
        <div class="grid gap-3 border-t border-ink/10 p-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="grid gap-1.5">
              <span class={label}>Small label</span>
              <input class={field} bind:value={content.overview.label} on:input={push} />
            </label>
            <label class="grid gap-1.5">
              <span class={label}>Heading</span>
              <input class={field} bind:value={content.overview.headline} on:input={push} />
            </label>
          </div>
          <div class="grid gap-2">
            <span class={label}>Paragraphs</span>
            {#each content.overview.paragraphs as _, i}
              <div class="flex items-start gap-2">
                <div class="min-w-0 flex-1">
                  <!-- Rich text, because the public page renders these through
                       <RichText>. A plain box here would show the operator raw
                       tags for formatting the page is already applying. -->
                  <AdminRichText
                    label=""
                    name={`overview_paragraph_${i}`}
                    rows={4}
                    headings="none"
                    bind:value={content.overview.paragraphs[i]}
                  />
                </div>
                <button class="mt-1 shrink-0 rounded-md p-2 text-ink/35 transition hover:text-red-600" type="button" aria-label="Remove" on:click={() => removeAt(content.overview.paragraphs, i)}>
                  <X size={15} />
                </button>
              </div>
            {/each}
            <button class="inline-flex h-9 w-fit items-center gap-1.5 rounded-md border border-ink/15 px-3 text-xs font-semibold text-heading transition hover:bg-sand/50" type="button" on:click={() => addTo(content.overview.paragraphs, '')}>
              <Plus size={13} /> Add a paragraph
            </button>
          </div>
          <label class="grid gap-1.5">
            <span class={label}>Photo address <span class="font-normal text-ink/40">optional</span></span>
            <input class={field} bind:value={content.overview.imageUrl} on:input={push} placeholder="https://…" />
          </label>
        </div>
      {/if}
    </div>

    <!-- ── Planner + tours + reviews + faq: short, grouped together ──────── -->
    <div class="overflow-hidden rounded-md border border-ink/12 bg-surface">
      <button class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sand/30" type="button" on:click={() => toggle('bands')}>
        <ChevronDown size={16} class={`shrink-0 text-ink/40 transition ${open.bands ? 'rotate-180' : ''}`} />
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-bold text-heading">4 · Section headings</span>
          <span class="block text-[11px] text-ink/50">The short titles above the planner, the trip list, the reviews and the questions.</span>
        </span>
        {#if incomplete('planner') || incomplete('tours') || incomplete('reviews') || incomplete('faq')}
          <span class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Needs filling</span>
        {/if}
      </button>
      {#if open.bands}
        <div class="grid gap-5 border-t border-ink/10 p-4">
          <div class="grid gap-3">
            <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Above the 3-step planner</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <input class={field} bind:value={content.planner.label} on:input={push} placeholder="Small label" />
              <input class={field} bind:value={content.planner.headline} on:input={push} placeholder="Heading" />
            </div>
            <textarea class={area} rows="2" bind:value={content.planner.intro} on:input={push} placeholder="Sentence underneath"></textarea>
          </div>

          <div class="grid gap-3">
            <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Above the list of trips</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <input class={field} bind:value={content.tourCollection.label} on:input={push} placeholder="Small label" />
              <input class={field} bind:value={content.tourCollection.headline} on:input={push} placeholder="Heading" />
            </div>
            <textarea class={area} rows="2" bind:value={content.tourCollection.subheadline} on:input={push} placeholder="Sentence underneath"></textarea>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="grid gap-1.5">
                <span class={label}>Word for the trips</span>
                <input class={field} bind:value={content.tourCollection.resultsNoun} on:input={push} placeholder="e.g. safaris" />
                <span class={hint}>Used as “12 safaris”.</span>
              </label>
              <label class="grid gap-1.5">
                <span class={label}>“Show more” button</span>
                <input class={field} bind:value={content.tourCollection.loadMoreLabel} on:input={push} placeholder="Show more safaris" />
              </label>
            </div>
          </div>

          <div class="grid gap-3">
            <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Above the reviews</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <input class={field} bind:value={content.reviews.label} on:input={push} placeholder="Small label" />
              <input class={field} bind:value={content.reviews.title} on:input={push} placeholder="Heading" />
            </div>
            <textarea class={area} rows="2" bind:value={content.reviews.intro} on:input={push} placeholder="Sentence underneath"></textarea>
          </div>

          <div class="grid gap-3">
            <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Above the questions</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <input class={field} bind:value={content.faq.title} on:input={push} placeholder="Heading" />
              <label class="grid gap-1.5">
                <input class={field} bind:value={content.faq.answeredBy} on:input={push} placeholder="Answered by…" />
                <span class={hint}>e.g. “Answered by our Tanzania team”.</span>
              </label>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- ── Planning guide ───────────────────────────────────────────────── -->
    <div class="overflow-hidden rounded-md border border-ink/12 bg-surface">
      <button class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sand/30" type="button" on:click={() => toggle('guide')}>
        <ChevronDown size={16} class={`shrink-0 text-ink/40 transition ${open.guide ? 'rotate-180' : ''}`} />
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-bold text-heading">5 · Planning advice</span>
          <span class="block text-[11px] text-ink/50">Cards answering what people ask before booking — costs, route, best time.</span>
        </span>
        {#if incomplete('guide')}<span class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Needs filling</span>{/if}
      </button>
      {#if open.guide}
        <div class="grid gap-3 border-t border-ink/10 p-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <input class={field} bind:value={content.planningGuide.label} on:input={push} placeholder="Small label" />
            <input class={field} bind:value={content.planningGuide.title} on:input={push} placeholder="Heading" />
          </div>
          <textarea class={area} rows="2" bind:value={content.planningGuide.intro} on:input={push} placeholder="Sentence underneath"></textarea>

          {#each content.planningGuide.blocks as block, i}
            <div class="grid gap-2 rounded-md border border-ink/10 bg-sand/20 p-3">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">Card {i + 1}</span>
                <button class="rounded-md p-1.5 text-ink/35 transition hover:text-red-600 disabled:opacity-30" type="button" aria-label="Remove card" disabled={content.planningGuide.blocks.length <= EXACT_FOUR} on:click={() => removeAt(content.planningGuide.blocks, i, EXACT_FOUR)}>
                  <X size={14} />
                </button>
              </div>
              <input class={field} bind:value={block.title} on:input={push} placeholder="Card heading, e.g. Travel costs" />
              <AdminRichText
                label=""
                name={`guide_block_${i}`}
                rows={4}
                headings="none"
                placeholder="What someone needs to know. Bullet lists work well here."
                bind:value={block.body}
              />

              {#each block.links as link, li}
                <div class="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input class={field} bind:value={link.label} on:input={push} placeholder="Link wording" />
                  <input class={field} bind:value={link.href} on:input={push} placeholder="/where-it-goes" />
                  <button class="rounded-md p-2 text-ink/35 transition hover:text-red-600 disabled:opacity-30" type="button" aria-label="Remove link" disabled={block.links.length <= 1} on:click={() => removeAt(block.links, li, 1)}>
                    <X size={15} />
                  </button>
                </div>
              {/each}
              <div class="flex items-center gap-3">
                <button class="inline-flex h-8 w-fit items-center gap-1.5 rounded-md border border-ink/15 px-2.5 text-[11px] font-semibold text-heading transition hover:bg-surface" type="button" on:click={() => addTo(block.links, { label: '', href: '' })}>
                  <Plus size={12} /> Add a link
                </button>
                <span class={hint}>Each card needs at least one link. Use a path on this site like <code>/expert-advice</code>, or an anchor like <code>#lead-form</code>.</span>
              </div>
            </div>
          {/each}
          <div class="flex items-center gap-3">
            <button class="inline-flex h-9 w-fit items-center gap-1.5 rounded-md border border-ink/15 px-3 text-xs font-semibold text-heading transition hover:bg-sand/50 disabled:opacity-40" type="button" disabled={content.planningGuide.blocks.length >= EXACT_FOUR} on:click={() => addTo(content.planningGuide.blocks, { title: '', body: '', links: [{ label: '', href: '/' }] }, EXACT_FOUR)}>
              <Plus size={13} /> Add a card
            </button>
            <span class="text-[11px] font-semibold {content.planningGuide.blocks.length === EXACT_FOUR ? 'text-emerald-600' : 'text-amber-700'}">{countLabel(content.planningGuide.blocks.length, EXACT_FOUR)}</span>
          </div>
        </div>
      {/if}
    </div>

    <!-- ── Advisor ──────────────────────────────────────────────────────── -->
    <div class="overflow-hidden rounded-md border border-ink/12 bg-surface">
      <button class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sand/30" type="button" on:click={() => toggle('advisor')}>
        <ChevronDown size={16} class={`shrink-0 text-ink/40 transition ${open.advisor ? 'rotate-180' : ''}`} />
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-bold text-heading">6 · What we help you get right</span>
          <span class="block text-[11px] text-ink/50">The big decisions, and the quiet details people forget.</span>
        </span>
        {#if incomplete('advisor')}<span class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Needs filling</span>{/if}
      </button>
      {#if open.advisor}
        <div class="grid gap-3 border-t border-ink/10 p-4">
          <input class={field} bind:value={content.advisor.headline} on:input={push} placeholder="Heading" />
          <textarea class={area} rows="2" bind:value={content.advisor.intro} on:input={push} placeholder="Sentence underneath"></textarea>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <span class={label}>The big decisions</span>
              {#each content.advisor.big as _, i}
                <div class="flex items-center gap-2">
                  <input class={field} bind:value={content.advisor.big[i]} on:input={push} placeholder="e.g. Which parks, in which order" />
                  <button class="shrink-0 rounded-md p-2 text-ink/35 transition hover:text-red-600 disabled:opacity-30" type="button" aria-label="Remove" disabled={content.advisor.big.length <= EXACT_FOUR} on:click={() => removeAt(content.advisor.big, i, EXACT_FOUR)}><X size={15} /></button>
                </div>
              {/each}
              <div class="flex items-center gap-2">
                <button class="inline-flex h-8 w-fit items-center gap-1.5 rounded-md border border-ink/15 px-2.5 text-[11px] font-semibold text-heading transition hover:bg-sand/50 disabled:opacity-40" type="button" disabled={content.advisor.big.length >= EXACT_FOUR} on:click={() => addTo(content.advisor.big, '', EXACT_FOUR)}>
                  <Plus size={12} /> Add
                </button>
                <span class="text-[11px] font-semibold {content.advisor.big.length === EXACT_FOUR ? 'text-emerald-600' : 'text-amber-700'}">{countLabel(content.advisor.big.length, EXACT_FOUR)}</span>
              </div>
            </div>
            <div class="grid gap-2">
              <span class={label}>The quiet details</span>
              {#each content.advisor.quiet as _, i}
                <div class="flex items-center gap-2">
                  <input class={field} bind:value={content.advisor.quiet[i]} on:input={push} placeholder="e.g. Luggage limits on light aircraft" />
                  <button class="shrink-0 rounded-md p-2 text-ink/35 transition hover:text-red-600 disabled:opacity-30" type="button" aria-label="Remove" disabled={content.advisor.quiet.length <= EXACT_FOUR} on:click={() => removeAt(content.advisor.quiet, i, EXACT_FOUR)}><X size={15} /></button>
                </div>
              {/each}
              <div class="flex items-center gap-2">
                <button class="inline-flex h-8 w-fit items-center gap-1.5 rounded-md border border-ink/15 px-2.5 text-[11px] font-semibold text-heading transition hover:bg-sand/50 disabled:opacity-40" type="button" disabled={content.advisor.quiet.length >= EXACT_FOUR} on:click={() => addTo(content.advisor.quiet, '', EXACT_FOUR)}>
                  <Plus size={12} /> Add
                </button>
                <span class="text-[11px] font-semibold {content.advisor.quiet.length === EXACT_FOUR ? 'text-emerald-600' : 'text-amber-700'}">{countLabel(content.advisor.quiet.length, EXACT_FOUR)}</span>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- ── Steps ────────────────────────────────────────────────────────── -->
    <div class="overflow-hidden rounded-md border border-ink/12 bg-surface">
      <button class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sand/30" type="button" on:click={() => toggle('steps')}>
        <ChevronDown size={16} class={`shrink-0 text-ink/40 transition ${open.steps ? 'rotate-180' : ''}`} />
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-bold text-heading">7 · How a trip gets planned</span>
          <span class="block text-[11px] text-ink/50">The numbered steps, from first message to going away.</span>
        </span>
        {#if incomplete('steps')}<span class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Needs filling</span>{/if}
      </button>
      {#if open.steps}
        <div class="grid gap-3 border-t border-ink/10 p-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <input class={field} bind:value={content.howItsPlanned.label} on:input={push} placeholder="Small label" />
            <input class={field} bind:value={content.howItsPlanned.title} on:input={push} placeholder="Heading" />
          </div>
          <textarea class={area} rows="2" bind:value={content.howItsPlanned.intro} on:input={push} placeholder="Sentence underneath"></textarea>
          {#each content.howItsPlanned.steps as step, i}
            <div class="grid gap-2 rounded-md border border-ink/10 bg-sand/20 p-3">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">Step {i + 1}</span>
                <button class="rounded-md p-1.5 text-ink/35 transition hover:text-red-600 disabled:opacity-30" type="button" aria-label="Remove step" disabled={content.howItsPlanned.steps.length <= EXACT_FOUR} on:click={() => removeAt(content.howItsPlanned.steps, i, EXACT_FOUR)}><X size={14} /></button>
              </div>
              <input class={field} bind:value={step.title} on:input={push} placeholder="What happens" />
              <textarea class={area} rows="2" bind:value={step.text} on:input={push} placeholder="A sentence explaining it"></textarea>
            </div>
          {/each}
          <div class="flex items-center gap-3">
            <button class="inline-flex h-9 w-fit items-center gap-1.5 rounded-md border border-ink/15 px-3 text-xs font-semibold text-heading transition hover:bg-sand/50 disabled:opacity-40" type="button" disabled={content.howItsPlanned.steps.length >= EXACT_FOUR} on:click={() => addTo(content.howItsPlanned.steps, { title: '', text: '' }, EXACT_FOUR)}>
              <Plus size={13} /> Add a step
            </button>
            <span class="text-[11px] font-semibold {content.howItsPlanned.steps.length === EXACT_FOUR ? 'text-emerald-600' : 'text-amber-700'}">{countLabel(content.howItsPlanned.steps.length, EXACT_FOUR)}</span>
          </div>
        </div>
      {/if}
    </div>

    <!-- ── Final CTA ────────────────────────────────────────────────────── -->
    <div class="overflow-hidden rounded-md border border-ink/12 bg-surface">
      <button class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sand/30" type="button" on:click={() => toggle('cta')}>
        <ChevronDown size={16} class={`shrink-0 text-ink/40 transition ${open.cta ? 'rotate-180' : ''}`} />
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-bold text-heading">8 · The last ask</span>
          <span class="block text-[11px] text-ink/50">The closing band at the bottom of the page.</span>
        </span>
        {#if incomplete('cta')}<span class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Needs filling</span>{/if}
      </button>
      {#if open.cta}
        <div class="grid gap-3 border-t border-ink/10 p-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <input class={field} bind:value={content.finalCta.label} on:input={push} placeholder="Small label" />
            <input class={field} bind:value={content.finalCta.headline} on:input={push} placeholder="Heading" />
          </div>
          <textarea class={area} rows="2" bind:value={content.finalCta.subheadline} on:input={push} placeholder="Sentence underneath"></textarea>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="grid gap-1.5">
              <span class={label}>Button</span>
              <input class={field} bind:value={content.finalCta.buttonLabel} on:input={push} />
            </label>
            <label class="grid gap-1.5">
              <span class={label}>WhatsApp button</span>
              <input class={field} bind:value={content.finalCta.whatsappLabel} on:input={push} />
            </label>
          </div>
          <div class="grid gap-2">
            <span class={label}>Short reassurances beside the buttons</span>
            {#each content.finalCta.proofs as _, i}
              <div class="flex items-center gap-2">
                <input class={field} bind:value={content.finalCta.proofs[i]} on:input={push} placeholder="e.g. Replies within a day" />
                <button class="shrink-0 rounded-md p-2 text-ink/35 transition hover:text-red-600 disabled:opacity-30" type="button" aria-label="Remove" disabled={content.finalCta.proofs.length <= EXACT_FOUR} on:click={() => removeAt(content.finalCta.proofs, i, EXACT_FOUR)}><X size={15} /></button>
              </div>
            {/each}
            <div class="flex items-center gap-3">
              <button class="inline-flex h-8 w-fit items-center gap-1.5 rounded-md border border-ink/15 px-2.5 text-[11px] font-semibold text-heading transition hover:bg-sand/50 disabled:opacity-40" type="button" disabled={content.finalCta.proofs.length >= EXACT_FOUR} on:click={() => addTo(content.finalCta.proofs, '', EXACT_FOUR)}>
                <Plus size={12} /> Add
              </button>
              <span class="text-[11px] font-semibold {content.finalCta.proofs.length === EXACT_FOUR ? 'text-emerald-600' : 'text-amber-700'}">{countLabel(content.finalCta.proofs.length, EXACT_FOUR)}</span>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- The code box has not gone away, it has just stopped being the only way
       in. Kept for pasting a whole page across from somewhere else. -->
  <details class="rounded-md border border-ink/10 bg-surface px-4 py-3" bind:open={showJson}>
    <summary class="cursor-pointer text-xs font-semibold text-ink/55">
      <Braces size={13} class="mr-1 inline" /> Advanced — edit the raw page data
    </summary>
    <p class="mt-2 {hint}">Only needed to paste a page in from elsewhere. Editing here changes the fields above.</p>
    <textarea
      class="mt-2 min-h-[320px] w-full resize-y rounded-md border border-ink/15 bg-[#20231d] px-4 py-3 font-mono text-[12px] leading-5 text-[#f3efe7] outline-none focus:border-goldfinch-gold"
      spellcheck="false"
      value={json}
      on:input={(e) => { json = e.currentTarget.value; lastPushed = ''; dispatch('change', json); }}
    ></textarea>
  </details>
</section>
