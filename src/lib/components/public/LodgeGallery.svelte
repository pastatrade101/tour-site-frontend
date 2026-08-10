<script lang="ts">
  /**
   * Property gallery — a large lead image with supporting shots beside it, and
   * a lightbox for the rest.
   *
   * Only the first few images are requested at page load; the remainder are
   * fetched at thumbnail size and only upgraded when the lightbox opens. A
   * property with a dozen photographs should not cost a dozen full-size
   * downloads to look at one.
  */
  import { onDestroy, tick } from 'svelte';
  import { ChevronLeft, ChevronRight, Expand, X } from '@lucide/svelte';
  import Img from './Img.svelte';
  import type { LodgeImage } from '$lib/types';

  export let images: LodgeImage[] = [];
  export let propertyName = '';

  let open = false;
  let index = 0;
  let dialog: HTMLDivElement;
  let previouslyFocused: HTMLElement | null = null;

  // The cover leads; everything else follows in its saved order.
  $: ordered = [...images].sort((a, b) => Number(b.is_cover ?? false) - Number(a.is_cover ?? false));
  $: lead = ordered[0];
  $: supporting = ordered.slice(1, 5);
  $: extra = Math.max(0, ordered.length - 5);

  const alt = (image: LodgeImage, position: number) =>
    image.alt_text || (propertyName ? `${propertyName} — photo ${position + 1}` : '');

  const show = async (at: number) => {
    previouslyFocused = document.activeElement as HTMLElement | null;
    index = at;
    open = true;
    await tick();
    dialog?.focus();
  };

  const close = () => {
    open = false;
    previouslyFocused?.focus();
    previouslyFocused = null;
  };

  const step = (delta: number) => {
    index = (index + delta + ordered.length) % ordered.length;
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
  };

  $: if (typeof document !== 'undefined') document.body.style.overflow = open ? 'hidden' : '';
  onDestroy(() => {
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  });
</script>

<svelte:window on:keydown={onKeydown} />

{#if ordered.length}
  <div class="grid gap-2 sm:grid-cols-2 sm:gap-2.5">
    <!-- lead -->
    <button
      type="button"
      class="group relative col-span-1 aspect-[4/3] overflow-hidden rounded-[12px] bg-forest sm:aspect-auto sm:h-full sm:min-h-[320px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2"
      on:click={() => show(0)}
    >
      <Img
        record={lead}
        fields={['image_url']}
        alt={alt(lead, 0)}
        width={1100}
        sizes="(max-width: 640px) 100vw, 50vw"
        eager
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
      />
      <span class="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" aria-hidden="true"></span>
    </button>

    {#if supporting.length}
      <div class="grid grid-cols-2 gap-2 sm:gap-2.5">
        {#each supporting as image, offset}
          <button
            type="button"
            class="group relative aspect-[4/3] overflow-hidden rounded-[10px] bg-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2"
            on:click={() => show(offset + 1)}
          >
            <Img
              record={image}
              fields={['image_url']}
              alt={alt(image, offset + 1)}
              width={520}
              sizes="(max-width: 640px) 50vw, 25vw"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
            <!-- The last tile carries the overflow count rather than adding a
                 separate button nobody would look for. -->
            {#if extra > 0 && offset === supporting.length - 1}
              <span class="absolute inset-0 grid place-items-center bg-black/55 text-white transition group-hover:bg-black/45">
                <span class="text-center">
                  <span class="block font-serif text-2xl font-semibold">+{extra}</span>
                  <span class="text-[11px] font-bold uppercase tracking-[0.14em]">More photos</span>
                </span>
              </span>
            {:else}
              <span class="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" aria-hidden="true"></span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <button
    type="button"
    class="mt-3 inline-flex items-center gap-2 rounded-full border border-ink/15 bg-surface px-4 py-2 text-sm font-bold text-heading transition hover:border-goldfinch-gold hover:bg-sand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
    on:click={() => show(0)}
  >
    <Expand size={15} />
    View all {ordered.length} photos
  </button>
{/if}

{#if open}
  <div class="fixed inset-0 z-[120] bg-black/90" aria-hidden="true" on:click={close}></div>
  <div
    class="fixed inset-0 z-[121] flex flex-col p-3 outline-none sm:p-6"
    role="dialog"
    aria-modal="true"
    aria-label={`${propertyName} photos`}
    tabindex="-1"
    bind:this={dialog}
  >
    <div class="flex shrink-0 items-center justify-between text-white">
      <p class="text-[13px] font-semibold" aria-live="polite">{index + 1} / {ordered.length}</p>
      <button
        type="button"
        class="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
        aria-label="Close photos"
        on:click={close}
      >
        <X size={20} />
      </button>
    </div>

    <div class="flex min-h-0 flex-1 items-center gap-2 sm:gap-4">
      {#if ordered.length > 1}
        <button
          type="button"
          class="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
          aria-label="Previous photo"
          on:click={() => step(-1)}
        >
          <ChevronLeft size={20} />
        </button>
      {/if}

      <figure class="flex min-h-0 flex-1 flex-col items-center justify-center">
        <!-- Only the visible photo is ever requested at full size. -->
        <Img
          record={ordered[index]}
          fields={['image_url']}
          alt={alt(ordered[index], index)}
          width={1600}
          sizes="100vw"
          className="max-h-full min-h-0 w-auto max-w-full rounded-[10px] object-contain"
        />
        {#if ordered[index].caption}
          <figcaption class="mt-3 max-w-2xl text-center text-[13px] leading-6 text-white/70">
            {ordered[index].caption}
          </figcaption>
        {/if}
      </figure>

      {#if ordered.length > 1}
        <button
          type="button"
          class="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
          aria-label="Next photo"
          on:click={() => step(1)}
        >
          <ChevronRight size={20} />
        </button>
      {/if}
    </div>
  </div>
{/if}
