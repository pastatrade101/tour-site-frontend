<script lang="ts">
  import { Camera } from '@lucide/svelte';
  import Img from './Img.svelte';

  type GalleryMoment = {
    id?: string;
    image_url?: string | null;
    alt_text?: string | null;
    caption?: string | null;
    title?: string | null;
    destinations?: { name?: string | null } | null;
    [key: string]: unknown;
  };

  export let images: GalleryMoment[] = [];
  export let title = 'Moments from our travellers';
  export let galleryHref = '/gallery';

  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const captionOf = (image: GalleryMoment) =>
    text(image.caption) || text(image.title) || text(image.destinations?.name) || 'A Goldfinch traveller moment';
  const altOf = (image: GalleryMoment) => text(image.alt_text) || captionOf(image);

  $: moments = images.filter((image) => text(image.image_url)).slice(0, 10);
  $: canLoop = moments.length >= 5;
  $: track = canLoop ? [...moments, ...moments] : moments;
</script>

{#if moments.length}
  <section data-traveller-moments class="overflow-x-clip border-t border-ink/10 bg-surface py-14 md:py-20">
    <div class="container-shell">
      <div class="inline-flex items-center gap-2 text-clay">
        <Camera size={15} strokeWidth={2} aria-hidden="true" />
        <h2 class="text-xs font-semibold uppercase tracking-[0.16em]">{title}</h2>
      </div>
    </div>

    <div class="traveller-moments mt-5 w-full overflow-hidden">
      <ul class:traveller-moments__track={canLoop} class:traveller-moments__static={!canLoop}>
        {#each track as image, index (`${image.id ?? image.image_url}-${index}`)}
          <li
            class="relative h-[250px] w-[190px] shrink-0 overflow-hidden rounded-2xl bg-sand shadow-[0_12px_28px_rgba(57,61,50,0.12)] md:h-[310px] md:w-[240px]"
            aria-hidden={canLoop && index >= moments.length ? 'true' : undefined}
          >
            <a href={galleryHref} class="group block h-full w-full" tabindex={canLoop && index >= moments.length ? -1 : undefined}>
              <Img
                record={image}
                fields={['image_url']}
                alt={canLoop && index >= moments.length ? '' : altOf(image)}
                width={520}
                height={680}
                sizes="(min-width: 768px) 240px, 190px"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
              />
              <span class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" aria-hidden="true"></span>
              <span class="absolute inset-x-0 bottom-0 p-4 text-sm font-semibold leading-snug text-white md:text-[15px]">
                {captionOf(image)}
              </span>
            </a>
          </li>
        {/each}
      </ul>
    </div>
  </section>
{/if}

<style>
  .traveller-moments__track,
  .traveller-moments__static {
    --moment-gap: 1.25rem;
    display: flex;
    width: max-content;
    gap: var(--moment-gap);
  }

  .traveller-moments__track {
    animation: traveller-moments-scroll 64s linear infinite;
    will-change: transform;
  }

  .traveller-moments__static {
    margin-inline: auto;
  }

  .traveller-moments:hover .traveller-moments__track,
  .traveller-moments:focus-within .traveller-moments__track {
    animation-play-state: paused;
  }

  @keyframes traveller-moments-scroll {
    to {
      transform: translate3d(calc(-50% - (var(--moment-gap) / 2)), 0, 0);
    }
  }

  @media (min-width: 768px) {
    .traveller-moments__track,
    .traveller-moments__static {
      --moment-gap: 1.5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .traveller-moments {
      overflow-x: auto;
      scrollbar-width: none;
    }

    .traveller-moments::-webkit-scrollbar {
      display: none;
    }

    .traveller-moments__track {
      animation: none;
    }
  }
</style>
