<script lang="ts">
  export let cards = 3;
  export let compact = false;
  export let label = 'Loading content';
</script>

<section class={`overflow-hidden bg-[#fbfaf6] ${compact ? 'py-8' : 'py-14 md:py-20'}`} aria-busy="true" aria-label={label}>
  <div class="container-shell">
    {#if !compact}
      <div class="mb-8 max-w-2xl">
        <div class="shimmer h-3 w-28 rounded-full"></div>
        <div class="shimmer mt-4 h-8 w-[min(88%,34rem)] rounded-md md:h-10"></div>
        <div class="shimmer mt-4 h-4 w-[min(100%,42rem)] rounded-full"></div>
        <div class="shimmer mt-2 h-4 w-[min(72%,30rem)] rounded-full"></div>
      </div>
    {/if}

    <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {#each Array(cards) as _}
        <div class="overflow-hidden rounded-[14px] border border-ink/[0.07] bg-white shadow-[0_8px_24px_rgba(57,61,50,0.05)]">
          <div class={`shimmer w-full ${compact ? 'h-40' : 'aspect-[16/10]'}`}></div>
          <div class="space-y-3 p-5">
            <div class="shimmer h-3 w-24 rounded-full"></div>
            <div class="shimmer h-5 w-4/5 rounded-md"></div>
            <div class="shimmer h-3.5 w-full rounded-full"></div>
            <div class="shimmer h-3.5 w-2/3 rounded-full"></div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  .shimmer {
    position: relative;
    overflow: hidden;
    background: rgb(var(--c-ink) / 0.075);
  }

  .shimmer::after {
    content: '';
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.72), transparent);
    animation: content-shimmer 1.45s ease-in-out infinite;
  }

  @keyframes content-shimmer {
    to { transform: translateX(100%); }
  }

  @media (prefers-reduced-motion: reduce) {
    .shimmer::after { animation: none; }
  }
</style>
