import { browser } from '$app/environment';
import { API_URL } from '$lib/config/env';
import { getConsent } from '$lib/consent';

// ----------------------------------------------------------------------------
// Analytics — one place for every layer.
//   1) GA4 (gtag, loaded directly — never through GTM tags): fires window.gtag
//      if present. Consent-gated + PII-free.
//   2) Microsoft Clarity: lead and form milestones become Clarity custom events
//      and tags, and a lead's session recording is kept (upgraded), so the
//      recordings that matter can be filtered and watched.
//   3) First-party backend: POST /api/analytics/events (fire-and-forget) — the
//      in-house record the CMS analytics page reports from.
//
// The three main leads — the Plan My Trip planner, the itinerary form on tour
// pages and WhatsApp — go through createFormTracker() and the delegated
// WhatsApp listener below, so each one is counted the same way everywhere.
//
// Design rules:
//   • NEVER send names / emails / phones / WhatsApp numbers / trip notes / form
//     values anywhere — only the SAFE_KEYS whitelist below is ever forwarded.
//   • First-party keeps the site's own (custom) event names for continuity;
//     GA4 receives the GA4-recommended event name where one exists (see
//     GA4_EVENT_MAP) so GA4 reports & key-events use the standard vocabulary.
//   • Everything fails silently — blocked analytics must never break the site.
// ----------------------------------------------------------------------------

// First-party (custom) event names. Backward-compatible with existing reporting.
export type AnalyticsEventName =
  | 'page_view'
  | 'tour_page_view'
  | 'destination_page_view'
  | 'safari_style_view'
  | 'accommodation_view'
  | 'tour_list_view'
  | 'tour_card_click'
  | 'related_tour_click'
  | 'tour_filter_used'
  | 'search'
  | 'no_search_results'
  | 'plan_my_trip_opened'
  | 'plan_my_trip_submitted'
  | 'begin_journey_opened'
  | 'begin_journey_submitted'
  | 'request_trip_opened'
  | 'request_trip_submitted'
  | 'quotation_download'
  | 'form_submit_error'
  // Contextual enquiry forms (homepage / category / tour).
  | 'form_opened'
  | 'form_started'
  | 'form_step_completed'
  | 'form_validation_error'
  | 'form_abandoned'
  | 'form_submitted'
  | 'ai_advisor_opened'
  | 'ai_advisor_message_sent'
  | 'ai_advisor_lead_created'
  | 'cta_click'
  | 'whatsapp_click'
  | 'phone_click'
  | 'email_click';

// Forward these to gtag under their GA4-recommended name (GA4 only — the
// first-party layer still receives the original name for report continuity).
const GA4_EVENT_MAP: Partial<Record<AnalyticsEventName, string>> = {
  tour_page_view: 'view_item',
  destination_page_view: 'view_item',
  safari_style_view: 'view_item',
  accommodation_view: 'view_item',
  tour_list_view: 'view_item_list',
  tour_card_click: 'select_item',
  related_tour_click: 'select_item',
  tour_filter_used: 'filter_applied',
  plan_my_trip_submitted: 'generate_lead',
  begin_journey_submitted: 'generate_lead',
  request_trip_submitted: 'generate_lead',
  form_submitted: 'generate_lead'
  // page_view, search, and the whatsapp/phone/email/cta clicks keep their name.
};

// The ONLY keys ever forwarded to GA4 / the first-party backend. All non-PII.
const SAFE_KEYS = [
  'tour_id', 'tour_title', 'tour_name', 'destination', 'safari_style', 'experience_type',
  'accommodation_level', 'duration_days', 'price_from', 'currency', 'budget_range', 'traveller_type',
  'list_name', 'item_position', 'cta_name', 'cta_type', 'cta_location', 'page_section',
  'search_term', 'results_count', 'sort_option', 'filter_name', 'lead_type', 'transaction_id',
  'form_name', 'method', 'error_type', 'error_code',
  // Enquiry-form context. Deliberately no name, email, phone or free text —
  // SAFE_KEYS is the boundary that keeps contact details out of GA4.
  'form_type', 'step_index', 'step_key', 'field_name', 'category_id', 'category_name', 'tour_slug'
] as const;

