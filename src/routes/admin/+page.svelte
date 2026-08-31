<script lang="ts">
  /**
   * The overview.
   *
   * The previous version described the website — tours published, images
   * missing, posts written. All true, none of it what someone opens the CMS to
   * find out. The questions that actually bring people here are: is money owed
   * to us, is anybody waiting on a reply, and did the messages we sent this
   * week arrive.
   *
   * So it is ordered by those. Money first, then the work waiting on a human,
   * then where deals stand, then whether the plumbing is working. Content
   * health is kept but demoted — it matters, it just is not urgent.
   *
   * Every figure is derived from a record that exists. Nothing is projected,
   * estimated or smoothed: a number here either happened or is absent.
   */
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import {
    AlertTriangle,
    ArrowRight,
    Ban,
    BellRing,
    CalendarCheck,
    CheckCircle2,
    ClipboardList,
    Clock,
    FileText,
    Images,
    Mail,
    MessageSquare,
    Newspaper,
    Plus,
    Send,
    Sparkles,
    TrendingUp,
    Wallet
  } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import ChartCanvas from '$lib/components/admin/ChartCanvas.svelte';
  import { funnelConfig, lineConfig } from '$lib/charts';
  import ErrorState from '$lib/components/public/ErrorState.svelte';

  type Money = { received: number; refunded: number; outstanding: number };
  type Commerce = {
    days: number;
    money: Record<string, Money>;
    currencies: string[];
    series: Array<{ date: string; received: number; enquiries: number; accepted: number }>;
    pipeline: Record<string, number>;
    quotedValue: number;
    acceptedValue: number;
    winRate: number | null;
    attention: {
      quotationsAwaitingReply: number;
      quotationsToSend: number;
      paymentClaimsToVerify: number;
      paymentRequestsOpen: number;
      paymentRequestsOverdue: number;
      amendmentsOpen: number;
      unpaidConfirmed: number;
    };
    delivery: { sent: number; skipped: number; failed: number };
  };

  let stats: Record<string, any> | null = null;
  let commerce: Commerce | null = null;
  let loading = true;
  let error = '';

  onMount(async () => {
    try {
      const res = await api.dashboard.stats();
      stats = res.data as Record<string, any>;
      commerce = (stats?.commerce ?? null) as Commerce | null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load the dashboard.';
    } finally {
      loading = false;
    }
  });

  const money = (value: unknown, code = 'USD') =>
    `${code} ${Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const exact = (value: unknown, code = 'USD') =>
    `${code} ${Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  /** Short labels; a 30-point axis has no room for years. */
  const tick = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

  const hour = new Date().getHours();
  $: greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  /** The trading currency: whichever has seen the most money. */
  $: primary = (commerce?.currencies ?? []).slice().sort((a, b) => {
    const m = commerce!.money;
    return (m[b].received + m[b].outstanding) - (m[a].received + m[a].outstanding);
  })[0] ?? 'USD';
  $: pot = commerce?.money?.[primary] ?? { received: 0, refunded: 0, outstanding: 0 };

  /**
   * Only what someone can act on, and only when there is something to act on.
   * A permanent row of zeroes trains people to stop reading the section.
   */
  $: todo = !commerce
    ? []
    : [
        {
          key: 'claims',
          count: commerce.attention.paymentClaimsToVerify,
          label: 'said they paid — verify',
          detail: 'A traveller tapped “I have paid”. Nothing is recorded until you check the account.',
          href: '/admin/bookings?payment_status=unpaid',
          icon: Wallet,
          tone: 'urgent'
        },
        {
          key: 'changes',
          count: commerce.attention.quotationsAwaitingReply,
          label: 'quotations awaiting your reply',
          detail: 'The traveller asked for changes and the ball is with us.',
          href: '/admin/quotations?status=changes_requested',
          icon: MessageSquare,
          tone: 'urgent'
        },
        {
          key: 'overdue',
          count: commerce.attention.paymentRequestsOverdue,
          label: 'payment requests past their due date',
          detail: 'Asked for, due date passed, nothing received.',
          href: '/admin/bookings?payment_status=unpaid',
          icon: Clock,
          tone: 'urgent'
        },
        {
          key: 'tosend',
          count: commerce.attention.quotationsToSend,
          label: 'quotations ready but not sent',
          detail: 'Written and waiting. Nobody has seen these yet.',
          href: '/admin/quotations',
          icon: Send,
          tone: 'warn'
        },
        {
          key: 'amend',
          count: commerce.attention.amendmentsOpen,
          label: 'booking amendments open',
          detail: 'Proposed or agreed, not yet applied.',
          href: '/admin/bookings?status=confirmed',
          icon: FileText,
          tone: 'warn'
        },
        {
          key: 'unpaid',
          count: commerce.attention.unpaidConfirmed,
          label: 'confirmed trips not fully paid',
          detail: 'Agreed and going ahead, money still outstanding.',
          href: '/admin/bookings?status=confirmed&payment_status=unpaid',
          icon: CalendarCheck,
          tone: 'warn'
        },
        {
          key: 'open',
          count: commerce.attention.paymentRequestsOpen,
          label: 'payment requests still open',
          detail: 'Sent, not yet due, no response.',
          href: '/admin/payments',
          icon: BellRing,
          tone: 'calm'
        }
      ].filter((row) => row.count > 0);

  $: urgentCount = todo.filter((t) => t.tone === 'urgent').reduce((n, t) => n + t.count, 0);

  // ── Charts ──────────────────────────────────────────────────────────────
  $: series = commerce?.series ?? [];
  $: hasMoneyHistory = series.some((d) => d.received > 0);
  $: hasEnquiryHistory = series.some((d) => d.enquiries > 0);

  $: moneyChart = lineConfig(series.map((d) => tick(d.date)), series.map((d) => d.received), primary);
  $: enquiryChart = lineConfig(series.map((d) => tick(d.date)), series.map((d) => d.enquiries));

  const STAGE_LABELS: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    viewed: 'Viewed',
    changes_requested: 'Changes asked',
    revised: 'Revised',
    accepted: 'Accepted',
    declined: 'Declined',
    expired: 'Expired'
  };

  /** The live funnel only — settled outcomes are reported as numbers, not bars. */
  $: funnelStages = ['draft', 'sent', 'viewed', 'changes_requested', 'revised', 'accepted']
    .map((key) => ({ label: STAGE_LABELS[key], value: commerce?.pipeline?.[key] ?? 0 }));
  $: hasFunnel = funnelStages.some((s) => s.value > 0);
  $: funnelChart = funnelConfig(funnelStages);

  // ── Delivery ────────────────────────────────────────────────────────────
  $: delivery = commerce?.delivery ?? { sent: 0, skipped: 0, failed: 0 };
  $: deliveryTotal = delivery.sent + delivery.skipped + delivery.failed;
  $: deliveryRate = deliveryTotal ? Math.round((delivery.sent / deliveryTotal) * 100) : null;

  $: counts = (stats?.counts ?? {}) as Record<string, number>;
  $: recentBookings = (stats?.recent?.bookings ?? []) as Array<Record<string, any>>;
  $: recentMessages = (stats?.recent?.messages ?? []) as Array<Record<string, any>>;

  const when = (value: unknown) =>
    value
      ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(String(value)))
      : '';

  const QUICK: Array<{ label: string; href: string; icon: Component }> = [
    { label: 'New quotation', href: '/admin/quotations', icon: Plus },
    { label: 'Record a payment', href: '/admin/payments', icon: Wallet },
    { label: 'Bookings', href: '/admin/bookings', icon: ClipboardList },
    { label: 'Inbox', href: '/admin/messages', icon: Mail }
  ];

  const card = 'rounded-[10px] border border-ink/10 bg-surface p-5 shadow-sm';
  const eyebrow = 'text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70';
