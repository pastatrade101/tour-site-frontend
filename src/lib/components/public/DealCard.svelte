<script lang="ts">
  import type { Tour } from '$lib/types';
  import TourCard from './TourCard.svelte';

  type TourCardBadgeType = 'rust' | 'gold' | 'olive' | 'default';

  export let tour: Tour;
  export let index = 0;

  $: badge = tour.is_featured
    ? 'Best Value'
    : tour.is_popular
      ? 'Most Popular 🔥'
      : index % 2 === 0
        ? 'Special Offer'
        : 'Trip Idea';
  $: badgeType = (tour.is_featured ? 'gold' : tour.is_popular ? 'rust' : index % 2 === 0 ? 'olive' : 'default') as TourCardBadgeType;
</script>

<TourCard {tour} {badge} {badgeType} ctaLabel="View trip" />
