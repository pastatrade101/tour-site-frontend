<script lang="ts">
  import GalleryCard, { type GalleryCardItem } from './GalleryCard.svelte';

  export let images: GalleryCardItem[] = [];
</script>

<div class="grid auto-rows-[300px] gap-4 md:grid-cols-3">
  {#each images as image, index (image.id ?? `${image.image_url}-${index}`)}
    <GalleryCard item={image} featured={index === 0} />
  {/each}
</div>
