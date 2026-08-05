<script lang="ts">
  import { ArrowLeft, ArrowRight, MapPin } from '@lucide/svelte';
  import { imgUrl } from '$lib/img';

  export let eyebrow = 'Top Destinations';
  export let title = 'The Places That Shape the Journey';
  export let subtitle =
    'Some places are best for wildlife. Others are better for beaches, culture, trekking or quiet time after safari. The right Tanzania trip depends on how these places fit together.';
  export let destinations: any[] = [];

  let scrollerEl: HTMLDivElement;

  const scrollBy = (dir: 1 | -1) => {
    if (!scrollerEl) return;
    scrollerEl.scrollBy({ left: dir * scrollerEl.clientWidth * 0.85, behavior: 'smooth' });
  };

  const imageOf = (d: any): string => d?.main_image_url || d?.image_url || d?.banner_image_url || '';
  const metaOf = (d: any): string => d?.region || d?.country || '';
  const blurbOf = (d: any): string => d?.short_description || d?.description || d?.excerpt || '';
</script>

{#if destinations.length}
  <section class="py-14 md:py-[64px]">
    <div class="container-shell">
      <div class="flex items-end justify-between gap-6">
        <div class="max-w-[1180px] flex-1">
          {#if eyebrow}
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
              <span class="text-xs font-semibold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
            </div>
          {/if}
          {#if title}
            <h2 class="font-serif mt-2 text-3xl leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[40px]">
              {title}
            </h2>
          {/if}
          {#if subtitle}
            <p class="mt-3 max-w-[720px] text-[15px] leading-relaxed text-ink/70">
              {subtitle}
            </p>
          {/if}
        </div>
        <div class="hidden sm:flex gap-2">
          <button
            type="button"
            aria-label="Previous"
            on:click={() => scrollBy(-1)}
            class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink/10 bg-surface text-heading transition-colors hover:bg-sand"
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Next"
            on:click={() => scrollBy(1)}
            class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink/10 bg-surface text-heading transition-colors hover:bg-sand"
          >
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div
        bind:this={scrollerEl}
        class="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
      >
        {#each destinations as d (d.id ?? d.slug ?? d.name)}
          <a
            href={`/destinations/${d.slug}`}
            class="group relative block w-[86%] sm:w-[48%] lg:w-[30%] shrink-0 snap-start overflow-hidden rounded-[10px] border border-ink/10 bg-surface"
          >
            <div class="relative h-[360px] md:h-[380px] lg:h-[400px] overflow-hidden bg-sand">
              {#if imageOf(d)}
                <img
                  src={imgUrl(imageOf(d), 800)}
                  alt=""
                  loading="lazy"
                  width="800"
                  height="1000"
                  class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
              {/if}
              <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
              <div class="absolute inset-x-0 bottom-0 p-4 text-white">
                {#if metaOf(d)}
                  <div class="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-goldfinch-gold">
                    <MapPin size={12} strokeWidth={2} />
                    {metaOf(d)}
                  </div>
                {/if}
                {#if d.name}
                  <h3 class="font-serif mt-1 text-xl leading-tight">{d.name}</h3>
                {/if}
                {#if blurbOf(d)}
                  <p class="mt-1 text-[13px] leading-snug text-white/85 line-clamp-2">{blurbOf(d)}</p>
                {/if}
              </div>
            </div>
          </a>
        {/each}
      </div>
    </div>
  </section>
{/if}

<style>
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
</style>
