<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { MapPin } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import Img from './Img.svelte';
  import { fadeUpOnScroll, sectionReveal, staggeredCardReveal } from '$lib/animations';
  import type { MigrationEntry } from '$lib/types';
  import type { ImageVariantMap } from '$lib/img';

  // Serengeti Great Migration month-by-month guide. Self-hiding: renders nothing
  // until published entries exist, so the homepage is unchanged until content is
  // added in Admin → Migration calendar. Highlights the visitor's current month.
  export let eyebrow = 'Great Migration';
  export let title = 'Follow the herds, month by month';
  export let subtitle = 'Where the wildebeest and zebra roam across the Serengeti through the year — so you can plan your safari around the action.';
  // Toggle the whole section from Admin → Homepage (migration_section.is_active).
  export let active = true;
  export let entries: MigrationEntry[] = [];
  export let imageVariants: ImageVariantMap = {};

  let loaded = entries.length > 0;
  let currentMonth = '';

  $: hasEntries = loaded && entries.length > 0;

  const isCurrent = (month: string) =>
    !!currentMonth && !!month && month.trim().toLowerCase().startsWith(currentMonth.slice(0, 3).toLowerCase());

  onMount(async () => {
    if (browser) currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
    if (loaded) return;
    try {
      const res = await api.migrationCalendar.list({ is_published: true, limit: 24 });
      entries = (res.data.items ?? []) as MigrationEntry[];
    } catch {
      entries = [];
    } finally {
      loaded = true;
    }
  });
</script>

{#if active && hasEntries}
  <section class="relative overflow-hidden bg-canvas py-14 md:py-20" use:sectionReveal>
    <div class="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-surface/70 to-transparent" aria-hidden="true"></div>
    <div class="container-shell">
      <div class="relative mx-auto max-w-2xl text-center" use:fadeUpOnScroll={{ y: 14 }}>
        <p class="text-sm font-semibold uppercase tracking-[0.16em] text-goldfinch-gold">{eyebrow}</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-heading md:text-[38px]">{title}</h2>
        <p class="mt-4 text-[15px] leading-8 text-ink/70 md:text-lg">{subtitle}</p>
      </div>

      <div class="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.06 }}>
        {#each entries as entry}
          {@const current = isCurrent(entry.month)}
          <article
            class={`group relative flex flex-col overflow-hidden rounded-[8px] border bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover ${current ? 'border-goldfinch-gold ring-2 ring-goldfinch-gold/35' : 'border-ink/10 hover:border-forest/25'}`}
          >
            {#if entry.image_url}
              <div class="relative aspect-[16/10] overflow-hidden">
                <Img
                  record={entry}
                  fields={['image_url']}
                  variantsMap={imageVariants}
                  alt={`Great Migration in ${entry.month}`}
                  width={700}
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 33vw"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
                <span class="absolute left-3 top-3 rounded-[6px] bg-heading/85 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white backdrop-blur">{entry.month}</span>
                {#if current}
                  <span class="absolute right-3 top-3 rounded-[6px] bg-goldfinch-gold px-2.5 py-1 text-[11px] font-bold text-heading">This month</span>
                {/if}
              </div>
            {/if}

            <div class="flex flex-1 flex-col gap-2 p-5">
              {#if !entry.image_url}
                <div class="flex items-center justify-between gap-2">
                  <span class="text-lg font-bold text-heading">{entry.month}</span>
                  {#if current}<span class="rounded-[6px] bg-goldfinch-gold px-2.5 py-1 text-[11px] font-bold text-heading">This month</span>{/if}
                </div>
              {/if}
              {#if entry.location}
                <p class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest">
                  <MapPin size={14} />{entry.location}
                </p>
              {/if}
              {#if entry.note}
                <p class="text-sm leading-6 text-ink/70">{entry.note}</p>
              {/if}
            </div>
          </article>
        {/each}
      </div>
    </div>
  </section>
{/if}
