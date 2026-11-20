import { get, writable } from 'svelte/store';
import { COMPARE_KINDS, MAX_COMPARE, compareHref, type CompareKind } from './model';

/**
 * What a visitor is weighing up: up to four items in each category, kept in
 * this browser for two weeks. There is no account to attach it to, and asking
 * someone to sign up before comparing two trips would be the wrong trade.
 *
 * The comparison page itself reads its items from the address, so it can be
 * sent to whoever else is deciding; this store only decides what the tray
 * shows and what "Compare" on a card does. Sits beside the saved-trips
 * shortlist ($lib/shortlist) rather than replacing it: saving is "I like
 * this", comparing is "help me choose between these".
 *
 * Storage can be blocked (private windows, previews): every read and write is
 * guarded, and the feature works for the visit without it.
 */
export type ComparePick = { key: string; title: string; image?: string };
type Lists = Record<CompareKind, ComparePick[]>;
export type CompareState = {
  lists: Lists;
  /** The category the tray is showing: the one last added to. */
  active: CompareKind | null;
  /** False until the browser copy has been read, so server and first client render agree. */
  ready: boolean;
};

const STORAGE_KEY = 'goldfinch_compare_v1';
const TTL = 14 * 24 * 60 * 60 * 1000;
const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

const emptyLists = (): Lists => ({ tours: [], accommodation: [], destinations: [], guides: [] });

const cleanPicks = (value: unknown): ComparePick[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const picks: ComparePick[] = [];
  for (const entry of value as Array<Record<string, unknown>>) {
    const key = typeof entry?.key === 'string' ? entry.key : '';
    const title = typeof entry?.title === 'string' ? entry.title.slice(0, 200) : '';
    if (!key || !title || !KEY.test(key) || seen.has(key)) continue;
    seen.add(key);
    picks.push({ key, title, ...(typeof entry.image === 'string' && entry.image ? { image: entry.image } : {}) });
  }
  return picks.slice(0, MAX_COMPARE);
};

export const compareState = writable<CompareState>({ lists: emptyLists(), active: null, ready: false });

const firstWithPicks = (lists: Lists): CompareKind | null => COMPARE_KINDS.find((kind) => lists[kind].length > 0) ?? null;

const persist = (state: CompareState) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), lists: state.lists, active: state.active }));
  } catch {
    // Still works for this visit; it just will not survive a reload.
  }
};

/** Reads the browser copy once. Called by the tray when it mounts. */
export const restoreCompare = () => {
  if (typeof window === 'undefined' || get(compareState).ready) return;
  let lists = emptyLists();
  let active: CompareKind | null = null;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as { at?: number; lists?: Record<string, unknown>; active?: unknown } | null;
    if (stored && Date.now() - Number(stored.at ?? 0) < TTL) {
      for (const kind of COMPARE_KINDS) lists[kind] = cleanPicks(stored.lists?.[kind]);
      active = COMPARE_KINDS.includes(stored.active as CompareKind) && lists[stored.active as CompareKind].length ? (stored.active as CompareKind) : firstWithPicks(lists);
    } else if (stored) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    lists = emptyLists();
  }
  compareState.set({ lists, active, ready: true });
};

const change = (update: (state: CompareState) => CompareState) => {
  restoreCompare();
  compareState.update((state) => {
    const next = update(state);
    // The tray never points at an empty category while another has picks.
    const active = next.active && next.lists[next.active].length ? next.active : firstWithPicks(next.lists);
    const settled = { ...next, active };
    persist(settled);
    return settled;
  });
};

export type ToggleResult = 'added' | 'removed' | 'full';

/** Adds the item, or takes it off if it is already there. "full" changes nothing. */
export const toggleCompare = (kind: CompareKind, pick: ComparePick): ToggleResult => {
  restoreCompare();
  const current = get(compareState).lists[kind];
  if (current.some((entry) => entry.key === pick.key)) {
    change((state) => ({ ...state, lists: { ...state.lists, [kind]: state.lists[kind].filter((entry) => entry.key !== pick.key) } }));
    return 'removed';
  }
  if (current.length >= MAX_COMPARE) return 'full';
  change((state) => ({ ...state, active: kind, lists: { ...state.lists, [kind]: [...state.lists[kind], pick] } }));
  return 'added';
};

export const removeFromCompare = (kind: CompareKind, key: string) =>
  change((state) => ({ ...state, lists: { ...state.lists, [kind]: state.lists[kind].filter((entry) => entry.key !== key) } }));

export const clearCompare = (kind: CompareKind) => change((state) => ({ ...state, lists: { ...state.lists, [kind]: [] } }));

/** The comparison page keeps the tray in step with the address it was opened at (a shared link, a swap, a removal). */
export const setCompareList = (kind: CompareKind, picks: ComparePick[]) =>
  change((state) => ({ ...state, active: picks.length ? kind : state.active, lists: { ...state.lists, [kind]: cleanPicks(picks) } }));

export const showCompareKind = (kind: CompareKind) => change((state) => ({ ...state, active: kind }));

export const compareListHref = (state: CompareState, kind: CompareKind): string =>
  compareHref(kind, state.lists[kind].map((pick) => pick.key));
