<script lang="ts">
  import { ArrowRight, GitCompare } from '@lucide/svelte';
  import { COMPARISONS } from '$lib/data/comparisons';
</script>

<section class="relative overflow-hidden bg-gradient-to-br from-deep-green via-forest to-deep-green text-white">
  <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
  <div class="container-shell relative py-16 text-center md:py-20">
    <span class="inline-flex items-center gap-2 rounded-full border border-goldfinch-gold/30 bg-goldfinch-gold/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">
      <GitCompare size={14} strokeWidth={2.4} /> Compare
    </span>
    <h1 class="mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-[1.1] tracking-tight md:text-[44px]">Honest side-by-side comparisons</h1>
    <p class="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-white/75 md:text-lg">
      The big East Africa decisions, weighed honestly — with a clear Goldfinch verdict for each.
    </p>
  </div>
</section>

<section class="container-shell py-12 md:py-16">
  <div class="grid gap-6 md:grid-cols-3">
    {#each COMPARISONS as c (c.slug)}
      <a
        class="group flex flex-col rounded-2xl border border-ink/10 bg-white p-6 shadow-soft transition hover:border-goldfinch-gold/40 hover:shadow-[0_18px_50px_rgba(15,47,36,0.1)]"
        href={`/compare/${c.slug}`}
      >
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-clay">{c.eyebrow}</p>
        <h2 class="mt-2 text-xl font-extrabold leading-snug text-deep-green">{c.title}</h2>
        <p class="mt-2 flex-1 text-sm leading-6 text-ink/65">{c.intro}</p>
        <span class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition group-hover:text-deep-green">
          See the comparison <ArrowRight size={16} />
        </span>
      </a>
    {/each}
  </div>
</section>
