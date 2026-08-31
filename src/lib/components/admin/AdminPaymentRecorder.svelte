<script lang="ts">
  /**
   * Recording money that has arrived.
   *
   * This is the step everything else waits on. A quotation can be accepted, a
   * booking confirmed and a deposit requested, but until someone says "it
   * landed" the booking still reads unpaid — to staff, and on the traveller's
   * own trip page. Until now the only way to say it was the API.
   *
   * It records a fact, it does not take money. Nothing here charges anyone.
   *
   * Used from two places: the booking, where the booking is already known and
   * the amount can be suggested; and the Payments screen, where it isn't and
   * has to be searched for.
   */
  import { createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { Check, Loader2, Search, X } from '@lucide/svelte';
  import { api } from '$lib/api/client';

  export let open = false;
  /** Known when opened from a booking; blank when opened from Payments. */
  export let bookingId = '';
  export let bookingLabel = '';
  export let currency = 'USD';
  /** What is still owed, used to pre-fill and to warn on overpayment. */
  export let outstanding: number | null = null;
  export let suggestedAmount: number | null = null;

  const dispatch = createEventDispatcher<{ close: void; saved: Record<string, unknown> }>();

  type Lead = { id: string; booking_code?: string; full_name?: string; currency?: string; estimated_amount?: number | null };

  /**
   * Bound to a number input, so Svelte hands back a number — or null when the
   * box is empty. Typing it as a string and calling .trim() on it throws, and
   * a throw inside the disabled expression leaves the button disabled with no
   * error anywhere: the form simply refuses to submit and never says why.
   */
  let amount: string | number | null = '';
  let method = 'mpesa';
  let reference = '';
  let paidAt = '';
  let status: 'paid' | 'refunded' | 'failed' = 'paid';
  let notes = '';

  let search = '';
  let results: Lead[] = [];
  let chosen: Lead | null = null;
  let searching = false;

  let saving = false;
  let error = '';
  let seeded = false;

  // Seed once per opening, not on every keystroke a parent prop triggers.
  $: if (open && !seeded) {
    seeded = true;
    amount = suggestedAmount != null ? String(suggestedAmount) : outstanding != null && outstanding > 0 ? String(outstanding) : '';
    paidAt = new Date().toISOString().slice(0, 10);
  }
  $: if (!open && seeded) {
    seeded = false;
    amount = '';
    reference = '';
    notes = '';
    status = 'paid';
    search = '';
    results = [];
    chosen = null;
    error = '';
  }

  $: targetId = bookingId || chosen?.id || '';
  $: targetLabel = bookingLabel || (chosen ? `${chosen.full_name ?? ''} · ${chosen.booking_code ?? ''}` : '');
  $: activeCurrency = chosen?.currency ?? currency;
  $: overpaying = outstanding != null && Number(amount || 0) > outstanding + 0.005 && status === 'paid';
  $: hasAmount = String(amount ?? '').trim() !== '' && Number(amount) > 0;

  const METHODS = [
    { value: 'mpesa', label: 'M-Pesa' },
    { value: 'tigopesa', label: 'Tigo Pesa' },
    { value: 'airtelmoney', label: 'Airtel Money' },
    { value: 'bank_transfer', label: 'Bank transfer' },
    { value: 'card', label: 'Card' },
    { value: 'cash', label: 'Cash' },
    { value: 'other', label: 'Other' }
  ];

  let searchTimer: ReturnType<typeof setTimeout>;
  const runSearch = () => {
    clearTimeout(searchTimer);
    const q = search.trim();
    if (q.length < 2) {
      results = [];
      return;
    }
    searchTimer = setTimeout(async () => {
      searching = true;
      try {
        const res = await api.bookings.list({ search: q, limit: 8 });
        results = ((res.data?.items ?? []) as Lead[]) ?? [];
      } catch {
        results = [];
      } finally {
        searching = false;
      }
    }, 250);
  };

  const save = async () => {
    if (saving) return;
    error = '';

    if (!targetId) return (error = 'Choose which booking this payment is for.');
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return (error = 'Enter the amount that was actually received.');

    saving = true;
    try {
      const res = await api.payments.create({
        booking_id: targetId,
        amount: value,
        currency: activeCurrency,
        status,
        payment_method: method,
        transaction_reference: reference.trim() || null,
        paid_at: paidAt ? new Date(`${paidAt}T12:00:00`).toISOString() : null,
        notes: notes.trim() || null
      });
      dispatch('saved', (res as { data?: Record<string, unknown> }).data ?? {});
    } catch (err) {
      error = err instanceof Error ? err.message : 'Could not record the payment.';
    } finally {
      saving = false;
    }
  };

  const close = () => dispatch('close');
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) close();
  };

  const inputClass =
    'h-10 w-full min-w-0 rounded-xl border border-ink/15 bg-surface px-3 text-sm text-heading outline-none transition focus:border-forest';
  const labelText = 'text-[13px] font-semibold text-ink/65';
