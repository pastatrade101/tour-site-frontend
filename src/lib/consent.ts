import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Analytics/cookie consent. 'granted' = GA4 + first-party tracking on;
// 'denied' = everything off; null = undecided (first-party anonymous tracking
// runs under legitimate interest, but GA4 cookies wait for an explicit 'granted').
export type Consent = 'granted' | 'denied' | null;

const KEY = 'gf_consent';

const read = (): Consent => {
  if (!browser) return null;
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
};

export const consent = writable<Consent>(read());

export const getConsent = (): Consent => read();

export const setConsent = (value: 'granted' | 'denied') => {
  if (browser) {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* storage unavailable — still applies in-session */
    }
  }
  consent.set(value);
};
