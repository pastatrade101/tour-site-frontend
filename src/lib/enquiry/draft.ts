/**
 * A half-filled enquiry, kept in the visitor's own browser so it survives
 * opening another page (a suggested trip, a related tour) and coming back.
 * Nothing here is sent anywhere.
 *
 * Trip answers (dates, travellers, preferences) are kept for two weeks, so a
 * visitor who returns another day finds the form where they left it. Contact
 * details (name, email, phone, free-text notes) live only in this tab's session
 * storage, so they are gone when the tab closes — a shared computer does not
 * hand them to the next person. Both are cleared once the enquiry is sent.
 *
 * Every read and write is guarded: private windows and blocked storage simply
 * mean no draft, never a broken form.
 */

const PREFIX = 'gf_draft:';
const TRIP_DAYS = 14;

type Stored<T> = { v: 1; savedAt: number; data: T };

const read = <T>(storage: Storage | undefined, key: string, maxAgeMs?: number): T | null => {
  try {
    const raw = storage?.getItem(PREFIX + key);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Stored<T>;
    if (!stored || stored.v !== 1 || typeof stored.data !== 'object' || stored.data === null) return null;
    if (maxAgeMs && Date.now() - stored.savedAt > maxAgeMs) {
      storage?.removeItem(PREFIX + key);
      return null;
    }
    return stored.data;
  } catch {
    return null;
  }
};

const write = <T>(storage: Storage | undefined, key: string, data: T) => {
  try {
    storage?.setItem(PREFIX + key, JSON.stringify({ v: 1, savedAt: Date.now(), data } satisfies Stored<T>));
  } catch {
    /* storage full or blocked — the form still works without a draft */
  }
};

const local = () => (typeof window === 'undefined' ? undefined : (() => { try { return window.localStorage; } catch { return undefined; } })());
const session = () => (typeof window === 'undefined' ? undefined : (() => { try { return window.sessionStorage; } catch { return undefined; } })());

/** The saved trip answers and contact details for one form, or nulls. */
export const loadDraft = <Trip extends object, Contact extends object>(key: string) => ({
  trip: read<Partial<Trip>>(local(), `${key}:trip`, TRIP_DAYS * 24 * 60 * 60 * 1000),
  contact: read<Partial<Contact>>(session(), `${key}:contact`)
});

/** Save both halves. Call on change; it is cheap. */
export const saveDraft = <Trip extends object, Contact extends object>(key: string, trip: Trip, contact: Contact) => {
  write(local(), `${key}:trip`, trip);
  write(session(), `${key}:contact`, contact);
};

/** Forget the draft — after a successful send. */
export const clearDraft = (key: string) => {
  try {
    local()?.removeItem(`${PREFIX}${key}:trip`);
    session()?.removeItem(`${PREFIX}${key}:contact`);
  } catch {
    /* nothing to clear */
  }
};
