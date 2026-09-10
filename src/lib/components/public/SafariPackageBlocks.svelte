<script lang="ts">
  /**
   * Draws the blocks an editor composed on a safari-package page.
   *
   * Two rules run through all of it. A block whose data is empty renders
   * nothing at all — no placeholder, no "not recorded", no em dash holding a
   * space open. And an unrecognised type is skipped rather than throwing, so a
   * page saved by a newer editor stays readable on an older renderer.
   *
   * The section chrome is Goldfinch's own: alternating surface/canvas bands,
   * the supplied 1180px shell, a clay label, serif heading, ink body.
   */
  import { ArrowRight, Banknote, Car, Check, Clock3, MapPin, Minus, Plane, Route, Tent, Users } from '@lucide/svelte';
  import FAQAccordion from './FAQAccordion.svelte';
  import Img from './Img.svelte';
  import ItineraryDays from './ItineraryDays.svelte';
  import RichText from './RichText.svelte';
  import SafariRouteOptions from './SafariRouteOptions.svelte';
  import StylePlannerBand from './StylePlannerBand.svelte';
  import TourCard from './TourCard.svelte';
  import { MONTHS, arr, lines, rows, str, type Block } from '$lib/safariPackageBlocks';
  import type { FAQ, ItineraryDay, Tour } from '$lib/types';

  export let blocks: Block[] = [];
  /** The linked tour's real days — what the `itinerary` block renders. */
  export let itineraryDays: ItineraryDay[] = [];
  /** Resolved tours for `tours` blocks. Cards link to the canonical /tours/[slug]. */
  export let tours: Tour[] = [];
  /** FAQs attached to this package, used only when a `faq` block has none of its own. */
  export let moduleFaqs: FAQ[] = [];
  /** Published categories, offered as "main interest" in the planner band. */
  export let interests: { name: string; slug: string }[] = [];
  /** Real gateways, offered as "starting point". Empty hides that field. */
  export let startPoints: Array<Record<string, unknown>> = [];
  /** This package, so a lead from the planner records where it came from. */
  export let packageName = '';
  export let packageSlug = '';

  /** Alternating bands stop a long page reading as one flat slab. */
  const surface = (index: number) => (index % 2 === 0 ? 'bg-surface' : 'bg-canvas');

  /** The design's own shell: 1180px, not the site-wide container. */
  const SHELL = 'mx-auto max-w-[1180px] px-4 md:px-6';
  const SECTION = 'scroll-mt-24 py-12 md:py-16';
  const HEADING = 'font-serif mt-3 max-w-[820px] text-[26px] font-semibold leading-[1.15] tracking-tight text-heading md:text-[34px]';
  const INTRO = 'mt-4 max-w-3xl text-[15.5px] leading-relaxed text-ink/70';
  const GOLD =
    'inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-goldfinch-gold px-6 text-[14px] font-bold text-heading transition hover:brightness-105';

  /** Which enquiry block owns the #lead-form anchor. -1 when there is none. */
  $: firstEnquiry = blocks.findIndex((block) => block?.type === 'enquiry');

  const byOrder = (slugs: string[]) =>
    slugs.map((slug) => tours.find((tour) => tour.slug === slug)).filter((tour): tour is Tour => Boolean(tour));

  /**
   * The names an editor can type in a fact's Icon box, kept deliberately small
   * and plain-language. An unknown name draws no icon rather than an error
   * glyph, so a typo costs nothing.
   */
  const FACT_ICON: Record<string, typeof Plane> = {
    plane: Plane,
    pin: MapPin,
    clock: Clock3,
    route: Route,
    price: Banknote,
    people: Users,
    vehicle: Car,
    tent: Tent
  };

  const monthsOf = (value: unknown) =>
    arr<unknown>(value)
      .map((entry) => String(entry ?? '').trim())
      .filter((month) => MONTHS.includes(month));
</script>

