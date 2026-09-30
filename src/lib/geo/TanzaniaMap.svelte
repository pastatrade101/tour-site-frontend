<script lang="ts">
	/**
	 * A Tanzania map rendered as plain SVG from the bundled national basemap.
	 *
	 * Deliberately not Leaflet/Mapbox: no API key on a public page, no tile
	 * request to a third party, no runtime dependency to keep alive, and it
	 * inherits the surrounding theme through CSS custom properties instead of
	 * fighting a library's stylesheet. It also renders correctly on the server,
	 * so a destination page ships its map in the HTML.
	 */
	import { untrack } from 'svelte';
	import {
		decodeBasemap,
		fitProjection,
		regionShapes,
		outlinePath,
		lakePaths,
		legPath,
		LEG_BOW,
		padBBox,
		boundsOf,
		zoomProjection,
		zoomTransform,
		type BasemapDoc,
		type BBox,
		type LngLat,
		type MapMarker,
		type Zoom
	} from './basemap';

	interface Props {
		basemap: BasemapDoc;
		/** Region slugs painted as active. */
		highlight?: string[];
		markers?: MapMarker[];
		/** Join the markers in order, as a journey. */
		route?: boolean;
		/** 'country', 'markers', 'highlight', or an explicit bbox. */
		focus?: BBox | 'country' | 'markers' | 'highlight';
		/**
		 * Magnify the focused view. The frame keeps its size; pins, labels and
		 * route lines keep theirs, only the distances between them grow.
		 */
		zoom?: Zoom;
		width?: number;
		showRegionLabels?: boolean;
		interactive?: boolean;
		ariaLabel?: string;
		onselect?: (slug: string) => void;
		/**
		 * Per-region fill, keyed by region slug. Used to shade the country by
		 * tourism circuit, where every region has a colour and "highlight" would
		 * be the wrong idea — nothing is being singled out.
		 */
		regionColors?: Record<string, string>;
		/** Turns the map into a picker: a click reports where it landed. */
		onmapclick?: (p: LngLat) => void;
		class?: string;
	}

	let {
		basemap,
		highlight = [],
		markers = [],
		route = false,
		focus = 'country',
		zoom,
		width = 640,
		showRegionLabels = false,
		interactive = false,
		regionColors,
		ariaLabel = 'Map of Tanzania',
		onselect,
		onmapclick,
		class: className = ''
	}: Props = $props();

	let svgEl = $state<SVGSVGElement | null>(null);

	/**
	 * Client pixels to lon/lat.
	 *
	 * Goes through the SVG's own screen matrix rather than getBoundingClientRect
	 * arithmetic, so it stays correct under preserveAspectRatio letterboxing, CSS
	 * transforms and any zoom the browser is applying.
	 */
	function pointAt(ev: MouseEvent): LngLat | null {
		if (!svgEl) return null;
		const ctm = svgEl.getScreenCTM();
		if (!ctm) return null;
		const p = svgEl.createSVGPoint();
		p.x = ev.clientX;
		p.y = ev.clientY;
		const local = p.matrixTransform(ctm.inverse());
		return project.invert([local.x, local.y]);
	}

	// A stable id so <defs> in two maps on one page cannot collide.
	const uid = `mk-map-${Math.random().toString(36).slice(2, 9)}`;

	const map = $derived(decodeBasemap(basemap));
	const active = $derived(new Set(highlight));

	const bounds = $derived.by((): BBox => {
		if (Array.isArray(focus)) return padBBox(focus);
		if (focus === 'markers' && markers.length) {
			return padBBox(
				boundsOf(
					markers.map((m) => [m.lng, m.lat] as LngLat),
					basemap.bbox
				),
				0.45
			);
		}
		if (focus === 'highlight' && highlight.length) {
			const hit = basemap.regions.filter((r) => active.has(r.slug));
			if (hit.length) {
				return padBBox([
					Math.min(...hit.map((r) => r.bbox[0])),
					Math.min(...hit.map((r) => r.bbox[1])),
					Math.max(...hit.map((r) => r.bbox[2])),
					Math.max(...hit.map((r) => r.bbox[3]))
				]);
			}
		}
		return padBBox(basemap.bbox, 0.04);
	});

	/*
	 * The route draws itself in, one leg at a time, then hands back.
	 *
	 * While `drawing` is on, every leg is a single dash the length of its own
	 * path (pathLength="1") with the offset animating to zero — so it grows from
	 * its start pin to its end pin. Once the last leg has landed the class comes
	 * off and each leg's own dash pattern applies again, which is what tells a
	 * reader drive from flight from boat. Animating on top of those patterns
	 * would have made the dashes march instead of the line arrive.
	 */
	let drawing = $state(false);
	let reducedMotion = $state(false);

	$effect(() => {
		const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
		if (!mq) return;
		reducedMotion = mq.matches;
		const onChange = () => (reducedMotion = mq.matches);
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	// The journey itself, not where it sits on screen: a zoom re-projects every
	// leg on every frame, and the route must not draw itself in again each time.
	const journey = $derived(
		route ? markers.map((m) => `${m.lat},${m.lng},${m.mode ?? ''}`).join('|') : ''
	);

	$effect(() => {
		if (!journey || reducedMotion) return;
		const count = untrack(() => legs.length);
		if (!count) return;
		drawing = true;
		// Each leg starts exactly as the one before it lands, so the line is drawn
		// by a pen that never lifts. An overlap made two legs grow at once; a gap
		// made it stop and start.
		const done = setTimeout(() => (drawing = false), LEG_DRAW * count + 80);
		return () => clearTimeout(done);
	});

	const LEG_DRAW = 620;

	// The geography is projected once, for the focused view, and a zoom moves it
	// with one transform — re-projecting every coastline per animation frame is
	// what would make a zoom stutter. Pins and legs are few, so they take the
	// zoomed projection directly and keep their size.
	const base = $derived(fitProjection(bounds, width));
	const project = $derived(zoom ? zoomProjection(base, zoom) : base);
	const view = $derived(zoom ? zoomTransform(base, zoom) : null);
	const geoTransform = $derived(view ? `translate(${view.tx} ${view.ty}) scale(${view.k})` : undefined);
	const regions = $derived(regionShapes(map, base));
	const outline = $derived(outlinePath(map, base));
	const lakes = $derived(lakePaths(map, base));
	/** A region's label point, carried through the zoom without scaling the text. */
	const labelAt = ([x, y]: [number, number]): [number, number] =>
		view ? [x * view.k + view.tx, y * view.k + view.ty] : [x, y];
	// A marker with a missing or unparseable coordinate is DROPPED rather than
	// projected to NaN, which SVG renders as a dot in the top-left corner.
	const pins = $derived(
		markers
			.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng))
			.map((m, i) => {
				const [x, y] = project([m.lng, m.lat]);
				return { ...m, x, y, i };
			})
	);
	// Leg i runs from pin i to pin i+1, and is styled by the mode of the pin it
	// ARRIVES at — that is the journey the operator described for that day.
	const legs = $derived(
		route
			? pins.slice(1).map((p, i) => ({
					d: legPath([pins[i].x, pins[i].y], [p.x, p.y], LEG_BOW[p.mode ?? 'NONE']),
					mode: p.mode ?? null,
					key: i
				}))
			: []
	);

	/** About two and a half seconds per leg, so a long trip does not race. */
	const tripDuration = $derived(Math.max(4, legs.length * 2.4));

	/*
	 * A vehicle per leg, drawn from above.
	 *
	 * Top-down on purpose: `rotate="auto"` turns each one to face along its own
	 * curve, and a plan-view shape reads correctly at every heading. A
	 * side-on car would be upside down the moment the route ran right to left.
	 * Everything is drawn around the origin, because animateMotion moves the
	 * group by translating it there.
	 */
	const VEHICLE: Record<string, string> = {
		FLY: 'M5.4 0 -1.4 3.4 -0.2 0.9 -3.6 1.6 -4.4 0.6 -1.6 0 -4.4 -0.6 -3.6 -1.6 -0.2 -0.9 -1.4 -3.4Z',
		DRIVE: 'M-3.4 -1.7h4.6l2 1.1v1.2l-2 1.1h-4.6a1 1 0 0 1-1-1v-1.4a1 1 0 0 1 1-1Z',
		BOAT: 'M-3.2 -1.5h4l2.4 1.5-2.4 1.5h-4l-1-1.5Z'
	};

	/*
	 * One cycle, sliced evenly between the legs.
	 *
	 * Each vehicle waits at its start pin, crosses its own leg during its slice,
	 * then waits at the end — keyPoints holds it at 0 and at 1 either side. A
	 * discrete opacity track shows only the one whose turn it is, so the trip
	 * reads as a single journey handed from car to plane to boat rather than
	 * three things moving at once.
	 */
	const riders = $derived(
		legs.map((leg, i) => {
			const from = i / legs.length;
			const to = (i + 1) / legs.length;
			const t = (n: number) => Math.round(n * 1000) / 1000;
			return {
				key: leg.key,
				d: leg.d,
				icon: VEHICLE[leg.mode ?? ''] ?? '',
				keyTimes: `0;${t(from)};${t(to)};1`,
				showTimes: from === 0 ? `0;${t(to)}` : `0;${t(from)};${t(to)}`,
				showValues: from === 0 ? '1;0' : '0;1;0'
			};
		})
	);

	const usedModes = $derived([...new Set(legs.map((l) => l.mode).filter(Boolean))] as string[]);

	let hovered = $state<string | null>(null);
