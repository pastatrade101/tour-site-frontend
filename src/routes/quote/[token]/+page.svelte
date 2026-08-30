<script lang="ts">
  /**
   * The quotation as the traveller sees it.
   *
   * Opened from a WhatsApp link, so it is built mobile-first and kept to one
   * screen of substance: what the trip is, who it is for, what it costs, and
   * what to do about it. No navigation, no upsell.
   *
   * The page has one job, and it is not "reply" — by the time someone opens
   * this they already have a price, so the primary action is accepting it.
   * WhatsApp stays as the second action, because questions about dates, rooms
   * and traveller counts are exactly what a chat is better at than a form.
   *
   * Accepting is agreement, not a booking and not a payment. Nothing here
   * takes money or promises a seat.
   */
  import { enhance } from '$app/forms';
  import { CalendarDays, CheckCircle2, Clock, MessageCircle, PencilLine, ShieldCheck, Users, XCircle } from '@lucide/svelte';
  import { brand } from '$lib/brand';
  import { publicSettings, settingText } from '$lib/settings';
  import Img from '$lib/components/public/Img.svelte';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  $: quote = data.quotation as Record<string, any>;
  $: travellers = Number(quote.adults ?? 0) + Number(quote.children ?? 0);
  $: items = Array.isArray(quote.items) ? (quote.items as Array<Record<string, any>>) : [];

  const money = (amount: unknown, currency: unknown) =>
    `${String(currency ?? 'USD')} ${Number(amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const day = (value: unknown) =>
    value ? new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(String(value))) : '';

  $: waDigits = (settingText($publicSettings, 'whatsapp_number') || '').replace(/[^0-9]/g, '');
  $: waHref = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`Hello, I'd like to talk about quotation ${quote.quote_code}.`)}`
    : '';

  // An expired quote still displays — the traveller should see what they were
  // offered — but it says so plainly rather than implying the price still stands.
  $: expired =
    quote.status === 'expired' ||
    (quote.valid_until ? new Date(`${String(quote.valid_until).slice(0, 10)}T23:59:59.999Z`).getTime() < Date.now() : false);

  $: accepted = quote.status === 'accepted';
  $: declined = quote.status === 'declined';
  /** They have asked for something different and it is with us, not them. */
  $: changesRequested = quote.status === 'changes_requested';
  /** Only a live quotation can be answered. */
  $: actionable = !accepted && !declined && !expired;

  /** v1 needs no announcing; a later version does, so they know it moved. */
  $: revision = Number(quote.revision ?? 1);

  $: inclusions = (Array.isArray(quote.inclusions) ? quote.inclusions : []).map((v: unknown) => String(v)).filter(Boolean);
  $: exclusions = (Array.isArray(quote.exclusions) ? quote.exclusions : []).map((v: unknown) => String(v)).filter(Boolean);

  // What the traveller is told the quotation's state is. 'viewed' and 'sent'
  // are our bookkeeping, not their business: to them both mean it is waiting
  // on their answer. 'revised' is likewise ours — by the time they open the
  // link the version in front of them is simply the current one.
  $: state = accepted
    ? { label: 'Accepted', tone: 'accepted' }
    : declined
      ? { label: 'Closed', tone: 'muted' }
      : expired
        ? { label: 'Expired', tone: 'muted' }
        : changesRequested
          ? { label: 'With us for changes', tone: 'working' }
          : { label: 'Pending acceptance', tone: 'pending' };

  /** 'idle' until the traveller commits to answering, so the page opens calm. */
  let mode: 'idle' | 'accept' | 'decline' | 'changes' = 'idle';
  let submitting = false;

  const submit = () => {
    submitting = true;
    return async ({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) => {
      await update({ reset: false });
      submitting = false;
      mode = 'idle';
    };
  };
</script>

<svelte:head>
  <title>Quotation {quote.quote_code} | {brand.name}</title>
  <!-- A private document: never indexed, never followed. -->
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="min-h-screen bg-canvas py-8 md:py-14">
  <div class="mx-auto w-full max-w-2xl px-4">
    <header class="text-center">
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-clay">Your quotation</p>
      <h1 class="mt-2 font-serif text-3xl font-semibold leading-tight text-heading md:text-[40px]">{quote.title}</h1>
      <div class="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-ink/55">
        <span>Reference {quote.quote_code}</span>
        {#if revision > 1}
          <!-- Only from v2. Telling someone their first quotation is "version 1"
               invites a question about versions they never had. -->
          <span class="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-semibold text-ink/60">Version {revision}</span>
        {/if}
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em]
            {state.tone === 'accepted'
            ? 'bg-forest/10 text-forest'
            : state.tone === 'pending' || state.tone === 'working'
              ? 'bg-clay/10 text-clay'
              : 'bg-ink/[0.06] text-ink/50'}"
        >
          {#if state.tone === 'accepted'}<CheckCircle2 size={12} />{:else if state.tone === 'working'}<MessageCircle size={12} />{:else if state.tone === 'pending'}<Clock size={12} />{/if}
          {state.label}
        </span>
      </div>
    </header>

    {#if expired && !accepted && !declined}
      <p class="mt-6 rounded-[8px] border border-clay/25 bg-clay/[0.06] px-4 py-3 text-center text-sm text-clay">
        This quotation has expired. Message us and we'll gladly prepare an up-to-date price.
      </p>
    {/if}

    <section class="mt-6 overflow-hidden rounded-[12px] border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(57,61,50,0.07)]">
      {#if quote.tour?.main_image_url}
        <Img src={quote.tour.main_image_url} alt="" width={900} sizes="(max-width: 768px) 100vw, 672px" className="h-52 w-full object-cover md:h-64" />
      {/if}

      <div class="grid gap-5 p-5 md:p-7">
        <dl class="grid grid-cols-2 gap-4 text-sm">
          {#if travellers}
            <div>
              <dt class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45"><Users size={12} /> Travellers</dt>
              <dd class="mt-1 font-serif text-lg font-semibold text-heading">
                {quote.adults} {Number(quote.adults) === 1 ? 'adult' : 'adults'}{#if Number(quote.children) > 0}, {quote.children} {Number(quote.children) === 1 ? 'child' : 'children'}{/if}
              </dd>
            </div>
          {/if}
          {#if quote.travel_date}
            <div>
              <dt class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45"><CalendarDays size={12} /> Travel date</dt>
              <dd class="mt-1 font-serif text-lg font-semibold text-heading">{day(quote.travel_date)}</dd>
            </div>
          {/if}
        </dl>

        {#if items.length}
          <div class="border-t border-ink/10 pt-4">
            <!-- Historically this list WAS the "what's included" list, and older
                 quotations still rely on it for that. Once a quotation carries a
                 real inclusions list, these priced lines are the breakdown
                 instead — so the heading follows what the document actually has
                 rather than labelling two lists the same thing. -->
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">
              {inclusions.length ? 'Breakdown' : "What's included"}
            </p>
            <ul class="mt-2 grid gap-2">
              {#each items as item}
                <li class="flex items-start justify-between gap-3 text-sm">
                  <span class="flex min-w-0 items-start gap-2 text-ink/75">
                    <CheckCircle2 size={15} class="mt-0.5 shrink-0 text-forest" />
                    <span>{item.label ?? item.title ?? ''}</span>
                  </span>
                  {#if item.amount != null}
                    <span class="shrink-0 font-semibold text-heading">{money(item.amount, quote.currency)}</span>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if inclusions.length}
          <div class="border-t border-ink/10 pt-4">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">What's included</p>
            <ul class="mt-2 grid gap-2">
              {#each inclusions as line}
                <li class="flex items-start gap-2 text-sm text-ink/75">
                  <CheckCircle2 size={15} class="mt-0.5 shrink-0 text-forest" />
                  <span>{line}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if exclusions.length}
          <!-- The most valuable list on the page. An unstated exclusion is how an
               agreed price turns into an argument at the gate. -->
          <div class="border-t border-ink/10 pt-4">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">Not included</p>
            <ul class="mt-2 grid gap-2">
              {#each exclusions as line}
                <li class="flex items-start gap-2 text-sm text-ink/70">
                  <XCircle size={15} class="mt-0.5 shrink-0 text-clay" />
                  <span>{line}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if quote.notes}
          <div class="border-t border-ink/10 pt-4">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">Notes</p>
            <p class="mt-2 whitespace-pre-line text-sm leading-7 text-ink/75">{quote.notes}</p>
          </div>
        {/if}

        <div class="flex items-end justify-between gap-4 border-t border-ink/10 pt-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">Total</p>
            <p class="font-serif text-3xl font-semibold leading-tight text-heading">{money(quote.total_amount, quote.currency)}</p>
            {#if travellers > 1}
              <p class="mt-0.5 text-xs text-ink/50">for {travellers} travellers</p>
            {/if}
          </div>
          {#if quote.valid_until && !expired && !accepted}
            <p class="text-right text-xs text-ink/50">Valid until<br /><span class="font-semibold text-heading">{day(quote.valid_until)}</span></p>
          {/if}
        </div>

        {#if quote.deposit_amount != null || quote.payment_terms}
          <!-- Stated on the document, not left to a later message. Someone
               deciding whether to accept is entitled to know what saying yes
               commits them to paying, and when. -->
          <div class="rounded-[8px] bg-sand/40 p-4">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">Payment</p>
            {#if quote.deposit_amount != null}
              <p class="mt-1.5 text-sm text-ink/75">
                Deposit to confirm: <span class="font-semibold text-heading">{money(quote.deposit_amount, quote.currency)}</span>
              </p>
            {/if}
            {#if quote.payment_terms}
              <p class="mt-1 whitespace-pre-line text-sm leading-6 text-ink/70">{quote.payment_terms}</p>
            {/if}
            <p class="mt-2 text-xs text-ink/50">Nothing is payable to accept this quotation.</p>
          </div>
        {/if}
      </div>
    </section>

    <!-- ── What happens now ────────────────────────────────────────────────── -->
    {#if accepted}
      <section class="mt-6 rounded-[12px] border border-forest/20 bg-forest/[0.05] p-5 md:p-6">
        <p class="flex items-center gap-2 font-serif text-xl font-semibold text-heading">
          <CheckCircle2 size={20} class="text-forest" /> Thank you — this quotation is accepted
        </p>
        <p class="mt-2 text-sm leading-7 text-ink/70">
          {#if quote.accepted_at}Recorded on {day(quote.accepted_at)}. {/if}Nothing has been charged.
        </p>
        <ol class="mt-4 grid gap-3 border-t border-forest/15 pt-4 text-sm text-ink/75">
          <li class="flex gap-3"><span class="font-serif font-semibold text-forest">1</span> We confirm availability for your dates.</li>
          <li class="flex gap-3"><span class="font-serif font-semibold text-forest">2</span> We come back to you with the booking details to complete.</li>
          <li class="flex gap-3"><span class="font-serif font-semibold text-forest">3</span> Payment is arranged with you directly — there is nothing to pay right now.</li>
        </ol>
      </section>
    {:else if declined}
      <section class="mt-6 rounded-[12px] border border-ink/10 bg-surface p-5 text-sm leading-7 text-ink/70 md:p-6">
        Thank you for letting us know. If anything about the price, the dates or the lodges was the sticking point, tell us — we can almost always
        put together something that fits better.
      </section>
    {:else if changesRequested}
      <!-- The ball is with us. Saying so plainly stops the traveller wondering
           whether their message arrived, and stops them sending it again. -->
      <section class="mt-6 rounded-[12px] border border-clay/25 bg-clay/[0.05] p-5 md:p-6">
        <p class="flex items-center gap-2 font-serif text-xl font-semibold text-heading">
          <MessageCircle size={20} class="text-clay" /> We're working on your changes
        </p>
        <p class="mt-2 text-sm leading-7 text-ink/70">
          Thank you — we have your message and a specialist is putting together an updated quotation. You'll get a new link as soon as it's ready.
        </p>
        <p class="mt-2 text-sm leading-7 text-ink/60">
          The version below is still the current one, and you can still accept it if you'd rather not wait.
        </p>
      </section>
    {/if}

    <!-- ── Actions ─────────────────────────────────────────────────────────── -->
    {#if form?.message}
      <p class="mt-6 rounded-[8px] border border-clay/25 bg-clay/[0.06] px-4 py-3 text-sm text-clay" role="alert">{form.message}</p>
    {/if}

    <div class="mt-6 grid gap-3">
      {#if actionable}
        {#if mode === 'accept'}
          <form method="POST" action="?/accept" use:enhance={submit} class="rounded-[12px] border border-ink/10 bg-surface p-5 md:p-6">
            <p class="font-serif text-xl font-semibold text-heading">Accept this quotation</p>
            <p class="mt-1.5 text-sm leading-6 text-ink/60">
              Just so we know who is travelling and how to reach you. Every field is optional — you can send it as it is.
            </p>

            <div class="mt-4 grid gap-3">
              <label class="grid gap-1.5">
                <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">Lead traveller</span>
                <input
                  name="lead_traveller"
                  type="text"
                  autocomplete="name"
                  value={quote.customer_name ?? ''}
                  class="h-11 rounded-[8px] border border-ink/15 bg-canvas px-3 text-sm text-heading outline-none focus:border-forest"
                />
              </label>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="grid gap-1.5">
                  <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">Email</span>
                  <input
                    name="email"
                    type="email"
                    autocomplete="email"
                    class="h-11 rounded-[8px] border border-ink/15 bg-canvas px-3 text-sm text-heading outline-none focus:border-forest"
                  />
                </label>
                <label class="grid gap-1.5">
                  <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">Phone</span>
                  <input
                    name="phone"
                    type="tel"
                    autocomplete="tel"
                    class="h-11 rounded-[8px] border border-ink/15 bg-canvas px-3 text-sm text-heading outline-none focus:border-forest"
                  />
                </label>
              </div>
              <label class="grid gap-1.5">
                <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">Anything we should know</span>
                <textarea
                  name="notes"
                  rows="3"
                  placeholder="Dietary needs, room preferences, flight times…"
                  class="rounded-[8px] border border-ink/15 bg-canvas px-3 py-2.5 text-sm leading-6 text-heading outline-none focus:border-forest"
                ></textarea>
              </label>
            </div>

            <div class="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="submit"
                disabled={submitting}
                class="flex h-12 flex-1 items-center justify-center gap-2 rounded-[10px] bg-forest px-6 font-bold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {submitting ? 'Recording…' : 'Confirm acceptance'}
              </button>
              <button
                type="button"
                on:click={() => (mode = 'idle')}
                class="flex h-12 items-center justify-center rounded-[10px] border border-ink/15 px-6 text-sm font-semibold text-ink/60 transition hover:text-heading"
              >
                Cancel
              </button>
            </div>
          </form>
        {:else if mode === 'decline'}
          <form method="POST" action="?/decline" use:enhance={submit} class="rounded-[12px] border border-ink/10 bg-surface p-5 md:p-6">
            <p class="font-serif text-xl font-semibold text-heading">This doesn't work for me</p>
            <p class="mt-1.5 text-sm leading-6 text-ink/60">
              We'll close this quotation. If you tell us why, we'll use it to put together something better.
            </p>
            <textarea
              name="reason"
              rows="3"
              placeholder="Too expensive, wrong dates, changed plans…"
              class="mt-4 w-full rounded-[8px] border border-ink/15 bg-canvas px-3 py-2.5 text-sm leading-6 text-heading outline-none focus:border-forest"
            ></textarea>
            <div class="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="submit"
                disabled={submitting}
                class="flex h-12 flex-1 items-center justify-center rounded-[10px] border border-ink/20 px-6 font-semibold text-heading transition hover:bg-ink/[0.04] disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Send response'}
              </button>
              <button
                type="button"
                on:click={() => (mode = 'idle')}
                class="flex h-12 items-center justify-center rounded-[10px] px-6 text-sm font-semibold text-ink/60 transition hover:text-heading"
              >
                Back
              </button>
            </div>
          </form>
        {:else if mode === 'changes'}
          <form method="POST" action="?/requestChanges" use:enhance={submit} class="rounded-[12px] border border-ink/10 bg-surface p-5 md:p-6">
            <p class="font-serif text-xl font-semibold text-heading">Ask for changes</p>
            <p class="mt-1.5 text-sm leading-6 text-ink/60">
              Tell us what you'd like different and we'll send you an updated quotation. This doesn't cancel anything — the current price stays open
              to you in the meantime.
            </p>
            <textarea
              name="comment"
              rows="4"
              required
              placeholder="Could we travel a week later? Could we swap the last two nights for something closer to the airport?"
              class="mt-4 w-full rounded-[8px] border border-ink/15 bg-canvas px-3 py-2.5 text-sm leading-6 text-heading outline-none focus:border-forest"
            ></textarea>
            <div class="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="submit"
                disabled={submitting}
                class="flex h-12 flex-1 items-center justify-center gap-2 rounded-[10px] bg-clay px-6 font-bold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Send my changes'}
              </button>
              <button
                type="button"
                on:click={() => (mode = 'idle')}
                class="flex h-12 items-center justify-center rounded-[10px] border border-ink/15 px-6 text-sm font-semibold text-ink/60 transition hover:text-heading"
              >
                Back
              </button>
            </div>
          </form>
        {:else}
          <button
            type="button"
            on:click={() => (mode = 'accept')}
            class="flex h-14 items-center justify-center gap-2 rounded-[10px] bg-forest px-6 text-[17px] font-bold text-white shadow-sm transition hover:brightness-110"
          >
            <CheckCircle2 size={20} /> Accept quotation
          </button>
          <!-- Secondary, and deliberately not a decline. Most quotations that
               get turned down are turned down over one fixable detail, and
               before this the only way to raise that was to say no. -->
          <button
            type="button"
            on:click={() => (mode = 'changes')}
            class="flex items-center justify-center gap-2 rounded-[10px] border border-ink/15 bg-surface px-6 py-3.5 font-semibold text-heading transition hover:bg-ink/[0.03]"
          >
            <PencilLine size={18} class="text-clay" />
            {changesRequested ? 'Send another change' : 'Ask for changes'}
          </button>
        {/if}
      {/if}

      {#if waHref}
        <a
          class="flex items-center justify-center gap-2 rounded-[10px] transition
            {actionable && mode === 'idle'
            ? 'border border-[#25D366]/40 bg-[#25D366]/[0.08] px-6 py-3.5 font-semibold text-[#128C4B] hover:bg-[#25D366]/[0.14]'
            : 'h-14 bg-[#25D366] px-6 font-bold text-white shadow-sm hover:brightness-105'}"
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={19} />
          {#if expired}Request an updated price{:else if accepted}Message us about this booking{:else}WhatsApp us about this quote{/if}
        </a>
      {/if}
    </div>

    {#if actionable && mode === 'idle'}
      <p class="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-ink/50">
        <ShieldCheck size={13} /> No payment required to accept — it simply confirms this price works for you.
      </p>
      <p class="mt-3 text-center">
        <button type="button" on:click={() => (mode = 'decline')} class="text-xs text-ink/40 underline underline-offset-4 transition hover:text-ink/70">
          This doesn't work for me
        </button>
      </p>
    {/if}

    <p class="mt-8 text-center text-xs leading-6 text-ink/45">
      Prepared for you by {brand.name}.
      {#if !accepted}Prices are held until the valid-until date and are subject to availability at the time of booking.{/if}
    </p>
  </div>
</main>
