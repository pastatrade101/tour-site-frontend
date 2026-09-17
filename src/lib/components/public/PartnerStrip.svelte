<script lang="ts">
  import { cdnUrl } from '$lib/img';
  type Logo = { image_url: string; name?: string; url?: string };

  export let logos: Logo[] = [];
  export let title = '';

  $: valid = logos.filter((logo) => logo && typeof logo.image_url === 'string' && logo.image_url.trim());
  /*
   * A handful of logos sit still and centred; the marquee is for a set too wide
   * to show at once. Scrolling five logos past the reader is motion with
   * nothing to reveal.
   */
  $: scrolls = valid.length > 6;
  // Duplicate the set so the horizontal scroll loops seamlessly.
  $: loop = scrolls ? [...valid, ...valid] : valid;
</script>

{#if valid.length}
  <section class="relative overflow-hidden border-y border-ink/[0.06] bg-surface py-10 md:py-14">
    <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-goldfinch-gold/25 to-transparent" aria-hidden="true"></div>
    <div class="container-shell">
      {#if title}
        <p class="text-center text-xs font-bold uppercase tracking-[0.18em] text-ink/45 md:text-[13px]">{title}</p>
      {/if}

      <div class={`${scrolls ? 'marquee' : ''} ${title ? 'mt-8' : ''}`}>
        <div class={scrolls ? 'marquee-track' : 'logo-row'}>
          {#each loop as logo, index (index)}
            <div class="marquee-item" aria-hidden={index >= valid.length ? 'true' : undefined}>
              {#if logo.url}
                <a class="flex" href={logo.url} target="_blank" rel="noopener noreferrer" title={logo.name}>
                  <img class="marquee-logo" src={cdnUrl(logo.image_url)} alt={logo.name || 'Partner logo'} loading="lazy" />
                </a>
              {:else}
                <img class="marquee-logo" src={cdnUrl(logo.image_url)} alt={logo.name || 'Partner logo'} loading="lazy" />
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>
{/if}

<style>
  .marquee {
    overflow: hidden;
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
    mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
  }

  .marquee-track {
    display: flex;
    width: max-content;
    align-items: center;
    gap: 48px;
    animation: marquee-scroll 36s linear infinite;
  }

  .marquee:hover .marquee-track {
    animation-play-state: paused;
  }

  .marquee-item {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logo-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 32px 56px;
  }

  .marquee-logo {
    height: 44px;
    width: auto;
    max-width: 180px;
    object-fit: contain;
    transition:
      filter 0.25s ease,
      opacity 0.25s ease,
      transform 0.25s ease;
  }

  .marquee-item:hover .marquee-logo {
    transform: scale(1.04);
  }

  @keyframes marquee-scroll {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-50%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .marquee-track {
      animation: none;
    }
  }
</style>
