<script lang="ts">
  import { ArrowRight, ShieldCheck } from '@lucide/svelte';
  import Img from '$lib/components/public/Img.svelte';

  // Honest "typical cost" band (spec §4.1 F / §6). Rows come from the CMS
  // (cost_ranges section → extra_data.ranges); the section hides when there are none.
  export let title = '';
  export let subtitle = '';
  export let ranges: Array<{ label: string; from: string; note?: string; image?: string }> = [];

  // Real CMS rows only — no fabricated default prices or stock images. Rows come
  // from Admin → Homepage (cost_ranges → extra_data.ranges); the section hides
  // itself when there are none.
  $: rows = ranges;
</script>

<div class="relative">
  <div class="mx-auto max-w-2xl text-center">
    <div class="mx-auto mb-4 h-1 w-14 rounded-full bg-goldfinch-gold"></div>
    {#if title}<h2 class="text-3xl font-bold tracking-normal text-ink md:text-4xl">{title}</h2>{/if}
    {#if subtitle}<p class="mx-auto mt-3 text-base leading-7 text-ink/65">{subtitle}</p>{/if}
  </div>

  <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {#each rows as row}
      <div class="group relative flex min-h-[200px] flex-col overflow-hidden rounded-[8px] border border-ink/10 bg-surface p-5 shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-goldfinch-gold/40 hover:shadow-card-hover">
        <!-- very faint photo texture (only when the CMS row provides an image) -->
        {#if row.image}
          <Img
            src={row.image}
            alt=""
            width={520}
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 24vw"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.08] transition duration-700 group-hover:scale-105 group-hover:opacity-[0.14]"
          />
        {/if}
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-br from-surface via-surface/80 to-canvas/70"></div>
        <div class="pointer-events-none absolute inset-y-5 left-0 w-1 rounded-r-full bg-goldfinch-gold/70 transition group-hover:bg-goldfinch-gold"></div>

        <div class="relative flex flex-1 flex-col">
          <p class="text-sm font-bold uppercase tracking-[0.14em] text-clay">{row.label}</p>
          <p class="mt-2 text-2xl font-extrabold text-heading">{row.from}</p>
          {#if row.note}<p class="mt-1.5 text-sm leading-6 text-ink/70">{row.note}</p>{/if}
          <p class="mt-auto pt-3 text-xs font-medium text-ink/65">per person</p>
        </div>
      </div>
    {/each}
  </div>

  <div class="mt-7 flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-between">
    <p class="inline-flex items-center gap-2 text-sm text-ink/70">
      <ShieldCheck size={18} class="shrink-0 text-forest" />
      Typical starting prices — your exact cost depends on season, lodges and group size. No hidden costs.
    </p>
    <a class="inline-flex h-11 shrink-0 items-center gap-2 rounded-[8px] bg-deep-green px-6 font-bold text-white transition hover:bg-forest" href="/plan-my-trip">
      Get your exact price <ArrowRight size={18} />
    </a>
  </div>
</div>
