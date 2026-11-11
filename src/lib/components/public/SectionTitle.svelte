<script lang="ts">
  import type { CalendarDays } from '@lucide/svelte';
  /**
   * A tour-page section heading: a gold marker, a bold serif title and, where
   * the section has one real number worth stating ("6 days"), a small chip.
   *
   * The sections of a tour page used to open with a plain heading each, and
   * the page read as one long column. The marker makes each section's start
   * findable while scrolling.
   */
  export let title = '';
  /** Carried onto the h2, for aria-labelledby. */
  export let id: string | undefined = undefined;
  /** The intro line under the title, set in line with the title's text. */
  export let description = '';
  export let chip = '';
  export let chipIcon: typeof CalendarDays | null = null;
</script>

<div class="flex flex-wrap items-center gap-x-3.5 gap-y-2">
  <span class="h-8 w-1.5 shrink-0 rounded bg-goldfinch-gold md:h-10" aria-hidden="true"></span>
  <h2 {id} class="min-w-0 font-serif text-[26px] font-bold leading-[1.08] text-heading sm:text-[30px] md:text-[34px]">{title}</h2>
  {#if chip}
    <span class="inline-flex items-center gap-1.5 rounded-full bg-deep-green px-3 py-1.5 text-[11.5px] font-bold uppercase leading-none tracking-[0.08em] text-goldfinch-gold">
      {#if chipIcon}<svelte:component this={chipIcon} size={14} strokeWidth={2.2} />{/if}
      {chip}
    </span>
  {/if}
</div>
{#if description}
  <p class="mt-2.5 max-w-2xl pl-5 text-[15px] leading-relaxed text-ink/70">{description}</p>
{/if}
