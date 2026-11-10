<script lang="ts" context="module">
  import {
    Backpack, BedDouble, Binoculars, Calendar, Camera, Car, Clock, Compass, Luggage, Map as MapIcon, Mountain,
    Plane, Route, Scale, Shield, Sun, Tent, Ticket, TreePalm, Trees, Users, Utensils, Wallet, WavesHorizontal
  } from '@lucide/svelte';

  /**
   * The icon names the CMS stores for topic groups and icon lists, drawn with
   * Lucide. An unknown name falls back to the compass rather than failing.
   */
  export const JOURNAL_ICONS = {
    compass: Compass, map: MapIcon, calendar: Calendar, backpack: Backpack, tent: Tent, palm: TreePalm,
    binoculars: Binoculars, scale: Scale, plane: Plane, mountain: Mountain, waves: WavesHorizontal, camera: Camera,
    trees: Trees, car: Car, bed: BedDouble, route: Route, wallet: Wallet, users: Users, clock: Clock,
    shield: Shield, utensils: Utensils, ticket: Ticket, luggage: Luggage, sun: Sun
  } as const;
  export type JournalIconName = keyof typeof JOURNAL_ICONS;
</script>

<script lang="ts">
  export let name: string | null | undefined = 'compass';
  export let size = 18;
  let className = '';
  export { className as class };

  $: icon = JOURNAL_ICONS[(name ?? 'compass') as JournalIconName] ?? Compass;
</script>

<svelte:component this={icon} {size} strokeWidth={1.7} class={className} aria-hidden="true" />
