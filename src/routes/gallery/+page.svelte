<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';
  import GalleryGrid from '$lib/components/public/GalleryGrid.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';

  let images: Record<string, unknown>[] = [
    { image_url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801', title: 'Safari plains' },
    { image_url: 'https://images.unsplash.com/photo-1558981001-1995369a39cd', title: 'Island coast' },
    { image_url: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e', title: 'Wildlife route' }
  ];

  onMount(async () => {
    try {
      const response = await api.gallery.list();
      images = response.data.items.length ? response.data.items : images;
    } catch {
      images = images;
    }
  });
</script>

<section class="container-shell py-14">
  <SectionHeader eyebrow="Gallery" title="Travel Image Gallery" description="Starter grid ready for Supabase Storage-backed CMS uploads." />
  <div class="mt-8">
    <GalleryGrid {images} />
  </div>
</section>
