import { derived, writable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Cookie consent, in two optional categories on top of the always-on essentials:
 *
 *   analytics  Google Analytics storage, Microsoft Clarity, and our own visit
 *              statistics (first-party, stored in this browser)
 *   marketing  Google Ads conversion measurement (ad storage / ad user data).
 *              Personalised advertising is never switched on.
 *
 * Google tags read this through Consent Mode v2: app.html sets the defaults
 * from the saved choice before any tag loads, and saveConsentChoice() sends
 * the update. A choice is kept 180 days, then asked again.
 *
 * `consent` / getConsent() keep their original meaning for existing callers:
 * 'granted' or 'denied' for analytics, null while nobody has chosen.
 */
export type Consent = 'granted' | 'denied' | null;
export type ConsentChoice = { analytics: boolean; marketing: boolean };

type StoredRecord = ConsentChoice & { v: 2; savedAt: number; expiresAt: number };

/** Read by the inline script in app.html — keep the two in step. */
export const CONSENT_KEY = 'gf_consent_v2';
const LEGACY_KEY = 'gf_consent';
const RETENTION_DAYS = 180;
const MAX_AGE = 60 * 60 * 24 * RETENTION_DAYS;

const parse = (raw: string | null | undefined): StoredRecord | null => {
  try {
    const record = JSON.parse(raw ?? 'null') as StoredRecord | null;
    const now = Date.now();
    if (!record || record.v !== 2 || typeof record.analytics !== 'boolean' || typeof record.marketing !== 'boolean') return null;
    if (!Number.isFinite(record.expiresAt) || record.expiresAt <= now) return null;
    return record;
  } catch {
    return null;
  }
};

const readCookie = (key: string): string | null => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

/**
 * The saved choice, or null when undecided. The earlier single "analytics"
 * answer carries over only where it still means the same thing: a decline
 * stays a decline. An earlier acceptance covered analytics alone, not
 * advertising, so that visitor is asked again.
 */
const readChoice = (): ConsentChoice | null => {
  if (!browser) return null;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CONSENT_KEY);
  } catch {
    raw = null;
  }
  const record = parse(raw ?? readCookie(CONSENT_KEY));
  if (record) return { analytics: record.analytics, marketing: record.marketing };

  let legacy: string | null = null;
  try {
    legacy = localStorage.getItem(LEGACY_KEY);
  } catch {
    legacy = null;
  }
  if ((legacy ?? readCookie(LEGACY_KEY)) === 'denied') return { analytics: false, marketing: false };
  return null;
};

/**
 * Outside the regions that require opt-in (EU/EEA, UK, Switzerland — decided
 * by the inline script in app.html), analytics and advertising measurement are
 * on until the visitor switches them off. Nothing is saved for that: it is the
 * default where the law allows one, not a recorded consent.
 */
export const consentRegion = (): 'opt_in' | 'opt_out' => {
  if (!browser) return 'opt_in';
  return (window as unknown as { __gfConsentRegion?: string }).__gfConsentRegion === 'opt_out' ? 'opt_out' : 'opt_in';
};

/** The saved choice, else the regional default (null where we must ask). */
const effectiveChoice = (): ConsentChoice | null =>
  readChoice() ?? (consentRegion() === 'opt_out' ? { analytics: true, marketing: true } : null);

export const consentChoice = writable<ConsentChoice | null>(effectiveChoice());

/** Analytics consent, as callers have always read it. */
export const consent = derived(consentChoice, (choice): Consent =>
  choice === null ? null : choice.analytics ? 'granted' : 'denied'
);

export const getConsentChoice = (): ConsentChoice | null => effectiveChoice();

/** Whether the visitor has made (and saved) a choice — the dialog asks until they have. */
export const hasSavedChoice = (): boolean => readChoice() !== null;

export const getConsent = (): Consent => {
  const choice = effectiveChoice();
  return choice === null ? null : choice.analytics ? 'granted' : 'denied';
};

/** Advertising measurement allowed — the only case an ad click id may be shared. */
export const hasMarketingConsent = (): boolean => effectiveChoice()?.marketing === true;

/** Tell Google tags (Consent Mode v2) and GTM what the visitor chose. */
const applyToGoogle = (choice: ConsentChoice) => {
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  const gtag = w.gtag ?? function gtag() { w.dataLayer!.push(arguments); };
  w.gtag = gtag;
  gtag('consent', 'update', {
    analytics_storage: choice.analytics ? 'granted' : 'denied',
    ad_storage: choice.marketing ? 'granted' : 'denied',
    ad_user_data: choice.marketing ? 'granted' : 'denied',
    ad_personalization: 'denied'
  });
  gtag('set', 'ads_data_redaction', !choice.marketing);
  w.dataLayer.push({ event: 'cookie_consent_updated', analytics_consent: choice.analytics, marketing_consent: choice.marketing });
};

export const saveConsentChoice = (choice: ConsentChoice): void => {
  const clean: ConsentChoice = { analytics: choice.analytics === true, marketing: choice.marketing === true };
  if (browser) {
    const now = Date.now();
    const record: StoredRecord = { v: 2, ...clean, savedAt: now, expiresAt: now + MAX_AGE * 1000 };
    const value = JSON.stringify(record);
    try {
      localStorage.setItem(CONSENT_KEY, value);
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* storage unavailable — the cookie below still carries it */
    }
    document.cookie = `${CONSENT_KEY}=${encodeURIComponent(value)}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax`;
    document.cookie = `${LEGACY_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
    try {
      applyToGoogle(clean);
    } catch {
      /* measurement must never break the page */
    }
  }
  consentChoice.set(clean);
};

/** Earlier single-switch API, kept for any remaining caller. */
export const setConsent = (value: 'granted' | 'denied') =>
  saveConsentChoice({ analytics: value === 'granted', marketing: value === 'granted' });

/** Whether the cookie dialog is open — the footer's "Cookie settings" link opens it. */
export const consentDialogOpen = writable(false);
export const openConsentSettings = () => consentDialogOpen.set(true);