/** The three channels the business treats as its main leads. */
export type LeadChannel = 'plan_my_trip' | 'itinerary_form' | 'whatsapp';

/** Events that are a lead in themselves (a sent form, a WhatsApp tap). */
const LEAD_EVENTS = new Set<AnalyticsEventName>(['plan_my_trip_submitted', 'request_trip_submitted', 'form_submitted', 'whatsapp_click']);
/** Form milestones worth a Clarity custom event (recordings can be filtered by them). */
const CLARITY_FORM_EVENTS = new Set<AnalyticsEventName>([
  'form_opened', 'form_started', 'form_step_completed', 'form_validation_error', 'form_abandoned', 'form_submit_error'
]);

type SafeKey = (typeof SAFE_KEYS)[number];

export type EventMeta = Partial<Record<SafeKey, string | number | null | undefined>> & {
  metadata?: Record<string, unknown>;
};

const SESSION_KEY = 'gf_sid';

const getSessionId = (): string => {
  if (!browser) return '';
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
};

const deviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (!browser) return 'desktop';
  const ua = navigator.userAgent;
  const w = window.innerWidth;
  if (/Mobi|Android|iPhone/i.test(ua) || w < 640) return 'mobile';
  if (/iPad|Tablet/i.test(ua) || (w >= 640 && w < 1024)) return 'tablet';
  return 'desktop';
};

/**
 * Only the live site records analytics. Local development and previews talk to
 * a backend that may share the production database, so their events would be
 * counted as real visitors — the in-house numbers must stay real traffic only.
 */
const NOT_TRAFFIC_HOST = /^(localhost|0\.0\.0\.0|\[[0-9a-f:.]+\]|\d{1,3}(\.\d{1,3}){3})$|\.(localhost|local|test|internal|lan)$/i;
export const isProdHost = (): boolean =>
  // A real domain on the standard port. Not: localhost and its kin, a LAN or
  // server IP (a phone testing `vite --host`, a smoke test on the VPS's raw
  // address), or any explicit port such as :5174 or :3000.
  browser && !window.location.port && !NOT_TRAFFIC_HOST.test(window.location.hostname);

/**
 * `localStorage.gf_analytics_debug = '1'` prints every event to the console
 * (name, GA4 name, parameters) — on any host, and without sending anything
 * from a non-production one. For checking the tracking, never for reporting.
 */
const debugOn = (): boolean => {
  try {
    return browser && localStorage.getItem('gf_analytics_debug') === '1';
  } catch {
    return false;
  }
};

const hasGtag = (): ((...args: unknown[]) => void) | null => {
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  return typeof w.gtag === 'function' ? w.gtag : null;
};

// A page URL with the query string dropped — the site never puts PII in the
// path, but query params (search terms, ids) can, so GA4/first-party only ever
// see the clean pathname. Campaign (utm/gclid) attribution is captured by GA4
// from the initial landing URL, so nothing is lost by stripping it here.
export const cleanLocation = (): string => {
  if (!browser) return '';
  return `${window.location.origin}${window.location.pathname}`;
};

// Search terms are the one field a visitor could paste anything into — never
// forward one that looks like it might carry personal data (email/phone/very long).
const safeSearchTerm = (raw: string): string | undefined => {
  const s = (raw ?? '').trim();
  if (!s || s.length > 64) return undefined;
  if (/@|\d{7,}/.test(s)) return undefined; // looks like an email / phone
  return s.slice(0, 64);
};

// Collect only whitelisted, non-empty params.
const safeParams = (meta: EventMeta): Record<string, string | number> => {
  const out: Record<string, string | number> = {};
  for (const key of SAFE_KEYS) {
    const v = meta[key];
    if (v !== undefined && v !== null && v !== '') out[key] = v as string | number;
  }
  return out;
};

type ClarityFn = (...args: unknown[]) => void;
const hasClarity = (): ClarityFn | null => {
  const w = window as unknown as { clarity?: ClarityFn };
  return typeof w.clarity === 'function' ? w.clarity : null;
};

/**
 * Clarity: milestones as custom events ("plan_my_trip:step_3_when"), the form
 * and lead channel as session tags, and a lead's session upgraded so Clarity
 * keeps its recording. Only safe values — the same whitelist as GA4.
 */
