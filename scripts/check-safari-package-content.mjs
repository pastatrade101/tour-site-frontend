/** Run with: node scripts/check-safari-package-content.mjs */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/safariPackageBlocks.ts', import.meta.url), 'utf8');
const js = ts.transpile(source, { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 });
const { blocksForEditing, blocksForSaving, routeTourSlugs, routeDisplayName } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

const stored = [
  { type: 'prose', title: 'A long heading '.repeat(30), body: '<p>Keep <strong>all</strong> this copy.</p>', extra: 'Preserve fields from older editors' },
  { type: 'facts', items: [{ label: 'Duration', value: '2 days', icon: 'clock' }] },
  { type: 'routes', routes: [{ tab: 'Northern parks', stay_disclaimer: 'We confirm your lodge with your travel dates.', tours: ['Obsolete value'], comforts: [{ accommodation_level: 'MID_RANGE', tour_slug: 'northern-safari', description: 'Comfortable lodges near the parks.', accommodation_ids: ['lodge-a', 'lodge-b'], extra: 'Keep me too' }] }] },
  { type: 'highlights', items: ['First highlight', 'Second highlight'] },
  { type: 'compare', columns: ['Route', 'Duration'], rows: [{ label: 'Northern', values: ['Two days'] }] },
  { type: 'unrecognised-section', content: { paragraphs: ['Retain unknown content'] } }
];
assert.deepEqual(blocksForSaving(blocksForEditing(stored)), stored, 'Round trips must retain all content, properties and unknown fields');
const editing = blocksForEditing(stored);
editing[2].routes[0].comforts[0].accommodation_ids.push('new-selection');
assert.equal(stored[2].routes[0].comforts[0].accommodation_ids.length, 2, 'Draft edits must not mutate fetched records');
assert.deepEqual(routeTourSlugs(stored[2].routes[0]), ['northern-safari'], 'Current selections take precedence over obsolete legacy tour values');
assert.deepEqual(routeTourSlugs({ tours: ['Mid-range | classic-safari', 'private-safari'] }), ['classic-safari', 'private-safari']);
assert.deepEqual(blocksForSaving([{ type: 'highlights', items: ['Already', 'Stored'] }])[0].items, ['Already', 'Stored']);
assert.deepEqual(blocksForSaving([{ type: 'highlights', items: 'First\n\nSecond' }])[0].items, ['First', 'Second']);
assert.equal(routeDisplayName('OPTION1', 'Nyerere Safari'), 'Nyerere Safari');
assert.equal(routeDisplayName('Option 2', 'Tarangire Safari'), 'Tarangire Safari');
assert.equal(routeDisplayName('', 'Nyerere Safari'), 'Nyerere Safari');
assert.equal(routeDisplayName('Tarangire & Ngorongoro', 'Full tour title'), 'Tarangire & Ngorongoro');
console.log('Safari package content checks passed: lossless round trips, isolated drafts, legacy routes and line-list compatibility.');
