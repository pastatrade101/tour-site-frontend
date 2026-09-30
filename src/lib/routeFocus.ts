import { fitProjection, padBBox, type BasemapDoc, type Projection, type Zoom } from './geo/basemap';

/**
 * Whole country, or fitted to the route?
 *
 * The whole country is the better picture — a reader sees whether a trip runs
 * along the coast or across the middle — so it is kept whenever it stays
 * readable. It stops being readable when two pins, or a pin and another's
 * "Day 2–3" label, would land on top of each other. A plain distance limit
 * cannot tell those apart: labels sit to the RIGHT of their pin, so two stops
 * side by side collide at a gap where two stops stacked one above the other
 * are fine. So each pin and its label are measured as a box, on the same
 * country-scale projection TanzaniaMap draws, and any overlap means zoom.
 *
 * Measured against the real itineraries this fits most northern-circuit loops
 * (Arusha, Karatu, Mto wa Mbu, Ngorongoro all within a degree) and keeps the
 * country for routes spread across it.
 */

export type FocusStop = { lat: number; lng: number; badge: string };

// Geometry of lib/geo/TanzaniaMap.svelte — keep these in step if it changes.
const VIEW_WIDTH = 640; // the width RouteMap passes to TanzaniaMap
const COUNTRY_PAD = 0.04; // TanzaniaMap's padBBox(basemap.bbox, 0.04) for focus 'country'
const PIN_R = 8; // stop pin radius
const LABEL_X = 11.5; // the badge starts this far right of the pin centre
const CHAR_W = 7.4; // average advance of the 13px bold badge text
const HALF_H = 9; // half the height of a pin and its label
const TOUCH = 2; // strokes merely touching still read fine

type Box = [number, number, number, number];

const overlaps = (a: Box, b: Box) =>
  a[0] < b[2] - TOUCH && b[0] < a[2] - TOUCH && a[1] < b[3] - TOUCH && b[1] < a[3] - TOUCH;

/** The frame every route is drawn in: all of Tanzania, as TanzaniaMap fits it. */
export const countryProjection = (basemap: BasemapDoc): Projection =>
  fitProjection(padBBox(basemap.bbox, COUNTRY_PAD), VIEW_WIDTH);

// A return visit lands on the very same spot, which is not crowding: one entry
// per place, sized for the longest label drawn there.
const placesOf = (stops: FocusStop[]) => {
  const places = new Map<string, FocusStop>();
  for (const stop of stops) {
    const key = `${stop.lat},${stop.lng}`;
    const seen = places.get(key);
    if (!seen || stop.badge.length > seen.badge.length) places.set(key, stop);
  }
  return [...places.values()];
};

export const routeFocus = (stops: FocusStop[], basemap: BasemapDoc): 'country' | 'markers' => {
  const places = placesOf(stops);
  if (places.length < 2) return 'country';

  const project = countryProjection(basemap);
  const boxes = places.map((stop): Box => {
    const [x, y] = project([stop.lng, stop.lat]);
    return [x - PIN_R, y - HALF_H, x + LABEL_X + stop.badge.length * CHAR_W, y + HALF_H];
  });

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (overlaps(boxes[i], boxes[j])) return 'markers';
    }
  }
  return 'country';
};

/*
 * ── Zoom ─────────────────────────────────────────────────────────────────────
 * Every view is the country frame magnified around a point, so the map box
 * never changes size. Out, the levels run back to the whole country. In, they
 * go only as deep as it takes to pull the most crowded pins' labels apart —
 * measured with the same pin-and-label boxes as the opening view — and glide
 * from the whole route toward that crowded spot, so the last click lands on
 * Karatu, Mto wa Mbu and Ngorongoro side by side rather than on the empty
 * country between the parks.
 */
const STEP = 1.6; // the size of a click, when the depth leaves the choice free
const STEPS_IN = 3; // at most
const STEPS_OUT = 2; // at most; fewer when the opening view is already wide
const FIT_MARGIN = 28; // clear space around the pins and labels when fitted
// The old 'markers' fit never showed less than about 2.3° across, so a single
// area still reads as a place in the country. Twelve degrees ÷ 2.3 ≈ 5.
const MAX_FIT = 5;
// About a degree across (≈110 km). Deeper, the country's outline is gone and
// the view is a line on blank land — nothing a reader can place.
const MAX_ZOOM = 12;
const CLEAR_MARGIN = 1.15; // a little air once the labels have parted

type Place = { x: number; y: number; w: number };

