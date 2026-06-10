<script lang="ts">
  import { ArrowRight, ShieldCheck } from '@lucide/svelte';

  // Honest "typical cost" band (spec §4.1 F / §6). Rows can be overridden from the
  // CMS (cost_ranges section → extra_data.ranges); otherwise sensible defaults show.
  export let title = '';
  export let subtitle = '';
  export let ranges: Array<{ label: string; from: string; note?: string }> = [];

  const defaults = [
    { label: 'Safari', from: 'from $1,500', note: 'Guiding, park fees & lodges' },
    { label: 'Kilimanjaro', from: 'from $1,900', note: 'Guides, crew, meals & route support' },
    { label: 'Zanzibar beach', from: 'from $850', note: 'Beach stays & transfers' },
    { label: 'Gorilla trekking', from: 'from $2,400', note: 'Includes the gorilla permit' }
  ];

  $: rows = ranges.length ? ranges : defaults;
</script>

<div>
  {#if title}<h2 class="text-center text-3xl font-bold tracking-normal text-ink md:text-4xl">{title}</h2>{/if}
  {#if subtitle}<p class="mx-auto mt-3 max-w-2xl text-center text-base leading-7 text-ink/65">{subtitle}</p>{/if}

  <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {#each rows as row}
      <div class="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft transition hover:border-goldfinch-gold/40">
        <p class="text-sm font-bold uppercase tracking-[0.14em] text-clay">{row.label}</p>
        <p class="mt-2 text-2xl font-extrabold text-deep-green">{row.from}</p>
        {#if row.note}<p class="mt-1.5 text-sm leading-6 text-ink/55">{row.note}</p>{/if}
        <p class="mt-2 text-xs font-medium text-ink/40">per person</p>
      </div>
    {/each}
  </div>

  <div class="mt-7 flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-between">
    <p class="inline-flex items-center gap-2 text-sm text-ink/60">
      <ShieldCheck size={18} class="shrink-0 text-forest" />
      Typical starting prices — your exact cost depends on season, lodges and group size. No hidden costs.
    </p>
    <a class="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-deep-green px-6 font-bold text-white transition hover:bg-forest" href="/plan-my-trip">
      Get your exact price <ArrowRight size={18} />
    </a>
  </div>
</div>
