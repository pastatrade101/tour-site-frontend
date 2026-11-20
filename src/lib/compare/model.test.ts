import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { accommodationKind } from './accommodation';
import { destinationsKind } from './destinations';
import { guidesKind } from './guides';
import { buildComparison, compareHref, flag, list, money, narrowComparison, parseCompareKeys, score, text, type SectionDef } from './model';
import { interleave } from './shared';
import { toursKind } from './tours';

/** Stands in for `$t`: a key reads as itself, so a test can see which label a value got. */
const t = (key: string) => key;
const ctx = (extras = {}) => ({ t, extras });
const row = (built: ReturnType<typeof buildComparison>, id: string) => built.sections.flatMap((section) => section.rows).find((entry) => entry.id === id);

describe('comparison addresses', () => {
  it('reads distinct, valid keys from ?items= and stops at four', () => {
    assert.deepEqual(parseCompareKeys('a-b, c ,a-b,,d,e,f'), ['a-b', 'c', 'd', 'e']);
    assert.deepEqual(parseCompareKeys('ok,<script>,bad key,../x,a--b,-a'), ['ok']);
    assert.deepEqual(parseCompareKeys(null), []);
  });

  it('accepts a record id as a key (guides have no slug)', () => {
    const id = '3f0c2c1e-8a5b-4d1c-9a55-0c2f6f1b7d10';
    assert.deepEqual(parseCompareKeys(id), [id]);
  });

  it('builds the address a comparison is shared at', () => {
    assert.equal(compareHref('tours', ['a', 'b']), '/compare/tours?items=a,b');
    assert.equal(compareHref('guides'), '/compare/guides');
  });
});

describe('cells', () => {
  it('never turns a missing value into a value', () => {
    assert.equal(text(''), null);
    assert.equal(text('   '), null);
    assert.equal(text(null), null);
    assert.equal(list([]), null);
    assert.equal(list(['', '  ', null]), null);
    assert.equal(money(0), null);
    assert.equal(money(null), null);
    assert.equal(money('abc'), null);
    assert.equal(score(0), null);
    assert.equal(score(null), null);
    assert.equal(flag(null), null);
    assert.equal(flag(undefined), null);
  });

  it('keeps list entries distinct, in order, and counts what a limit leaves off', () => {
    assert.deepEqual(list(['Game drive', 'game drive', ' Walk ']), { type: 'list', items: ['Game drive', 'Walk'] });
    assert.deepEqual(list(['a', 'b', 'c', 'd'], 2), { type: 'list', items: ['a', 'b'], more: 2 });
  });
});

describe('building a comparison', () => {
  type Item = { name: string; price?: number; tier?: string; tags?: string[]; note?: string };
  const sections: SectionDef<Item>[] = [
    {
      id: 'main',
      title: 'main',
      rows: [
        { id: 'price', label: 'price', get: (item) => money(item.price), best: 'low' },
        { id: 'tier', label: 'tier', get: (item) => text(item.tier) },
        { id: 'tags', label: 'tags', get: (item) => list(item.tags) },
        { id: 'note', label: 'note', get: (item) => text(item.note) }
      ]
    },
    { id: 'empty', title: 'empty', rows: [{ id: 'never', label: 'never', get: () => null }] }
  ];

  it('drops rows and sections nobody fills', () => {
    const built = buildComparison(sections, [{ name: 'a', price: 100 }, { name: 'b', price: 200 }]);
    assert.deepEqual(built.sections.map((section) => section.id), ['main']);
    assert.deepEqual(built.sections[0].rows.map((entry) => entry.id), ['price']);
  });

  it('points at the single lowest price, and at nothing on a tie or a lone price', () => {
    assert.equal(row(buildComparison(sections, [{ name: 'a', price: 300 }, { name: 'b', price: 200 }, { name: 'c' }]), 'price')?.best, 1);
    assert.equal(row(buildComparison(sections, [{ name: 'a', price: 200 }, { name: 'b', price: 200 }, { name: 'c', price: 300 }]), 'price')?.best, null);
    assert.equal(row(buildComparison(sections, [{ name: 'a', price: 200 }, { name: 'b' }]), 'price')?.best, null);
  });

  it('calls a row the same only when every item gives the same answer', () => {
    const built = buildComparison(sections, [
      { name: 'a', tier: 'Luxury', note: 'x', tags: ['One', 'Two'] },
      { name: 'b', tier: 'luxury', tags: ['two', 'one'] }
    ]);
    assert.equal(row(built, 'tier')?.same, true); // case is not a difference
    assert.equal(row(built, 'tags')?.same, true); // nor is the order of a list
    assert.equal(row(built, 'note')?.same, false); // one says, one does not
    assert.equal(built.matching, 2);
    assert.equal(built.differing, 1);
  });

  it('finds the list entries every item shares', () => {
    const built = buildComparison(sections, [
      { name: 'a', tags: ['Park fees', 'Meals', 'Flights'] },
      { name: 'b', tags: ['meals', 'Park fees', 'Balloon'] }
    ]);
    assert.deepEqual(row(built, 'tags')?.common.sort(), ['meals', 'park fees']);
    // An item with no list shares nothing.
    assert.deepEqual(row(buildComparison(sections, [{ name: 'a', tags: ['Meals'] }, { name: 'b' }]), 'tags')?.common, []);
  });

  it('judges again when narrowed to two columns', () => {
    const built = buildComparison(sections, [
      { name: 'a', price: 300, tier: 'Luxury' },
      { name: 'b', price: 200, tier: 'Mid-range' },
      { name: 'c', price: 250, tier: 'Luxury' }
    ]);
    assert.equal(row(built, 'tier')?.same, false);
    const pair = narrowComparison(built, [0, 2]);
    assert.equal(row(pair, 'tier')?.same, true);
    assert.equal(row(pair, 'price')?.best, 1); // 250 is the lower of the two shown
    assert.equal(pair.matching, 1);
    assert.equal(pair.differing, 1);
  });
});

