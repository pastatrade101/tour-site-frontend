<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { X } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { brand } from '$lib/brand';
  import { publicSettings, settingText } from '$lib/settings';
  import Img from '$lib/components/public/Img.svelte';
  import TripRequestForm from '$lib/components/public/TripRequestForm.svelte';

  // The planning request opens immediately as a focused dialog over a blurred
  // backdrop — the surrounding "how it works" copy made the page cluttered and
  // competed with the form itself.
  $: heroImage = settingText($publicSettings, 'about_hero_image') || '/images/surf-hero.jpg';

  const close = () => history.length > 1 ? history.back() : goto('/');

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };

  onMount(() => {
    document.body.style.overflow = 'hidden';
  });
  onDestroy(() => {
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  });
</script>

<svelte:head>
  <title>Plan My Trip | {brand.name}</title>
  <meta name="description" content="Tell us your dates, budget and travel style and a local Goldfinch specialist will shape a tailor-made East Africa plan — no payment to start." />
</svelte:head>

<svelte:window on:keydown={onKey} />

<!-- Blurred scene behind the dialog -->
<div class="fixed inset-0 -z-10" aria-hidden="true">
  <Img src={heroImage} alt="" width={1600} sizes="100vw" eager className="h-full w-full object-cover" />
  <div class="absolute inset-0 bg-deep-green/70"></div>
</div>

<div class="planning-dialog fixed inset-0 z-[200] overflow-y-auto overflow-x-hidden bg-black/45 backdrop-blur-md" transition:fade={{ duration: 150 }}>
  <div class="planning-dialog-inner flex min-h-full items-center justify-center p-4 py-10 sm:py-14">
    <div class="planning-dialog-panel relative w-full max-w-[560px]" transition:scale={{ duration: 180, start: 0.98 }}>
      <button
        class="absolute -top-3 right-0 z-10 grid h-10 w-10 place-items-center rounded-full bg-surface text-ink shadow-lg ring-1 ring-ink/10 transition hover:bg-sand sm:-right-3"
        type="button"
        aria-label="Close"
        on:click={close}
      >
        <X size={20} />
      </button>

      <TripRequestForm source="plan_my_trip" heading="Plan My Trip" intro="Tell us the basics and a local specialist will shape a confident East Africa plan." />
    </div>
  </div>
</div>

<style>
  @media (max-width: 1023px) {
    .planning-dialog {
      height: var(--planning-viewport-height, 100dvh);
      overscroll-behavior: contain;
    }

    .planning-dialog-inner {
      min-height: 100%;
      padding: 0.75rem;
    }

    /*
      Auto height, not full height. The old form was tall enough to want the
      whole screen; the trimmed one is not, and stretching the panel pinned a
      short card to the top of an otherwise empty overlay.
    */
    .planning-dialog-panel {
      height: auto;
      min-width: 0;
    }
  }
</style>