const toClarity = (name: AnalyticsEventName, params: Record<string, string | number>) => {
  const clarity = hasClarity();
  if (!clarity) return;
  const form = params.form_name ? String(params.form_name) : '';
  if (form) clarity('set', 'form_name', form);
  if (CLARITY_FORM_EVENTS.has(name)) {
    const label =
      name === 'form_step_completed' && params.step_key !== undefined
        ? `step_${Number(params.step_index ?? 0) + 1}_${params.step_key}`
        : name.replace(/^form_/, '');
    clarity('event', form ? `${form}:${label}` : name);
    if (name === 'form_step_completed' && params.step_key !== undefined) clarity('set', 'form_last_step', String(params.step_key));
  }
  if (LEAD_EVENTS.has(name)) {
    const channel = String(params.lead_type ?? (name === 'whatsapp_click' ? 'whatsapp' : form || name));
    clarity('event', `lead:${channel}`);
    clarity('set', 'lead_channel', channel);
    clarity('upgrade', `lead:${channel}`);
  }
};

// Low-level emit: GA4 (recommended name + safe params) + Clarity + first-party (own name).
/** Where an event happened, when that is not the page now showing (an abandon fired as the visitor navigates away). */
type EventPlace = { path: string; url: string };
const here = (): EventPlace => ({ path: window.location.pathname, url: cleanLocation() });

const emit = (name: AnalyticsEventName, meta: EventMeta, place?: EventPlace): void => {
  if (!browser) return;
  if (getConsent() === 'denied') return; // explicit decline → nothing at all
  try {
    const params = safeParams(meta);
    if (name === 'cta_click') rememberCta(params);
    const ga4Name = GA4_EVENT_MAP[name] ?? name;
    // GA4's generate_lead reads its channel from lead_source.
    const ga4Params = ga4Name === 'generate_lead' && params.lead_type ? { ...params, lead_source: params.lead_type } : params;

    if (debugOn()) console.info('[analytics]', name, '→ GA4', ga4Name, ga4Params, meta.metadata ?? '');

    // 1) GA4 — only when gtag is loaded (which only happens after 'granted').
    const gtag = hasGtag();
    if (gtag) gtag('event', ga4Name, ga4Params);

    // 2) Clarity — likewise only once loaded (consent granted).
    toClarity(name, params);

    // 3) First-party — the live site only, so development never counts as traffic.
    if (!isProdHost()) return;

    // First-party backend — fire-and-forget, keepalive for unload safety.
    const payload: Record<string, unknown> = {
      event_name: name,
      session_id: getSessionId(),
      page_path: place?.path ?? window.location.pathname,
      source_page_url: place?.url ?? cleanLocation(),
      device_type: deviceType(),
      ...params
    };
    if (meta.metadata) payload.metadata = meta.metadata;
    void fetch(`${API_URL}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  } catch {
    // analytics must never throw
  }
};

/** Generic event helper (backward compatible). Prefer the typed helpers below. */
export const trackEvent = (eventName: AnalyticsEventName, meta: EventMeta = {}): void => emit(eventName, meta);

// ── Page views ──────────────────────────────────────────────────────────────
// GA4's config sends the initial page_view; for SPA route changes we must send
// it ourselves. Deduped by clean path so the same URL never double-counts, and
// stripped of query params so no search/id ever leaks into GA4.
let lastGa4Path = '';
let lastFirstPartyPath = '';

export const trackPageView = (): void => {
  if (!browser || getConsent() === 'denied') return;
  if (debugOn()) console.info('[analytics] page_view', window.location.pathname);
  const path = window.location.pathname;
  const location = cleanLocation();
  try {
    const gtag = hasGtag();
    if (gtag && path !== lastGa4Path) {
      lastGa4Path = path;
      gtag('event', 'page_view', {
        page_path: path,
        page_location: location,
        page_title: document.title,
        page_referrer: document.referrer || undefined
      });
    }
    if (path !== lastFirstPartyPath && isProdHost()) {
      lastFirstPartyPath = path;
      void fetch(`${API_URL}/analytics/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: 'page_view',
          session_id: getSessionId(),
          page_path: path,
          source_page_url: location,
          device_type: deviceType()
        }),
        keepalive: true
      }).catch(() => {});
    }
  } catch {
    /* never throw */
  }
};

