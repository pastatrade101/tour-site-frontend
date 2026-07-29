import { browser } from '$app/environment';
import { API_URL } from '$lib/config/env';
import { getConsent } from '$lib/consent';

// ----------------------------------------------------------------------------
// trackEvent — one helper for both analytics layers.
//   1) GA4 (Phase 2): fires window.gtag if present (safe, non-personal only).
//   2) First-party backend: POST /api/analytics/events (fire-and-forget).
// NEVER sends name/email/phone/WhatsApp/trip notes anywhere. Fails silently so
// blocked analytics (ad-blockers, no backend) can't break the site.
// ----------------------------------------------------------------------------

export type AnalyticsEventName =
  | 'page_view'
  | 'tour_page_view'
  | 'destination_page_view'
  | 'tour_card_click'
  | 'tour_filter_used'
  | 'plan_my_trip_opened'
  | 'plan_my_trip_submitted'
  | 'request_trip_opened'
  | 'request_trip_submitted'
  | 'ai_advisor_opened'
  | 'ai_advisor_message_sent'
  | 'ai_advisor_lead_created'
  | 'whatsapp_click'
  | 'phone_click'
  | 'email_click';

// Only these safe, non-personal fields are ever forwarded.
const SAFE_KEYS = ['tour_id', 'tour_title', 'destination', 'experience_type', 'budget_range', 'traveller_type'] as const;

export type EventMeta = Partial<Record<(typeof SAFE_KEYS)[number], string | null | undefined>> & {
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

export const trackEvent = (eventName: AnalyticsEventName, meta: EventMeta = {}): void => {
  if (!browser) return;
  // Respect an explicit decline. (Undecided still allows PII-free first-party
  // tracking; GA4 only fires once gtag is loaded, which waits for 'granted'.)
  if (getConsent() === 'denied') return;
  try {
    const payload: Record<string, unknown> = {
      event_name: eventName,
      session_id: getSessionId(),
      page_path: window.location.pathname,
      source_page_url: window.location.href,
      device_type: deviceType()
    };
    for (const key of SAFE_KEYS) if (meta[key]) payload[key] = meta[key];
    if (meta.metadata) payload.metadata = meta.metadata;

    // 1) GA4 — only if loaded + consented (gtag present). Safe fields only.
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    if (typeof w.gtag === 'function') {
      const { metadata: _m, session_id: _s, ...safe } = payload;
      w.gtag('event', eventName, safe);
    }

    // 2) First-party backend — fire-and-forget, keepalive for unload safety.
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

// ── Session attribution (Tier 2) ─────────────────────────────────────────────
// First-touch: on the first visit we capture UTM + external referrer and persist
// them (localStorage), so a lead submitted later still carries the source that
// brought the visitor. PII-free. Never throws.
const ATTR_KEY = 'gf_attr';
const SESSION_SENT_KEY = 'gf_session_sent';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

const captureAttribution = (): Record<string, string> => {
  const out: Record<string, string> = {};
  try {
    const params = new URLSearchParams(window.location.search);
    for (const key of UTM_KEYS) {
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
export const getAttribution = (): Record<string, string> => {
  const sid = getSessionId();
  return { ...(sid ? { session_id: sid } : {}), ...storedAttribution() };
};

/** Fire the session attribution beacon once per browser session. Never throws. */
export const trackSession = (): void => {
  if (!browser) return;
  if (getConsent() === 'denied') return;
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
