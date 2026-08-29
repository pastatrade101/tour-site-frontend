<script lang="ts">
  import type { Tour } from '$lib/types';
  import TourCard from './TourCard.svelte';

  export let tour: Tour;
  export let showShortlist = true;
  export let whiteSurface = true;
</script>

<TourCard {tour} {showShortlist} {whiteSurface} />