</script>

<div class="mk-map {className}" class:is-interactive={interactive}>
	<!-- The click only exists in picker mode (onmapclick), where pointing at a spot
	     IS the action; a keyboard user types the coordinates in the form instead. -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events -->
	<svg
		bind:this={svgEl}
		viewBox="0 0 {project.width} {project.height}"
		role="img"
		aria-label={ariaLabel}
		preserveAspectRatio="xMidYMid meet"
		class:is-picking={!!onmapclick}
		onclick={onmapclick
			? (e) => {
					const p = pointAt(e);
					if (p) onmapclick(p);
				}
			: undefined}
	>
		<defs>
			<filter id="{uid}-pin" x="-50%" y="-50%" width="200%" height="200%">
				<feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-opacity="0.35" />
			</filter>
			<marker
				id="{uid}-arrow"
				viewBox="0 0 10 10"
				refX="8"
				refY="5"
				markerWidth="5"
				markerHeight="5"
				orient="auto-start-reverse"
			>
				<path d="M0 0 L10 5 L0 10 z" fill="var(--map-route, #c8553d)" />
			</marker>
		</defs>

		<rect width="100%" height="100%" fill="var(--map-sea, #eef4f7)" />

		<g class="mk-map__geo" transform={geoTransform}>
			<g class="mk-map__land">
				{#each regions as r (r.slug)}
					{#if interactive}
						<path
							d={r.d}
							class="mk-map__region"
							class:is-active={active.has(r.slug)}
							class:is-hovered={hovered === r.slug}
							style={regionColors?.[r.slug] ? `fill:${regionColors[r.slug]}` : undefined}
							role="button"
							tabindex="0"
							aria-label={r.name}
							onmouseenter={() => (hovered = r.slug)}
							onmouseleave={() => (hovered = null)}
							onfocus={() => (hovered = r.slug)}
							onblur={() => (hovered = null)}
							onclick={() => onselect?.(r.slug)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									onselect?.(r.slug);
								}
							}}
						/>
					{:else}
						<path
							d={r.d}
							class="mk-map__region"
							class:is-active={active.has(r.slug)}
							style={regionColors?.[r.slug] ? `fill:${regionColors[r.slug]}` : undefined}
						/>
					{/if}
				{/each}
			</g>

			{#each lakes as l (l.name)}
				<path d={l.d} class="mk-map__lake" />
			{/each}

			<path d={outline} class="mk-map__outline" />
		</g>

		{#if legs.length}
			<g class="mk-map__route" class:is-drawing={drawing}>
				{#each legs as leg, i (leg.key)}
					<path
						d={leg.d}
						class={leg.mode ? `is-${leg.mode.toLowerCase()}` : 'is-unstated'}
						marker-end="url(#{uid}-arrow)"
						pathLength="1"
						style="--leg: {i}"
					/>
				{/each}

				{#if !reducedMotion}
					<!--
						The journey, made over and over — by car where they drive, by
						plane where they fly, by boat over water.

						Purely decorative: hidden from assistive technology, and not
						rendered at all for a reader who has asked for less motion. The
						route and its legend say the same thing without it.
					-->
					{#each riders as rider (rider.key)}
						<g class="mk-map__traveller" aria-hidden="true">
							<circle class="mk-map__traveller-halo" r="10" />
							{#if rider.icon}
								<!-- Drawn small and scaled up, so one set of paths serves both
								     the map and the composer's buttons. The viewBox is 640 units
								     against roughly 516 rendered pixels, so a 10-unit vehicle was
								     landing at about 8px on screen. -->
								<path class="mk-map__traveller-icon" d={rider.icon} transform="scale(1.9)" />
							{:else}
								<circle class="mk-map__traveller-dot" r="2.6" />
							{/if}
							<animateMotion
								dur="{tripDuration}s"
								repeatCount="indefinite"
								path={rider.d}
								rotate="auto"
								calcMode="linear"
								keyPoints="0;0;1;1"
								keyTimes={rider.keyTimes}
							/>
							<animate
								attributeName="opacity"
								dur="{tripDuration}s"
								repeatCount="indefinite"
								calcMode="discrete"
								values={rider.showValues}
								keyTimes={rider.showTimes}
							/>
						</g>
					{/each}
				{/if}
			</g>
		{/if}

		{#if showRegionLabels}
			<g class="mk-map__labels">
				{#each regions as r (r.slug)}
					{#if !highlight.length || active.has(r.slug)}
						{@const [lx, ly] = labelAt(r.label)}
						<text x={lx} y={ly} class:is-active={active.has(r.slug)}>{r.name}</text>
					{/if}
				{/each}
			</g>
		{/if}

		<g class="mk-map__pins">
			{#each pins as p (p.i)}
				<g class="mk-map__pin mk-map__pin--{p.kind ?? 'stop'}" filter="url(#{uid}-pin)">
					<circle cx={p.x} cy={p.y} r={p.kind === 'place' ? 8 : 7} />
					{#if p.kind !== 'place' && route}
						<text x={p.x} y={p.y + 3.2} class="mk-map__pin-n">{p.i + 1}</text>
					{/if}
				</g>
				{#if p.badge}
					<text x={p.x + 11.5} y={p.y + 4.6} class="mk-map__badge">{p.badge}</text>
				{/if}
			{/each}
		</g>

		{#if interactive && hovered}
			{@const r = regions.find((x) => x.slug === hovered)}
			{#if r}
				{@const [lx, ly] = labelAt(r.label)}
				<text x={lx} y={ly} class="mk-map__tip">{r.name}</text>
			{/if}
		{/if}
	</svg>
</div>

<style>
	.mk-map {
		width: 100%;
	}
	.mk-map svg {
		display: block;
		width: 100%;
		height: auto;
		border-radius: var(--map-radius, 6px);
		overflow: hidden;
	}
	.mk-map svg.is-picking {
		cursor: crosshair;
	}

	/* A zoom scales the geography group; its borders stay hairlines. */
	.mk-map__region,
	.mk-map__lake,
	.mk-map__outline {
		vector-effect: non-scaling-stroke;
	}

	.mk-map__region {
		fill: var(--map-land, #dfe6df);
		stroke: var(--map-border, #ffffff);
		stroke-width: 0.6;
		stroke-linejoin: round;
		transition: fill 0.15s ease;
	}
	.mk-map__region.is-active {
		fill: var(--map-land-active, #e6c3ba);
		stroke: var(--map-land-active-edge, #c8553d);
		stroke-width: 1;
	}
	.is-interactive .mk-map__region {
		cursor: pointer;
		outline: none;
	}
	.is-interactive .mk-map__region.is-hovered {
		fill: var(--map-land-hover, #b9c7b9);
	}
	.is-interactive .mk-map__region.is-active.is-hovered {
		fill: var(--map-land-active-hover, #dcb0a5);
	}

	.mk-map__lake {
		fill: var(--map-water, #cfe1ea);
		stroke: var(--map-water-edge, #b9d3df);
		stroke-width: 0.4;
		pointer-events: none;
	}

	.mk-map__outline {
		fill: none;
		stroke: var(--map-outline, #9aa89a);
		stroke-width: 1;
		stroke-linejoin: round;
		stroke-linecap: round;
		pointer-events: none;
	}

	.mk-map__route > path {
		fill: none;
		stroke: var(--map-route, #c8553d);
		stroke-width: 1.8;
		stroke-linecap: round;
		pointer-events: none;
	}
	/* Solid ground, dashes for air, dots for water — readable before the legend. */
	.mk-map__route > path.is-drive {
		stroke-dasharray: none;
	}
	.mk-map__route > path.is-fly {
		stroke-dasharray: 6 5;
	}
	.mk-map__route > path.is-boat {
		stroke-dasharray: 1.5 4;
	}
	.mk-map__route > path.is-unstated {
		stroke-dasharray: 4 3.5;
		opacity: 0.75;
	}

	/*
	 * The draw. One dash as long as the path itself, unrolled from the start.
	 *
	 * It sits AFTER the mode rules on purpose. Both selectors carry the same
	 * specificity, so whichever is written last wins — and with this block above
	 * them the mode's dash pattern kept its dasharray, leaving the offset to
	 * animate by one pixel against a 4px dash. The line marched a fraction and
	 * looked like nothing had happened.
	 *
	 * `forwards` is deliberately absent: when the animation ends the element
	 * falls back to its own rule below, which is the dash pattern that carries
	 * the meaning. The line is fully extended by then, so the handover reads as
	 * the route settling rather than as a jump.
	 */
	.mk-map__route.is-drawing > path {
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		/* Constant speed, and the next leg begins on the beat the last one ends:
		   a pen moving at one pace across the whole trip, not five separate
		   flourishes. */
		animation: mk-route-draw 620ms linear;
		animation-delay: calc(var(--leg, 0) * 620ms);
		animation-fill-mode: backwards;
	}
	@keyframes mk-route-draw {
		to {
			stroke-dashoffset: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.mk-map__route.is-drawing > path {
			animation: none;
			stroke-dashoffset: 0;
		}
	}


	/* The traveller: a dot going round the trip, and a soft wake behind it. */
	.mk-map__traveller-dot,
	.mk-map__traveller-icon {
		fill: var(--map-route, #c8553d);
		stroke: #fff;
		stroke-width: 0.55;
		stroke-linejoin: round;
		paint-order: stroke;
	}
	.mk-map__traveller-halo {
		fill: var(--map-route, #c8553d);
		opacity: 0.18;
		animation: mk-traveller-pulse 1.9s ease-in-out infinite;
		transform-box: fill-box;
		transform-origin: center;
	}
	@keyframes mk-traveller-pulse {
		0%,
		100% {
			transform: scale(0.75);
			opacity: 0.22;
		}
		50% {
			transform: scale(1.15);
			opacity: 0.08;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.mk-map__traveller {
			display: none;
		}
	}

	.mk-map__pin circle {
		fill: var(--map-pin, #c8553d);
		stroke: #fff;
		stroke-width: 1.6;
	}
	.mk-map__pin--start circle {
		fill: var(--map-pin-start, #2f6f4e);
	}
	.mk-map__pin--end circle {
		fill: var(--map-pin-end, #1f2937);
	}
	.mk-map__pin-n {
		fill: #fff;
		font-size: var(--fs-tiny);
		font-weight: var(--fw-bold);
		text-anchor: middle;
		pointer-events: none;
	}

	/*
	 * "Day 1" is a label a reader has to read, not a footnote.
	 *
	 * The viewBox is 640 units wide against roughly 516 rendered pixels, so a
	 * size set here lands on screen about a fifth smaller than it looks in the
	 * source — 9.5 was under 8px on a desktop and smaller still on a phone.
	 */
	.mk-map__badge {
		font-size: var(--fs-meta);
		font-weight: var(--fw-bold);
		fill: var(--map-label, #37404a);
		paint-order: stroke;
		stroke: var(--map-sea, #eef4f7);
		stroke-width: 4;
		stroke-linejoin: round;
		pointer-events: none;
	}

	.mk-map__labels text {
		font-size: var(--fs-tiny);
		fill: var(--map-label-muted, #7a857a);
		text-anchor: middle;
		paint-order: stroke;
		stroke: var(--map-land, #dfe6df);
		stroke-width: 2.2;
		stroke-linejoin: round;
		pointer-events: none;
	}
	.mk-map__labels text.is-active {
		fill: var(--map-label, #37404a);
		stroke: var(--map-land-active, #e6c3ba);
		font-weight: var(--fw-bold);
	}

	.mk-map__tip {
		font-size: var(--fs-tiny);
		font-weight: var(--fw-bold);
		text-anchor: middle;
		fill: var(--map-label, #37404a);
		paint-order: stroke;
		stroke: #fff;
		stroke-width: 3;
		stroke-linejoin: round;
		pointer-events: none;
	}
</style>
