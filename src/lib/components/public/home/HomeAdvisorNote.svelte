<script lang="ts">
  // Advisor's note — editorial card with two bulleted columns.
  // Fully CMS-driven: title / body / footnote come from the section record and
  // `columns` from its extra_data, so the client can rename either column and
  // edit every bullet without a code change.
  type Column = { title: string; items: string[] };

  export let eyebrow = "Advisor's Note";
  export let title = 'The Trip Is Won or Lost in the Planning Details';
  export let body =
    'Most travel mistakes happen before arrival. The wrong route, too many one-night stops, poor lodge locations or badly timed transfers can make even a beautiful trip feel tiring.';
  export let footnote =
    'That is why we start with your dates, travel style and priorities — not with a fixed package.';
  export let columns: Column[] = [
    {
      title: 'The big choices',
      items: [
        'When to travel — migration timing, dry season, shoulder-season value, beach conditions and Kilimanjaro weather.',
        'Which places to include — and which to leave out so the trip has enough space.',
        'How to combine safari, Zanzibar, Kilimanjaro or culture without wasting days in transit.',
        'Accommodation style — mobile camp, tented camp, lodge, boutique hotel, beach resort or mountain hotel.'
      ]
    },
    {
      title: 'The quiet details',
      items: [
        'Vehicle style, road time and where open-side game-drive vehicles make sense.',
        'Which Zanzibar coast fits your month, swimming preference and travel style.',
        'Family logistics, gentler safari days, connecting rooms and realistic drive times.',
        'Photography, birding, walking, culture or trekking interests matched to the right guide and pace.'
      ]
    }
  ];

  // Tolerate partial CMS shapes: drop empty columns and blank bullets.
  $: cols = (columns ?? [])
    .filter((c) => c && c.title)
    .map((c) => ({ title: c.title, items: (c.items ?? []).filter((i) => typeof i === 'string' && i.trim()) }))
    .filter((c) => c.items.length);
</script>

<section class="py-14 md:py-20">
  <div class="container-shell">
    <div
      class="relative overflow-hidden rounded-[12px] border border-ink/20 bg-sand px-7 py-8 sm:px-10 sm:py-10 md:px-14 md:py-14 lg:px-[72px] lg:py-[64px]"
      style="box-shadow: 0 18px 45px rgba(57,61,50,0.06)"
    >
      <!-- subtle background compass mark -->
      <svg
        aria-hidden="true"
        viewBox="0 0 200 200"
        class="pointer-events-none absolute right-6 top-6 z-0 h-[110px] w-[110px] text-clay opacity-[0.09] sm:right-8 sm:top-8 md:h-[160px] md:w-[160px] lg:h-[200px] lg:w-[200px]"
        fill="none"
        stroke="currentColor"
        stroke-width="1.2"
      >
        <circle cx="100" cy="100" r="80" />
        <circle cx="100" cy="100" r="55" />
        <path d="M100 20 L110 100 L100 180 L90 100 Z" fill="currentColor" opacity="0.5" />
        <path d="M20 100 L100 90 L180 100 L100 110 Z" fill="currentColor" opacity="0.3" />
      </svg>

      <div class="relative max-w-[1180px]">
        {#if eyebrow}
          <div class="inline-flex items-center gap-2">
            <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
            <span class="text-xs font-semibold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
          </div>
        {/if}
        {#if title}
          <h2 class="font-serif mt-4 text-3xl leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[42px]">
            {title}
          </h2>
        {/if}
        {#if body}
          <p class="mt-4 max-w-[760px] text-base leading-relaxed text-ink/70 md:text-lg">{body}</p>
        {/if}
      </div>

      {#if cols.length}
        <div class="relative mt-10 grid gap-10 md:mt-14 md:grid-cols-2 md:gap-14">
          {#each cols as col (col.title)}
            <div>
              <h3 class="font-serif text-xl text-heading md:text-2xl">{col.title}</h3>
              <div class="mt-3 h-[2px] w-10 bg-goldfinch-gold" aria-hidden="true"></div>
              <ul class="mt-6 space-y-[15px]">
                {#each col.items as item (item)}
                  <li class="flex items-start gap-3.5 text-[15px] leading-relaxed text-heading">
                    <span aria-hidden="true" class="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-goldfinch-gold"></span>
                    <span>{item}</span>
                  </li>
                {/each}
              </ul>
            </div>
          {/each}
        </div>
      {/if}

      {#if footnote}
        <div class="relative mt-10 border-t border-ink/20 pt-6 md:mt-14 md:pt-7">
          <p class="max-w-3xl text-[15px] italic leading-relaxed text-ink/70 md:text-base">{footnote}</p>
        </div>
      {/if}
    </div>
  </div>
</section>
