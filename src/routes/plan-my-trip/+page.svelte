<script lang="ts">
  /**
   * Plan My Trip — a seven-step planner that suggests real trips as it goes.
   *
   * Every "Plan My Trip" link on the site lands here. The visitor reaches a
   * specialist with a trip shape (type, travellers, dates, length and pace,
   * priorities, comfort, budget, planning stage) and the published tours that
   * fit it, which the specialist sees in the enquiry.
   *
   * Nothing on the page is invented: the trip types, priorities and comfort
   * levels on offer are the ones the catalogue backs, the budget scale is our
   * own range of starting prices, and the trust line is the real review
   * summary. The logic lives in lib/tripPlanner.ts; the request goes through
   * the same bookings endpoint as every other form, so the CMS inbox, the staff
   * and traveller emails, HubSpot and the WhatsApp opt-in all work unchanged.
   */
  import { onMount, tick } from 'svelte';
  import { fade, fly, scale as pop, slide } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { backOut, cubicOut, quintOut } from 'svelte/easing';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import {
    ArrowLeft,
    ArrowRight,
    BedDouble,
    CalendarDays,
    Check,
    ChevronDown,
    Clock,
    Compass,
    Flag,
    Gauge,
    Heart,
    Lightbulb,
    Loader2,
    Lock,
    MapPin,
    Minus,
    Pencil,
    Plus,
    Sparkles,
    Star,
    Users,
    Wallet
  } from '@lucide/svelte';
  import { api, ApiRequestError } from '$lib/api/client';
  import { campaignTags, createFormTracker, getAttribution, lastCtaClicked, pushDataLayerEvent } from '$lib/analytics';
  import { afterNavigate } from '$app/navigation';
  import { currency, formatUsd } from '$lib/currency';
  import { brand } from '$lib/brand';
  import { locale, t } from '$lib/i18n/ui';
  import type { ReviewSummary } from '$lib/types';
  import Img from '$lib/components/public/Img.svelte';
  import {
    LENGTHS,
    MAX_PRIORITIES,
    MONTHS,
    MONTH_NAMES,
    MONTH_TIP,
    NOT_SURE,
    PACES,
    PARTIES,
    SEASON,
    STAGES,
    activeMonth,
    budgetScale,
    catalogueTips,
    childAgesOf,
    comfortOptions,
    fromQuery,
    insights,
    lengthLabel,
    offeredPriorities,
    offeredTypes,
    placesOf,
    popularBand,
    recommend,
    startingAtOrUnder,
    tierLabel,
    totalDays,
    travellers,
    typeOf,
    whenText,
    fill,
    type Speak,
    type Draft,
    type Party,
    type PlannerCategory,
    type PlannerTour,
    type TypeId
  } from '$lib/tripPlanner';

  export let data: {
    tours: PlannerTour[];
    categorySlugs: string[];
    categories: PlannerCategory[];
    reviews: ReviewSummary | null;
    /** English titles (by tour id) and place names (by slug) — what staff read. */
    englishNames: { tours: Record<string, string>; places: Record<string, string> };
  };

  // Translation keys, resolved with $t where the progress bar renders.
  const STEPS = [
    'pg_plan_my_trip.step_trip_type',
    'ui.travellers',
    'pg_plan_my_trip.step_when',
    'pg_plan_my_trip.step_length_pace',
    'ui.preferences',
    'pg_plan_my_trip.step_planning_stage',
    'pg_plan_my_trip.step_summary'
  ];
  const LAST = STEPS.length - 1;

  const now = new Date();
  const thisYear = now.getFullYear();
  const years = [thisYear, thisYear + 1, thisYear + 2];
  const monthPast = (year: number, month: number) => year === thisYear && month < now.getMonth();
  // Today in the visitor's own time zone, as the date inputs read it.
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  // Links from tour, park and style pages carry context — start from it.
  const incoming = fromQuery($page.url.searchParams, now, data.categories);
  const offered = offeredTypes(data.tours, data.categorySlugs);
  const priorityOptions = offeredPriorities(data.tours, data.categorySlugs);
  const comfortChoices = comfortOptions(data.tours);
  const scale = budgetScale(data.tours);
  // Only worth explaining when more than one way to start a safari is on offer.
  const baseNote = offered.filter((type) => type.base).length > 1;

  // A month from a link is kept only in a year the planner offers; one years
  // away is dropped rather than quietly moved to another year.
  const yearOk = incoming.year === undefined || (incoming.year >= thisYear && incoming.year <= years[years.length - 1]);
  const startYear = incoming.year !== undefined && yearOk ? incoming.year : thisYear;
  const startMonth = yearOk && incoming.month !== undefined && !monthPast(startYear, incoming.month) ? incoming.month : null;
  const startDate = incoming.startDate && incoming.startDate >= today ? incoming.startDate : '';

  let d: Draft = {
    types: incoming.types.filter((type) => offered.some((o) => o.id === type)),
    party: incoming.party,
    adults: incoming.adults ?? 2,
    // A family from a page's head count is that many people, split unknown —
    // no child is invented; one is only the starting point when nothing was counted.
    children: incoming.children ?? (incoming.party === 'family' && incoming.adults === undefined ? 1 : 0),
    childAges: Array.from({ length: incoming.children ?? (incoming.party === 'family' && incoming.adults === undefined ? 1 : 0) }, () => ''),
    dateMode: startDate ? 'exact' : 'flexible',
    year: startDate ? Number(startDate.slice(0, 4)) : startYear,
    month: startDate ? Number(startDate.slice(5, 7)) - 1 : startMonth,
    dateUnsure: false,
    startDate,
    endDate: '',
    lengths: { ...incoming.lengths },
    pace: '',
    priorities: incoming.priorities.filter((p) => priorityOptions.includes(p)),
    comfort: '',
    budget: null,
    budgetUnsure: false,
    stage: '',
    notes: ''
  };

  let step = 0;
  let errors: Record<string, string> = {};

  // ── Tracking ───────────────────────────────────────────────────────────────
  // The planner is one of the main leads. One tracker records its whole path —
  // opened, first answer, each step passed, what stopped a step, where it was
  // left, the lead — so the CMS can show where planners drop out. Only ids,
  // bands and step names leave the page, never what anyone typed.
  // In the order of STEPS; the last step's completion is the submit itself.
  const STEP_KEYS = ['trip_type', 'travellers', 'when', 'length_pace', 'preferences', 'planning_stage', 'summary'];
  const tracker = createFormTracker({ form_name: 'plan_my_trip', form_type: 'trip_planner', lead_type: 'plan_my_trip' }, 'plan_my_trip_submitted');
  // Every answer replaces the draft with a new object, so the first time it is
  // not the one built above, the visitor has answered something themselves.
  // What a link prefilled (a trip type, a month, who is travelling) is not a start.
  const prefilled = d;
  $: if (d !== prefilled) tracker.started();
  // Where the visitor is, for the abandon event.
  $: tracker.at(step, STEP_KEYS[step]);
  onMount(() => {
    // The planner is the page, so opening the page is seeing the form.
    tracker.opened();
    return tracker.watchLeave();
  });
  /** The field a refused step stopped on first, by its key (never its value). */
  const firstError = () => Object.keys(errors)[0] ?? 'unknown';

  // Contact — only asked on the last step.
  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'sw', label: 'Kiswahili' },
    { code: 'de', label: 'Deutsch (German)' },
    { code: 'fr', label: 'Français (French)' },
    { code: 'es', label: 'Español (Spanish)' },
    { code: 'it', label: 'Italiano (Italian)' }
  ];
  const DIAL_CODES = ['+255', '+254', '+256', '+250', '+44', '+1', '+49', '+33', '+34', '+39', '+31', '+41', '+61', '+27', '+971'];
  const CONTACTS = ['WhatsApp', 'Email', 'Phone call'] as const;
  // The values above go to staff as they are; only the button text is translated.
  const CONTACT_LABELS: Record<(typeof CONTACTS)[number], string> = {
    WhatsApp: 'cta.whatsapp',
    Email: 'form.email',
    'Phone call': 'pg_plan_my_trip.phone_call'
  };

  let full_name = '';
  let email = '';
  let dialCode = '+44';
  let phone = '';
  let contact: (typeof CONTACTS)[number] = 'WhatsApp';
  let whatsappConsent = false;
  let language = LANGUAGES.some((l) => l.code === $locale) ? String($locale) : 'en';
  let hp_company = '';
  // One per filled-in form: the bookings table's unique index on it is what stops a double click sending twice.
  const idempotencyKey = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

  let submitting = false;
  let submitted = false;
  let bookingCode = '';
  // The Google Ads conversion is pushed once per page visit, however the
  // success path is reached.
  let conversionSent = false;
  // The page the visitor came to the planner from, inside the site.
  let cameFromPath = '';
  afterNavigate(({ from }) => {
    if (from?.url && !cameFromPath) cameFromPath = from.url.pathname;
  });
  let errorMessage = '';
  let card: HTMLElement;

  // Mobile: the sidebar panels fold away under the form.
  let openSummary = false;
  let openMatches = false;

  // ── Motion ─────────────────────────────────────────────────────────────────
  // Every transition honours the visitor's "reduce motion" setting: ms() turns
  // durations and delays to zero, and the CSS animations are switched off below.
  const reduced = browser && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const ms = (n: number) => (reduced ? 0 : n);
  /** 1 going forward, -1 going back — the next step slides in from that side. */
  let dir = 1;
  /** The sidebar suggestions wait for the page to be live, so their entrance is seen. */
  let mounted = false;
  onMount(() => (mounted = true));
  let nextButton: HTMLButtonElement | undefined;
  /** A small shake of the button when a step still needs an answer. */
  const nudge = () =>
    !reduced &&
    nextButton?.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
      { duration: 380, easing: 'ease-out' }
    );

  $: people = travellers(d);
  $: days = totalDays(d);
  $: month = activeMonth(d);
  // ── What the visitor reads, in their language ─────────────────────────────
  // The planner's lists and sentences are English (what the specialist reads);
  // each is looked up here by its English text. A text with no translation
  // stays English rather than breaking.
  const keyOf = (english: string) =>
    'tp.' + english.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
  $: tp = (english: string): string => {
    if (!english) return english;
    const key = keyOf(english);
    const out = $t(key);
    return out === key ? english : out;
  };
  $: monthName = (index: number) => new Intl.DateTimeFormat($locale, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, index, 1)));
  $: monthShort = (index: number) => new Intl.DateTimeFormat($locale, { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, index, 1)));
  $: speak = {
    say: (template: string, vars?: Record<string, string | number>) => fill(tp(template), vars),
    term: tp,
    list: (items: string[]) => (items.length < 2 ? items.join('') : new Intl.ListFormat($locale, { type: 'conjunction' }).format(items)),
    month: monthName,
    monthShort
  } satisfies Speak;
  /** "12 Mar 2027" in the reader's language. */
  $: dateIn = (iso: string) =>
    /^\d{4}-\d{2}-\d{2}/.test(iso)
      ? new Intl.DateTimeFormat($locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`))
      : iso;
  /** When, as the visitor reads it (whenText stays the specialist's English). */
  $: whenLocal = (() => {
    if (d.dateMode === 'exact') {
      if (!d.startDate) return '';
      return d.endDate ? `${dateIn(d.startDate)} → ${dateIn(d.endDate)}` : speak.say('From {date}', { date: dateIn(d.startDate) });
    }
    if (d.dateUnsure) return NOT_SURE;
    return d.month === null ? '' : `${monthName(d.month)} ${d.year}`;
  })();

  $: price = (usd: number) => formatUsd(usd, $currency);
  // Round figures read better without the formatter's cents.
  $: whole = (usd: number) => price(usd).replace(/[.,]00(?!\d)/, '');
  $: recs = recommend(d, data.tours, incoming.context, whole, speak);
  // Changes whenever a different set of trips is suggested — replays the highlight.
  $: recKey = recs.map((rec) => rec.tour.id).join('|');
  $: tips = [...catalogueTips(d, data.tours, data.categories, whole, speak).map((tip) => tip.text), ...insights(d, speak)].slice(0, 4);
  $: chosenTypes = d.types.filter((type) => type !== 'unsure');
  // The trips the budget count is measured against: those of the chosen kinds.
  $: pool = chosenTypes.length ? data.tours.filter((tour) => chosenTypes.some((type) => typeOf(type).matches(tour))) : data.tours;
  $: sliderValue = d.budget ?? scale?.start ?? 0;
  $: budgetText = (usd: number) => $t('pg_plan_my_trip.budget_up_to').replace('{price}', () => whole(usd));
  $: underBudget = scale ? startingAtOrUnder(pool, sliderValue) : 0;
  $: pickedPriorities = d.priorities.filter((p) => p !== NOT_SURE);
  $: partyLabel = PARTIES.find((p) => p.id === d.party)?.label ?? '';
  $: ages = childAgesOf(d);

  $: interest = (() => {
    const slug = incoming.context.destinationSlug;
    if (slug) {
      for (const tour of data.tours) {
        const hit = placesOf(tour).find((p) => p.slug === slug);
        if (hit) return hit.name;
      }
    }
    return incoming.context.placeName ?? '';
  })();

  // ── What the visitor sees of their own answers ──────────────────────────────
  $: travellerText = d.party
    ? [
        tp(partyLabel),
        $t(people.adults > 1 ? 'pg_plan_my_trip.n_adults' : 'pg_plan_my_trip.n_adult').replace('{n}', String(people.adults)),
        people.children
          ? $t(people.children > 1 ? 'pg_plan_my_trip.n_children' : 'pg_plan_my_trip.n_child').replace('{n}', String(people.children)) +
            (ages.length ? ` (${$t('pg_plan_my_trip.ages_list').replace('{ages}', ages.join(', '))})` : '')
          : ''
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  $: whenDisplay = (() => {
    const text = whenLocal;
    if (!text || text === NOT_SURE) return text ? $t('ui.not_sure_yet') : '';
    return month !== null ? `${text} · ${$t('pg_plan_my_trip.season_value').replace('{season}', tp(SEASON[month]))}` : text;
  })();
  $: lengthDisplay = d.types.some((type) => d.lengths[type])
    ? d.types
        .filter((type) => d.lengths[type])
        .map((type) => `${type === 'unsure' ? $t('pg_plan_my_trip.whole_trip') : tp(lengthLabel(type))}: ${d.lengths[type] === NOT_SURE ? $t('ui.not_sure_yet') : tp(d.lengths[type] ?? '')}`)
        .join(' · ') + (days ? ` (${$t('pg_plan_my_trip.about_n_days').replace('{n}', String(days))})` : '')
    : '';
  $: comfortDisplay = d.comfort ? (d.comfort === NOT_SURE ? $t('ui.not_sure_yet') : tp(tierLabel(d.comfort))) : '';
  $: budgetDisplay = d.budgetUnsure
    ? $t('ui.not_sure_yet')
    : d.budget !== null
      ? `${budgetText(d.budget)} ${$t('pg_plan_my_trip.per_person')}`
      : '';
  $: prioritiesDisplay = d.priorities.map((p) => (p === NOT_SURE ? $t('ui.not_sure_yet') : tp(p))).join(', ');
  $: typesDisplay = d.types.map((type) => (type === 'unsure' ? $t('ui.not_sure_yet') : tp(typeOf(type).label))).join(', ');
  $: paceDisplay = d.pace === NOT_SURE ? $t('ui.not_sure_yet') : tp(d.pace);

  /*
   * "Your trip so far": one row per answer, each with its icon. Answers that
   * are a list (trip types, priorities) show as chips rather than one long
   * joined line, so the panel stays easy to scan as it fills.
   */
  $: soFar = [
    { key: 'trip', icon: Compass, label: $t('pg_plan_my_trip.row_trip'), value: typesDisplay, chips: d.types.map((type) => (type === 'unsure' ? $t('ui.not_sure_yet') : tp(typeOf(type).label))) },
    { key: 'interest', icon: MapPin, label: $t('pg_plan_my_trip.row_interest'), value: interest, chips: [] as string[] },
    { key: 'travellers', icon: Users, label: $t('ui.travellers'), value: travellerText, chips: [] as string[] },
    { key: 'when', icon: CalendarDays, label: $t('pg_plan_my_trip.step_when'), value: whenDisplay, chips: [] as string[] },
    { key: 'length', icon: Clock, label: $t('pg_plan_my_trip.row_length'), value: lengthDisplay, chips: [] as string[] },
    { key: 'pace', icon: Gauge, label: $t('pg_plan_my_trip.row_pace'), value: d.pace ? paceDisplay : '', chips: [] as string[] },
    { key: 'priorities', icon: Heart, label: $t('pg_plan_my_trip.row_priorities'), value: prioritiesDisplay, chips: d.priorities.map((p) => (p === NOT_SURE ? $t('ui.not_sure_yet') : tp(p))) },
    { key: 'comfort', icon: BedDouble, label: $t('pg_plan_my_trip.row_comfort'), value: comfortDisplay, chips: [] as string[] },
    { key: 'budget', icon: Wallet, label: $t('pg_plan_my_trip.row_budget'), value: budgetDisplay, chips: [] as string[] },
    { key: 'stage', icon: Flag, label: $t('pg_plan_my_trip.row_stage'), value: tp(d.stage), chips: [] as string[] }
  ].filter((row) => row.value);

  $: review = [
    { label: $t('pg_plan_my_trip.row_trip_types'), value: typesDisplay, at: 0 },
    { label: $t('ui.travellers'), value: travellerText, at: 1 },
    { label: $t('pg_plan_my_trip.step_when'), value: whenDisplay, at: 2 },
    { label: $t('pg_plan_my_trip.step_length_pace'), value: [lengthDisplay, d.pace === NOT_SURE ? '' : tp(d.pace)].filter(Boolean).join(' · '), at: 3 },
    { label: $t('pg_plan_my_trip.row_preferences'), value: [prioritiesDisplay, comfortDisplay, budgetDisplay].filter(Boolean).join(' · '), at: 4 },
    { label: $t('pg_plan_my_trip.step_planning_stage'), value: tp(d.stage), at: 5 }
  ];

  // The final screen's recap, in the order the traveller will recognise it.
  $: recap = [
    { label: $t('pg_plan_my_trip.row_trip_type'), value: typesDisplay },
    { label: $t('pg_plan_my_trip.row_travel_date'), value: whenLocal === NOT_SURE ? $t('ui.not_sure_yet') : whenLocal },
    { label: $t('ui.travellers'), value: travellerText },
    { label: $t('pg_plan_my_trip.row_comfort_level'), value: comfortDisplay },
    { label: $t('pg_plan_my_trip.row_priorities'), value: prioritiesDisplay }
  ];

  // The real review summary, as the top bar shows it.
  $: platforms = (data.reviews?.by_platform ?? []).map((entry) => String(entry.platform ?? '').trim()).filter(Boolean);
  $: trustText = data.reviews
    ? $t(platforms.length ? 'pg_plan_my_trip.trust_reviews' : 'pg_plan_my_trip.trust_reviews_plain')
        .replace('{avg}', (Math.round(Number(data.reviews.average) * 10) / 10).toFixed(1))
        .replace('{n}', String(data.reviews.count))
        .replace('{platforms}', platforms.join(', '))
    : '';

  // ── Answering ──────────────────────────────────────────────────────────────
  const clear = (...keys: string[]) => {
    if (!keys.some((key) => errors[key])) return;
    const next = { ...errors };
    for (const key of keys) delete next[key];
    errors = next;
  };

  /**
   * "Not sure yet" stands alone. The ways a safari can start (Safari, Safari
   * from Zanzibar, Kenya & Tanzania) replace one another: they are alternatives,
   * and their lengths would otherwise add up as if they were two safaris.
   */
  const toggleType = (id: TypeId) => {
    let types: TypeId[];
    if (id === 'unsure') types = d.types.includes('unsure') ? [] : ['unsure'];
    else {
      const rest = d.types.filter((type) => type !== 'unsure');
      if (rest.includes(id)) types = rest.filter((type) => type !== id);
      else types = [...(typeOf(id).base ? rest.filter((type) => !typeOf(type).base) : rest), id];
    }
    const lengths: Draft['lengths'] = {};
    for (const type of types) if (d.lengths[type]) lengths[type] = d.lengths[type];
    d = { ...d, types, lengths };
    clear('types');
  };

  const pickParty = (id: Party) => {
    // A family usually travels with at least one child; the counter can take it back to none.
    const children = id === 'family' && d.children === 0 ? 1 : d.children;
    d = { ...d, party: id, children, childAges: resize(d.childAges, children) };
    clear('party');
  };

  const resize = (list: string[], n: number) => Array.from({ length: n }, (_, i) => list[i] ?? '');
  const setAdults = (n: number) => (d = { ...d, adults: Math.max(1, Math.min(20, n)) });
  const setChildren = (n: number) => {
    const children = Math.max(0, Math.min(20, n));
    d = { ...d, children, childAges: resize(d.childAges, children) };
  };
  const setAge = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    const age = digits === '' ? '' : String(Math.min(17, Number(digits)));
    d = { ...d, childAges: d.childAges.map((value, i) => (i === index ? age : value)) };
  };

  const pickYear = (year: number) => (d = { ...d, year, month: d.month !== null && monthPast(year, d.month) ? null : d.month });
  const pickMonth = (index: number) => {
    d = { ...d, month: index, dateUnsure: false };
    clear('when');
  };
  const toggleDateUnsure = () => {
    d = { ...d, dateUnsure: !d.dateUnsure, month: d.dateUnsure ? d.month : null };
    clear('when');
  };
  const setDateMode = (mode: Draft['dateMode']) => {
    d = { ...d, dateMode: mode };
    clear('when', 'start', 'end');
  };
  const setStart = (value: string) => {
    // An end date before the new start is no longer an answer.
    d = { ...d, startDate: value, endDate: d.endDate && value && d.endDate < value ? '' : d.endDate };
    clear('start', 'end');
  };
  const setEnd = (value: string) => {
    d = { ...d, endDate: value };
    clear('end');
  };

  const pickLength = (type: TypeId, band: string) => {
    d = { ...d, lengths: { ...d.lengths, [type]: band } };
    clear(`len_${type}`);
  };
  const pickPace = (id: string) => {
    d = { ...d, pace: id };
    clear('pace');
  };

  /** Up to three priorities; "Not sure yet" replaces the rest. */
  const togglePriority = (id: string) => {
    if (id === NOT_SURE) return (d = { ...d, priorities: d.priorities.includes(NOT_SURE) ? [] : [NOT_SURE] });
    const rest = d.priorities.filter((p) => p !== NOT_SURE);
    if (rest.includes(id)) return (d = { ...d, priorities: rest.filter((p) => p !== id) });
    if (rest.length >= MAX_PRIORITIES) return;
    d = { ...d, priorities: [...rest, id] };
  };
  const pickComfort = (id: string) => {
    d = { ...d, comfort: id };
    clear('comfort');
  };
  const setBudget = (value: number) => (d = { ...d, budget: value, budgetUnsure: false });
  const toggleBudgetUnsure = () => (d = { ...d, budgetUnsure: !d.budgetUnsure });
  const pickStage = (id: string) => {
    d = { ...d, stage: id };
    clear('stage');
  };

  // ── Moving through the steps ───────────────────────────────────────────────
  const validate = (index: number): boolean => {
    const e: Record<string, string> = {};
    if (index === 0 && !d.types.length) e.types = $t('pg_plan_my_trip.err_types');
    if (index === 1 && !d.party) e.party = $t('pg_plan_my_trip.err_party');
    if (index === 2) {
      if (d.dateMode === 'flexible' && d.month === null && !d.dateUnsure) e.when = $t('pg_plan_my_trip.err_when');
      if (d.dateMode === 'exact') {
        if (!d.startDate) e.start = $t('pg_plan_my_trip.err_start');
        else if (d.startDate < today) e.start = $t('pg_plan_my_trip.err_start_past');
        if (d.endDate && d.startDate && d.endDate < d.startDate) e.end = $t('pg_plan_my_trip.err_end');
      }
    }
    if (index === 3) {
      for (const type of d.types) if (!d.lengths[type]) e[`len_${type}`] = $t('pg_plan_my_trip.err_length');
      if (!d.pace) e.pace = $t('pg_plan_my_trip.err_pace');
    }
    if (index === 4 && !d.comfort) e.comfort = $t('ui.choose_a_comfort_level');
    if (index === 5 && !d.stage) e.stage = $t('pg_plan_my_trip.err_stage');
    if (index === LAST) {
      if (full_name.trim().length < 2) e.full_name = $t('pg_plan_my_trip.err_name');
      if (!EMAIL.test(email.trim())) e.email = $t('pg_plan_my_trip.err_email');
      const digits = phone.replace(/[\s-]/g, '');
      // A number is only required when that is how they asked to be reached.
      if ((contact !== 'Email' || digits) && !/^\d{6,14}$/.test(digits)) e.phone = $t('pg_plan_my_trip.err_phone');
    }
    errors = e;
    return !Object.keys(e).length;
  };

  // The server's own email rule (zod), so an address the form accepts is never refused on Send.
  const EMAIL = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;

  let stepHeading: HTMLElement | undefined;
  let sentHeading: HTMLElement | undefined;

  /** After a step refuses to move on: bring the first problem into view and put focus on it. */
  const showFirstError = async () => {
    await tick();
    const alert = card?.querySelector<HTMLElement>('[role="alert"]');
    if (!alert) return;
    alert.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    const field = card?.querySelector<HTMLElement>('[aria-invalid="true"]');
    field?.focus({ preventScroll: true });
  };

  const goTo = async (index: number) => {
    dir = index >= step ? 1 : -1;
    step = index;
    errorMessage = '';
    await tick();
    // Only scroll when the top of the card is out of sight; a short step should not jump.
    if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    // Screen readers and keyboards land on the new step's question.
    stepHeading?.focus({ preventScroll: true });
  };
  const next = () => {
    if (validate(step)) {
      tracker.step(step, STEP_KEYS[step]);
      return goTo(Math.min(LAST, step + 1));
    }
    tracker.invalid(STEP_KEYS[step], firstError());
    nudge();
    showFirstError();
  };
  const back = () => goTo(Math.max(0, step - 1));
  /** Jump back to edit — only to steps already passed, so nothing is skipped unvalidated. */
  const edit = (index: number) => index < step && goTo(index);

  // ── Sending ────────────────────────────────────────────────────────────────
  // Staff read in English and in USD, whatever the visitor browsed in.
  const usd = (n: number) => `$${n.toLocaleString('en-US')}`;
  const lengthSummary = () =>
    d.types
      .filter((type) => d.lengths[type])
      .map((type) => `${lengthLabel(type)}: ${d.lengths[type]}`)
      .join(' · ') + (days ? ` (about ${days} days)` : '');
  const travelMonth = () => {
    const text = whenText(d);
    return month !== null && d.dateMode === 'flexible' ? `${text} (${SEASON[month].toLowerCase()} season)` : text;
  };
  /** The place they came about, by its English name where the link named a destination. */
  const interestForStaff = () => {
    const slug = incoming.context.destinationSlug;
    return (slug && data.englishNames.places[slug]) || interest;
  };
  /**
   * The same place for analytics. A place name can arrive straight from the
   * link's query string, so anything that looks like an email address or a
   * phone number is dropped, and it is held to the 128 characters the event
   * accepts — a longer one would see the whole lead event refused.
   */
  const interestForAnalytics = () => {
    const name = interestForStaff().trim();
    return name && !/@|\d{7,}/.test(name) ? name.slice(0, 128) : undefined;
  };
  const budgetSummary = () => {
    if (d.budgetUnsure) return NOT_SURE;
    if (d.budget === null) return undefined;
    return `Up to ${usd(d.budget)} per person (USD)`;
  };

  /** The number as dialled from abroad: "07700 900123" after +44 becomes "7700 900123". */
  const nationalNumber = () => phone.trim().replace(/^0+/, '');

  const submit = async () => {
    if (submitting) return;
    if (!validate(LAST)) {
      tracker.invalid(STEP_KEYS[LAST], firstError());
      nudge();
      return void showFirstError();
    }
    submitting = true;
    errorMessage = '';
    const exact = d.dateMode === 'exact';
    try {
      const res = await api.bookings.create({
        tour_id: null,
        full_name: full_name.trim(),
        email: email.trim(),
        phone: nationalNumber() ? `${dialCode} ${nationalNumber()}` : null,
        // A real date only when they gave one — a made-up day would read as a booking date in the CMS.
        travel_date: exact && d.startDate ? d.startDate : null,
        number_of_adults: people.adults,
        number_of_children: people.children,
        special_requests: d.notes.trim() || null,
        source: 'plan_my_trip',
        whatsapp_opt_in: whatsappConsent,
        idempotency_key: idempotencyKey,
        lead_context: {
          v: 1,
          form_type: 'trip_planner',
          lead_source: 'Plan My Trip',
          language,
          page: { url: location.href, title: document.title, referrer: document.referrer || undefined },
          attribution: getAttribution(),
          // The link that brought them here, and any campaign tags on this visit.
          entry: Object.keys(incoming.entry).length ? incoming.entry : undefined,
          campaign: Object.keys(incoming.campaign).length ? incoming.campaign : undefined,
          // Read by the staff email as a "Dates: start → end" line.
          exact_start_date: exact ? d.startDate || undefined : undefined,
          exact_end_date: exact ? d.endDate || undefined : undefined,
          // Named keys are the ones the staff email and HubSpot print as their
          // own lines (notification.service buildLeadFromBooking); the rest
          // are listed under them as they are.
          answers: {
            travel_interests: d.types.map((type) => typeOf(type).label),
            // An exact start date reaches staff as the booking's travel date (and
            // "Dates: start → end" with an end date), not as a month.
            travel_month: exact ? undefined : travelMonth(),
            date_flexibility: exact ? 'Exact dates' : d.dateUnsure ? NOT_SURE : 'Flexible — month only',
            traveller_type: partyLabel,
            children_ages: ages.length ? ages.join(', ') : undefined,
            trip_duration: lengthSummary(),
            travel_pace: d.pace,
            travel_priorities: d.priorities,
            accommodation_preference: d.comfort === NOT_SURE ? NOT_SURE : tierLabel(d.comfort),
            budget_per_person: budgetSummary(),
            planning_stage: d.stage,
            destination_interest: interestForStaff() || undefined,
            preferred_contact: contact,
            reply_language: LANGUAGES.find((l) => l.code === language)?.label ?? language,
            suggested_trips: recs.map((r) => data.englishNames.tours[String(r.tour.id)] ?? r.tour.title),
            came_from: incoming.context.tourSlug ? `tour: ${incoming.context.tourSlug}` : incoming.from
          }
        },
        hp_company
      });
      bookingCode = String((res.data as Record<string, unknown>)?.booking_code ?? '');
      submitted = true;
      // The lead: plan_my_trip_submitted here, generate_lead in GA4 with
      // lead_source plan_my_trip. The trip's shape as ids and bands — who,
      // how long, what budget, what kind, where — for the CMS to count by.
      tracker.submitted({
        traveller_type: d.party || undefined,
        duration_days: days || undefined,
        budget_range: d.budgetUnsure ? 'not_sure' : d.budget !== null ? `up_to_${d.budget}` : undefined,
        experience_type: d.types.join(',') || undefined,
        accommodation_level: d.comfort === NOT_SURE ? 'not_sure' : d.comfort || undefined,
        destination: interestForAnalytics(),
        // The reply language is a preference, not personal.
        metadata: { language }
      });
      await tick();
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      sentHeading?.focus({ preventScroll: true });
      // Google Ads conversion, through GTM's Custom Event trigger: only now the
      // server has stored the enquiry and the success screen is showing, and
      // only once. The reference is the transaction id that lets Ads drop a
      // repeat. Trip shape and campaign only — never name, email or phone.
      if (!conversionSent) {
        conversionSent = true;
        const children = people.children ? `, ${people.children} ${people.children === 1 ? 'child' : 'children'}` : '';
        let referrerPath = '';
        try {
          referrerPath = document.referrer ? new URL(document.referrer).hostname : '';
        } catch {
          referrerPath = '';
        }
        pushDataLayerEvent('trip_request_submitted', {
          form_type: 'Goldfinch Guided Trip Planner',
          reference_id: bookingCode,
          trip_type: d.types.map((type) => typeOf(type).label).join(', '),
          travel_date: exact ? d.startDate : travelMonth(),
          travellers: `${partyLabel ? `${partyLabel} · ` : ''}${people.adults} ${people.adults === 1 ? 'adult' : 'adults'}${children}`,
          comfort_level: d.comfort === NOT_SURE ? NOT_SURE : tierLabel(d.comfort),
          priorities: d.priorities.join(', '),
          source_page: incoming.context.tourSlug ? `/tours/${incoming.context.tourSlug}` : incoming.from || cameFromPath || referrerPath || '(direct)',
          cta_clicked: lastCtaClicked(),
          ...campaignTags()
        });
      }
    } catch (error) {
      tracker.failed(error instanceof ApiRequestError && error.status === 422 ? 'server_validation' : 'submit_failed');
      const fields = error instanceof ApiRequestError ? error.errors : [];
      if (fields.some((f) => (f.path ?? []).includes('email'))) {
        errors = { email: $t('pg_plan_my_trip.err_email') };
        showFirstError();
      } else errorMessage = error instanceof Error && error.message ? error.message : $t('form.err_generic');
    } finally {
      submitting = false;
    }
  };

  const choice = (on: boolean) =>
    `relative min-h-[56px] rounded-[10px] border p-4 text-left transition ${
      on ? 'border-goldfinch-gold bg-goldfinch-gold/10 shadow-sm' : 'border-ink/12 bg-surface hover:border-goldfinch-gold'
    }`;
  const pill = (on: boolean) =>
    `inline-flex min-h-[44px] items-center justify-center rounded-[8px] border px-4 py-2 text-sm transition ${
      on ? 'border-goldfinch-gold bg-goldfinch-gold/10 font-semibold text-heading' : 'border-ink/15 text-heading hover:border-goldfinch-gold'
    }`;
</script>

<svelte:head>
  <title>{$t('cta.plan_my_trip')} — {$t('pg_plan_my_trip.meta_title')} | {brand.name}</title>
  <meta name="description" content={$t('pg_plan_my_trip.meta_description')} />
  <meta property="og:title" content="{$t('cta.plan_my_trip')} — {brand.name}" />
  <meta property="og:description" content={$t('pg_plan_my_trip.og_description')} />
</svelte:head>

<!-- No hero: the planner is the page. The heading stays for search engines and
     screen readers, out of sight. -->
<h1 class="sr-only">{$t('pg_plan_my_trip.title')}</h1>

{#if submitted}
  <!-- The final screen: what was sent, and where to go next. -->
  <section class="bg-canvas px-4 py-14 md:py-20" data-conversion="lead-submitted">
    <div class="mx-auto max-w-xl rounded-[12px] bg-surface p-6 text-center md:p-10" in:fly={{ y: 24, duration: ms(560), easing: quintOut }}>
      <span class="relative mx-auto grid h-14 w-14 place-items-center" in:pop={{ start: 0.3, duration: ms(560), delay: ms(160), easing: backOut }}>
        <span class="pm-burst absolute inset-0 rounded-full" aria-hidden="true"></span>
        <span class="relative grid h-14 w-14 place-items-center rounded-full bg-goldfinch-gold/15 text-clay"><Check size={26} strokeWidth={2.4} class="pm-tick" /></span>
      </span>
      <h2 bind:this={sentHeading} tabindex="-1" class="mt-5 font-serif text-2xl font-bold text-heading outline-none md:text-3xl" in:fly={{ y: 12, duration: ms(480), delay: ms(300), easing: cubicOut }}>{$t('pg_plan_my_trip.sent_heading')}</h2>
      <p class="mt-3 text-[15px] leading-relaxed text-ink/65" in:fly={{ y: 12, duration: ms(480), delay: ms(380), easing: cubicOut }}>{$t('pg_plan_my_trip.sent_body')}</p>
      {#if bookingCode}<p class="mt-2 text-sm text-ink/65">{$t('form.your_reference_is')} <b class="text-clay">{bookingCode}</b>.</p>{/if}
      <dl class="mt-6 divide-y divide-ink/10 rounded-[10px] border border-ink/12 text-left">
        {#each recap as row, i (row.label)}
          <div in:fly|global={{ y: 10, duration: ms(420), delay: ms(480 + i * 80), easing: cubicOut }} class="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] gap-3 px-4 py-2.5 text-sm sm:grid-cols-[150px_minmax(0,1fr)]">
            <dt class="text-ink/60">{row.label}</dt>
            <dd class="break-words text-heading">{row.value || $t('ui.not_sure_yet')}</dd>
          </div>
        {/each}
      </dl>
      <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center" in:fly={{ y: 12, duration: ms(460), delay: ms(520 + recap.length * 80), easing: cubicOut }}>
        <a href="/" class="inline-flex h-12 items-center justify-center rounded-[10px] bg-goldfinch-gold px-6 text-sm font-semibold text-heading transition hover:brightness-105">{$t('pg_plan_my_trip.back_to_website')}</a>
        <a href="/safari-styles" class="inline-flex h-12 items-center justify-center rounded-[10px] border border-ink/20 px-6 text-sm font-semibold text-heading transition hover:bg-canvas">{$t('pg_plan_my_trip.explore_safari_ideas')}</a>
      </div>
    </div>
  </section>
{:else}
  <div class="bg-canvas">
    <!-- items-start: each column keeps its own height. Stretched, the form card
         grew to the sidebar's height and left a tall empty panel under Next. -->
    <div class="mx-auto grid max-w-6xl items-start gap-6 px-4 py-8 md:py-14 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div bind:this={card} class="min-w-0 scroll-mt-28 rounded-[12px] border border-ink/10 bg-surface p-5 shadow-sm md:p-7">
        <!-- Progress: every step named, so the length of the form is never a surprise. -->
        <ol class="mb-5 grid grid-cols-7 gap-1.5">
          {#each STEPS as label, i}
            <li aria-current={i === step ? 'step' : undefined}>
              <button type="button" class="w-full text-left disabled:cursor-default" disabled={i >= step} on:click={() => edit(i)} aria-label={`${i + 1}. ${$t(label)}`}>
                <span class="block h-1.5 overflow-hidden rounded-full bg-ink/10">
                  <span class="pm-fill block h-full rounded-full bg-goldfinch-gold" style={`transform: scaleX(${i <= step ? 1 : 0})`}></span>
                </span>
                <span class={`mt-1.5 hidden text-[11px] leading-tight lg:block ${i === step ? 'font-semibold text-heading' : i < step ? 'text-heading hover:text-clay' : 'text-ink/55'}`}>{i + 1}. {$t(label)}</span>
              </button>
            </li>
          {/each}
        </ol>
        <p class="text-xs text-ink/55">
          {$t('ui.step_x_of_y').replace('{step}', String(step + 1)).replace('{total}', String(STEPS.length))}<span class="lg:hidden">{' · '}{$t(STEPS[step])}</span>
        </p>

        {#key step}
        <div in:fly={{ x: 40 * dir, duration: ms(460), easing: cubicOut }}>
        {#if step === 0}
          <h2 bind:this={stepHeading} tabindex="-1" class="mt-2 font-serif text-xl font-semibold text-heading outline-none md:text-2xl">{$t('pg_plan_my_trip.trip_type_heading')}</h2>
          <p class="gf-hint mt-1.5 text-[13px]">{$t('pg_plan_my_trip.trip_type_hint')}{#if baseNote}{' '}{$t('pg_plan_my_trip.base_types_note')}{/if}</p>
          {#if errors.types}<p class="mt-2 text-sm font-medium text-clay" role="alert" in:fly={{ y: -6, duration: ms(240), easing: cubicOut }}>{errors.types}</p>{/if}
          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            {#each offered as option, i (option.id)}
              {@const on = d.types.includes(option.id)}
              <button type="button" class={`pm-rise ${choice(on)} pr-10`} style={`--i: ${i}`} aria-pressed={on} on:click={() => toggleType(option.id)}>
                {#if on}<span class="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-goldfinch-gold text-heading" in:pop={{ start: 0.3, duration: ms(300), easing: backOut }}><Check size={12} /></span>{/if}
                <span class="block font-semibold text-heading">{option.id === 'unsure' ? $t('ui.not_sure_yet') : tp(option.label)}</span>
                <span class="mt-0.5 block text-xs text-ink/60">{tp(option.desc)}</span>
              </button>
            {/each}
          </div>
        {:else if step === 1}
          <h2 bind:this={stepHeading} tabindex="-1" class="mt-2 font-serif text-xl font-semibold text-heading outline-none md:text-2xl">{$t('pg_plan_my_trip.whos_travelling')}</h2>
          {#if errors.party}<p class="mt-2 text-sm font-medium text-clay" role="alert" in:fly={{ y: -6, duration: ms(240), easing: cubicOut }}>{errors.party}</p>{/if}
          <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {#each PARTIES as option, i (option.id)}
              <button type="button" class={`pm-rise ${choice(d.party === option.id)} text-center`} style={`--i: ${i}`} aria-pressed={d.party === option.id} on:click={() => pickParty(option.id)}>
                <span class="block font-semibold text-heading">{tp(option.label)}</span>
              </button>
            {/each}
          </div>
          {#if d.party === 'family' || d.party === 'group'}
            <div class="mt-5 grid gap-4 rounded-[10px] bg-canvas p-4" transition:slide={{ duration: ms(320), easing: cubicOut }}>
              {#each [{ key: 'adults', label: $t('form.adults'), min: 1, value: d.adults, set: setAdults }, { key: 'children', label: $t('pg_plan_my_trip.children_under_18'), min: 0, value: d.children, set: setChildren }] as counter (counter.key)}
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-heading">{counter.label}</span>
                  <div class="flex items-center gap-3">
                    <button type="button" class="grid h-11 w-11 place-items-center rounded-full border border-ink/20 bg-surface disabled:opacity-40" aria-label={$t('pg_plan_my_trip.fewer_label').replace('{label}', counter.label)} disabled={counter.value <= counter.min} on:click={() => counter.set(counter.value - 1)}><Minus size={16} /></button>
                    <span class="w-6 text-center font-semibold text-heading" aria-live="polite">{counter.value}</span>
                    <button type="button" class="grid h-11 w-11 place-items-center rounded-full border border-ink/20 bg-surface disabled:opacity-40" aria-label={$t('pg_plan_my_trip.more_label').replace('{label}', counter.label)} disabled={counter.value >= 20} on:click={() => counter.set(counter.value + 1)}><Plus size={16} /></button>
                  </div>
                </div>
              {/each}
              {#if d.children > 0}
                <div transition:slide={{ duration: ms(280), easing: cubicOut }}>
                  <p class="text-xs text-ink/65">{$t('pg_plan_my_trip.children_ages')} <span class="text-ink/50">{$t('pg_plan_my_trip.children_ages_hint')}</span></p>
                  <div class="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {#each d.childAges as age, i (i)}
                      {@const childLabel = $t('pg_plan_my_trip.child_n').replace('{n}', String(i + 1))}
                      <input in:pop={{ start: 0.85, duration: ms(240), easing: backOut }} class="gf-input" inputmode="numeric" maxlength="2" aria-label={childLabel} placeholder={childLabel} value={age} on:input={(event) => {
                        setAge(i, event.currentTarget.value);
                        // Show exactly what is kept (digits only, 17 at most).
                        event.currentTarget.value = d.childAges[i] ?? '';
                      }} />
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        {:else if step === 2}
          <h2 bind:this={stepHeading} tabindex="-1" class="mt-2 font-serif text-xl font-semibold text-heading outline-none md:text-2xl">{$t('pg_plan_my_trip.when_heading')}</h2>
          <p class="gf-hint mt-1.5 text-[13px]">{$t('pg_plan_my_trip.when_hint')}</p>
          <div class="relative mt-5 inline-grid grid-cols-2 rounded-[10px] bg-canvas p-1" role="group">
            <span class="pm-seg absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-[8px] bg-surface shadow-sm" style={`transform: translateX(${d.dateMode === 'exact' ? '100%' : '0'})`} aria-hidden="true"></span>
            {#each [{ id: 'flexible', label: $t('pg_plan_my_trip.flexible') }, { id: 'exact', label: $t('pg_plan_my_trip.exact_dates') }] as mode (mode.id)}
              <button type="button" aria-pressed={d.dateMode === mode.id}
                class={`relative h-10 rounded-[8px] px-4 text-sm font-semibold transition-colors ${d.dateMode === mode.id ? 'text-heading' : 'text-ink/60 hover:text-heading'}`}
                on:click={() => setDateMode(mode.id === 'exact' ? 'exact' : 'flexible')}>{mode.label}</button>
            {/each}
          </div>
          {#if d.dateMode === 'flexible'}
            <div in:fade={{ duration: ms(260) }}>
            {#if errors.when}<p class="mt-3 text-sm font-medium text-clay" role="alert" in:fly={{ y: -6, duration: ms(240), easing: cubicOut }}>{errors.when}</p>{/if}
            <div class="mt-4 flex gap-2">
              {#each years as year}
                <button type="button" aria-pressed={d.year === year}
                  class={`h-10 rounded-[8px] px-4 text-sm font-semibold ${d.year === year ? 'bg-heading text-white' : 'border border-ink/15 text-heading'}`}
                  on:click={() => pickYear(year)}>{year}</button>
              {/each}
            </div>
            <div class="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {#each MONTHS as label, i}
                {@const past = monthPast(d.year, i)}
                {@const on = !d.dateUnsure && d.month === i}
                <button type="button" disabled={past} aria-pressed={on} style={`--i: ${i * 0.45}`}
                  class={`pm-rise min-h-[56px] rounded-[10px] border p-3 text-left transition ${past ? 'cursor-not-allowed opacity-35' : ''} ${on ? 'border-goldfinch-gold bg-goldfinch-gold/10' : 'border-ink/12 hover:border-goldfinch-gold'}`}
                  on:click={() => pickMonth(i)}>
                  <span class="block text-sm font-semibold text-heading">{monthShort(i)}</span>
                  <span class={`mt-1 block text-[10px] font-semibold uppercase tracking-wide ${SEASON[i] === 'Peak' ? 'text-clay' : SEASON[i] === 'Low' ? 'text-forest' : 'text-ink/55'}`}>{tp(SEASON[i])}</span>
                </button>
              {/each}
            </div>
            <button type="button" aria-pressed={d.dateUnsure}
              class={`mt-3 h-12 w-full rounded-[10px] border text-sm font-semibold text-heading transition ${d.dateUnsure ? 'border-goldfinch-gold bg-goldfinch-gold/10' : 'border-ink/12 hover:border-goldfinch-gold'}`}
              on:click={toggleDateUnsure}>{$t('ui.not_sure_yet')}</button>
            </div>
          {:else}
            <div class="mt-5 grid gap-4 sm:grid-cols-2" in:fade={{ duration: ms(260) }}>
              <label class="grid gap-1.5">
                <span class="gf-label">{$t('pg_plan_my_trip.start_date')}<span class="gf-req">*</span></span>
                <input class="gf-input" type="date" min={today} value={d.startDate} on:change={(event) => setStart(event.currentTarget.value)} />
                {#if errors.start}<span class="text-xs font-medium text-clay" role="alert" in:fly={{ y: -6, duration: ms(240), easing: cubicOut }}>{errors.start}</span>{/if}
              </label>
              <label class="grid gap-1.5">
                <span class="gf-label">{$t('pg_plan_my_trip.end_date')} <span class="gf-hint">{$t('pg_plan_my_trip.optional_paren')}</span></span>
                <input class="gf-input" type="date" min={d.startDate || today} value={d.endDate} on:change={(event) => setEnd(event.currentTarget.value)} />
                {#if errors.end}<span class="text-xs font-medium text-clay" role="alert" in:fly={{ y: -6, duration: ms(240), easing: cubicOut }}>{errors.end}</span>{/if}
              </label>
            </div>
          {/if}
          {#if month !== null}
            {#key month}
            <p in:fly={{ y: 8, duration: ms(340), easing: cubicOut }} class="mt-4 flex items-start gap-2 rounded-[10px] bg-canvas px-4 py-3 text-sm text-heading">
              <Lightbulb size={15} class="mt-0.5 shrink-0 text-clay" /><span><b>{monthName(month)}:</b> {tp(MONTH_TIP[month])}</span>
            </p>
            {/key}
          {/if}
        {:else if step === 3}
          <h2 bind:this={stepHeading} tabindex="-1" class="mt-2 font-serif text-xl font-semibold text-heading outline-none md:text-2xl">{$t('pg_plan_my_trip.length_pace_heading')}</h2>
          <p class="gf-hint mt-1.5 text-[13px]">{$t('pg_plan_my_trip.length_pace_hint')}</p>
          <div class="mt-5 grid gap-5">
            {#each d.types as type (type)}
              {@const popular = type === 'unsure' ? null : popularBand(type, data.tours)}
              <div>
                <p class="mb-2 text-sm font-semibold text-heading">{type === 'unsure' ? $t('pg_plan_my_trip.whole_trip') : tp(lengthLabel(type))}</p>
                <div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {#each [...LENGTHS[type], NOT_SURE] as band, i}
                    <button type="button" class={`pm-rise ${pill(d.lengths[type] === band)}`} style={`--i: ${i}`} aria-pressed={d.lengths[type] === band} on:click={() => pickLength(type, band)}>
                      {band === NOT_SURE ? $t('ui.not_sure_yet') : tp(band)}
                      {#if popular === band}<span class="pm-shine ml-2 rounded bg-clay px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">{$t('pg_plan_my_trip.popular')}</span>{/if}
                    </button>
                  {/each}
                </div>
                {#if errors[`len_${type}`]}<p class="mt-1 text-xs text-clay" role="alert" in:fly={{ y: -6, duration: ms(240), easing: cubicOut }}>{errors[`len_${type}`]}</p>{/if}
              </div>
            {/each}
            {#if days > 0}<p class="text-sm text-ink/65" in:fade={{ duration: ms(260) }}>{$t('pg_plan_my_trip.estimated_total')} <b class="text-heading">{$t('pg_plan_my_trip.about_n_days').replace('{n}', String(days))}</b></p>{/if}
          </div>
          <div class="mt-6 border-t border-ink/10 pt-6">
            <h3 class="text-[15px] font-semibold text-heading">{$t('pg_plan_my_trip.pace_heading')}</h3>
            {#if errors.pace}<p class="mt-2 text-sm font-medium text-clay" role="alert" in:fly={{ y: -6, duration: ms(240), easing: cubicOut }}>{errors.pace}</p>{/if}
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              {#each PACES as option, i (option.id)}
                {@const on = d.pace === option.id}
                <button type="button" class={`pm-rise ${choice(on)} pr-10`} style={`--i: ${i + 3}`} aria-pressed={on} on:click={() => pickPace(option.id)}>
                  {#if on}<span class="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-goldfinch-gold text-heading" in:pop={{ start: 0.3, duration: ms(300), easing: backOut }}><Check size={12} /></span>{/if}
                  <span class="block font-semibold text-heading">{option.id === NOT_SURE ? $t('ui.not_sure_yet') : tp(option.id)}</span>
                  <span class="mt-0.5 block text-xs text-ink/60">{tp(option.desc)}</span>
                </button>
              {/each}
            </div>
          </div>
        {:else if step === 4}
          <h2 bind:this={stepHeading} tabindex="-1" class="mt-2 font-serif text-xl font-semibold text-heading outline-none md:text-2xl">{$t('pg_plan_my_trip.prefs_heading')}</h2>
          <p class="gf-hint mt-1.5 text-[13px]">{$t('pg_plan_my_trip.prefs_hint')}</p>

          <h3 class="mt-5 text-[15px] font-semibold text-heading">
            {$t('pg_plan_my_trip.priorities_heading').replace(/\{max\}/g, String(MAX_PRIORITIES))}
            <span class="ml-1 font-normal text-ink/55">{pickedPriorities.length}/{MAX_PRIORITIES}</span>
          </h3>
          <div class="mt-3 flex flex-wrap gap-2">
            {#each priorityOptions as option, i (option)}
              {@const on = d.priorities.includes(option)}
              {@const full = !on && option !== NOT_SURE && pickedPriorities.length >= MAX_PRIORITIES}
              <button type="button" aria-pressed={on} disabled={full} style={`--i: ${i * 0.6}`}
                class={`pm-rise inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border px-3.5 text-sm font-medium text-heading transition disabled:cursor-not-allowed disabled:opacity-40 ${on ? 'border-goldfinch-gold bg-goldfinch-gold/10' : 'border-ink/15 hover:border-goldfinch-gold'}`}
                on:click={() => togglePriority(option)}>
                {option === NOT_SURE ? $t('ui.not_sure_yet') : tp(option)}
                {#if on}<span class="inline-flex" in:pop={{ start: 0.3, duration: ms(280), easing: backOut }}><Check size={15} class="shrink-0 text-clay" /></span>{/if}
              </button>
            {/each}
          </div>
          <p class="mt-2 text-xs text-ink/55">{$t('pg_plan_my_trip.priorities_note')}</p>

          <div class="mt-6 border-t border-ink/10 pt-6">
            <h3 class="text-[15px] font-semibold text-heading">{$t('pg_plan_my_trip.comfort_heading')}</h3>
            {#if errors.comfort}<p class="mt-2 text-sm font-medium text-clay" role="alert" in:fly={{ y: -6, duration: ms(240), easing: cubicOut }}>{errors.comfort}</p>{/if}
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              {#each [...comfortChoices, { id: NOT_SURE, label: $t('ui.not_sure_yet'), desc: $t('pg_plan_my_trip.comfort_unsure_desc'), count: 0, min: 0, max: 0 }] as option, i (option.id)}
                {@const on = d.comfort === option.id}
                <button type="button" class={`pm-rise ${choice(on)} pr-10`} style={`--i: ${i + 4}`} aria-pressed={on} on:click={() => pickComfort(option.id)}>
                  {#if on}<span class="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-goldfinch-gold text-heading" in:pop={{ start: 0.3, duration: ms(300), easing: backOut }}><Check size={12} /></span>{/if}
                  <span class="block font-semibold text-heading">{tp(option.label)}</span>
                  {#if option.desc}<span class="mt-0.5 block text-xs text-ink/60">{tp(option.desc)}</span>{/if}
                  {#if option.count && option.min}
                    <!-- Counted from the published trips in this tier. -->
                    <span class="mt-2 block text-xs font-semibold text-forest">
                      {$t(option.count === 1 ? 'pg_plan_my_trip.tier_one_trip' : 'pg_plan_my_trip.tier_n_trips').replace('{n}', String(option.count))}
                      · {option.min === option.max
                        ? $t('pg_plan_my_trip.from_price').replace('{price}', () => whole(option.min))
                        : `${whole(option.min)}–${whole(option.max)}`}
                    </span>
                  {/if}
                </button>
              {/each}
            </div>
          </div>

          {#if scale}
            <div class="mt-6 border-t border-ink/10 pt-6">
              <h3 class="text-[15px] font-semibold text-heading">{$t('filter.budget_pp')} <span class="font-normal text-ink/55">{$t('pg_plan_my_trip.optional_paren')}</span></h3>
              <p class="mt-1 text-sm text-ink/60">{$t('pg_plan_my_trip.budget_hint')}</p>
              <div class={`mt-4 rounded-[12px] border border-ink/12 bg-surface px-4 py-5 transition sm:px-6 ${d.budgetUnsure ? 'opacity-45' : ''}`}>
                <p class="text-center text-2xl font-bold text-heading" aria-live="polite">
                  {d.budgetUnsure ? $t('ui.not_sure_yet') : budgetText(sliderValue)}
                </p>
                <p class="mt-1 text-center text-xs text-ink/60">
                  {#if d.budgetUnsure}
                    &nbsp;
                  {:else if d.budget === null}
                    {$t('pg_plan_my_trip.budget_drag')}
                  {:else if !pool.length}
                    &nbsp;
                  {:else}
                    {$t('pg_plan_my_trip.budget_matches').replace('{n}', String(underBudget)).replace('{total}', String(pool.length))}
                  {/if}
                </p>
                <input
                  type="range"
                  class="planner-range mt-4 w-full"
                  min={scale.min}
                  max={scale.max}
                  step={scale.step}
                  value={sliderValue}
                  disabled={d.budgetUnsure}
                  aria-label={$t('filter.budget_pp')}
                  aria-valuetext={budgetText(sliderValue)}
                  style={`--fill: ${((sliderValue - scale.min) / (scale.max - scale.min)) * 100}%`}
                  on:input={(event) => setBudget(Number(event.currentTarget.value))}
                />
                <div class="mt-2 flex justify-between text-xs font-medium text-heading">
                  <span>{whole(scale.min)}</span><span>{whole(scale.max)}</span>
                </div>
              </div>
              <p class="mt-2 text-xs text-ink/55">{$t('pg_plan_my_trip.budget_scale_note')}</p>
              <label class="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-ink/70">
                <input type="checkbox" class="h-4 w-4 accent-clay" checked={d.budgetUnsure} on:change={toggleBudgetUnsure} />
                {$t('pg_plan_my_trip.budget_unsure')}
              </label>
            </div>
          {/if}
        {:else if step === 5}
          <h2 bind:this={stepHeading} tabindex="-1" class="mt-2 font-serif text-xl font-semibold text-heading outline-none md:text-2xl">{$t('pg_plan_my_trip.stage_heading')}</h2>
          {#if errors.stage}<p class="mt-2 text-sm font-medium text-clay" role="alert" in:fly={{ y: -6, duration: ms(240), easing: cubicOut }}>{errors.stage}</p>{/if}
          <div class="mt-5 grid gap-3">
            {#each STAGES as option, i (option.id)}
              {@const on = d.stage === option.id}
              <button type="button" class={`pm-rise ${choice(on)} pr-10`} style={`--i: ${i}`} aria-pressed={on} on:click={() => pickStage(option.id)}>
                {#if on}<span class="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-goldfinch-gold text-heading" in:pop={{ start: 0.3, duration: ms(300), easing: backOut }}><Check size={12} /></span>{/if}
                <span class="block font-semibold text-heading">{tp(option.id)}</span>
                <span class="mt-0.5 block text-xs text-ink/60">{tp(option.desc)}</span>
              </button>
            {/each}
          </div>
        {:else}
          <h2 bind:this={stepHeading} tabindex="-1" class="mt-2 font-serif text-xl font-semibold text-heading outline-none md:text-2xl">{$t('pg_plan_my_trip.review_heading')}</h2>
          <dl class="mt-5 divide-y divide-ink/10 rounded-[10px] border border-ink/12">
            {#each review as row, i (row.at)}
              <div class="pm-rise flex items-start justify-between gap-3 px-4 py-3" style={`--i: ${i * 0.7}`}>
                <div class="min-w-0">
                  <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink/55">{row.label}</dt>
                  <dd class="mt-0.5 break-words text-sm text-heading">{row.value || $t('ui.not_sure_yet')}</dd>
                </div>
                <button type="button" class="inline-flex h-9 shrink-0 items-center gap-1 text-xs font-semibold text-clay hover:underline" on:click={() => edit(row.at)}><Pencil size={12} />{$t('pg_plan_my_trip.edit')}</button>
              </div>
            {/each}
          </dl>

          <form class="relative mt-5 grid gap-4 sm:grid-cols-2" on:submit|preventDefault={submit} novalidate>
            <!-- Honeypot: not rendered (hidden), so browser autofill skips it; bots reading the HTML still fill it. -->
            <div class="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
              <input type="text" name="gf-x1" tabindex="-1" autocomplete="off" hidden bind:value={hp_company} />
            </div>
            <label class="grid gap-1.5">
              <span class="gf-label">{$t('form.full_name')}<span class="gf-req">*</span></span>
              <input class="gf-input" autocomplete="name" aria-invalid={!!errors.full_name} bind:value={full_name} />
              {#if errors.full_name}<span role="alert" class="text-xs font-medium text-clay" in:fly={{ y: -6, duration: ms(240), easing: cubicOut }}>{errors.full_name}</span>{/if}
            </label>
            <label class="grid gap-1.5">
              <span class="gf-label">{$t('form.email')}<span class="gf-req">*</span></span>
              <input class="gf-input" type="email" autocomplete="email" aria-invalid={!!errors.email} bind:value={email} placeholder="you@example.com" />
              {#if errors.email}<span role="alert" class="text-xs font-medium text-clay" in:fly={{ y: -6, duration: ms(240), easing: cubicOut }}>{errors.email}</span>{/if}
            </label>
            <div class="grid gap-1.5">
              <span class="gf-label">{$t('form.phone')}{#if contact !== 'Email'}<span class="gf-req">*</span>{:else}<span class="gf-hint">{' '}{$t('pg_plan_my_trip.optional_paren')}</span>{/if}</span>
              <div class="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
                <select class="gf-input" bind:value={dialCode} aria-label={$t('pg_plan_my_trip.country_code')}>
                  {#each DIAL_CODES as code}<option value={code}>{code}</option>{/each}
                </select>
                <input class="gf-input" type="tel" inputmode="tel" autocomplete="tel-national" aria-invalid={!!errors.phone} bind:value={phone} aria-label={$t('form.phone')} />
              </div>
              {#if errors.phone}<span role="alert" class="text-xs font-medium text-clay" in:fly={{ y: -6, duration: ms(240), easing: cubicOut }}>{errors.phone}</span>{/if}
            </div>
            <label class="grid gap-1.5">
              <span class="gf-label">{$t('pg_plan_my_trip.reply_in')}</span>
              <select class="gf-input" bind:value={language}>
                {#each LANGUAGES as option}<option value={option.code}>{option.label}</option>{/each}
              </select>
            </label>
            <div class="grid gap-1.5 sm:col-span-2">
              <span class="gf-label">{$t('pg_plan_my_trip.preferred_contact')}</span>
              <div class="grid grid-cols-3 gap-2">
                {#each CONTACTS as option}
                  <button type="button" aria-pressed={contact === option}
                    class={`h-11 rounded-[8px] border px-2 text-sm font-semibold text-heading ${contact === option ? 'border-goldfinch-gold bg-goldfinch-gold/10' : 'border-ink/20'}`}
                    on:click={() => (contact = option)}>{$t(CONTACT_LABELS[option])}</button>
                {/each}
              </div>
            </div>
            <label class="grid gap-1.5 sm:col-span-2">
              <span class="gf-label">{$t('pg_plan_my_trip.anything_else')} <span class="gf-hint">{$t('pg_plan_my_trip.optional_paren')}</span></span>
              <textarea class="gf-textarea" rows="3" bind:value={d.notes} placeholder={$t('pg_plan_my_trip.notes_placeholder_long')}></textarea>
            </label>
            <label class="flex items-start gap-2 text-xs text-ink/65 sm:col-span-2">
              <input type="checkbox" class="mt-0.5 h-4 w-4" bind:checked={whatsappConsent} />
              {$t('pg_plan_my_trip.whatsapp_consent').replace('{brand}', brand.name)}
            </label>
            {#if errorMessage}
              <p class="rounded-[8px] bg-clay/10 px-3 py-2.5 text-sm text-clay sm:col-span-2" role="alert">{errorMessage}</p>
            {/if}
            <button type="submit" class="hidden" aria-hidden="true" tabindex="-1"></button>
          </form>
          <p class="gf-hint mt-4 flex items-center gap-1.5 text-xs"><Lock size={12} />{$t('form.secure_never_shared')}</p>
        {/if}
        </div>
        {/key}

        <!-- Back / Next. On phones it stays in reach at the bottom of the screen
             while the form is in view; on wide screens it sits under the step. -->
        <div class="planner-dock sticky bottom-0 z-20 -mx-5 -mb-5 mt-7 rounded-b-[12px] border-t border-ink/10 bg-surface/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-5 md:-mx-7 md:-mb-7 md:px-7 lg:static lg:mx-0 lg:mb-0 lg:rounded-none lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-5 lg:backdrop-blur-none">
          <div class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:gap-3 lg:flex lg:justify-between">
            <button type="button" class="gf-btn-ghost w-[52px] shrink-0 px-0 disabled:opacity-40 sm:w-auto sm:px-4 lg:disabled:invisible" disabled={step === 0} aria-label={$t('form.back')} on:click={back}><ArrowLeft size={18} /><span class="hidden sm:inline">{$t('form.back')}</span></button>
            {#if step < LAST}
              <button bind:this={nextButton} type="button" class="group gf-btn-primary w-full min-w-0 whitespace-nowrap px-5 sm:px-6 lg:w-auto" on:click={next}><span class="truncate">{$t('ui.next')}</span> <ArrowRight size={16} strokeWidth={2.6} class="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" /></button>
            {:else}
              <button bind:this={nextButton} type="button" class="group gf-btn-primary w-full min-w-0 whitespace-nowrap px-3 text-[14px] sm:px-6 sm:text-sm lg:w-auto" disabled={submitting} on:click={submit}>
                {#if submitting}<Loader2 size={16} class="shrink-0 animate-spin" /> <span class="truncate">{$t('form.sending')}</span>{:else}<span class="truncate">{$t('pg_plan_my_trip.send_plan')}</span> <ArrowRight size={16} strokeWidth={2.6} class="hidden shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 sm:block" />{/if}
              </button>
            {/if}
          </div>
          {#if trustText}
            <p class="mt-2 flex items-center justify-center gap-1.5 truncate text-[11px] text-ink/60 lg:mt-4 lg:justify-start lg:text-xs">
              <Star size={13} class="shrink-0 fill-goldfinch-gold text-goldfinch-gold" /><span class="truncate"><b class="font-semibold text-heading">{trustText}</b></span>
            </p>
          {/if}
        </div>
      </div>

      <!-- The planner's running commentary: what they have chosen, what we'd advise, and trips that fit. -->
      <aside class="grid min-w-0 content-start gap-4 lg:sticky lg:top-28 lg:self-start">
        <div class="overflow-hidden rounded-[14px] bg-deep-green text-white shadow-[0_18px_40px_-24px_rgba(20,24,18,0.6)]">
          <button type="button" class="flex h-12 w-full items-center justify-between px-5 lg:hidden" aria-expanded={openSummary} on:click={() => (openSummary = !openSummary)}>
            <span class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold"><Sparkles size={14} />{$t('pg_plan_my_trip.your_trip_so_far')}</span>
            <span class="flex items-center gap-2 text-[11px] font-semibold text-white/60">{step + 1}/{STEPS.length}<ChevronDown size={16} class={`transition ${openSummary ? 'rotate-180' : ''}`} /></span>
          </button>
          <div class={`${openSummary ? 'block' : 'hidden'} lg:block`}>
            <div class="hidden items-center justify-between px-5 pt-5 lg:flex">
              <p class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold"><Sparkles size={14} />{$t('pg_plan_my_trip.your_trip_so_far')}</p>
              <span class="text-[11px] font-semibold tabular-nums text-white/55">{step + 1}/{STEPS.length}</span>
            </div>
            {#if soFar.length}
              <ul class="mt-1 px-2 pb-2 lg:mt-3">
                {#each soFar as row (row.key)}
                  <li class="flex items-start gap-3 rounded-[10px] px-3 py-2.5" animate:flip={{ duration: ms(320), easing: cubicOut }} in:fly|global={{ x: 14, duration: ms(380), easing: cubicOut }}>
                    <span class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.08] text-goldfinch-gold">
                      <svelte:component this={row.icon} size={15} strokeWidth={2} />
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">{row.label}</span>
                      {#key row.value}
                        {#if row.chips.length > 1}
                          <span class="pm-glint mt-1.5 flex flex-wrap gap-1.5">
                            {#each row.chips as chip (chip)}
                              <span class="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-[12px] font-medium leading-5 text-white">{chip}</span>
                            {/each}
                          </span>
                        {:else}
                          <span class="pm-glint mt-0.5 block break-words text-[14px] font-medium leading-snug text-white">{row.value}</span>
                        {/if}
                      {/key}
                    </span>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="px-5 pb-5 text-sm text-white/70 lg:pt-3">{$t('pg_plan_my_trip.choose_type_to_begin')}</p>
            {/if}
          </div>
        </div>

        {#if mounted && tips.length}
          <div class="rounded-[12px] border border-clay/20 bg-surface p-5" in:fly={{ y: 18, duration: ms(480), easing: quintOut }}>
            <p class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-clay"><Lightbulb size={14} />{$t('pg_plan_my_trip.expert_tips')}</p>
            <ul class="mt-3 grid gap-2.5">
              {#each tips as tip, i (tip)}
                <li class="text-sm leading-snug text-heading" animate:flip={{ duration: ms(320), easing: cubicOut }} in:fly|global={{ y: 8, duration: ms(380), delay: ms(140 + i * 80), easing: cubicOut }}>{tip}</li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if mounted && recs.length}
          <div class="relative rounded-[12px] border border-ink/10 bg-surface" in:fly={{ y: 28, duration: ms(620), easing: quintOut }}>
            {#key recKey}<span class="pm-glow pointer-events-none absolute inset-0 rounded-[12px]" aria-hidden="true"></span>{/key}
            <button type="button" class="flex h-12 w-full items-center justify-between px-5 lg:hidden" aria-expanded={openMatches} on:click={() => (openMatches = !openMatches)}>
              <span class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-clay">
                {#key recKey}<span class="pm-ping relative flex h-2 w-2" aria-hidden="true"><span class="absolute inset-0 rounded-full bg-clay"></span></span>{/key}
                {$t('pg_plan_my_trip.trips_that_match')}
                {#key recs.length}<span class="inline-block" in:pop={{ start: 0.5, duration: ms(320), easing: backOut }}>({recs.length})</span>{/key}
              </span>
              <ChevronDown size={16} class={`transition ${openMatches ? 'rotate-180' : ''}`} />
            </button>
            <div class={`${openMatches ? 'block' : 'hidden'} px-5 pb-5 lg:block lg:pt-5`}>
              <p class="hidden items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-clay lg:flex" in:fade|global={{ duration: ms(360), delay: ms(140) }}>
                {#key recKey}<span class="pm-ping relative flex h-2 w-2" aria-hidden="true"><span class="absolute inset-0 rounded-full bg-clay"></span></span>{/key}
                {$t('pg_plan_my_trip.trips_that_match')}
              </p>
              <!-- Compact on purpose: a sidebar that outgrows the form it sits
                   beside reads as the main thing on the page. Titles held to two
                   lines, and the strongest reasons only. -->
              <ul class="grid gap-3 lg:mt-3">
                {#each recs as rec, i (rec.tour.id)}
                  {@const delay = 240 + i * 130}
                  <li animate:flip={{ duration: ms(420), easing: cubicOut }} in:fly|global={{ x: 22, duration: ms(560), delay: ms(delay), easing: quintOut }} style={`--d: ${delay}ms`}>
                    <a href={`/tours/${rec.tour.slug}`} target="_blank" rel="noopener" class="group flex gap-3 rounded-[10px] transition-transform duration-300 hover:-translate-y-0.5">
                      {#if rec.tour.main_image_url_thumbnail || rec.tour.main_image_url}
                        <span class="pm-thumb block h-14 w-16 shrink-0 overflow-hidden rounded-[8px]">
                          <Img src={rec.tour.main_image_url_thumbnail || rec.tour.main_image_url || ''} alt="" width={160} sizes="64px" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        </span>
                      {/if}
                      <span class="min-w-0">
                        <span class="line-clamp-2 text-[13px] font-semibold leading-tight text-heading group-hover:text-clay">{rec.tour.title}</span>
                        <span class="mt-0.5 block text-[11px] text-ink/60">
                          {[
                            rec.tour.duration_days ? $t('pg_plan_my_trip.n_days').replace('{n}', String(rec.tour.duration_days)) : '',
                            rec.tour.price_from ? $t('pg_plan_my_trip.from_price').replace('{price}', () => whole(Number(rec.tour.price_from))) : '',
                            people.children && rec.tour.minimum_age ? $t('pg_plan_my_trip.kids_age_plus').replace('{age}', String(rec.tour.minimum_age)) : ''
                          ].filter(Boolean).join(' · ')}
                        </span>
                        {#each rec.reasons.slice(0, 2) as reason, r (reason)}
                          <span class="pm-reason mt-0.5 flex items-start gap-1 text-[11px] leading-snug text-forest" style={`--r: ${r}`}><Check size={11} class="mt-0.5 shrink-0" /><span class="line-clamp-1">{reason}</span></span>
                        {/each}
                      </span>
                    </a>
                  </li>
                {/each}
              </ul>
              <p class="mt-3 text-xs text-ink/60" in:fade|global={{ duration: ms(400), delay: ms(300 + recs.length * 130) }}>{$t('pg_plan_my_trip.tailor_one_of_these')}</p>
            </div>
          </div>
        {:else if mounted && d.types.length}
          <div class="rounded-[12px] border border-ink/10 bg-surface p-5" in:fly={{ y: 18, duration: ms(480), easing: quintOut }}>
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">{$t('pg_plan_my_trip.made_for_you')}</p>
            <p class="mt-2 text-sm text-heading">{$t('pg_plan_my_trip.no_ready_made_trip')}</p>
          </div>
        {/if}

        <p class="px-1 text-xs text-ink/60">{$t('pg_plan_my_trip.prefer_to_talk')} <a href="/contact" class="font-semibold text-heading underline">{$t('pg_plan_my_trip.contact_our_team')}</a></p>
      </aside>
    </div>
  </div>
{/if}

<style>
  /* Lift the floating buttons (saved trips, back to top) above the Back / Next
     bar while it is pinned to the bottom of a phone screen. */
  @media (max-width: 1023.98px) {
    :global(html:has(.planner-dock)) {
      --package-dock-space: 92px;
    }
  }

  /* ── Motion ───────────────────────────────────────────────────────────────
     Plain CSS for what runs on its own (staggers, glows, the progress fill);
     Svelte transitions for what enters and leaves. Global class names because
     several sit inside class strings built in the script. */

  /* Choices rise into place one after another when a step opens. */
  :global(.pm-rise) {
    animation: pm-rise 0.52s cubic-bezier(0.22, 1, 0.36, 1) backwards;
    animation-delay: calc(var(--i, 0) * 45ms + 90ms);
  }
  @keyframes -global-pm-rise {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.985);
    }
  }

  /* Progress segments fill from the left, a beat after one another. */
  :global(.pm-fill) {
    transform-origin: left center;
    transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* The flexible / exact-dates switch slides its highlight across. */
  :global(.pm-seg) {
    transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* "Popular": a light sweeps across the badge once. */
  :global(.pm-shine) {
    position: relative;
    overflow: hidden;
  }
  :global(.pm-shine)::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(110deg, transparent 30%, rgb(255 255 255 / 0.55) 50%, transparent 70%);
    transform: translateX(-120%);
    animation: pm-shine 1.6s ease-out 0.6s 1 forwards;
  }
  @keyframes -global-pm-shine {
    to {
      transform: translateX(120%);
    }
  }

  /* A value that just changed in "Your trip so far" glints gold, then settles. */
  :global(.pm-glint) {
    animation: pm-glint 0.9s ease-out;
  }
  @keyframes -global-pm-glint {
    from {
      color: rgb(var(--c-goldfinch-gold));
    }
  }

  /* Trips that match: a soft gold halo each time a new set arrives… */
  :global(.pm-glow) {
    animation: pm-glow 1.5s cubic-bezier(0.22, 1, 0.36, 1) 0.35s backwards;
  }
  @keyframes -global-pm-glow {
    from {
      box-shadow:
        0 0 0 1.5px rgb(var(--c-goldfinch-gold) / 0.9),
        0 0 0 0 rgb(var(--c-goldfinch-gold) / 0.45);
    }
    60% {
      box-shadow:
        0 0 0 1.5px rgb(var(--c-goldfinch-gold) / 0.35),
        0 0 0 12px rgb(var(--c-goldfinch-gold) / 0);
    }
    to {
      box-shadow:
        0 0 0 1.5px rgb(var(--c-goldfinch-gold) / 0),
        0 0 0 12px rgb(var(--c-goldfinch-gold) / 0);
    }
  }
  /* …a dot that pings three times beside the heading… */
  :global(.pm-ping)::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    background: rgb(var(--c-clay));
    animation: pm-ping 1.1s cubic-bezier(0, 0, 0.2, 1) 0.3s 3;
    opacity: 0;
  }
  @keyframes -global-pm-ping {
    from {
      transform: scale(1);
      opacity: 0.7;
    }
    to {
      transform: scale(2.6);
      opacity: 0;
    }
  }
  /* …and inside each trip, the photo then its reasons follow the card in. */
  :global(.pm-thumb) {
    animation: pm-thumb 0.6s cubic-bezier(0.34, 1.4, 0.64, 1) backwards;
    animation-delay: calc(var(--d, 0ms) + 80ms);
  }
  @keyframes -global-pm-thumb {
    from {
      opacity: 0;
      transform: scale(0.8) rotate(-2deg);
    }
  }
  :global(.pm-reason) {
    animation: pm-reason 0.45s cubic-bezier(0.22, 1, 0.36, 1) backwards;
    animation-delay: calc(var(--d, 0ms) + 260ms + var(--r, 0) * 90ms);
  }
  @keyframes -global-pm-reason {
    from {
      opacity: 0;
      transform: translateX(-6px);
    }
  }

  /* The final screen: a ring bursts out from the check, which draws itself. */
  :global(.pm-burst) {
    animation: pm-burst 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.45s backwards;
    opacity: 0;
  }
  @keyframes -global-pm-burst {
    from {
      opacity: 0.8;
      box-shadow: 0 0 0 0 rgb(var(--c-goldfinch-gold) / 0.55);
    }
    to {
      opacity: 0;
      box-shadow: 0 0 0 22px rgb(var(--c-goldfinch-gold) / 0);
    }
  }
  :global(.pm-tick) :global(path),
  :global(.pm-tick) :global(polyline) {
    stroke-dasharray: 30;
    stroke-dashoffset: 30;
    animation: pm-tick 0.5s cubic-bezier(0.65, 0, 0.35, 1) 0.55s forwards;
  }
  @keyframes -global-pm-tick {
    to {
      stroke-dashoffset: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.pm-rise),
    :global(.pm-thumb),
    :global(.pm-reason),
    :global(.pm-glow),
    :global(.pm-glint),
    :global(.pm-burst),
    :global(.pm-shine)::after,
    :global(.pm-ping)::before {
      animation: none;
    }
    :global(.pm-tick) :global(path),
    :global(.pm-tick) :global(polyline) {
      animation: none;
      stroke-dashoffset: 0;
    }
    :global(.pm-fill),
    :global(.pm-seg) {
      transition: none;
    }
  }

  /* The budget slider: a gold-to-clay fill up to the thumb, a large thumb for
     fingers. Colours come from the theme variables so dark mode follows. */
  .planner-range {
    -webkit-appearance: none;
    appearance: none;
    height: 40px;
    background: transparent;
    cursor: pointer;
  }
  .planner-range:disabled {
    cursor: not-allowed;
  }
  .planner-range::-webkit-slider-runnable-track {
    height: 8px;
    border-radius: 9999px;
    background:
      linear-gradient(to right, rgb(var(--c-goldfinch-gold)), rgb(var(--c-clay))) 0 0 / var(--fill, 0%) 100% no-repeat,
      rgb(var(--c-ink) / 0.16);
  }
  .planner-range::-moz-range-track {
    height: 8px;
    border-radius: 9999px;
    background: rgb(var(--c-ink) / 0.16);
  }
  .planner-range::-moz-range-progress {
    height: 8px;
    border-radius: 9999px;
    background: linear-gradient(to right, rgb(var(--c-goldfinch-gold)), rgb(var(--c-clay)));
  }
  .planner-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 32px;
    height: 32px;
    margin-top: -12px;
    border-radius: 9999px;
    background: rgb(var(--c-goldfinch-gold));
    border: 4px solid rgb(var(--c-surface));
    box-shadow: 0 0 0 1px rgb(var(--c-ink) / 0.18), 0 4px 12px rgb(var(--c-ink) / 0.18);
  }
  .planner-range::-moz-range-thumb {
    width: 26px;
    height: 26px;
    border-radius: 9999px;
    background: rgb(var(--c-goldfinch-gold));
    border: 4px solid rgb(var(--c-surface));
    box-shadow: 0 0 0 1px rgb(var(--c-ink) / 0.18), 0 4px 12px rgb(var(--c-ink) / 0.18);
  }
  .planner-range:focus-visible {
    outline: none;
  }
  .planner-range:focus-visible::-webkit-slider-thumb {
    box-shadow: 0 0 0 4px rgb(var(--c-goldfinch-gold) / 0.35), 0 4px 12px rgb(var(--c-ink) / 0.18);
  }
  .planner-range:focus-visible::-moz-range-thumb {
    box-shadow: 0 0 0 4px rgb(var(--c-goldfinch-gold) / 0.35), 0 4px 12px rgb(var(--c-ink) / 0.18);
  }
</style>