describe('safaris', () => {
  const bare = { id: '1', title: 'Bare', slug: 'bare' } as never;
  const full = {
    id: '2',
    title: 'Full',
    slug: 'full',
    price_from: 2400,
    duration_days: 7,
    duration_nights: 6,
    budget_tier: 'mid_range',
    difficulty_level: 'Easy',
    group_size_min: 2,
    group_size_max: 6,
    minimum_age: 0,
    start_location: 'Arusha',
    persona_tags: ['first-time safari travellers'],
    tour_destinations: [{ destination_id: 'd1', sort_order: 1, destinations: { id: 'd1', name: 'Serengeti', slug: 'serengeti' } }],
    itinerary_days: [
      { day_number: 1, title: 'One', lodge: { id: 'l1', name: 'River Camp', slug: 'river-camp' }, activities: 'Sunrise game drive\nPicnic lunch\nTransfer to Karatu', travel_mode: 'DRIVE' },
      { day_number: 2, title: 'Two', accommodation: 'Crater Lodge', activities: 'Afternoon game drive, village visit' }
    ],
    tour_inclusions: [{ title: 'Meals', sort_order: 2 }, { title: 'Park fees', sort_order: 1 }]
  } as never;

  it('shows nothing for a safari that says nothing', () => {
    const built = buildComparison(toursKind.sections([bare], ctx()), [bare]);
    assert.deepEqual(built.sections, []);
  });

  it('reads each row from the safari itself', () => {
    const built = buildComparison(toursKind.sections([full], ctx()), [full]);
    assert.deepEqual(row(built, 'price')?.cells[0], { type: 'money', usd: 2400 });
    assert.deepEqual(row(built, 'length')?.cells[0], { type: 'text', text: '7 label.days / 6 label.nights' });
    // The stand-in translator has no dictionary, so a stored choice falls back to its readable form.
    assert.deepEqual(row(built, 'comfort')?.cells[0], { type: 'text', text: 'Mid range' });
    assert.deepEqual(row(built, 'group')?.cells[0], { type: 'text', text: '2–6 ui.people' });
    assert.deepEqual(row(built, 'places')?.cells[0], { type: 'list', items: ['Serengeti'] });
    assert.deepEqual(row(built, 'stays')?.cells[0], { type: 'list', items: ['River Camp', 'Crater Lodge'] });
    assert.deepEqual(row(built, 'travel')?.cells[0], { type: 'list', items: ['ui.route_leg_drive'] });
    // Two differently worded game drives are one activity; a meal and a transfer are not activities.
    assert.deepEqual(row(built, 'activities')?.cells[0], { type: 'list', items: ['compare.act_game_drives', 'compare.act_culture'] });
    assert.deepEqual(row(built, 'included')?.cells[0], { type: 'list', items: ['Park fees', 'Meals'] });
    // A minimum age of 0 is "no minimum recorded", and no end point was given: neither is a row.
    assert.equal(row(built, 'age'), undefined);
    assert.equal(row(built, 'end'), undefined);
  });
});