</script>

{#if error}
  <ErrorState message={error} />
{:else if loading}
  <div class="grid gap-4">
    {#each Array(3) as _}
      <div class="h-32 animate-pulse rounded-[10px] border border-ink/10 bg-sand/30"></div>
    {/each}
  </div>
{:else}
  <div class="grid gap-5">
    <!-- ── The band: money, and whether anyone is waiting ──────────────── -->
    <section
      class="relative overflow-hidden rounded-[10px] border border-white/10 bg-gradient-to-br from-deep-green via-forest to-[#232620] p-6 text-white shadow-[0_26px_80px_rgba(57,61,50,0.18)] lg:p-8"
    >
      <div class="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-goldfinch-gold/10 blur-3xl"></div>

      <div class="relative grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <div class="min-w-0">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">{greeting}</p>
          <h1 class="mt-2 font-serif text-3xl font-semibold leading-[1.1] md:text-[38px]">
            {#if urgentCount > 0}
              {urgentCount} {urgentCount === 1 ? 'thing needs' : 'things need'} you today
            {:else if todo.length}
              Nothing urgent — {todo.length} {todo.length === 1 ? 'item' : 'items'} in hand
            {:else}
              Everything is clear
            {/if}
          </h1>
          <p class="mt-2 max-w-lg text-sm leading-relaxed text-white/70">
            {#if urgentCount > 0}
              Someone is waiting on a reply or on money being checked. The list below is ordered by who has been waiting longest for a decision.
            {:else if todo.length}
              Nothing is blocked. What is below is work in flight, not work overdue.
            {:else}
              No open quotations, no unanswered payment requests, and nothing outstanding on a confirmed trip.
            {/if}
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-[8px] bg-white/[0.07] p-4 ring-1 ring-white/10">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">Received</p>
            <p class="mt-1 font-serif text-3xl font-semibold leading-none text-goldfinch-gold">{money(pot.received, primary)}</p>
            <p class="mt-1.5 text-[11px] text-white/50">
              {#if pot.refunded > 0}less {money(pot.refunded, primary)} refunded{:else}all time{/if}
            </p>
          </div>
          <div class="rounded-[8px] bg-white/[0.07] p-4 ring-1 ring-white/10">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">Outstanding</p>
            <p class="mt-1 font-serif text-3xl font-semibold leading-none text-white">{money(pot.outstanding, primary)}</p>
            <p class="mt-1.5 text-[11px] text-white/50">
              {commerce?.attention.unpaidConfirmed ?? 0} confirmed {(commerce?.attention.unpaidConfirmed ?? 0) === 1 ? 'trip' : 'trips'}
            </p>
          </div>
        </div>
      </div>

      {#if commerce && commerce.currencies.length > 1}
        <!-- Only when there genuinely is more than one. Currencies are never
             added together — a combined figure reconciles against nothing. -->
        {@const others = commerce.currencies.filter((c) => c !== primary)}
        <p class="relative mt-4 text-[11px] text-white/50">
          Also holding
          {#each others as code, i}
            {i > 0 ? ' · ' : ' '}{exact(commerce.money[code].received, code)}
          {/each}
        </p>
      {/if}
    </section>

    <!-- ── What needs a human ──────────────────────────────────────────── -->
    {#if todo.length}
      <section class="grid gap-3">
        <div class="flex items-baseline justify-between gap-3">
          <div>
            <p class={eyebrow}>Waiting on you</p>
            <h2 class="mt-1 text-xl font-bold text-ink">Where the work is</h2>
          </div>
        </div>
        <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {#each todo as row (row.key)}
            <a
              class="group flex items-start gap-3 rounded-[10px] border bg-surface p-4 shadow-sm transition hover:shadow-md
                {row.tone === 'urgent' ? 'border-clay/30' : row.tone === 'warn' ? 'border-goldfinch-gold/35' : 'border-ink/10'}"
              href={row.href}
            >
              <span
                class="grid h-10 w-10 shrink-0 place-items-center rounded-xl
                  {row.tone === 'urgent' ? 'bg-clay/10 text-clay' : row.tone === 'warn' ? 'bg-goldfinch-gold/15 text-heading' : 'bg-sand/60 text-ink/60'}"
              >
                <svelte:component this={row.icon} size={18} />
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex items-baseline gap-1.5">
                  <span class="text-2xl font-extrabold leading-none text-ink">{row.count}</span>
                  <span class="text-sm font-semibold text-ink/80">{row.label}</span>
                </span>
                <span class="mt-1 block text-xs leading-5 text-ink/55">{row.detail}</span>
              </span>
              <ArrowRight size={15} class="mt-1 shrink-0 text-ink/25 transition group-hover:translate-x-0.5 group-hover:text-ink/50" />
            </a>
          {/each}
        </div>
      </section>
    {:else}
      <section class="flex items-center gap-3 rounded-[10px] border border-emerald-200/60 bg-emerald-50/60 p-4">
        <CheckCircle2 size={20} class="shrink-0 text-emerald-600" />
        <p class="text-sm text-emerald-900">
          Nothing is waiting on a decision — no unanswered quotations, no open payment requests, no amendments in flight.
        </p>
      </section>
    {/if}

    <!-- ── Trend ───────────────────────────────────────────────────────── -->
    <section class="grid gap-4 xl:grid-cols-2">
      <div class={card}>
        <div class="flex items-baseline justify-between gap-3">
          <div>
            <p class={eyebrow}><TrendingUp size={12} class="mr-1 inline" /> Last {commerce?.days ?? 30} days</p>
            <h2 class="mt-1 text-xl font-bold text-ink">Money received</h2>
          </div>
          <p class="text-right text-sm font-bold text-ink">
            {exact(series.reduce((n, d) => n + d.received, 0), primary)}
          </p>
        </div>
        {#if hasMoneyHistory}
          <div class="mt-4"><ChartCanvas {...moneyChart} height={220} /></div>
        {:else}
          <!-- An empty chart implies a measured zero. This says there is no
               history yet, which is a different thing. -->
          <p class="mt-6 rounded-[8px] border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-ink/45">
            No payments recorded in this period yet.
          </p>
        {/if}
      </div>

      <div class={card}>
        <div class="flex items-baseline justify-between gap-3">
          <div>
            <p class={eyebrow}>Last {commerce?.days ?? 30} days</p>
            <h2 class="mt-1 text-xl font-bold text-ink">Enquiries</h2>
          </div>
          <p class="text-right text-sm font-bold text-ink">{series.reduce((n, d) => n + d.enquiries, 0)}</p>
        </div>
        {#if hasEnquiryHistory}
          <div class="mt-4"><ChartCanvas {...enquiryChart} height={220} /></div>
        {:else}
          <p class="mt-6 rounded-[8px] border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-ink/45">
            No enquiries in this period.
          </p>
        {/if}
      </div>
    </section>

    <!-- ── Deals ───────────────────────────────────────────────────────── -->
    <section class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div class={card}>
        <div class="flex items-baseline justify-between gap-3">
          <div>
            <p class={eyebrow}>Quotations</p>
            <h2 class="mt-1 text-xl font-bold text-ink">Where deals stand</h2>
          </div>
          <a class="text-xs font-semibold text-forest underline underline-offset-4 hover:no-underline" href="/admin/quotations">Open</a>
        </div>
        {#if hasFunnel}
          <div class="mt-4"><ChartCanvas {...funnelChart} height={240} /></div>
        {:else}
          <p class="mt-6 rounded-[8px] border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-ink/45">
            No quotations raised yet.
          </p>
        {/if}
      </div>

      <div class="grid gap-3">
        <div class={card}>
          <p class={eyebrow}>Accepted value</p>
          <p class="mt-1 font-serif text-3xl font-semibold leading-none text-heading">{money(commerce?.acceptedValue, primary)}</p>
          <p class="mt-1.5 text-xs text-ink/50">Across {commerce?.pipeline?.accepted ?? 0} accepted {(commerce?.pipeline?.accepted ?? 0) === 1 ? 'quotation' : 'quotations'}</p>
        </div>
        <div class={card}>
          <p class={eyebrow}>Still deciding</p>
          <p class="mt-1 font-serif text-3xl font-semibold leading-none text-heading">{money(commerce?.quotedValue, primary)}</p>
          <p class="mt-1.5 text-xs text-ink/50">Sent and not yet answered</p>
        </div>
        <div class={card}>
          <p class={eyebrow}>Acceptance rate</p>
          {#if commerce?.winRate == null}
            <!-- No decided quotations, so any percentage would be invented. -->
            <p class="mt-1 font-serif text-3xl font-semibold leading-none text-ink/35">—</p>
            <p class="mt-1.5 text-xs text-ink/50">Nothing has been decided yet</p>
          {:else}
            <p class="mt-1 font-serif text-3xl font-semibold leading-none text-emerald-600">{commerce.winRate}%</p>
            <p class="mt-1.5 text-xs text-ink/50">
              Of quotations that got an answer. Undecided ones are excluded — a quote sent yesterday is not a refusal.
            </p>
          {/if}
        </div>
      </div>
    </section>

    <!-- ── Did our messages land ───────────────────────────────────────── -->
    <section class={card}>
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p class={eyebrow}>Last {commerce?.days ?? 30} days</p>
          <h2 class="mt-1 text-xl font-bold text-ink">Message delivery</h2>
        </div>
        {#if deliveryRate != null}
          <p class="text-sm font-bold {deliveryRate >= 90 ? 'text-emerald-600' : deliveryRate >= 60 ? 'text-amber-600' : 'text-clay'}">
            {deliveryRate}% delivered
          </p>
        {/if}
      </div>

      {#if deliveryTotal === 0}
        <p class="mt-4 rounded-[8px] border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-ink/45">
          Nothing has been sent in this period.
        </p>
      {:else}
        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          {#each [['Delivered', delivery.sent, 'text-emerald-600', 'bg-emerald-500', CheckCircle2], ['Skipped', delivery.skipped, 'text-amber-600', 'bg-amber-400', Ban], ['Failed', delivery.failed, 'text-clay', 'bg-clay', AlertTriangle]] as [label, value, tone, accent, icon]}
            <div class="flex items-center gap-3 rounded-[8px] border border-ink/10 px-3.5 py-3">
              <span class={`h-9 w-1 shrink-0 rounded-full ${accent}`}></span>
              <span class="min-w-0">
                <span class={`block text-2xl font-extrabold leading-none ${tone}`}>{value}</span>
                <span class="mt-0.5 block text-[11px] font-semibold text-ink/50">{label}</span>
              </span>
            </div>
          {/each}
        </div>

        {#if delivery.skipped > 0 || delivery.failed > 0}
          <!-- The reason this section exists. A provider rejecting everything
               looks exactly like nobody having sent anything, and the only
               place that difference shows is here. -->
          <p class="mt-3 flex items-start gap-2 rounded-[8px] bg-sand/40 px-3.5 py-2.5 text-xs leading-6 text-ink/70">
            <AlertTriangle size={14} class="mt-1 shrink-0 text-amber-600" />
            <span>
              {#if delivery.failed > 0}<strong>{delivery.failed} failed</strong> outright — usually the email provider rejecting the send.{/if}
              {#if delivery.skipped > 0}
                {delivery.skipped} were skipped, which is deliberate: outside the 24-hour WhatsApp window with no approved template, the message is refused rather than faked.
              {/if}
            </span>
          </p>
        {/if}
      {/if}
    </section>

    <!-- ── Movement ────────────────────────────────────────────────────── -->
    <section class="grid gap-4 xl:grid-cols-[1fr_1fr_0.7fr]">
      <div class={card}>
        <div class="flex items-baseline justify-between gap-3">
          <h2 class="text-base font-bold text-ink">Latest enquiries</h2>
          <a class="text-xs font-semibold text-forest underline underline-offset-4 hover:no-underline" href="/admin/bookings">All</a>
        </div>
        {#if recentBookings.length}
          <ul class="mt-3 grid gap-2">
            {#each recentBookings.slice(0, 5) as b}
              <li class="flex items-baseline justify-between gap-3 border-b border-ink/[0.06] pb-2 last:border-0 last:pb-0">
                <span class="min-w-0">
                  <span class="block truncate text-sm font-semibold text-heading">{b.full_name}</span>
                  <span class="font-mono text-[11px] text-ink/45">{b.booking_code}</span>
                </span>
                <span class="shrink-0 text-[11px] text-ink/45">{when(b.created_at)}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="mt-4 text-sm text-ink/45">No enquiries yet.</p>
        {/if}
      </div>

      <div class={card}>
        <div class="flex items-baseline justify-between gap-3">
          <h2 class="text-base font-bold text-ink">Unread messages</h2>
          <a class="text-xs font-semibold text-forest underline underline-offset-4 hover:no-underline" href="/admin/messages">Inbox</a>
        </div>
        {#if recentMessages.length}
          <ul class="mt-3 grid gap-2">
            {#each recentMessages.slice(0, 5) as m}
              <li class="flex items-baseline justify-between gap-3 border-b border-ink/[0.06] pb-2 last:border-0 last:pb-0">
                <span class="min-w-0">
                  <span class="block truncate text-sm font-semibold text-heading">{m.name ?? m.full_name ?? 'Someone'}</span>
                  <span class="block truncate text-[11px] text-ink/45">{m.subject ?? m.email ?? ''}</span>
                </span>
                <span class="shrink-0 text-[11px] text-ink/45">{when(m.created_at)}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="mt-4 text-sm text-ink/45">Nothing unread.</p>
        {/if}
      </div>

      <div class={card}>
        <h2 class="text-base font-bold text-ink">Jump to</h2>
        <div class="mt-3 grid gap-2">
          {#each QUICK as q}
            <a
              class="flex items-center gap-2.5 rounded-xl border border-ink/10 px-3 py-2.5 text-sm font-semibold text-heading transition hover:bg-sand/40"
              href={q.href}
            >
              <svelte:component this={q.icon} size={15} class="text-ink/45" />
              {q.label}
            </a>
          {/each}
        </div>
      </div>
    </section>

    <!-- ── The website itself. Kept, deliberately last. ─────────────────── -->
    <section class={card}>
      <div class="flex items-baseline justify-between gap-3">
        <div>
          <p class={eyebrow}><Sparkles size={12} class="mr-1 inline" /> The website</p>
          <h2 class="mt-1 text-xl font-bold text-ink">Content</h2>
        </div>
        <a class="text-xs font-semibold text-forest underline underline-offset-4 hover:no-underline" href="/admin/tours">Manage</a>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
        {#each [['Published tours', counts.publishedTours, Newspaper], ['Drafts', counts.draftTours, FileText], ['Destinations', counts.destinations, Images], ['Blog posts', counts.blogPosts, Newspaper], ['Media', counts.mediaFiles, Images]] as [label, value, icon]}
          <div class="rounded-[8px] border border-ink/10 px-3 py-2.5">
            <span class="block text-xl font-extrabold leading-none text-ink">{value ?? 0}</span>
            <span class="mt-1 block text-[11px] font-semibold text-ink/50">{label}</span>
          </div>
        {/each}
      </div>
    </section>
  </div>
{/if}