{#each blocks as block, index (index)}
  {@const eyebrow = str(block.eyebrow)}
  {@const title = str(block.title)}
  {@const intro = str(block.intro)}

  {#if block.type === 'facts'}
    {@const items = rows<{ label?: string; value?: string; icon?: string }>(block.items).filter((item) => str(item.value).trim())}
    {#if items.length}
      <section class="bg-[#272B22]">
        <div class={`${SHELL} grid gap-x-8 gap-y-5 py-6 sm:grid-cols-2 lg:grid-cols-5`}>
          {#each items as item, i (i)}
            {@const Icon = FACT_ICON[str(item.icon).trim().toLowerCase()]}
            <div class="flex min-w-0 items-start gap-2.5">
              {#if Icon}<Icon size={18} strokeWidth={1.6} class="mt-0.5 shrink-0 text-goldfinch-gold" />{/if}
              <div class="min-w-0">
                <p class="text-[10px] font-bold uppercase tracking-[0.13em] text-canvas/60">{str(item.label)}</p>
                <p class="mt-0.5 text-[13.5px] leading-snug text-surface">{str(item.value)}</p>
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}

  {:else if block.type === 'prose'}
    {@const asideTitle = str(block.aside_title).trim()}
    {@const asideBody = str(block.aside_body).trim()}
    {@const hasAside = Boolean(asideTitle && asideBody)}
    {#if str(block.body)}
      <section class={`${surface(index)} ${SECTION}`}>
        <!-- The copy runs full width until there is a side card to sit beside. -->
        <div class={`${SHELL} ${hasAside ? '' : 'max-w-[820px]'}`}>
          {#if eyebrow}
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
              <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
            </div>
          {/if}
          {#if title}<h2 class={HEADING}>{title}</h2>{/if}
          <div class={hasAside ? 'mt-5 grid gap-8 lg:grid-cols-12' : ''}>
            <RichText
              value={str(block.body)}
              className={`space-y-4 text-[15px] leading-8 text-ink/72 md:text-base ${hasAside ? 'lg:col-span-7' : 'mt-5'}`}
            />
            {#if hasAside}
              <div class="lg:col-span-5">
                <div class="rounded-[12px] border border-clay/20 bg-canvas p-6">
                  <div class="inline-flex items-center gap-2">
                    <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
                    <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-clay">{asideTitle}</span>
                  </div>
                  <p class="font-serif mt-3 text-[19px] leading-[1.35] text-heading">{asideBody}</p>
                </div>
              </div>
            {/if}
          </div>
        </div>
      </section>
    {/if}

  {:else if block.type === 'highlights'}
    {@const items = lines(block.items)}
    {#if items.length || str(block.image_url)}
      <section class={`${surface(index)} ${SECTION}`}>
        <div class={`${SHELL} grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12`}>
          {#if str(block.image_url)}
            <Img
              src={str(block.image_url)}
              alt={title || 'Trip highlight'}
              width={900}
              sizes="(max-width: 1023px) 100vw, 46vw"
              className="aspect-[4/3] w-full rounded-2xl object-cover"
            />
          {/if}
          <div class="min-w-0">
            {#if eyebrow}
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
              <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
            </div>
          {/if}
            {#if title}<h2 class={HEADING}>{title}</h2>{/if}
            {#if intro}<p class={INTRO}>{intro}</p>{/if}
            {#if items.length}
              <ul class="mt-6 grid gap-3">
                {#each items as item, i (i)}
                  <li class="flex items-start gap-2.5 text-[15px] leading-relaxed text-ink/75">
                    <span class="mt-1.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-goldfinch-gold bg-surface">
                      <Check size={10} strokeWidth={3} class="text-clay" />
                    </span>
                    <span>{item}</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        </div>
      </section>
    {/if}

  {:else if block.type === 'season'}
    {@const months = monthsOf(block.months)}
    {#if months.length}
      <section class={`${surface(index)} ${SECTION}`}>
        <div class={SHELL}>
          {#if eyebrow}
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
              <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
            </div>
          {/if}
          {#if title}<h2 class={HEADING}>{title}</h2>{/if}
          {#if intro}<p class={INTRO}>{intro}</p>{/if}
          <div class="mt-7 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
            {#each MONTHS as month (month)}
              {@const best = months.includes(month)}
              <div class={`rounded-[8px] border px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide ${best ? 'border-goldfinch-gold bg-goldfinch-gold/15 text-heading' : 'border-ink/10 bg-surface text-ink/40'}`}>
                {month.slice(0, 3)}
              </div>
            {/each}
          </div>
          {#if str(block.note)}<p class="mt-4 text-sm leading-6 text-ink/60">{str(block.note)}</p>{/if}
        </div>
      </section>
    {/if}

  {:else if block.type === 'tiers'}
    {@const tiers = rows<{ label?: string; price?: string; body?: string }>(block.tiers)}
    {#if tiers.length}
      <section class={`${surface(index)} ${SECTION}`}>
        <div class={SHELL}>
          {#if eyebrow}
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
              <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
            </div>
          {/if}
          {#if title}<h2 class={HEADING}>{title}</h2>{/if}
          {#if intro}<p class={INTRO}>{intro}</p>{/if}
          <div class="mt-8 grid gap-4 md:grid-cols-3">
            {#each tiers as tier, i (i)}
              <article class="rounded-[16px] border border-ink/12 bg-surface p-6">
                <p class="font-serif text-xl font-semibold text-heading">{str(tier.label)}</p>
                {#if str(tier.price)}
                  <p class="mt-3 font-serif text-2xl font-bold text-clay">{str(tier.price)}</p>
                {/if}
                {#if str(tier.body)}
                  <p class="mt-3 text-sm leading-relaxed text-ink/70">{str(tier.body)}</p>
                {/if}
              </article>
            {/each}
          </div>
          {#if str(block.note)}<p class="mt-4 text-sm leading-6 text-ink/55">{str(block.note)}</p>{/if}
        </div>
      </section>
    {/if}

  {:else if block.type === 'itinerary'}
    <!-- The linked tour's real days, through the same renderer the tour page
         uses. Nothing is retyped here, so the two can never disagree. -->
    {#if itineraryDays.length}
      <section class={`${surface(index)} ${SECTION}`}>
        <div class={SHELL}>
          {#if eyebrow}
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
              <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
            </div>
          {/if}
          {#if title}<h2 class={HEADING}>{title}</h2>{/if}
          {#if intro}<p class={INTRO}>{intro}</p>{/if}
          <div class="mt-8">
            <ItineraryDays days={itineraryDays} />
          </div>
        </div>
      </section>
    {/if}

  {:else if block.type === 'compare'}
    {@const columns = lines(block.columns)}
    {@const tableRows = rows<{ label?: string; values?: unknown }>(block.rows)}
    {#if columns.length && tableRows.length}
      <section class={`${surface(index)} ${SECTION}`}>
        <div class={SHELL}>
          {#if eyebrow}
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
              <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
            </div>
          {/if}
          {#if title}<h2 class={HEADING}>{title}</h2>{/if}
          {#if intro}<p class={INTRO}>{intro}</p>{/if}
          <!-- Scrolls inside itself; the page never scrolls sideways. -->
          <div class="mt-8 overflow-x-auto rounded-[12px] border border-ink/12">
            <table class="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr class="bg-sand/50">
                  {#each columns as column, i (i)}
                    <th class="border-b border-ink/10 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-ink/60">{column}</th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each tableRows as row, rowIndex (rowIndex)}
                  <tr class={rowIndex % 2 ? 'bg-canvas/60' : 'bg-surface'}>
                    <th scope="row" class="border-b border-ink/8 px-4 py-3 font-semibold text-heading">{str(row.label)}</th>
                    {#each lines(row.values) as cell, ci (ci)}
                      <td class="border-b border-ink/8 px-4 py-3 text-ink/70">{cell}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    {/if}

  {:else if block.type === 'inclusions'}
    {@const included = lines(block.included)}
    {@const excluded = lines(block.excluded)}
    {#if included.length || excluded.length}
      <section class={`${surface(index)} ${SECTION}`}>
        <div class={SHELL}>
          {#if title}<h2 class={`${HEADING} mt-0 max-w-3xl`}>{title}</h2>{/if}
          <div class="mt-8 grid gap-5 md:grid-cols-2">
            {#if included.length}
              <article class="rounded-[16px] border border-forest/20 bg-forest/[0.06] p-6 md:p-7">
                <h3 class="font-serif text-2xl font-semibold text-heading">Included</h3>
                <ul class="mt-5 grid gap-3">
                  {#each included as item, i (i)}
                    <li class="flex gap-3 text-sm leading-6 text-ink/75">
                      <Check size={16} strokeWidth={2.5} class="mt-0.5 shrink-0 text-forest" />
                      <span>{item}</span>
                    </li>
                  {/each}
                </ul>
              </article>
            {/if}
            {#if excluded.length}
              <article class="rounded-[16px] border border-clay/20 bg-clay/[0.05] p-6 md:p-7">
                <h3 class="font-serif text-2xl font-semibold text-heading">Not included</h3>
                <ul class="mt-5 grid gap-3">
                  {#each excluded as item, i (i)}
                    <li class="flex gap-3 text-sm leading-6 text-ink/75">
                      <Minus size={16} strokeWidth={2.5} class="mt-0.5 shrink-0 text-clay" />
                      <span>{item}</span>
                    </li>
                  {/each}
                </ul>
              </article>
            {/if}
          </div>
        </div>
      </section>
    {/if}

  {:else if block.type === 'gallery'}
    {@const images = rows<{ image_url?: string; caption?: string }>(block.images).filter((image) => str(image.image_url).trim())}
    {#if images.length}
      <section class={`${surface(index)} ${SECTION}`}>
        <div class={SHELL}>
          {#if eyebrow}
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
              <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
            </div>
          {/if}
          {#if title}<h2 class={HEADING}>{title}</h2>{/if}
          <div class="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {#each images as image, i (i)}
              <figure class="min-w-0">
                <Img
                  src={str(image.image_url)}
                  alt={str(image.caption)}
                  width={720}
                  sizes="(max-width: 639px) 100vw, (max-width: 1023px) 48vw, 32vw"
                  className="aspect-[4/3] w-full rounded-[12px] object-cover"
                />
                {#if str(image.caption)}
                  <figcaption class="mt-2 text-[13px] leading-6 text-ink/60">{str(image.caption)}</figcaption>
                {/if}
              </figure>
            {/each}
          </div>
        </div>
      </section>
    {/if}

  {:else if block.type === 'tours'}
    {@const picked = byOrder(lines(block.tour_slugs))}
    {#if picked.length}
      <section class={`${surface(index)} ${SECTION}`}>
        <div class={SHELL}>
          {#if eyebrow}
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
              <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
            </div>
          {/if}
          {#if title}<h2 class={HEADING}>{title}</h2>{/if}
          {#if intro}<p class={INTRO}>{intro}</p>{/if}
          <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {#each picked as tour (tour.id)}
              <TourCard {tour} />
            {/each}
          </div>
        </div>
      </section>
    {/if}

  {:else if block.type === 'faq'}
    {@const authored = rows<{ question?: string; answer?: string }>(block.items).filter((item) => str(item.question).trim() && str(item.answer).trim())}
    <!-- Questions typed into the block win; an empty block falls back to the
         ones attached to this package in the FAQ module. -->
    {@const entries = authored.length
      ? authored.map((item, n) => ({ id: `pkg-faq-${index}-${n}`, question: str(item.question), answer: str(item.answer) }))
      : moduleFaqs.map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer }))}
    {#if entries.length}
      <section class={`${surface(index)} ${SECTION}`}>
        <div class={`${SHELL} max-w-[900px]`}>
          {#if title}<h2 class={`${HEADING} mt-0`}>{title}</h2>{/if}
          <div class="mt-8">
            <FAQAccordion faqs={entries} />
          </div>
        </div>
      </section>
    {/if}

  {:else if block.type === 'enquiry'}
    <!-- The same planner band a safari-style page closes with, questions laid
         out across the band rather than a button that opens a dialog. Reused
         rather than re-cut so a lead from here is shaped like every other one. -->
    <!-- A page usually closes with two of these. Only the first answers to
         #lead-form — every "Plan this trip" link on the page points there, and
         two elements sharing one id is one id too many. -->
    <div id={index === firstEnquiry ? 'lead-form' : undefined} class="scroll-mt-24">
      <StylePlannerBand
        eyebrow={eyebrow || 'Plan this safari'}
        title={title || 'Plan this trip with a local specialist'}
        description={intro}
        {startPoints}
        {interests}
        {packageName}
        {packageSlug}
      />
    </div>

  {:else if block.type === 'routes'}
    {@const routeRows = rows<Record<string, unknown>>(block.routes)}
    {#if routeRows.length}
      <section id="route-options" class={`scroll-mt-20 ${surface(index)} ${SECTION}`}>
        <div class={SHELL}>
          {#if eyebrow}
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
              <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
            </div>
          {/if}
          {#if title}<h2 class={HEADING}>{title}</h2>{/if}
          {#if intro}<p class={INTRO}>{intro}</p>{/if}
          <SafariRouteOptions routes={routeRows} {tours} ctaLabel={str(block.cta_label) || 'Send request for this route'} />
        </div>
      </section>
    {/if}

  {:else if block.type === 'advice'}
    {@const cards = rows<{ title?: string; body?: string; best_for?: string; note?: string }>(block.cards)}
    {#if cards.length}
      <section class={`${surface(index)} ${SECTION}`}>
        <div class={SHELL}>
          {#if eyebrow}
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
              <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
            </div>
          {/if}
          {#if title}<h2 class={HEADING}>{title}</h2>{/if}
          {#if intro}<p class={INTRO}>{intro}</p>{/if}
          <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {#each cards as card, i (i)}
              <div class="overflow-hidden rounded-[12px] border border-ink/12 bg-surface">
                <div class="h-[3px] w-full bg-clay" aria-hidden="true"></div>
                <div class="p-5">
                  {#if str(card.title)}<h3 class="font-serif text-lg font-semibold leading-snug text-heading">{str(card.title)}</h3>{/if}
                  {#if str(card.body)}<p class="mt-2.5 text-[14.5px] leading-relaxed text-ink/70">{str(card.body)}</p>{/if}
                  {#if str(card.best_for)}<p class="mt-4 text-[13.5px] font-semibold leading-relaxed text-heading">Best for: {str(card.best_for)}</p>{/if}
                  {#if str(card.note)}<p class="mt-2 text-[13px] italic leading-relaxed text-ink/55">{str(card.note)}</p>{/if}
                </div>
              </div>
            {/each}
          </div>
          {#if str(block.help_text) || str(block.cta_label)}
            <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              {#if str(block.help_text)}<p class="text-[14.5px] leading-relaxed text-ink/70">{str(block.help_text)}</p>{/if}
              {#if str(block.cta_label)}
                <a class={GOLD} href="#lead-form">
                  {str(block.cta_label)}
                  <ArrowRight size={16} />
                </a>
              {/if}
            </div>
          {/if}
        </div>
      </section>
    {/if}

  {:else if block.type === 'expectations'}
    {@const can = lines(block.can)}
    {@const cannot = lines(block.cannot)}
    {#if can.length || cannot.length}
      <section class={`${surface(index)} ${SECTION}`}>
        <div class={SHELL}>
          <div class="rounded-[16px] bg-canvas p-6 md:p-9">
            {#if eyebrow}
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
              <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
            </div>
          {/if}
            {#if title}<h2 class={HEADING}>{title}</h2>{/if}
            {#if intro}<p class={INTRO}>{intro}</p>{/if}
            <div class="mt-7 grid gap-4 md:grid-cols-2">
              {#if can.length}
                <div class="rounded-[12px] border border-ink/10 bg-surface p-5">
                  <h3 class="text-[11px] font-bold uppercase tracking-[0.14em] text-heading">{str(block.can_title) || 'What it can give you'}</h3>
                  <ul class="mt-4 grid gap-2.5">
                    {#each can as item, i (i)}
                      <li class="flex gap-2.5 text-[14.5px] leading-relaxed text-ink/70">
                        <span class="mt-[3px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-goldfinch-gold text-heading">
                          <Check size={11} strokeWidth={3} />
                        </span>
                        <span>{item}</span>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
              {#if cannot.length}
                <div class="rounded-[12px] border border-ink/10 bg-surface p-5">
                  <h3 class="text-[11px] font-bold uppercase tracking-[0.14em] text-heading">{str(block.cannot_title) || 'What it cannot give you'}</h3>
                  <ul class="mt-4 grid gap-2.5">
                    {#each cannot as item, i (i)}
                      <li class="flex gap-2.5 text-[14.5px] leading-relaxed text-ink/70">
                        <span class="mt-[3px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-ink/30 text-ink/50">
                          <Minus size={11} strokeWidth={3} />
                        </span>
                        <span>{item}</span>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </div>
            {#if str(block.note)}<p class="mt-6 max-w-3xl text-[14.5px] leading-relaxed text-ink/70">{str(block.note)}</p>{/if}
          </div>
        </div>
      </section>
    {/if}

  {:else if block.type === 'priceguide'}
    {@const priceRows = rows<{ route?: string; price?: string; best_for?: string; tendency?: string; why?: string }>(block.rows)}
    {@const factors = lines(block.factors)}
    {#if priceRows.length || factors.length}
      <section class={`${surface(index)} ${SECTION}`}>
        <div class={SHELL}>
          {#if eyebrow}
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
              <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
            </div>
          {/if}
          {#if title}<h2 class={HEADING}>{title}</h2>{/if}
          {#if intro}<p class={INTRO}>{intro}</p>{/if}

          {#if priceRows.length}
            <div class="mt-8 overflow-hidden rounded-[12px] border border-ink/10 bg-surface">
              <div class="hidden grid-cols-12 gap-4 bg-deep-green px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white/80 md:grid">
                <span class="col-span-3">Option</span>
                <span class="col-span-3">Usually best for</span>
                <span class="col-span-2">Price tendency</span>
                <span class="col-span-4">Why it costs that way</span>
              </div>
              {#each priceRows as row, i (i)}
                <div class="grid gap-2 border-b border-ink/10 px-5 py-5 last:border-b-0 md:grid-cols-12 md:items-start md:gap-4 md:py-4">
                  <div class="md:col-span-3">
                    <span class="font-serif block text-[16px] font-semibold text-heading">{str(row.route)}</span>
                    {#if str(row.price)}<span class="mt-1 block text-[13px] font-semibold text-clay">{str(row.price)}</span>{/if}
                  </div>
                  <span class="text-sm text-ink/70 md:col-span-3">{str(row.best_for)}</span>
                  <span class="text-sm font-semibold text-heading md:col-span-2">{str(row.tendency)}</span>
                  <span class="text-sm leading-relaxed text-ink/70 md:col-span-4">{str(row.why)}</span>
                </div>
              {/each}
            </div>
          {/if}
          {#if str(block.small_print)}<p class="mt-4 text-[13.5px] italic leading-relaxed text-ink/55">{str(block.small_print)}</p>{/if}

          {#if factors.length}
            <div class="mt-8 rounded-[12px] border border-ink/10 bg-surface p-6">
              <h3 class="font-serif text-lg font-semibold text-heading">{str(block.factors_title) || 'Why your quote may change'}</h3>
              <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each factors as factor, i (i)}
                  {@const parts = factor.split('|')}
                  {@const Icon = parts.length > 1 ? FACT_ICON[parts[0].trim().toLowerCase()] : undefined}
                  {@const label = parts.length > 1 ? parts.slice(1).join('|').trim() : factor}
                  <div class="flex items-start gap-3">
                    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-canvas text-clay">
                      {#if Icon}<Icon size={18} />{:else}<Banknote size={18} />{/if}
                    </span>
                    <span class="pt-1.5 text-[14.5px] font-medium text-heading">{label}</span>
                  </div>
                {/each}
              </div>
              {#if str(block.factors_note)}<p class="mt-5 text-sm leading-relaxed text-ink/70">{str(block.factors_note)}</p>{/if}
            </div>
          {/if}

          {#if str(block.note)}
            <div class="mt-6 rounded-[12px] border-l-[3px] border-goldfinch-gold bg-surface p-5">
              {#if str(block.note_label)}<span class="text-[11px] font-bold uppercase tracking-[0.14em] text-clay">{str(block.note_label)}</span>{/if}
              <p class="mt-2 text-[15px] leading-relaxed text-heading">{str(block.note)}</p>
            </div>
          {/if}

          {#if str(block.cta_label)}
            <a class={`mt-6 w-full sm:w-auto ${GOLD}`} href="#lead-form">
              {str(block.cta_label)}
              <ArrowRight size={16} />
            </a>
          {/if}
        </div>
      </section>
    {/if}

  {:else if block.type === 'durations'}
    {@const options = rows<{ title?: string; body?: string; best_for?: string; href?: string; cta_label?: string }>(block.options)}
    {#if options.length}
      <section id="compare-durations" class={`scroll-mt-20 ${surface(index)} ${SECTION}`}>
        <div class={SHELL}>
          {#if eyebrow}
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
              <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
            </div>
          {/if}
          {#if title}<h2 class={HEADING}>{title}</h2>{/if}
          {#if intro}<p class={INTRO}>{intro}</p>{/if}
          <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {#each options as option, i (i)}
              {@const href = str(option.href).trim()}
              <!-- No link means this is the page the reader is already on. -->
              <div class={`flex flex-col rounded-[12px] p-5 ${href ? 'border border-ink/12 bg-surface' : 'bg-deep-green text-white'}`}>
                {#if str(option.title)}
                  <h3 class={`font-serif text-lg font-semibold leading-snug ${href ? 'text-heading' : 'text-white'}`}>{str(option.title)}</h3>
                {/if}
                {#if str(option.body)}
                  <p class={`mt-2.5 flex-1 text-sm leading-relaxed ${href ? 'text-ink/70' : 'text-white/80'}`}>{str(option.body)}</p>
                {/if}
                {#if str(option.best_for)}
                  <p class={`mt-4 text-[11px] font-bold uppercase tracking-[0.13em] ${href ? 'text-clay' : 'text-goldfinch-gold'}`}>
                    Best for: {str(option.best_for)}
                  </p>
                {/if}
                {#if href}
                  <a class="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-goldfinch-gold px-4 text-[13.5px] font-bold text-heading transition hover:brightness-105" {href}>
                    {str(option.cta_label) || 'See this option'}
                    <ArrowRight size={15} />
                  </a>
                {:else}
                  <span class="mt-4 inline-flex h-10 items-center justify-center rounded-[10px] border border-white/25 px-4 text-[13.5px] font-semibold text-white/80">
                    You are viewing this option
                  </span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </section>
    {/if}
  {/if}
{/each}