/** The magnification at which two places' pin-and-label boxes stop overlapping. */
const clearAt = (a: Place, b: Place) => {
  const [left, right] = a.x <= b.x ? [a, b] : [b, a];
  const dx = right.x - left.x;
  const dy = Math.abs(a.y - b.y);
  // Side by side, the left one's label must end before the right one's pin;
  // one above the other, the two rows must not touch.
  const byX = dx > 0 ? (PIN_R + LABEL_X + left.w - TOUCH) / dx : Infinity;
  const byY = dy > 0 ? (2 * HALF_H - TOUCH) / dy : Infinity;
  return Math.min(byX, byY);
};

/** Keep a view's centre where the magnified frame still lies on the country. */
export const clampZoom = (base: Projection, zoom: Zoom): Zoom => {
  const [x, y] = base(zoom.center);
  const hw = base.width / (2 * zoom.scale);
  const hh = base.height / (2 * zoom.scale);
  const cx = Math.min(Math.max(x, hw), base.width - hw);
  const cy = Math.min(Math.max(y, hh), base.height - hh);
  return { scale: zoom.scale, center: base.invert([cx, cy]) };
};

export type RouteViews = { levels: Zoom[]; start: number };

export const routeViews = (stops: FocusStop[], basemap: BasemapDoc): RouteViews => {
  const base = countryProjection(basemap);
  const places: Place[] = placesOf(stops).map((stop) => {
    const [x, y] = base([stop.lng, stop.lat]);
    return { x, y, w: stop.badge.length * CHAR_W };
  });
  if (!places.length) return { levels: [{ scale: 1, center: base.invert([base.width / 2, base.height / 2]) }], start: 0 };

  // Pins spread with the zoom; their labels do not — they stay the same size.
  const extent = (set: Place[]) => {
    const xs = set.map((p) => p.x);
    const ys = set.map((p) => p.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
      labelW: LABEL_X + Math.max(0, ...set.map((p) => p.w))
    };
  };
  const route = extent(places);
  const room = (span: number, fixed: number, frame: number) =>
    span > 0 ? (frame - 2 * FIT_MARGIN - fixed) / span : Infinity;
  const fit = Math.min(
    Math.max(
      Math.min(
        room(route.maxX - route.minX, route.labelW + PIN_R, base.width),
        room(route.maxY - route.minY, 2 * HALF_H, base.height)
      ),
      1
    ),
    MAX_FIT
  );

  /** The middle of a set's pins-and-labels box at a scale, in country-frame units. */
  const middle = (set: ReturnType<typeof extent>, scale: number): [number, number] => [
    (set.minX + set.maxX) / 2 + (set.labelW - PIN_R) / 2 / scale,
    (set.minY + set.maxY) / 2
  ];
  const view = (scale: number, [x, y]: [number, number]): Zoom =>
    clampZoom(base, { scale, center: base.invert([x, y]) });

  const opening = routeFocus(stops, basemap) === 'country' ? 1 : fit;

  // The crowded spot: the pair of places needing the most magnification to
  // part, and every place still tangled with them at the opening view.
  let tightest: [number, number] | null = null;
  let clear = 0;
  for (let i = 0; i < places.length; i++) {
    for (let j = i + 1; j < places.length; j++) {
      const need = clearAt(places[i], places[j]);
      if (need > clear) [clear, tightest] = [need, [i, j]];
    }
  }
  let crowd = places;
  if (tightest && clear > opening) {
    const member = new Set(tightest);
    for (let grew = true; grew; ) {
      grew = false;
      places.forEach((p, i) => {
        if (member.has(i)) return;
        if ([...member].some((m) => clearAt(p, places[m]) > opening)) {
          member.add(i);
          grew = true;
        }
      });
    }
    crowd = places.filter((_, i) => member.has(i));
  }
  const cluster = extent(crowd);

  // Deep enough to part the crowd, and to fit the whole route when the page
  // opens on the country; never past MAX_ZOOM, and worth at least two clicks.
  const deepest = Math.min(Math.max(fit, clear * CLEAR_MARGIN, opening * STEP ** 2), MAX_ZOOM);
  const steps = Math.min(Math.max(Math.ceil(Math.log(deepest / opening) / Math.log(STEP) - 0.05), 1), STEPS_IN);

  const levels: Zoom[] = [];
  const out = opening <= 1 ? 0 : opening >= STEP * 1.25 ? STEPS_OUT : 1;
  for (let j = 0; j < out; j++) {
    const scale = opening ** (j / out); // j = 0 is the whole country
    levels.push(view(scale, middle(route, scale)));
  }
  levels.push(view(opening, middle(route, opening)));
  if (deepest > opening) {
    for (let i = 1; i <= steps; i++) {
      const scale = opening * (deepest / opening) ** (i / steps);
      const [ax, ay] = middle(route, scale);
      const [bx, by] = middle(cluster, scale);
      const k = i / steps;
      levels.push(view(scale, [ax + (bx - ax) * k, ay + (by - ay) * k]));
    }
  }
  return { levels, start: out };
};