// ── Reusable CTA tracking ─────────────────────────────────────────────────────
export type CtaMeta = {
  cta_name: string; // e.g. "Book Now", "Request a Quote"
  cta_type?: string; // "button" | "link" | "whatsapp" | "phone" | "email"
  cta_location?: string; // "hero", "sticky_bar", "footer", "tour_detail"…
  page_section?: string;
} & Pick<EventMeta, 'tour_id' | 'tour_title' | 'destination'>;

/** Track any important CTA click through one place instead of per-button code. */
export const trackCta = (meta: CtaMeta): void =>
  emit('cta_click', { cta_type: 'button', ...meta });

// ── Search tracking ───────────────────────────────────────────────────────────
export type SearchMeta = {
  search_term?: string;
  results_count?: number;
  list_name?: string;
} & Pick<EventMeta, 'destination' | 'safari_style' | 'budget_range' | 'sort_option'>;

/** Fire on a *submitted / settled* search (never per keystroke). */
export const trackSearch = (meta: SearchMeta): void => {
  const term = meta.search_term ? safeSearchTerm(String(meta.search_term)) : undefined;
  const zero = meta.results_count === 0;
  emit(zero ? 'no_search_results' : 'search', { ...meta, search_term: term });
};

// ── Session attribution (Tier 2) ─────────────────────────────────────────────
// First-touch: on the first visit we capture UTM + external referrer and persist
// them (localStorage), so a lead submitted later still carries the source that
// brought the visitor. PII-free. Never throws.
const ATTR_KEY = 'gf_attr';
const SESSION_SENT_KEY = 'gf_session_sent';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
// Google Ads auto-tagging adds a click id instead of UTM tags; without it an ad
// click arrives looking like an ordinary Google search.
const AD_CLICK_KEYS = ['gclid', 'gbraid', 'wbraid'] as const;

const captureAttribution = (): Record<string, string> => {
  const out: Record<string, string> = {};
  try {
    const params = new URLSearchParams(window.location.search);
    for (const key of [...UTM_KEYS, ...AD_CLICK_KEYS]) {
      const v = params.get(key);
      if (v) out[key] = v.slice(0, 200);
    }
    const ref = document.referrer;
    if (ref) {
      try {
        if (new URL(ref).host !== window.location.host) out.referrer = ref.slice(0, 500);
      } catch {
        /* malformed referrer — ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return out;
};

const storedAttribution = (): Record<string, string> => {
  if (!browser) return {};
  try {
    return JSON.parse(localStorage.getItem(ATTR_KEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
};

/** First-touch attribution + session id, to attach to a lead's lead_context. */
// ── Google Tag Manager events ─────────────────────────────────────────────────
// The last call-to-action clicked in this tab, so a later conversion can say
// which button started it. Only the CTA's own place and name — nothing personal.
const LAST_CTA_KEY = 'gf_last_cta';
const rememberCta = (params: Record<string, unknown>): void => {
  try {
    const label = [params.cta_location, params.cta_name].filter(Boolean).map(String).join(':');
    if (label) sessionStorage.setItem(LAST_CTA_KEY, label.slice(0, 120));
  } catch {
    /* storage unavailable — the conversion simply goes without it */
  }
};
export const lastCtaClicked = (): string => {
  if (!browser) return '';
  try {
    return sessionStorage.getItem(LAST_CTA_KEY) ?? '';
  } catch {
    return '';
  }
};

/**
 * Push an event onto the dataLayer for Google Tag Manager — e.g. the Custom
 * Event trigger behind the Google Ads conversion. Same consent rule as every
 * other channel here, and never throws. Callers pass non-personal values only:
 * GTM tags can forward them to Google Ads, whose policies forbid names, email
 * addresses and phone numbers.
 */
export const pushDataLayerEvent = (event: string, params: Record<string, string | number | null | undefined> = {}): void => {
  if (!browser || getConsent() === 'denied') return;
  try {
    const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));
    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event, ...clean });
    if (debugOn()) console.info('[analytics] dataLayer', event, clean);
  } catch {
    /* never break the page over measurement */
  }
};

