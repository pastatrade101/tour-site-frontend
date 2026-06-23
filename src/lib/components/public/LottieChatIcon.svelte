<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { browser } from '$app/environment';

  export let size = 28;
  export let loop = true;

  let canvas: HTMLCanvasElement;
  let player: { destroy: () => void } | null = null;

  // Respect reduced motion — show the first frame instead of animating.
  const reduce = browser && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  onMount(() => {
    if (!browser) return;
    let cancelled = false;

    // Defer the (~1.7MB) player + wasm until the browser is idle so it never
    // competes with the hero / LCP on first load.
    const start = async () => {
      if (cancelled) return;
      try {
        const { DotLottie } = await import('@lottiefiles/dotlottie-web');
        // Self-hosted wasm (copied into /static) so we don't depend on a CDN at runtime.
        DotLottie.setWasmUrl('/dotlottie-player.wasm');
        player = new DotLottie({ canvas, src: '/ai-chat.lottie', loop, autoplay: !reduce });
      } catch {
        // If the player fails to load, the (empty) canvas simply renders nothing.
      }
    };

    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    const handle = ric ? ric(start, { timeout: 3000 }) : window.setTimeout(start, 1500);

    return () => {
      cancelled = true;
      if (!ric) window.clearTimeout(handle);
    };
  });

  onDestroy(() => player?.destroy());
</script>

<canvas
  bind:this={canvas}
  width={size * 2}
  height={size * 2}
  style={`width:${size}px;height:${size}px`}
  aria-hidden="true"
></canvas>