</script>

<svelte:window on:keydown={onKeydown} />

{#if open}
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-label="Record a payment"
    transition:fade={{ duration: 140 }}
  >
    <button class="absolute inset-0 cursor-default" type="button" aria-label="Close" on:click={close}></button>

    <div
      class="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-surface shadow-[0_24px_80px_rgba(57,61,50,0.18)]"
      transition:scale={{ duration: 160, start: 0.98 }}
    >
      <div class="flex items-start justify-between gap-4 border-b border-ink/10 bg-sand/30 p-5">
        <div class="min-w-0">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Finance</p>
          <h2 class="mt-1 font-serif text-xl font-semibold text-heading">Record a payment</h2>
          <p class="text-xs text-ink/50">Money that has already arrived. Nothing here charges anyone.</p>
        </div>
        <button
          class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand"
          type="button"
          aria-label="Close"
          on:click={close}><X size={18} /></button
        >
      </div>

      <div class="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5">
        {#if error}
          <p class="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 ring-1 ring-red-100" role="alert">{error}</p>
        {/if}

        {#if bookingId}
          <div class="rounded-xl bg-sand/30 px-3.5 py-2.5">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">Against</p>
            <p class="mt-0.5 text-sm font-semibold text-heading">{targetLabel || 'This booking'}</p>
            {#if outstanding != null}
              <p class="text-xs text-ink/55">
                {outstanding > 0 ? `${activeCurrency} ${outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })} outstanding` : 'Nothing outstanding'}
              </p>
            {/if}
          </div>
        {:else}
          <!-- Opened from Payments, where the booking is the first thing that
               has to be established. A payment against nothing is unattributable
               the moment it is saved. -->
          <div class="grid gap-1.5">
            <span class={labelText}>Which booking</span>
            {#if chosen}
              <div class="flex items-center justify-between gap-3 rounded-xl border border-forest/25 bg-forest/[0.05] px-3.5 py-2.5">
                <span class="min-w-0">
                  <span class="block truncate text-sm font-semibold text-heading">{chosen.full_name}</span>
                  <span class="block font-mono text-[11px] text-ink/45">{chosen.booking_code}</span>
                </span>
                <button class="text-xs font-semibold text-ink/50 underline underline-offset-2 hover:text-heading" type="button" on:click={() => (chosen = null)}
                  >Change</button
                >
              </div>
            {:else}
              <span class="flex h-10 items-center gap-2 rounded-xl border border-ink/15 bg-surface px-3 focus-within:border-forest">
                <Search size={15} class="shrink-0 text-ink/40" />
                <input
                  class="h-full w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
                  type="search"
                  bind:value={search}
                  on:input={runSearch}
                  placeholder="Booking code, name, email…"
                />
                {#if searching}<Loader2 size={14} class="shrink-0 animate-spin text-ink/40" />{/if}
              </span>
              {#if results.length}
                <ul class="grid max-h-44 gap-px overflow-y-auto rounded-xl border border-ink/10 bg-ink/10">
                  {#each results as row (row.id)}
                    <li>
                      <button
                        class="flex w-full items-center justify-between gap-3 bg-surface px-3.5 py-2.5 text-left transition hover:bg-sand/40"
                        type="button"
                        on:click={() => { chosen = row; results = []; search = ''; }}
                      >
                        <span class="min-w-0">
                          <span class="block truncate text-sm font-medium text-heading">{row.full_name}</span>
                          <span class="block font-mono text-[11px] text-ink/45">{row.booking_code}</span>
                        </span>
                        <Check size={14} class="shrink-0 text-ink/25" />
                      </button>
                    </li>
                  {/each}
                </ul>
              {:else if search.trim().length >= 2 && !searching}
                <p class="text-[11px] text-ink/45">No booking matches that.</p>
              {/if}
            {/if}
          </div>
        {/if}

        <div class="grid gap-3 sm:grid-cols-[1fr_140px]">
          <label class="grid gap-1.5">
            <span class={labelText}>Amount received ({activeCurrency})</span>
            <input class={inputClass} type="number" step="0.01" min="0" inputmode="decimal" bind:value={amount} placeholder="0.00" />
          </label>
          <label class="grid gap-1.5">
            <span class={labelText}>Date</span>
            <input class={inputClass} type="date" bind:value={paidAt} />
          </label>
        </div>

        {#if overpaying}
          <!-- Allowed, not blocked: overpayments genuinely happen, and refusing
               one would leave staff unable to record money that is sitting in
               the account. -->
          <p class="rounded-md bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-800 ring-1 ring-amber-200/70">
            That is more than the {activeCurrency} {outstanding?.toLocaleString('en-US', { minimumFractionDigits: 2 })} outstanding. Recording it will mark the booking paid with a credit.
          </p>
        {/if}

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="grid gap-1.5">
            <span class={labelText}>How it was paid</span>
            <select class={inputClass} bind:value={method}>
              {#each METHODS as m}<option value={m.value}>{m.label}</option>{/each}
            </select>
          </label>
          <label class="grid gap-1.5">
            <span class={labelText}>Type</span>
            <select class={inputClass} bind:value={status}>
              <option value="paid">Payment received</option>
              <option value="refunded">Refund issued</option>
              <option value="failed">Failed attempt</option>
            </select>
          </label>
        </div>

        <label class="grid gap-1.5">
          <span class={labelText}>Reference <span class="font-normal text-ink/40">optional</span></span>
          <input class={inputClass} bind:value={reference} placeholder="M-Pesa code, bank reference…" />
          <span class="text-[11px] text-ink/45">What you would search for on a statement to find this again.</span>
        </label>

        <label class="grid gap-1.5">
          <span class={labelText}>Note <span class="font-normal text-ink/40">optional</span></span>
          <textarea
            class="w-full rounded-xl border border-ink/15 bg-surface px-3 py-2.5 text-sm leading-6 text-heading outline-none focus:border-forest"
            rows="2"
            bind:value={notes}
            placeholder="Anything worth remembering about this payment."
          ></textarea>
        </label>
      </div>

      <div class="flex items-center justify-between gap-3 border-t border-ink/10 bg-sand/20 p-4">
        <p class="text-[11px] text-ink/45">The booking's payment status follows from this.</p>
        <div class="flex gap-2">
          <button class="h-10 rounded-xl px-3 text-xs font-semibold text-ink/55 transition hover:text-heading" type="button" on:click={close}
            >Cancel</button
          >
          <button
            class="inline-flex h-10 items-center gap-2 rounded-xl bg-forest px-5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            type="button"
            disabled={saving || !targetId || !hasAmount}
            on:click={save}
          >
            {#if saving}<Loader2 size={14} class="animate-spin" />{:else}<Check size={14} />{/if}
            Record payment
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