export const getAttribution = (): Record<string, string> => {
  const sid = getSessionId();
  return { ...(sid ? { session_id: sid } : {}), ...storedAttribution() };
};

/** Fire the session attribution beacon once per browser session. Never throws. */
export const trackSession = (): void => {
  if (!browser) return;
  if (getConsent() === 'denied') return;
  if (!isProdHost()) return; // development is not traffic
  try {
    // First-touch: only persist attribution the first time we ever see this browser.
    if (localStorage.getItem(ATTR_KEY) === null) {
      localStorage.setItem(ATTR_KEY, JSON.stringify(captureAttribution()));
    }
    // Send at most once per tab session.
    if (sessionStorage.getItem(SESSION_SENT_KEY)) return;
    sessionStorage.setItem(SESSION_SENT_KEY, '1');

    const attr = storedAttribution();
    const payload: Record<string, unknown> = {
      session_id: getSessionId(),
      device_type: deviceType(),
      landing_path: window.location.pathname,
      referrer: attr.referrer ?? null
    };
    for (const key of UTM_KEYS) if (attr[key]) payload[key] = attr[key];
    // The sessions table has no click-id column: an auto-tagged ad click with no
    // UTM tags is recorded as google / cpc, the same reading GA4 gives it.
    if (!payload.utm_source && AD_CLICK_KEYS.some((key) => attr[key])) {
      payload.utm_source = 'google';
      payload.utm_medium = 'cpc';
    }

    void fetch(`${API_URL}/analytics/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  } catch {
    // analytics must never throw
  }
};

// ── The main leads ───────────────────────────────────────────────────────────

export type FormTrackerContext = {
  /** Stable id of the form, e.g. 'plan_my_trip' or 'tour_itinerary'. */
  form_name: string;
  form_type?: string;
  /** Which of the main leads a sent form counts as. */
  lead_type: LeadChannel;
} & Pick<EventMeta, 'tour_id' | 'tour_title' | 'tour_slug' | 'destination' | 'price_from' | 'duration_days' | 'currency'>;

/**
 * One tracker per form on the page. It records the form's whole path — seen,
 * first answer, each step passed, what stopped a step, where it was left, and
 * the lead — under one form_name, so the CMS can show where people drop out.
 * Each milestone fires once per page view (steps once per step), so going back
 * and forward does not inflate the counts.
 *
 * `submitEvent` is the lead event the form sends: plan_my_trip_submitted for
 * the planner, request_trip_submitted for a tour's itinerary form. Both reach
 * GA4 as generate_lead with lead_source set to the channel.
 */
export const createFormTracker = (context: FormTrackerContext, submitEvent: AnalyticsEventName = 'form_submitted') => {
  let opened = false;
  let started = false;
  let sent = false;
  /**
   * Hidden is not gone: switching tabs or apps (or opening one of our own
   * links in a new tab) hides the page, and on phones it is often the last
   * signal before the browser discards it. So an abandon is reported on hide —
   * once per place in the form: it re-arms only when the visitor moves on (an
   * answer, a step), so flicking between tabs does not repeat it, and a later
   * leave from further on reports the new place. A later submit still counts;
   * the CMS keeps a session's last abandon only when no submit followed it.
   */
  let abandoned = false;
  let lastStep: { index: number; key: string } | null = null;
  // The page the form lives on — an in-site navigation has already changed the URL by the time we hear of it.
  let place: EventPlace | null = null;
  const passed = new Set<number>();
  const base = (): EventMeta => ({ ...context });
  const remember = () => {
    if (browser) place = here();
  };

  const onLeave = () => {
    if (!started || sent || abandoned) return;
    abandoned = true;
    emit('form_abandoned', { ...base(), step_index: lastStep?.index ?? 0, step_key: lastStep?.key ?? 'start' }, place ?? undefined);
  };

  return {
    /** The form came into view (or its page opened). */
    opened() {
      if (opened) return;
      opened = true;
      remember();
      emit('form_opened', base());
    },
    /** The first answer — the visitor has begun. */
    started() {
      if (started) return;
      started = true;
      abandoned = false;
      if (!opened) this.opened();
      emit('form_started', base());
    },
    /** Remember where the visitor is, for the abandon event. */
    at(index: number, key: string) {
      if (lastStep?.index !== index) abandoned = false; // moved on — a new place to leave from
      lastStep = { index, key };
      remember();
    },
    /** A step was answered and passed. */
    step(index: number, key: string) {
      if (!started) this.started();
      if (lastStep?.index !== index + 1) abandoned = false;
      lastStep = { index: index + 1, key };
      remember();
      if (passed.has(index)) return;
      passed.add(index);
      emit('form_step_completed', { ...base(), step_index: index, step_key: key });
    },
    /** A step refused to move on; the first field at fault. */
    invalid(stepKey: string, field: string) {
      emit('form_validation_error', { ...base(), step_key: stepKey, field_name: field, error_type: 'required_or_invalid' });
    },
    /** The lead was saved. */
    submitted(extra: EventMeta = {}) {
      sent = true;
      emit(submitEvent, { ...base(), ...extra });
    },
    /** The request failed on its way to us. */
    failed(errorType = 'submit_failed') {
      emit('form_submit_error', { ...base(), error_type: errorType });
    },
    /**
     * Report an unfinished form when the visitor leaves (closing the tab,
     * navigating away, or the app going to the background on a phone).
     * Returns the cleanup for onDestroy / onMount.
     */
    watchLeave(): () => void {
      if (!browser) return () => {};
      const visibility = () => {
        if (document.visibilityState === 'hidden') onLeave();
      };
      const shown = (event: PageTransitionEvent) => {
        if (event.persisted) abandoned = false; // restored from the back/forward cache
      };
      window.addEventListener('pagehide', onLeave);
      window.addEventListener('pageshow', shown);
      document.addEventListener('visibilitychange', visibility);
      return () => {
        // An in-app navigation away also counts as leaving.
        onLeave();
        window.removeEventListener('pagehide', onLeave);
        window.removeEventListener('pageshow', shown);
        document.removeEventListener('visibilitychange', visibility);
      };
    }
  };
};

export type FormTracker = ReturnType<typeof createFormTracker>;

const WHATSAPP_LINK = /^(https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|chat\.whatsapp\.com)\/|whatsapp:)/i;

/**
 * Every WhatsApp link on the public site, counted by one listener: buttons in
 * components, links typed into CMS content, anything added later. Where it sits
 * comes from the nearest `data-track-location` (set on the known buttons), or
 * else from the page landmark it is in. On a tour page the tour is attached.
 * Components must not fire whatsapp_click themselves — this is the only source.
 */
export const installWhatsAppTracking = (): (() => void) => {
  if (!browser) return () => {};
  const onClick = (event: MouseEvent) => {
    // A middle-click opens the link in a new tab and arrives as auxclick; other buttons open nothing.
    if (event.type === 'auxclick' && event.button !== 1) return;
    if (/^\/admin(\/|$)/.test(window.location.pathname)) return; // staff in the CMS are not leads
    const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!link) return;
    const href = link.getAttribute('href') ?? '';
    if (!WHATSAPP_LINK.test(href)) return;
    const marked = link.closest<HTMLElement>('[data-track-location]')?.dataset.trackLocation;
    const landmark = link.closest('header') ? 'header' : link.closest('footer') ? 'footer' : link.closest('nav') ? 'navigation' : 'page_content';
    const tourSlug = window.location.pathname.match(/^(?:\/[a-z]{2})?\/tours\/([^/]+)\/?$/)?.[1];
    emit('whatsapp_click', {
      lead_type: 'whatsapp',
      cta_type: 'whatsapp',
      cta_location: marked || landmark,
      method: /^whatsapp:/i.test(href) ? 'app' : new URL(href, window.location.href).hostname.replace(/^www\./, ''),
      tour_slug: tourSlug ? decodeURIComponent(tourSlug) : undefined
    });
  };
  // Capture phase: counted even when a handler stops the click from bubbling.
  document.addEventListener('click', onClick, true);
  document.addEventListener('auxclick', onClick, true);
  return () => {
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('auxclick', onClick, true);
  };
};