describe('places to stay', () => {
  it('does not print a database default as an answer', () => {
    const lodge = { id: '1', name: 'Camp', slug: 'camp', accommodation_level: 'LUXURY', lodge_type: 'TENTED_CAMP', family_friendly: false, fly_in_available: false, children_allowed: false, wheelchair_accessible: false, price_per_night_from: null } as never;
    const built = buildComparison(accommodationKind.sections([lodge], ctx()), [lodge]);
    assert.deepEqual(built.sections.flatMap((section) => section.rows.map((entry) => entry.id)), ['comfort', 'type']);
  });

  it('says yes where the record says yes, and from what age', () => {
    const lodge = { id: '1', name: 'Camp', slug: 'camp', family_friendly: true, children_allowed: true, minimum_child_age: 6, wifi_availability: 'COMMON_AREAS_ONLY', amenities: [{ id: 'a', name: 'Pool' }] } as never;
    const built = buildComparison(accommodationKind.sections([lodge], ctx()), [lodge]);
    assert.deepEqual(row(built, 'family')?.cells[0], { type: 'flag', value: true });
    assert.deepEqual(row(built, 'children')?.cells[0], { type: 'text', text: 'compare.from_n_years' });
    assert.deepEqual(row(built, 'wifi')?.cells[0], { type: 'text', text: 'Common areas only' });
    assert.deepEqual(row(built, 'amenities')?.cells[0], { type: 'list', items: ['Pool'] });
  });
});

describe('destinations', () => {
  const guide = (name: string) => [
    { title: 'At a glance', items: [{ title: 'Best for', body: `${name} wildlife` }, { title: 'Recommended stay', body: '2 nights' }] },
    { title: `Why ${name}`, body: 'Why text that is long enough to count as a section of the guide.' },
    { title: `Highlights of ${name}`, body: 'Highlights text that is long enough to count as a section.' },
    { title: `Best Time to Visit ${name}`, body: 'June to October is the dry season and the easiest time to see game.' },
    { title: `How ${name} Fits Into a Safari Route`, body: 'It pairs with the crater on a northern circuit.' },
    { title: 'Helpful tips', body: 'Tips text that is long enough to count as a section of the guide.' }
  ];
  const serengeti = { id: 'd1', name: 'Serengeti', slug: 'serengeti', country: 'Tanzania', score_wildlife: 10, score_family: 0, guide: guide('Serengeti') } as never;
  const mikumi = { id: 'd2', name: 'Mikumi', slug: 'mikumi', country: 'Tanzania', score_wildlife: 7 } as never;

  it('labels quick-fact rows from the guide and leaves a guide-less place empty', () => {
    const built = buildComparison(destinationsKind.sections([serengeti, mikumi], ctx()), [serengeti, mikumi]);
    const fact = row(built, 'fact-0');
    assert.equal(fact?.labelText, 'Best for');
    assert.deepEqual(fact?.cells, [{ type: 'text', text: 'Serengeti wildlife' }, null]);
    assert.equal(row(built, 'country')?.same, true);
  });

  it('rates only what is rated, and points at the higher rating', () => {
    const built = buildComparison(destinationsKind.sections([serengeti, mikumi], ctx()), [serengeti, mikumi]);
    assert.equal(row(built, 'wildlife')?.best, 0);
    assert.equal(row(built, 'family'), undefined); // a 0 is an unrated field
  });

  it('finds the guide sections by their titles', () => {
    const built = buildComparison(destinationsKind.sections([serengeti], ctx()), [serengeti]);
    assert.match((row(built, 'when')?.cells[0] as { text: string }).text, /June to October/);
    assert.match((row(built, 'route')?.cells[0] as { text: string }).text, /northern circuit/);
  });

  it('falls back to the standard order for a translated guide, and to nothing for any other shape', () => {
    const translated = { ...(serengeti as object), guide: guide('Serengeti').map((block, index) => ({ ...block, title: `Abschnitt ${index}` })) } as never;
    const built = buildComparison(destinationsKind.sections([translated], ctx()), [translated]);
    assert.match((row(built, 'when')?.cells[0] as { text: string }).text, /June to October/);

    const odd = { ...(serengeti as object), guide: guide('Serengeti').slice(0, 3).map((block, index) => ({ ...block, title: `Abschnitt ${index}` })) } as never;
    assert.equal(row(buildComparison(destinationsKind.sections([odd], ctx()), [odd]), 'when'), undefined);
  });

  it('counts safaris, prices and stays from what is linked to the place', () => {
    const extras = {
      tours: [
        { id: 't1', title: 'A', slug: 'a', price_from: 3000, tour_destinations: [{ destination_id: 'd1', destinations: { id: 'd1', name: 'Serengeti', slug: 'serengeti' } }] },
        { id: 't2', title: 'B', slug: 'b', price_from: 1800, tour_destinations: [{ destination_id: 'd1', destinations: { id: 'd1', name: 'Serengeti', slug: 'serengeti' } }] }
      ],
      lodges: [{ id: 'l1', name: 'Camp', slug: 'camp', destination_id: 'd1' }]
    };
    const built = buildComparison(destinationsKind.sections([serengeti, mikumi], ctx(extras)), [serengeti, mikumi]);
    assert.deepEqual(row(built, 'safaris')?.cells, [{ type: 'text', text: 'compare.n_safaris' }, null]);
    assert.deepEqual(row(built, 'from')?.cells, [{ type: 'money', usd: 1800 }, null]);
    assert.deepEqual(row(built, 'stays')?.cells, [{ type: 'text', text: 'compare.n_stay' }, null]);
  });
});

