<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import Img from '$lib/components/public/Img.svelte';
  import type { SafariPackage } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: packages = ((data.packages ?? []) as SafariPackage[]).filter((row) => row?.slug && row?.name);
</script>

<svelte:head>
  <title>Safari Packages | Goldfinch Adventures</title>
  <meta name="description" content="Ready-shaped safari packages from Goldfinch Adventures — each one a real route with real days, prices and departure points." />
</svelte:head>

<section class="bg-surface py-14 md:py-20">
  <div class="container-shell">
    <div class="max-w-[720px]">
      <p class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">Safari packages</p>
      <h1 class="font-serif mt-3 text-3xl leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[40px]">
        Trips shaped around where you are starting from
      </h1>
      <p class="mt-4 text-base leading-relaxed text-ink/70">
        Each package is a real route with published days, a stated length and an honest price band.
      </p>
    </div>

    {#if packages.length}
      <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {#each packages as item (item.id)}
          <a
            href={`/${item.slug}`}
            class="group flex min-w-0 flex-col overflow-hidden rounded-[16px] border border-ink/12 bg-surface transition hover:border-goldfinch-gold/50"
            data-sveltekit-preload-data="hover"
          >
            {#if item.hero_image_url}
              <Img
                src={item.hero_image_url}
                alt={item.name}
                width={720}
                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 48vw, 32vw"
                className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            {/if}
            <span class="flex flex-1 flex-col p-5">
              {#if item.hero_eyebrow}
                <span class="text-[10px] font-bold uppercase tracking-[0.14em] text-clay">{item.hero_eyebrow}</span>
              {/if}
              <span class="mt-1.5 font-serif text-lg font-semibold leading-snug text-heading">{item.name}</span>
              {#if item.hero_subtitle}
                <span class="mt-2 line-clamp-3 text-sm leading-relaxed text-ink/65">{item.hero_subtitle}</span>
              {/if}
              <span class="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-forest">
                View package <ArrowRight size={15} />
              </span>
            </span>
          </a>
        {/each}
      </div>
    {:else}
      <!-- Nothing published yet. The page says so rather than showing a shell. -->
      <p class="mt-10 rounded-[12px] border border-ink/10 bg-sand/35 p-5 text-[14px] leading-6 text-ink/70">
        No safari packages have been published yet.
      </p>
    {/if}
  </div>
</section>
