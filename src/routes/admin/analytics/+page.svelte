<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Bot,
    ClipboardList,
    Filter,
    MapPin,
    MessageCircle,
    MousePointerClick,
    Send,
    TrendingUp,
    Users
  } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import ApexChart from '$lib/components/admin/ApexChart.svelte';

  type Tally = Array<{ label: string; value: number }>;
  type Overview = {
    visitors: number; interactions: number; planMyTripSubmissions: number; requestTripSubmissions: number;
    aiLeads: number; whatsappClicks: number; phoneClicks: number; emailClicks: number; aiAdvisorOpened: number;
    totalLeads: number; formOpens: number; formConversionRate: number; leadConversionRate: number;
  };
  type LeadData = {
    total: number; leadsByDay: Array<{ date: string; value: number }>;
    bySource: Tally; byDestination: Tally; byBudget: Tally; byExperience: Tally;
    byTravellerType: Tally; byAccommodation: Tally; byStatus: Tally;
  };
  type Funnel = { stages: Array<{ key: string; label: string; value: number }>; rates: Record<string, number> };
  type Traffic = { byDay: Array<{ date: string; visitors: number; whatsapp: number; ai: number; events: number }>; byDevice: Tally; topEvents: Tally };

  const RANGES = [
    { k: 'today', l: 'Today' }, { k: 'yesterday', l: 'Yesterday' }, { k: '7d', l: '7 days' },
    { k: '30d', l: '30 days' }, { k: 'this_month', l: 'This month' }, { k: 'last_month', l: 'Last month' }
  ];

  let range = '30d';
  let loading = true;
  let overview: Overview | null = null;
  let leads: LeadData | null = null;
  let funnel: Funnel | null = null;
  let traffic: Traffic | null = null;

  const CHART_FONT = 'Figtree, Inter, sans-serif';
  const LABEL = '#94a3b8';

  const load = async () => {
    loading = true;
    const params = { range };
    try {
      const [o, l, f, t] = await Promise.all([
        api.analytics.overview(params), api.analytics.leads(params),
        api.analytics.funnel(params), api.analytics.timeseries(params)
      ]);
      overview = o.data as Overview;
      leads = l.data as LeadData;
      funnel = f.data as Funnel;
      traffic = t.data as Traffic;
    } catch {
      overview = null; leads = null; funnel = null; traffic = null;
    } finally {
      loading = false;
    }
  };

  const setRange = (k: string) => { range = k; void load(); };
  onMount(load);

  $: cards = overview
    ? [
        { label: 'Visitors', value: overview.visitors, helper: 'Unique sessions (first-party)', icon: Users, trend: `${overview.interactions} interactions` },
        { label: 'Total leads', value: overview.totalLeads, helper: 'Requests in range', icon: ClipboardList, trend: `${overview.leadConversionRate}% of visitors` },
        { label: 'Plan My Trip', value: overview.planMyTripSubmissions, helper: 'General planning leads', icon: MapPin, trend: 'Submissions' },
        { label: 'Request This Trip', value: overview.requestTripSubmissions, helper: 'Tour-specific leads', icon: Send, trend: 'Submissions' },
        { label: 'AI advisor leads', value: overview.aiLeads, helper: `${overview.aiAdvisorOpened} advisor opens`, icon: Bot, trend: 'From chat' },
        { label: 'WhatsApp clicks', value: overview.whatsappClicks, helper: `${overview.phoneClicks} phone · ${overview.emailClicks} email`, icon: MessageCircle, trend: 'Contact intent' },
        { label: 'Form conversion', value: `${overview.formConversionRate}%`, helper: `${overview.formOpens} form opens`, icon: TrendingUp, trend: 'Open → submit' },
        { label: 'Interactions', value: overview.interactions, helper: 'Tracked events', icon: MousePointerClick, trend: 'All events' }
      ]
    : [];

  const DONUT_COLORS = ['#D9A441', '#1F4D3A', '#0F2F24', '#94a3b8', '#b86b45', '#E9D8A6', '#f87171'];

  const donut = (t: Tally, max = 6) => {
    const top = t.filter((x) => x.value > 0).slice(0, max);
    return {
      chart: { type: 'donut', height: 280, fontFamily: CHART_FONT },
      labels: top.map((x) => x.label),
      series: top.map((x) => x.value),
      colors: DONUT_COLORS,
      legend: { position: 'bottom', fontWeight: 600, labels: { colors: LABEL } },
      dataLabels: { enabled: false },
      stroke: { width: 2, colors: ['transparent'] },
      plotOptions: { pie: { donut: { labels: { show: true, total: { show: true, color: LABEL } } } } },
      tooltip: { y: { formatter: (v: number) => `${v} lead${v === 1 ? '' : 's'}` } },
      noData: { text: 'No data yet', style: { color: LABEL } }
    };
  };

  $: leadsLineOptions = {
    chart: { type: 'area', height: 280, fontFamily: CHART_FONT, toolbar: { show: false }, sparkline: { enabled: false } },
    series: [{ name: 'Leads', data: (leads?.leadsByDay ?? []).map((d) => d.value) }],
    xaxis: { categories: (leads?.leadsByDay ?? []).map((d) => d.date.slice(5)), labels: { style: { colors: LABEL } } },
    yaxis: { labels: { style: { colors: LABEL } }, min: 0, forceNiceScale: true },
    colors: ['#D9A441'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 0.4, opacityFrom: 0.35, opacityTo: 0.05 } },
    stroke: { curve: 'smooth', width: 3 },
    dataLabels: { enabled: false },
    grid: { borderColor: 'rgba(148,163,184,0.18)' },
    tooltip: { y: { formatter: (v: number) => `${v} lead${v === 1 ? '' : 's'}` } }
  };

  $: destBarOptions = {
    chart: { type: 'bar', height: 280, fontFamily: CHART_FONT, toolbar: { show: false } },
    series: [{ name: 'Leads', data: (leads?.byDestination ?? []).filter((x) => x.label !== 'Not specified').slice(0, 7).map((x) => x.value) }],
    xaxis: { categories: (leads?.byDestination ?? []).filter((x) => x.label !== 'Not specified').slice(0, 7).map((x) => x.label), labels: { style: { colors: LABEL } } },
    yaxis: { labels: { style: { colors: LABEL } } },
    colors: ['#1F4D3A'],
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    dataLabels: { enabled: false },
    grid: { borderColor: 'rgba(148,163,184,0.18)' },
    tooltip: { theme: 'dark' }
  };

  // Pre-clean ranked lists in the script (Svelte {@const} can't live under a <div>).
  const cleanRows = (t: Tally, n = 6) => {
    const rows = t.filter((x) => x.label !== 'Not specified' && x.value > 0).slice(0, n);
    return { rows, max: Math.max(1, ...rows.map((x) => x.value)) };
  };

  $: funnelMax = funnel ? Math.max(1, ...funnel.stages.map((s) => s.value)) : 1;
  $: breakdownBlocks = leads
    ? [
        { t: 'Experience interests', ...cleanRows(leads.byExperience) },
        { t: 'Traveller type', ...cleanRows(leads.byTravellerType) },
        { t: 'Accommodation preference', ...cleanRows(leads.byAccommodation) }
      ]
    : [];
  $: topEventRows = traffic ? cleanRows(traffic.topEvents, 8) : { rows: [], max: 1 };