describe('guides', () => {
  it('compares what a specialist record holds, and links only real profiles', () => {
    const anna = { id: 'g1', name: 'Anna M', role: 'Safari specialist', blurb: 'Plans northern circuit trips.', tripadvisor_url: 'https://www.tripadvisor.com/x' } as never;
    const ben = { id: 'g2', name: 'Ben K', role: 'Safari specialist', tripadvisor_url: 'javascript:alert(1)' } as never;
    const extras = { tours: [{ id: 't1', title: 'Northern Circuit', slug: 'n', specialist_id: 'g1' }] };
    const built = buildComparison(guidesKind.sections([anna, ben], ctx(extras)), [anna, ben]);
    assert.equal(row(built, 'role')?.same, true);
    assert.deepEqual(row(built, 'safaris')?.cells, [{ type: 'list', items: ['Northern Circuit'] }, null]);
    assert.deepEqual(row(built, 'tripadvisor')?.cells, [{ type: 'links', items: [{ label: 'TripAdvisor', href: 'https://www.tripadvisor.com/x' }] }, null]);
  });

  it('states experience, languages and specialisations only for the people who have them', () => {
    const anna = { id: 'g1', name: 'Anna M', role: 'Safari guide', years_experience: 12, languages: ['English', 'Swahili', 'German'], specialisations: ['Great Migration'] } as never;
    const ben = { id: 'g2', name: 'Ben K', role: 'Safari guide', years_experience: 0, languages: [], specialisations: null } as never;
    const built = buildComparison(guidesKind.sections([anna, ben], ctx()), [anna, ben]);
    assert.deepEqual(row(built, 'experience')?.cells, [{ type: 'text', text: 'compare.n_years' }, null]);
    assert.equal(row(built, 'experience')?.best, null); // people are not ranked
    assert.deepEqual(row(built, 'languages')?.cells, [{ type: 'list', items: ['English', 'Swahili', 'German'] }, null]);
    assert.deepEqual(row(built, 'specialisations')?.cells, [{ type: 'list', items: ['Great Migration'] }, null]);

    // Nobody filled in: the rows are not there at all.
    const empty = buildComparison(guidesKind.sections([ben], ctx()), [ben]);
    for (const id of ['experience', 'languages', 'specialisations']) assert.equal(row(empty, id), undefined);
  });
});

describe('what a safari already says about the other categories', () => {
  const tour = (slug: string, lodges: Array<[string, string] | null>, places: string[], specialist: string | null) =>
    ({
      id: slug,
      title: slug,
      slug,
      specialist_id: specialist,
      specialist: specialist ? { id: specialist, name: `Person ${specialist}`, role: 'Tour Planner' } : null,
      itinerary_days: lodges.map((lodge, index) => ({ day_number: index + 1, title: `Day ${index + 1}`, lodge: lodge ? { id: lodge[0], slug: lodge[0], name: lodge[1] } : null, accommodation: lodge ? null : 'A guest house in town' })),
      tour_destinations: places.map((place, index) => ({ destination_id: place, sort_order: index, destinations: { id: place, slug: place, name: place } }))
    }) as never;

  const a = tour('a', [['river-camp', 'River Camp'], ['river-camp', 'River Camp'], ['crater-lodge', 'Crater Lodge'], null], ['serengeti', 'ngorongoro'], 'p1');
  const b = tour('b', [['beach-house', 'Beach House'], ['crater-lodge', 'Crater Lodge']], ['zanzibar', 'serengeti'], 'p1');

  it('reads the linked properties, the places visited and the specialist from a safari', () => {
    assert.deepEqual(accommodationKind.fromTour!(a).map((entry) => entry.key), ['river-camp', 'river-camp', 'crater-lodge']); // free-text stays have no page
    assert.deepEqual(destinationsKind.fromTour!(a).map((entry) => entry.key), ['serengeti', 'ngorongoro']);
    assert.deepEqual(guidesKind.fromTour!(a), [{ key: 'p1', title: 'Person p1' }]);
    assert.equal(toursKind.fromTour, undefined);
  });

  it('takes turns between the safaris and lists each place once', () => {
    const stays = interleave([a, b].map((entry) => accommodationKind.fromTour!(entry)));
    assert.deepEqual(stays.map((entry) => entry.key), ['river-camp', 'beach-house', 'crater-lodge']);
    const people = interleave([a, b].map((entry) => guidesKind.fromTour!(entry)));
    assert.deepEqual(people.map((entry) => entry.key), ['p1']);
    assert.deepEqual(interleave([]), []);
  });
});
