import { writable } from 'svelte/store';

/**
 * Where the site-wide "Plan My Trip" buttons (top bar, footer) send people.
 *
 * Normally the plain planner. A page about something specific — a safari
 * style — sets its own planner link while it is open, so those buttons open
 * the planner already knowing what the visitor was looking at, exactly like
 * the page's own calls to action. The page puts it back when it closes.
 */
export const PLANNER_PATH = '/plan-my-trip';
export const plannerHref = writable<string>(PLANNER_PATH);
export const resetPlannerHref = () => plannerHref.set(PLANNER_PATH);
