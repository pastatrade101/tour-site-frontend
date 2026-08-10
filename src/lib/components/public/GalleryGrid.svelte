<script lang="ts">
  import GalleryCard, { type GalleryCardItem } from './GalleryCard.svelte';
  import type { ImageVariantMap } from '$lib/img';

  export let images: GalleryCardItem[] = [];
  export let imageVariants: ImageVariantMap = {};
</script>

<div class="grid auto-rows-[300px] gap-4 md:grid-cols-3">
  {#each images as image, index (image.id ?? `${image.image_url}-${index}`)}
    <GalleryCard item={image} featured={index === 0} {imageVariants} />
  {/each}
</div>
