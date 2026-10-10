import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { env as publicEnv } from '$env/dynamic/public';
import { localeFromPath, type KnownLocale } from '$lib/i18n';
import { translateIn } from '$lib/i18n/ui';

/**
 * The traveller's quotation, fetched by its link token.
 *
 * Server-side so the offer is in the HTML the moment the page opens — this is
 * a link someone taps in WhatsApp, often on a slow connection, and it should
 * not depend on a second round trip to show a price.
 *
 * The token is the only credential. It is never echoed back into the page, and
 * the endpoint returns just the offer — no internal ids, no admin notes.
 *
 * Accepting and declining are form actions rather than browser fetches, so the
 * token stays server-side, there is no CORS to negotiate, and the page still
 * works if the JavaScript never arrives.
 */
const apiBase = (origin: string) => {
  const raw = publicEnv.PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  if (!raw) return 'http://localhost:5000/api';
  return raw.startsWith('/') ? `${origin}${raw}` : raw;
};

export const load: PageServerLoad = async ({ fetch, params, url }) => {
  const base = apiBase(url.origin);

  let quotation: Record<string, unknown> | null = null;
  try {
    const res = await fetch(`${base}/quotations/public/${encodeURIComponent(params.token)}`);
    if (res.ok) quotation = ((await res.json()) as { data?: Record<string, unknown> }).data ?? null;
  } catch {
    quotation = null;
  }

  // A wrong or expired token is a 404, never an explanation of what went
  // wrong — nothing here should help someone probe for valid links.
  if (!quotation) throw error(404, translateIn(localeFromPath(url.pathname), 'pg_quote.link_not_valid'));

  return { quotation };
};

/**
 * The API's refusals, by its own wording, and the dictionary line that says
 * the same thing. The API writes English for the team; the traveller reads
 * their own language. Anything not listed (a 500, a reworded message) gets the
 * generic line — raw server text is never handed to the page.
 */
const API_MESSAGE_KEYS: Record<string, string> = {
  'Quotation not found.': 'pg_quote.err_not_found',
  'This quotation was declined. Message us and we will prepare a new one.': 'pg_quote.err_declined',
  'This quotation has expired. Message us and we will prepare an up-to-date price.': 'pg_quote.err_expired',
  'This quotation was already accepted. Message us if you need to change it.': 'pg_quote.err_already_accepted',
  'This quotation has been accepted. Message us and we will handle the change against your booking.': 'pg_quote.err_accepted_change',
  'This quotation is closed. Message us and we will prepare a new one.': 'pg_quote.err_closed',
  'Tell us what you would like changed.': 'pg_quote.err_comment_required'
};

/** POST the traveller's answer to the API, and say back what it said, in the page's language. */
const respond = async (
  fetchFn: typeof fetch,
  url: URL,
  token: string,
  action: 'accept' | 'decline' | 'request-changes',
  body: Record<string, string | null>
) => {
  // The reroute strips /de for matching, but event.url keeps it — the form
  // posts back to the page's own address, so this is the visitor's language.
  const lang: KnownLocale = localeFromPath(url.pathname);
  try {
    const res = await fetchFn(`${apiBase(url.origin)}/quotations/public/${encodeURIComponent(token)}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const payload = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
    if (!res.ok || payload.success === false) {
      const key =
        res.status === 429 ? 'form.err_too_many' : (API_MESSAGE_KEYS[String(payload.message ?? '')] ?? 'pg_quote.err_not_recorded');
      return fail(res.status === 429 ? 429 : 400, { message: translateIn(lang, key) });
    }
    return { done: true as const };
  } catch {
    return fail(503, { message: translateIn(lang, 'pg_quote.err_unreachable') });
  }
};

const field = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

export const actions: Actions = {
  accept: async ({ fetch, params, request, url }) => {
    const form = await request.formData();
    return respond(fetch, url, params.token, 'accept', {
      lead_traveller: field(form, 'lead_traveller'),
      email: field(form, 'email'),
      phone: field(form, 'phone'),
      notes: field(form, 'notes')
    });
  },

  decline: async ({ fetch, params, request, url }) => {
    const form = await request.formData();
    return respond(fetch, url, params.token, 'decline', { reason: field(form, 'reason') });
  },

  // Neither yes nor no. The quotation stays live and acceptable; this only says
  // the traveller wants something different first.
  requestChanges: async ({ fetch, params, request, url }) => {
    const form = await request.formData();
    const comment = field(form, 'comment');
    if (!comment) return fail(422, { message: translateIn(localeFromPath(url.pathname), 'pg_quote.err_comment_required') });
    return respond(fetch, url, params.token, 'request-changes', { comment });
  }
};
