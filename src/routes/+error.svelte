<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { ArrowRight, Compass, Home, LifeBuoy, MapPin } from '@lucide/svelte';
  import { api } from '$lib/api/client';

  $: status = $page.status;
  $: isNotFound = status === 404;
  $: message = $page.error?.message ?? 'Something went wrong on our end.';

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/tours', label: 'Browse tours', icon: Compass },
    { href: '/destinations', label: 'Destinations', icon: MapPin },
    { href: '/contact', label: 'Talk to us', icon: LifeBuoy }
  ];

  onMount(() => {
    // Report genuine 404s so broken links surface in Admin → Error logs. The hook
    // already tried a redirect before we got here; this records the miss.
    if (status !== 404) return;
    api.errors
      .report({
        url: window.location.pathname + window.location.search,
        error_type: '404',
        referrer: document.referrer || null
      })
      .catch(() => {
        /* best-effort; never block the page */
      });
  });
</script>

<section class="bg-canvas">
  <div class="container-shell flex min-h-[62vh] flex-col items-center justify-center py-20 text-center">
    <p class="font-serif text-6xl font-bold text-goldfinch-gold md:text-8xl">{status}</p>

    <h1 class="mt-4 text-2xl font-semibold text-heading md:text-3xl">
      {#if isNotFound}This trail doesn't exist{:else}Something went wrong{/if}
    </h1>

    <p class="mt-3 max-w-md text-[15px] leading-7 text-ink/70">
      {#if isNotFound}
        The page you're looking for may have moved or the link is out of date. Let's get you back on track.
      {:else}
        {message}
      {/if}
    </p>

    <div class="mt-9 flex flex-wrap items-center justify-center gap-3">
      {#each links as link}
        <a
          class="inline-flex items-center gap-2 rounded-full border border-ink/12 bg-surface px-5 py-2.5 text-sm font-bold text-heading shadow-sm transition hover:border-forest/30 hover:text-forest"
          href={link.href}
        >
          <svelte:component this={link.icon} size={16} />{link.label}
        </a>
      {/each}
    </div>

    <a
      class="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-goldfinch-gold px-7 text-sm font-bold text-heading shadow-sm transition hover:brightness-105"
      href="/plan-my-trip"
    >
      Plan my trip <ArrowRight size={16} />
    </a>
  </div>
</section>
