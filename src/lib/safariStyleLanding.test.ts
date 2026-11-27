import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stayPhotosWithChoices, styleLandingContentErrors, defaultStyleLandingContent } from './safariStyleLanding';

const lodge = (name: string) => ({ name, image_url: `https://media.example.com/${name}.jpg`, image_url_variants: { webp: [] } });

test('a chosen photo replaces the automatic one for that level only', () => {
  const photos = stayPhotosWithChoices(
    { Budget: lodge('camp'), 'Mid-range': lodge('lodge'), Luxury: lodge('villa') },
    { midRange: 'https://media.example.com/chosen.jpg' }
  );
  assert.deepEqual(photos['Mid-range'], { image_url: 'https://media.example.com/chosen.jpg' });
  assert.equal(photos.Budget?.name, 'camp');
  assert.equal(photos.Luxury?.name, 'villa');
});

test('blank, missing or non-web choices keep the automatic photo', () => {
  const automatic = { Budget: lodge('camp') };
  assert.deepEqual(stayPhotosWithChoices(automatic, undefined), automatic);
  assert.deepEqual(stayPhotosWithChoices(automatic, { budget: '  ' }), automatic);
  assert.deepEqual(stayPhotosWithChoices(automatic, { budget: 'javascript:alert(1)' }), automatic);
});

test('a chosen photo shows even when no property has one at that level', () => {
  const photos = stayPhotosWithChoices({}, { luxury: 'https://media.example.com/tent.jpg' });
  assert.deepEqual(photos, { Luxury: { image_url: 'https://media.example.com/tent.jpg' } });
});

test('the editor flags a photo the server would refuse, and accepts none at all', () => {
  const page = defaultStyleLandingContent({ name: 'Family Safari', image_url: 'https://media.example.com/a.jpg' });
  const ok = (planner: object) => styleLandingContentErrors({ ...page, planner: { ...page.planner, ...planner } }).filter((e) => e.includes('stayPhotos'));
  assert.deepEqual(ok({}), []);
  assert.deepEqual(ok({ stayPhotos: { budget: 'https://media.example.com/b.jpg', luxury: '' } }), []);
  assert.equal(ok({ stayPhotos: { budget: '/b.jpg' } }).length, 1);
  assert.equal(ok({ stayPhotos: { premium: 'https://media.example.com/b.jpg' } }).length, 1);
});
