<script lang="ts">
  export let images: Record<string, unknown>[] = [];
</script>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {#each images as image}
    <figure class="aspect-[4/3] overflow-hidden rounded-lg bg-skywash">
      {#if typeof image.image_url === 'string'}
        <img class="h-full w-full object-cover" src={image.image_url} alt={String(image.alt_text ?? image.title ?? 'Gallery image')} />
      {/if}
    </figure>
  {/each}
</div>
