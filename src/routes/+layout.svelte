<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { env as publicEnv } from '$env/dynamic/public';
  import { onMount } from 'svelte';
  import '../app.css';
  import Navbar from '$lib/components/public/Navbar.svelte';
  import Footer from '$lib/components/public/Footer.svelte';
  import GoldfinchAIAdvisor from '$lib/components/public/GoldfinchAIAdvisor.svelte';
  import ConsentBanner from '$lib/components/public/ConsentBanner.svelte';
  import PersistentCTA from '$lib/components/public/PersistentCTA.svelte';
  import ShortlistFab from '$lib/components/public/ShortlistFab.svelte';
  import { consent } from '$lib/consent';
  import { initSmoothScrolling, setupGsap } from '$lib/animations';
  import { api } from '$lib/api/client';
  import { applyBranding, branding } from '$lib/branding';
  import { SITE_URL } from '$lib/config/env';
  import { aiAdvisorEnabled, loadPublicSettings, publicSettings } from '$lib/settings';

  $: isAdmin = $page.url.pathname.startsWith('/admin');
  // Admins can hide the whole AI advisor from Settings → AI.
  $: showAdvisor = aiAdvisorEnabled($publicSettings);

  // Site origin from PUBLIC_SITE_URL (.env), falling back to the live request origin.
  $: siteOrigin = SITE_URL || $page.url.origin;
  $: canonicalUrl = `${siteOrigin}${$page.url.pathname}`;
  $: orgUrl = `${siteOrigin}/`;

  let smoothScrollCleanup: (() => void) | undefined;

  $: if (browser) {
    if (isAdmin && smoothScrollCleanup) {
      smoothScrollCleanup();
      smoothScrollCleanup = undefined;
    }

    if (!isAdmin && !smoothScrollCleanup) {
      smoothScrollCleanup = initSmoothScrolling();
    }
  }

  const loadBranding = async () => {
    try {
      const response = await api.branding.get();
      applyBranding(response.data as Record<string, unknown>);
    } catch {
      // Defaults already live in app.css :root — nothing to do on failure.
    }
  };

  // Load GA4 (gtag) on the public site — gated by consent ('granted') above and a
  // configured PUBLIC_GA4_MEASUREMENT_ID. This activates trackEvent's GA4 path.
  const loadGa4 = () => {
    const id = publicEnv.PUBLIC_GA4_MEASUREMENT_ID;
    if (!browser || !id || isAdmin || document.getElementById('ga4-src')) return;
    const script = document.createElement('script');
    script.id = 'ga4-src';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(script);
    const w = window as unknown as { dataLayer: unknown[]; gtag: (...args: unknown[]) => void };
    w.dataLayer = w.dataLayer || [];
    w.gtag = function gtag() { w.dataLayer.push(arguments); };
    w.gtag('js', new Date());
    w.gtag('config', id, { anonymize_ip: true });
  };

  // Load GA4 only once the visitor has explicitly granted consent.
  $: if (browser && $consent === 'granted') loadGa4();

  onMount(() => {
    void setupGsap();
    void loadBranding();
    void loadPublicSettings();
    return () => {
      smoothScrollCleanup?.();
    };
  });
</script>

<svelte:head>
  <title>{$branding.site_name}</title>
  <meta name="description" content={`${$branding.tagline}. ${$branding.positioning}`} />
  <meta property="og:title" content={$branding.site_name} />
  <meta property="og:description" content={$branding.positioning} />
  <meta property="og:type" content="website" />
  <link rel="canonical" href={canonicalUrl} />
  <script type="application/ld+json">
    {JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      name: $branding.company_name,
      url: orgUrl,
      slogan: $branding.tagline
    })}
  </script>
</svelte:head>

{#if !isAdmin}
  <Navbar />
{/if}

<slot />

{#if !isAdmin}
  <Footer />
  <!-- clearance so the fixed mobile CTA bar never covers footer content -->
  <div class="h-16 lg:hidden" aria-hidden="true"></div>
  <ShortlistFab />
  <PersistentCTA />
  {#if showAdvisor}
    <GoldfinchAIAdvisor />
  {/if}
  <ConsentBanner />
{/if}
