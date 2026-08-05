<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { ArrowLeft, ArrowRight, Check, MessageCircle, Sparkles } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { revealHeading } from '$lib/animations';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import type { Tour } from '$lib/types';

  type Opt = { value: string; label: string; hint?: string };
  type Question = { key: string; title: string; subtitle?: string; options: Opt[] };

  const questions: Question[] = [
    {
      key: 'persona',
      title: "Who's travelling?",
      subtitle: 'So we can shape the pace and style.',
      options: [
        { value: 'family', label: 'Family' },
        { value: 'couple', label: 'Couple' },
        { value: 'group', label: 'Group of friends' },
        { value: 'solo', label: 'Solo' }
      ]
    },
    {
      key: 'experience',
      title: 'What kind of trip excites you?',
      options: [
        { value: 'safari', label: 'Safari' },
        { value: 'kilimanjaro', label: 'Kilimanjaro' },
        { value: 'beach', label: 'Beach / Zanzibar' },
        { value: 'gorilla', label: 'Gorilla trekking' },
        { value: 'cultural', label: 'Cultural' },
        { value: '', label: 'Not sure yet' }
      ]
    },
    {
      key: 'when',
      title: 'Roughly when?',
      options: [
        { value: 'Flexible', label: "I'm flexible" },
        { value: 'January', label: 'Jan' },
        { value: 'February', label: 'Feb' },
        { value: 'March', label: 'Mar' },
        { value: 'April', label: 'Apr' },
        { value: 'May', label: 'May' },
        { value: 'June', label: 'Jun' },
        { value: 'July', label: 'Jul' },
        { value: 'August', label: 'Aug' },
        { value: 'September', label: 'Sep' },
        { value: 'October', label: 'Oct' },
        { value: 'November', label: 'Nov' },
        { value: 'December', label: 'Dec' }
      ]
    },
    {
      key: 'length',
      title: 'How long do you have?',
      options: [
        { value: 'short', label: 'Short', hint: '1–4 days' },
        { value: 'medium', label: 'About a week', hint: '5–8 days' },
        { value: 'long', label: 'Longer', hint: '9+ days' },
        { value: '', label: 'Any length' }
      ]
    },
    {
      key: 'budget',
      title: 'Budget per person?',
      subtitle: 'Roughly — we can refine it together.',
      options: [
        { value: '1500', label: 'Under $1,500' },
        { value: '3000', label: '$1,500 – $3,000' },
        { value: '5000', label: '$3,000 – $5,000' },
        { value: '99999', label: '$5,000+' },
        { value: '', label: "I'm not sure" }
      ]
    }
  ];

  let step = 0;
  let answers: Record<string, string> = {};
  let tours: Tour[] = [];
  let loading = true;
  let questionEl: HTMLDivElement;

  $: isResults = step >= questions.length;
  $: current = questions[step];
  $: headingText = isResults ? 'Your best-fit trips' : 'Find the right trip in a minute';

  const scrollQuestionIntoView = async () => {
    await tick();
    questionEl?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const select = async (key: string, value: string) => {
    answers = { ...answers, [key]: value };
    step += 1;
    await scrollQuestionIntoView();
  };
  const back = async () => {
    if (step > 0) step -= 1;
    await scrollQuestionIntoView();
  };
  const restart = async () => {
    answers = {};
    step = 0;
    await scrollQuestionIntoView();
  };

  onMount(async () => {
    try {
      const res = await api.tours.list({ status: 'published', limit: 60 });
      tours = res.data.items ?? [];
    } catch {
      tours = [];
    } finally {
      loading = false;
    }
  });

  // Embedded category/destination names come through the tours select.
  const catName = (t: Tour) =>
    String((t as unknown as { tour_categories?: { name?: string } }).tour_categories?.name ?? '').toLowerCase();
  const destName = (t: Tour) =>
    String((t as unknown as { destinations?: { name?: string } }).destinations?.name ?? '');

  const expKeywords: Record<string, string[]> = {
    safari: ['safari'],
    kilimanjaro: ['kilimanjaro', 'climb'],
    beach: ['beach', 'zanzibar', 'coast'],
    gorilla: ['gorilla'],
    cultural: ['cultur']
  };
  const expMatches = (cat: string, exp: string) =>
    exp ? (expKeywords[exp] ?? [exp]).some((k) => cat.includes(k)) : false;

  const lengthMatches = (dur: number, len: string) =>
    (len === 'short' && dur <= 4) ||
    (len === 'medium' && dur >= 5 && dur <= 8) ||
    (len === 'long' && dur >= 9);

  const score = (t: Tour) => {
    let s = 0;
    if (expMatches(catName(t), answers.experience)) s += 5;
    if (lengthMatches(t.duration_days ?? 0, answers.length)) s += 3;
    const cap = Number(answers.budget || 0);
    if (cap && t.price_from && t.price_from <= cap) s += 2;
    if (t.is_featured) s += 1;
    return s;
  };

  const why = (t: Tour) => {
    const r: string[] = [];
    if (expMatches(catName(t), answers.experience)) {
      const label = questions[1].options.find((o) => o.value === answers.experience)?.label.toLowerCase();
      if (label) r.push(`a ${label} trip`);
    }
    if (lengthMatches(t.duration_days ?? 0, answers.length)) r.push(`${t.duration_days} days`);
    const cap = Number(answers.budget || 0);
    if (cap && t.price_from && t.price_from <= cap) r.push('within your budget');
    return r.length ? `Matches ${r.join(' · ')}.` : 'A trusted East Africa starting point.';
  };

  $: recommendations = (() => {
    if (!isResults) return [] as Array<{ tour: Tour; reason: string }>;
    const scored = tours.map((t) => ({ tour: t, s: score(t) }));
    scored.sort((a, b) => b.s - a.s);
    const picks = scored.filter((x) => x.s > 0).slice(0, 3);
    const list = picks.length ? picks : scored.slice(0, 3);
    return list.map((x) => ({ tour: x.tour, reason: why(x.tour) }));
  })();

  const experienceCategorySlug: Record<string, string> = {
    safari: 'safari',
    beach: 'beach-holiday',
    kilimanjaro: 'kilimanjaro'
  };

  $: specialistHref = (() => {
    const p = new URLSearchParams();
    if (answers.persona) p.set('persona', answers.persona);
    if (answers.experience) p.set('experience', answers.experience);
    if (answers.when && answers.when !== 'Flexible') p.set('month', answers.when);
    const q = p.toString();
    return `/plan-my-trip${q ? `?${q}` : ''}`;
  })();
  $: allToursHref = experienceCategorySlug[answers.experience]
    ? `/tours?category=${experienceCategorySlug[answers.experience]}`
    : '/tours';

  const planHref = (slug: string) =>
    `/plan-my-trip?tour=${slug}${answers.persona ? `&persona=${answers.persona}` : ''}`;
  const fmtPrice = (t: Tour) =>
    t.price_from ? `${t.currency ?? 'USD'} ${t.price_from.toLocaleString()}` : 'On request';
</script>

<section class="overflow-x-hidden bg-sand/40">
  <div class="container-shell flex min-h-[70vh] flex-col items-center py-10 sm:py-12 md:py-16">
    <div class="min-w-0 w-full max-w-2xl">
      <div class="text-center">
        <p class="font-serif text-xl italic text-clay">Trip Finder</p>
        {#key isResults}
          <h1 class="gf-trip-mobile-heading mx-auto mt-4 max-w-[19rem] text-3xl font-extrabold leading-tight tracking-tight text-heading md:hidden">
            {headingText}
          </h1>
          <h1 class="mx-auto mt-4 hidden max-w-xl text-[40px] font-extrabold leading-tight tracking-tight text-heading md:block" use:revealHeading>
            {headingText}
          </h1>
        {/key}
        {#if !isResults}
          <p class="mx-auto mt-3 max-w-full break-words text-ink/70 sm:max-w-md">A few quick questions and we'll recommend trips that actually fit you.</p>
        {/if}
      </div>

      {#if !isResults}
        <!-- progress -->
        <div class="mt-6 min-w-0 rounded-[14px] border border-white/10 bg-deep-green p-3 shadow-[0_18px_40px_rgba(31,77,58,0.18)] sm:mt-8">
          <div class="flex items-center gap-3">
            {#if step > 0}
              <button type="button" class="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-white/15 bg-white/[0.06] text-white/75 transition hover:border-goldfinch-gold/45 hover:bg-white/[0.1] hover:text-white" aria-label="Back" on:click={back}>
                <ArrowLeft size={16} />
              </button>
            {/if}
            <div class="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10 shadow-inner">
              <div class="gf-trip-progress-fill h-full rounded-full bg-goldfinch-gold" style:width={`${((step + 1) / questions.length) * 100}%`}></div>
            </div>
            <span class="shrink-0 text-xs font-semibold text-white/65">{step + 1} / {questions.length}</span>
          </div>
        </div>

        <!-- question -->
        <div class="gf-trip-question-card gf-panel-dark relative mt-6 min-w-0 overflow-hidden rounded-[14px] border border-white/10 p-4 shadow-[0_24px_60px_rgba(31,77,58,0.22)] sm:mt-8 sm:p-6 md:p-8" bind:this={questionEl}>
          <h2 class="relative text-xl font-bold text-white md:text-2xl">{current.title}</h2>
          {#if current.subtitle}<p class="relative mt-1 text-sm text-white/65">{current.subtitle}</p>{/if}

          <div class={`mt-5 grid gap-3 sm:mt-6 ${current.key === 'when' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {#each current.options as opt (opt.value)}
              {@const selected = answers[current.key] === opt.value}
              <button
                type="button"
                class={`gf-trip-option group relative flex min-h-12 items-center justify-between gap-2 rounded-[10px] border px-3 py-3 text-left sm:px-4 ${
                  selected
                    ? 'border-goldfinch-gold bg-goldfinch-gold text-heading ring-1 ring-goldfinch-gold/25'
                    : 'border-white/12 bg-white/[0.055] text-white hover:border-goldfinch-gold/45 hover:bg-white/[0.085]'
                }`}
                on:click={() => select(current.key, opt.value)}
              >
                <span class="min-w-0">
                  <span class={`block break-words font-semibold leading-snug ${selected ? 'text-heading' : 'text-white'}`}>{opt.label}</span>
                  {#if opt.hint}<span class={`block text-xs ${selected ? 'text-heading/70' : 'text-white/55'}`}>{opt.hint}</span>{/if}
                </span>
                <ArrowRight size={16} class={`hidden shrink-0 transition sm:block ${selected ? 'text-heading/50' : 'text-white/30 group-hover:text-goldfinch-gold'}`} />
              </button>
            {/each}
          </div>
        </div>

        <p class="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-ink/70">
          <span>Prefer to skip ahead?</span>
          <a class="font-semibold text-forest hover:text-heading" href="/plan-my-trip">Talk to a specialist</a>
          <span aria-hidden="true">·</span>
          <a class="font-semibold text-forest hover:text-heading" href="/tours">See all tours</a>
        </p>
      {:else if loading}
        <div class="mt-10"><LoadingState message="Finding your best-fit trips…" /></div>
      {:else}
        <!-- results -->
        <div class="mt-8 grid gap-4">
          {#if recommendations.length}
            {#each recommendations as rec (rec.tour.id)}
              <article class="flex flex-col overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(57,61,50,0.07)] sm:flex-row">
                <div class="aspect-[16/10] w-full shrink-0 overflow-hidden bg-skywash sm:aspect-auto sm:w-44">
                  {#if rec.tour.main_image_url}
                    <img class="h-full w-full object-cover" src={rec.tour.main_image_url} alt={rec.tour.title} loading="lazy" />
                  {/if}
                </div>
                <div class="flex flex-1 flex-col p-5">
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
                    {#if destName(rec.tour)}<span class="text-clay">{destName(rec.tour)}</span>{/if}
                    {#if rec.tour.duration_days}<span class="text-ink/70">{rec.tour.duration_days} days</span>{/if}
                    <span class="text-ink/70">from <span class="text-heading">{fmtPrice(rec.tour)}</span></span>
                  </div>
                  <h3 class="mt-1 text-lg font-extrabold leading-snug text-heading">{rec.tour.title}</h3>
                  <p class="mt-1.5 inline-flex items-start gap-1.5 text-sm font-medium text-forest">
                    <Sparkles size={15} class="mt-0.5 shrink-0 text-goldfinch-gold" />{rec.reason}
                  </p>
                  <div class="mt-4 flex flex-wrap gap-2.5">
                    <a class="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-goldfinch-gold px-4 text-sm font-bold text-heading transition hover:brightness-105" href={planHref(rec.tour.slug)}>
                      <Sparkles size={15} /> Plan This Trip
                    </a>
                    <a class="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-ink/15 bg-surface px-4 text-sm font-semibold text-ink/70 transition hover:bg-sand/60" href={`/tours/${rec.tour.slug}`}>
                      View Trip
                    </a>
                  </div>
                </div>
              </article>
            {/each}
          {:else}
            <div class="rounded-[8px] border border-dashed border-ink/15 bg-surface p-8 text-center">
              <p class="font-semibold text-heading">We couldn't auto-match a trip — but we can still help.</p>
              <p class="mt-1 text-sm text-ink/70">Tell a specialist what you have in mind and we'll plan it around you.</p>
            </div>
          {/if}
        </div>

        <!-- escape hatches -->
        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <a class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-deep-green px-5 font-bold text-white shadow-sm transition hover:bg-forest" href={specialistHref}>
            <MessageCircle size={18} /> Talk to a specialist
          </a>
          <a class="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-ink/15 bg-surface px-5 font-semibold text-ink transition hover:bg-sand/60" href={allToursHref}>
            See all tours <ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-5 text-center">
          <button type="button" class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading" on:click={restart}>
            <Check size={15} /> Start over
          </button>
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  .gf-trip-mobile-heading {
    animation: gf-trip-heading-in 420ms ease-out both;
  }

  .gf-trip-progress-fill {
    box-shadow: 0 0 18px rgb(212 175 55 / 0.34);
    transition: width 460ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .gf-trip-question-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 12% 0%, rgb(212 175 55 / 0.18), transparent 32%),
      linear-gradient(135deg, rgb(255 255 255 / 0.07), transparent 46%);
    pointer-events: none;
  }

  .gf-trip-option {
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.08);
    transition:
      transform 180ms ease,
      border-color 220ms ease,
      background-color 220ms ease,
      box-shadow 220ms ease,
      color 220ms ease;
  }

  .gf-trip-option:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 26px rgb(0 0 0 / 0.12), inset 0 1px 0 rgb(255 255 255 / 0.12);
  }

  .gf-trip-option:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgb(212 175 55 / 0.28), inset 0 1px 0 rgb(255 255 255 / 0.12);
  }

  @keyframes gf-trip-heading-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .gf-trip-mobile-heading {
      animation: none;
    }

    .gf-trip-progress-fill,
    .gf-trip-option {
      transition: none;
    }

    .gf-trip-option:hover {
      transform: none;
    }
  }
</style>
