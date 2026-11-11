import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { activityKind, placeOfDay, placesForDays, shortPlaceName, shortPlaceNames, splitList, tidyList } from './itineraryDisplay';

const place = (id: string, name: string) => ({ id, name, slug: id });
const day = (day_number: number, destination: ReturnType<typeof place> | null) =>
  ({ day_number, title: `Day ${day_number}`, destination_id: destination?.id ?? null, destination }) as never;

describe('itinerary display', () => {
  it('gives each place one colour, in the order the trip reaches it', () => {
    const tarangire = place('t', 'Tarangire National Park');
    const serengeti = place('s', 'Central Serengeti');
    const days = [day(3, serengeti), day(1, tarangire), day(2, serengeti), day(4, null)];
    const places = placesForDays(days);
    assert.deepEqual(places.map((p) => p.name), ['Tarangire National Park', 'Central Serengeti']);
    assert.notEqual(places[0].colour, places[1].colour);
    assert.equal(placeOfDay(days[0], places)?.name, 'Central Serengeti');
    // A day with no linked place has no place, rather than a borrowed one.
    assert.equal(placeOfDay(days[3], places), null);
  });

  it('splits activities where the writer did, and nowhere else', () => {
    assert.deepEqual(splitList('flight from Zanzibar,\nTarangire game drive\npicnic lunch'), [
      'Flight from Zanzibar',
      'Tarangire game drive',
      'Picnic lunch'
    ]);
    assert.deepEqual(splitList('Transit game drive\nPicnic lunch'), ['Transit game drive', 'Picnic lunch']);
    assert.deepEqual(splitList('- Sunset walk.\n- sunset walk'), ['Sunset walk']);
    assert.deepEqual(splitList(''), []);
    assert.deepEqual(splitList(null), []);
  });

  it('tidies a list typed with a trailing comma', () => {
    assert.equal(tidyList('Breakfast, '), 'Breakfast');
    assert.equal(tidyList('Breakfast, Lunch & Dinner'), 'Breakfast, Lunch & Dinner');
  });

  it('picks an icon from the words in a tag', () => {
    assert.equal(activityKind('Flight from Zanzibar'), 'flight');
    assert.equal(activityKind('Tarangire game drive'), 'drive');
    assert.equal(activityKind('Picnic lunch'), 'meal');
    assert.equal(activityKind('Wildlife and bird watching'), 'birds');
    assert.equal(activityKind('Something else entirely'), 'other');
  });

  it('shortens a destination only by its generic tail', () => {
    assert.equal(shortPlaceName('Serengeti National Park'), 'Serengeti');
    assert.equal(shortPlaceName('Ngorongoro Crater'), 'Ngorongoro');
    assert.equal(shortPlaceName('Central Serengeti'), 'Central Serengeti');
    assert.equal(shortPlaceName('Zanzibar'), 'Zanzibar');
    // Names in other languages have no English tail and are left alone.
    assert.equal(shortPlaceName('Serengeti-Nationalpark'), 'Serengeti-Nationalpark');
    assert.deepEqual(shortPlaceNames(['Ngorongoro Crater', 'Ngorongoro Conservation Area', 'Tarangire National Park']), [
      'Ngorongoro',
      'Tarangire'
    ]);
  });
});
