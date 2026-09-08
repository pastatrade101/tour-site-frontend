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
   * `container-shell`, gold eyebrow, serif heading, ink body.
   */
  import { Check, Minus } from '@lucide/svelte';
  import FAQAccordion from './FAQAccordion.svelte';
  import Img from './Img.svelte';
  import ItineraryDays from './ItineraryDays.svelte';
  import LeadCaptureForm from './LeadCaptureForm.svelte';
  import RichText from './RichText.svelte';
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

  /** Alternating bands stop a long page reading as one flat slab. */
  const surface = (index: number) => (index % 2 === 0 ? 'bg-surface' : 'bg-canvas');

  const EYEBROW = 'text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold';
  const HEADING = 'font-serif mt-3 text-3xl leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[40px]';
  const INTRO = 'mt-4 max-w-[820px] text-base leading-relaxed text-ink/70';

  const byOrder = (slugs: string[]) =>
    slugs.map((slug) => tours.find((tour) => tour.slug === slug)).filter((tour): tour is Tour => Boolean(tour));

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
    {@const items = rows<{ label?: string; value?: string }>(block.items).filter((item) => str(item.value).trim())}
    {#if items.length}
      <section class="border-y border-ink/10 bg-canvas">
        <div class="container-shell grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {#each items as item, i (i)}
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/50">{str(item.label)}</p>
              <p class="mt-1 text-[15px] font-semibold leading-snug text-heading">{str(item.value)}</p>
            </div>
          {/each}
        </div>
      </section>
    {/if}

  {:else if block.type === 'prose'}
    {#if str(block.body)}
      <section class={`${surface(index)} py-14 md:py-20`}>
        <div class="container-shell max-w-[820px]">
          {#if eyebrow}<p class={EYEBROW}>{eyebrow}</p>{/if}
          {#if title}<h2 class={HEADING}>{title}</h2>{/if}
          <RichText value={str(block.body)} className="mt-5 space-y-4 text-[15px] leading-8 text-ink/72 md:text-base" />
        </div>
      </section>
    {/if}

  {:else if block.type === 'highlights'}
    {@const items = lines(block.items)}
    {#if items.length || str(block.image_url)}
      <section class={`${surface(index)} py-14 md:py-20`}>
        <div class="container-shell grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
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
            {#if eyebrow}<p class={EYEBROW}>{eyebrow}</p>{/if}
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
      <section class={`${surface(index)} py-14 md:py-20`}>
        <div class="container-shell">
          {#if eyebrow}<p class={EYEBROW}>{eyebrow}</p>{/if}
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
      <section class={`${surface(index)} py-14 md:py-20`}>
        <div class="container-shell">
          {#if eyebrow}<p class={EYEBROW}>{eyebrow}</p>{/if}
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
      <section class={`${surface(index)} py-14 md:py-20`}>
        <div class="container-shell">
          {#if eyebrow}<p class={EYEBROW}>{eyebrow}</p>{/if}
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
      <section class={`${surface(index)} py-14 md:py-20`}>
        <div class="container-shell">
          {#if eyebrow}<p class={EYEBROW}>{eyebrow}</p>{/if}
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
      <section class={`${surface(index)} py-14 md:py-20`}>
        <div class="container-shell">
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
      <section class={`${surface(index)} py-14 md:py-20`}>
        <div class="container-shell">
          {#if eyebrow}<p class={EYEBROW}>{eyebrow}</p>{/if}
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
      <section class={`${surface(index)} py-14 md:py-20`}>
        <div class="container-shell">
          {#if eyebrow}<p class={EYEBROW}>{eyebrow}</p>{/if}
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
      <section class={`${surface(index)} py-14 md:py-20`}>
        <div class="container-shell max-w-[900px]">
          {#if title}<h2 class={`${HEADING} mt-0`}>{title}</h2>{/if}
          <div class="mt-8">
            <FAQAccordion faqs={entries} />
          </div>
        </div>
      </section>
    {/if}

  {:else if block.type === 'enquiry'}
    <section id="lead-form" class="scroll-mt-20 bg-deep-green py-14 text-white md:py-20">
      <div class="container-shell grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          {#if eyebrow}<p class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">{eyebrow}</p>{/if}
          {#if title}<h2 class="font-serif mt-3 text-3xl leading-tight tracking-tight text-white sm:text-4xl">{title}</h2>{/if}
          {#if intro}<p class="mt-4 max-w-lg text-base leading-relaxed text-white/75">{intro}</p>{/if}
        </div>
        <LeadCaptureForm inline />
      </div>
    </section>
  {/if}
{/each}
