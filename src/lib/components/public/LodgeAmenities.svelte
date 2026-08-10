<script lang="ts">
  /**
   * Amenities attached to a property.
   *
   * Only what is actually attached is shown — there is no "not available"
   * column, because an unticked amenity in the CMS means nobody has said either
   * way, not that the property lacks it.
   */
  import {
    Bath, BedDouble, Binoculars, Car, Coffee, Fan, Flame, Flower2, Plug, Shirt,
    ShieldCheck, Snowflake, Sun, Utensils, Waves, Wifi, Wine
  } from '@lucide/svelte';
  import type { Amenity } from '$lib/types';

  export let amenities: Amenity[] = [];
  /** How many to show before the reveal. */
  export let initial = 8;

  let expanded = false;

  // icon_key is a stable key set in the CMS, so renaming a label never changes
  // the picture. Anything unmapped falls back to a neutral mark.
  const ICONS: Record<string, typeof Wifi> = {
    pool: Waves,
    wifi: Wifi,
    restaurant: Utensils,
    bar: Wine,
    spa: Flower2,
    laundry: Shirt,
    transfer: Car,
    safari: Binoculars,
    deck: Sun,
    shower: Bath,
    ac: Snowflake,
    fan: Fan,
    net: ShieldCheck,
    family: BedDouble,
    solar: Sun,
    power: Plug,
    campfire: Flame,
    dining: Coffee
  };

  const iconFor = (amenity: Amenity) => ICONS[String(amenity.icon_key ?? '')] ?? ShieldCheck;

  $: visible = expanded ? amenities : amenities.slice(0, initial);
  $: hidden = Math.max(0, amenities.length - initial);
</script>

{#if amenities.length}
  <div>
    <ul class="grid grid-cols-2 gap-x-6 gap-y-3.5 sm:grid-cols-3">
      {#each visible as amenity (amenity.id)}
        <li class="flex items-center gap-2.5 text-[14px] leading-6 text-ink/75">
          <svelte:component this={iconFor(amenity)} size={17} class="shrink-0 text-goldfinch-gold" aria-hidden="true" />
          {amenity.name}
        </li>
      {/each}
    </ul>

    {#if hidden > 0}
      <button
        type="button"
        class="mt-5 inline-flex items-center rounded-full border border-ink/15 bg-surface px-4 py-2 text-sm font-bold text-heading transition hover:border-goldfinch-gold hover:bg-sand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
        aria-expanded={expanded}
        on:click={() => (expanded = !expanded)}
      >
        {expanded ? 'Show fewer amenities' : `View all ${amenities.length} amenities`}
      </button>
    {/if}
  </div>
{/if}
