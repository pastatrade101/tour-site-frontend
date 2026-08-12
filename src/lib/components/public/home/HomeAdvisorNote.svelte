<script lang="ts">
  import { ArrowRight, Binoculars, CalendarDays, Compass, Hotel, MapPin, MessageCircle, Route } from '@lucide/svelte';
  import { brand } from '$lib/brand';
  import { trackEvent } from '$lib/analytics';
  import { publicSettings, settingText } from '$lib/settings';
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

  const detailIcons = [CalendarDays, MapPin, Route, Hotel, Compass, Binoculars];
  const splitDetail = (columnTitle: string, item: string) => {
    const parts = item.split(/\s+[—–]\s+|:\s+/);
    return parts.length > 1
      ? { title: parts[0], body: parts.slice(1).join(' — ') }
      : { title: columnTitle, body: item };
  };
  $: details = cols.flatMap((column) => column.items.map((item) => splitDetail(column.title, item))).slice(0, 6);
  $: waDigits = (settingText($publicSettings, 'whatsapp_number') || settingText($publicSettings, 'contact_phone')).replace(/[^0-9]/g, '');
  $: waHref = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`Hello ${brand.name}, I would like help planning my trip.`)}`
    : '';
</script>

<section class="home-advisor-note hidden">
  <div class="container-shell">
    <div
      class="home-advisor-card relative overflow-hidden rounded-[12px] border border-ink/20 bg-sand px-7 py-8 sm:px-10 sm:py-10 md:px-14 md:py-14 lg:px-[72px] lg:py-[64px]"
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

<section class="home-advisor-desktop bg-[#f3eee4] py-8 sm:py-10 xl:py-12">
  <div class="container-shell">
    <div class="relative overflow-hidden rounded-[18px] border border-white/80 bg-[#fffdf9] px-5 py-7 shadow-[0_24px_70px_rgba(57,61,50,0.08)] sm:px-7 sm:py-8 lg:rounded-[24px] lg:px-10 lg:py-10 xl:px-12 xl:py-11">
      <div class="advisor-contours pointer-events-none absolute inset-0 opacity-50" aria-hidden="true"></div>

      <div class="relative grid items-start gap-8 lg:grid-cols-[minmax(390px,0.92fr)_minmax(0,1.3fr)] lg:gap-10 xl:grid-cols-[minmax(440px,0.95fr)_minmax(0,1.35fr)] xl:gap-12">
        <div class="border-b border-ink/10 pb-8 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-10 xl:pr-12">
          {#if eyebrow}
            <div class="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-clay">
              <span class="h-[3px] w-10 rounded-full bg-goldfinch-gold"></span>{eyebrow}
            </div>
          {/if}
          {#if title}
            <h2 class="mt-5 max-w-[15ch] font-serif text-[clamp(2.15rem,9vw,3.8rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-heading">{title}</h2>
          {/if}
          <div class="mt-6 h-[3px] w-16 bg-goldfinch-gold"></div>
          {#if body}<p class="mt-5 max-w-md text-[16px] leading-7 text-ink/72">{body}</p>{/if}
          <a href="/plan-my-trip" class="mt-7 inline-flex min-h-12 items-center gap-7 rounded-[9px] bg-goldfinch-gold px-6 text-[15px] font-bold text-heading shadow-[0_12px_28px_rgba(228,169,46,0.22)] transition hover:-translate-y-0.5 hover:brightness-105">
            Plan My Trip <ArrowRight size={20} strokeWidth={2.3} />
          </a>
        </div>

        {#if details.length}
          <div class="grid grid-cols-2 lg:grid-cols-3">
            {#each details as detail, index}
              <article class={`advisor-detail flex min-h-[180px] min-w-0 flex-col items-center justify-center px-3 py-5 text-center sm:px-5 lg:min-h-[190px] lg:py-4 ${index % 3 !== 2 ? 'lg:border-r lg:border-ink/10' : ''} ${index < 3 && details.length > 3 ? 'lg:border-b lg:border-ink/10' : ''}`}>
                <span class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f3eee4] text-heading lg:h-16 lg:w-16">
                  <svelte:component this={detailIcons[index]} size={29} strokeWidth={1.65} />
                </span>
                <h3 class="mt-4 text-[11px] font-extrabold uppercase tracking-[0.07em] text-heading sm:text-[12px] lg:text-[13px]">{detail.title}</h3>
                <p class="mx-auto mt-2 max-w-[17rem] text-[12.5px] leading-[1.5] text-ink/68 sm:text-[13px] lg:text-[14px]">{detail.body}</p>
              </article>
            {/each}
          </div>
        {/if}
      </div>

      {#if footnote || waHref}
        <div class="relative mt-8 grid items-center overflow-hidden rounded-[16px] bg-deep-green px-5 py-6 text-white shadow-[0_18px_40px_rgba(31,77,58,0.2)] sm:px-7 lg:mt-9 lg:min-h-[118px] lg:grid-cols-[1.35fr_0.65fr] lg:rounded-[18px] lg:px-8 lg:py-0">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_15%_100%,rgba(228,169,46,0.14),transparent_35%),linear-gradient(110deg,rgba(255,255,255,0.035),transparent_55%)]" aria-hidden="true"></div>
          {#if footnote}
            <div class="relative flex items-center gap-4 border-b border-white/20 pb-5 lg:gap-7 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-10">
              <span class="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-goldfinch-gold/35 bg-white/[0.05] text-goldfinch-gold lg:h-16 lg:w-16"><Compass size={28} strokeWidth={1.5} /></span>
              <p class="max-w-xl font-serif text-[17px] leading-snug text-white sm:text-[18px] lg:text-[20px]">{footnote}</p>
            </div>
          {/if}
          {#if waHref}
            <a href={waHref} target="_blank" rel="noopener noreferrer" class="relative mt-5 flex items-center gap-4 lg:mt-0 lg:gap-5 lg:pl-10" on:click={() => trackEvent('whatsapp_click', { cta_location: 'home_advisor_note' })}>
              <span class="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-goldfinch-gold/40 text-goldfinch-gold"><MessageCircle size={25} /></span>
              <span><strong class="block font-serif text-[20px] font-semibold">Talk to an Advisor</strong><small class="mt-1 flex items-center gap-2 text-[13px] font-bold text-goldfinch-gold">Chat with our safari experts <ArrowRight size={14} /></small></span>
            </a>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  .advisor-contours {
    background-image:
      radial-gradient(ellipse at 15% 20%, transparent 0 28%, rgb(var(--c-goldfinch-gold) / 0.08) 28.3% 28.6%, transparent 29%),
      radial-gradient(ellipse at 88% 32%, transparent 0 25%, rgb(var(--c-goldfinch-gold) / 0.07) 25.3% 25.6%, transparent 26%);
  }

  @media (max-width: 1023px) {
    .advisor-detail:nth-child(odd) {
      border-right: 1px solid rgb(var(--c-ink) / 0.1);
    }

    .advisor-detail:not(:nth-last-child(-n + 2)) {
      border-bottom: 1px solid rgb(var(--c-ink) / 0.1);
    }
  }

  @media (max-width: 767px) {
    .home-advisor-note {
      padding-block: 3.25rem;
      background: rgb(var(--c-canvas));
    }

    .home-advisor-card {
      padding: 1.35rem;
      border-radius: 12px;
    }

    .home-advisor-card h2 {
      font-size: clamp(1.85rem, 8vw, 2.25rem);
      line-height: 1.08;
      text-wrap: balance;
    }

    .home-advisor-card p,
    .home-advisor-card li {
      font-size: 0.95rem;
      line-height: 1.65;
    }
  }
</style>