</script>

<section class="grid gap-6">
  <!-- header + range filter -->
  <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Insights</p>
      <h2 class="mt-1 text-2xl font-bold text-ink">Analytics &amp; lead performance</h2>
      <p class="mt-1 text-sm text-ink/55">First-party traffic + business funnel. Full GA4 traffic (visitors, sources, countries) arrives in Phase 2.</p>
    </div>
    <div class="flex flex-wrap items-center gap-1.5">
      <Filter size={15} class="mr-1 text-ink/40" />
      {#each RANGES as r}
        <button
          class={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${range === r.k ? 'bg-forest text-white' : 'border border-ink/10 bg-surface text-ink/65 hover:border-goldfinch-gold/40'}`}
          type="button"
          on:click={() => setRange(r.k)}
        >{r.l}</button>
      {/each}
    </div>
  </div>

  {#if loading}
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {#each Array(8) as _}<div class="h-28 animate-pulse rounded-[10px] border border-ink/10 bg-surface/70"></div>{/each}
    </div>
  {:else}
    <!-- overview cards -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {#each cards as c}
        {@const Icon = c.icon}
        <article class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
          <div class="flex items-start justify-between">
            <span class="grid h-11 w-11 place-items-center rounded-2xl bg-forest/10 text-forest ring-1 ring-ink/5 dark:text-goldfinch-gold"><Icon size={19} /></span>
            <span class="rounded-full bg-sand/70 px-2.5 py-1 text-[10px] font-bold text-ink/55 ring-1 ring-ink/5">{c.trend}</span>
          </div>
          <p class="mt-4 text-3xl font-bold text-ink">{c.value}</p>
          <p class="mt-1 text-sm font-semibold text-ink/70">{c.label}</p>
          <p class="mt-0.5 text-xs text-ink/50">{c.helper}</p>
        </article>
      {/each}
    </div>

    <!-- funnel -->
    {#if funnel}
      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
        <div class="mb-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Conversion funnel</p>
          <h3 class="mt-1 text-xl font-bold text-ink">Visitor → Booked</h3>
        </div>
        <div class="grid gap-2.5">
          {#each funnel.stages as s}
            <div class="flex items-center gap-3">
              <span class="w-32 shrink-0 text-sm font-semibold text-ink/70">{s.label}</span>
              <div class="relative h-8 flex-1 overflow-hidden rounded-lg bg-sand/40">
                <div class="h-full rounded-lg bg-gradient-to-r from-forest to-goldfinch-gold transition-all" style={`width: ${Math.max(3, (s.value / funnelMax) * 100)}%`}></div>
              </div>
              <span class="w-12 shrink-0 text-right text-sm font-bold text-ink">{s.value}</span>
            </div>
          {/each}
        </div>
        <div class="mt-5 grid gap-3 sm:grid-cols-4">
          {#each [['Visitors → form', funnel.rates.visitorsToFormOpen], ['Form → submit', funnel.rates.formOpenToSubmit], ['Submit → contacted', funnel.rates.submitToContacted], ['Contacted → booked', funnel.rates.contactedToBooked]] as [label, rate]}
            <div class="rounded-xl border border-ink/10 bg-sand/25 p-3 text-center">
              <p class="text-2xl font-extrabold text-heading">{rate}%</p>
              <p class="mt-0.5 text-[11px] font-semibold text-ink/55">{label}</p>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- charts row -->
    <div class="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Leads over time</p>
        <h3 class="mt-1 text-xl font-bold text-ink">Leads by day</h3>
        <div class="mt-3">
          {#if (leads?.leadsByDay ?? []).length}<ApexChart options={leadsLineOptions} />{:else}<p class="grid h-[280px] place-items-center text-sm text-ink/45">No leads in this range yet.</p>{/if}
        </div>
      </div>
      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Where leads come from</p>
        <h3 class="mt-1 text-xl font-bold text-ink">Lead source</h3>
        <div class="mt-3">
          {#if (leads?.bySource ?? []).some((x) => x.value > 0)}<ApexChart options={donut(leads?.bySource ?? [])} />{:else}<p class="grid h-[280px] place-items-center text-sm text-ink/45">No leads yet.</p>{/if}
        </div>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Demand</p>
        <h3 class="mt-1 text-xl font-bold text-ink">Most requested destinations</h3>
        <div class="mt-3">
          {#if (leads?.byDestination ?? []).some((x) => x.label !== 'Not specified' && x.value > 0)}<ApexChart options={destBarOptions} />{:else}<p class="grid h-[280px] place-items-center text-sm text-ink/45">No destination data yet.</p>{/if}
        </div>
      </div>
      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Budget</p>
        <h3 class="mt-1 text-xl font-bold text-ink">Budget range mix</h3>
        <div class="mt-3">
          {#if (leads?.byBudget ?? []).some((x) => x.value > 0)}<ApexChart options={donut(leads?.byBudget ?? [])} />{:else}<p class="grid h-[280px] place-items-center text-sm text-ink/45">No budget data yet.</p>{/if}
        </div>
      </div>
    </div>

    <!-- ranked breakdowns -->
    <div class="grid gap-6 lg:grid-cols-3">
      {#each breakdownBlocks as block}
        <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
          <h3 class="text-sm font-bold text-ink">{block.t}</h3>
          {#if block.rows.length}
            <div class="mt-3 grid gap-2.5">
              {#each block.rows as row}
                <div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-semibold text-ink/75">{row.label}</span>
                    <span class="font-bold text-ink/55">{row.value}</span>
                  </div>
                  <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-sand/50">
                    <div class="h-full rounded-full bg-gradient-to-r from-forest to-goldfinch-gold" style={`width: ${(row.value / block.max) * 100}%`}></div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="mt-3 text-sm text-ink/45">No data yet.</p>
          {/if}
        </div>
      {/each}
    </div>

    <!-- first-party traffic (until GA4 in Phase 2) -->
    {#if traffic}
      <div class="grid gap-6 lg:grid-cols-[0.55fr_0.45fr]">
        <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
          <h3 class="text-sm font-bold text-ink">Top tracked events</h3>
          {#if topEventRows.rows.length}
            <div class="mt-3 grid gap-2.5">
              {#each topEventRows.rows as ev}
                <div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-mono font-semibold text-ink/75">{ev.label}</span>
                    <span class="font-bold text-ink/55">{ev.value}</span>
                  </div>
                  <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-sand/50">
                    <div class="h-full rounded-full bg-gradient-to-r from-forest to-goldfinch-gold" style={`width: ${(ev.value / topEventRows.max) * 100}%`}></div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="mt-3 text-sm text-ink/45">No events captured yet — they'll appear as visitors interact.</p>
          {/if}
        </div>
        <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
          <h3 class="text-sm font-bold text-ink">Devices</h3>
          <div class="mt-3">
            {#if traffic.byDevice.some((x) => x.value > 0)}<ApexChart options={donut(traffic.byDevice, 3)} />{:else}<p class="grid h-[200px] place-items-center text-sm text-ink/45">No device data yet.</p>{/if}
          </div>
        </div>
      </div>
    {/if}
  {/if}
</section>
