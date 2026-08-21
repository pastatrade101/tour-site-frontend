/**
 * Turning answers into an enquiry.
 *
 * One place builds the payload for all three forms, so the metadata a
 * submission carries never depends on which popup the visitor happened to open.
 */
import { browser } from '$app/environment';
import { api } from '$lib/api/client';
import { getAttribution } from '$lib/analytics';
import type { EnquiryContext, FormConfig, FormValues } from './types';

/** Columns on booking_requests. Everything else travels in lead_context. */
const COLUMN_KEYS = new Set([
  'full_name',
  'email',
  'phone',
  'country',
  'travel_date',
  'special_requests'
]);

/**
 * A stable key for one filled-in form. The server has a unique index on it, so
 * a double-tap, an impatient refresh or a retry after a dropped response all
 * resolve to the same enquiry instead of three.
 */
export const newIdempotencyKey = (): string => {
  if (browser && typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `gf-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

const pageInfo = () => {
  if (!browser) return {};
  return {
    url: window.location.href,
    path: window.location.pathname,
    title: document.title,
    referrer: document.referrer || undefined
  };
};

/** Only the UTM-ish keys, never the whole query string. */
const utmOf = (attribution: Record<string, string>) => {
  const utm: Record<string, string> = {};
  for (const [key, value] of Object.entries(attribution)) {
    if (key.startsWith('utm_') || key === 'gclid' || key === 'fbclid') utm[key] = value;
  }
  return utm;
};

export type EnquiryPayload = Record<string, unknown>;

export const buildPayload = (
  config: FormConfig,
  values: FormValues,
  context: EnquiryContext,
  idempotencyKey: string,
  selectedCurrency = 'USD'
): EnquiryPayload => {
  const attribution = getAttribution();

  // Answers = everything that is not a first-class column, so a new question
  // added to a config is captured with no change here.
  const answers: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (COLUMN_KEYS.has(key)) continue;
    if (key === 'hp_company' || key === 'marketing_consent' || key === 'whatsapp_opt_in') continue;
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) continue;
    answers[key] = value;
  }

  const leadContext: Record<string, unknown> = {
    v: 1,
    form_type: config.formType,
    page: pageInfo(),
    utm: utmOf(attribution),
    attribution,
    language: String(values.preferred_language ?? '') || undefined,
    // Recorded separately from the enquiry itself, as asked.
    consent: {
      marketing: values.marketing_consent === true,
      whatsapp_transactional: values.whatsapp_opt_in === true
    },
    answers
  };

  if (context.category?.id || context.category?.name) leadContext.category = context.category;
  if (context.tour?.id || context.tour?.title) leadContext.tour = context.tour;

  return {
    tour_id: context.tour?.id || undefined,
    full_name: String(values.full_name ?? '').trim(),
    email: String(values.email ?? '').trim(),
    phone: String(values.phone ?? '').trim() || undefined,
    country: String(values.country ?? '').trim() || undefined,
    travel_date: String(values.travel_date ?? '') || undefined,
    number_of_adults: Number(values.adults ?? 1) || 1,
    number_of_children: Number(values.children ?? 0) || 0,
    special_requests: String(values.special_requests ?? '').trim() || undefined,
    currency: context.tour?.currency || 'USD',
    selected_currency: selectedCurrency,
    source: config.formType,
    idempotency_key: idempotencyKey,
    lead_context: leadContext,
    // Explicit tick only — never inferred from the phone number being filled.
    whatsapp_opt_in: values.whatsapp_opt_in === true,
    // Honeypot — always sent, always empty for a human.
    hp_company: String(values.hp_company ?? '')
  };
};

export const submitEnquiry = async (
  config: FormConfig,
  values: FormValues,
  context: EnquiryContext,
  idempotencyKey: string,
  selectedCurrency = 'USD'
): Promise<{ booking_code?: string | null } & Record<string, unknown>> => {
  const payload = buildPayload(config, values, context, idempotencyKey, selectedCurrency);
  const response = await api.bookings.create(payload);
  return (response.data ?? {}) as Record<string, unknown>;
};
