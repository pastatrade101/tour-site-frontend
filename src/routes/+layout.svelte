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
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import PersistentCTA from '$lib/components/public/PersistentCTA.svelte';
  import ShortlistFab from '$lib/components/public/ShortlistFab.svelte';
  import { consent } from '$lib/consent';
  import { setupPwaInstall } from '$lib/pwa';
  import { initSmoothScrolling, setupGsap } from '$lib/animations';
  import { api } from '$lib/api/client';
  import { trackSession } from '$lib/analytics';
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

  // ── Per-page SEO overrides (Tier 2) ─────────────────────────────────────────
  // Fetched client-side per path. When there is NO override row, every computed
  // value below equals the exact site default, so the <head> is unchanged. Admin
  // pages are skipped. Public pages that don't have a row are byte-for-byte the
  // same as before this feature existed.
  type SeoOverride = {
    title?: string | null;
    meta_description?: string | null;
    og_title?: string | null;
    og_description?: string | null;
    og_image_url?: string | null;
    canonical_url?: string | null;
    robots?: string | null;
    structured_data?: Record<string, unknown> | unknown[] | null;
  };
  let seoOverride: SeoOverride | null = null;
  let lastSeoPath = '';

  const loadSeoOverride = async (path: string) => {
    try {
      const res = await api.pageSeo.resolve(path);
      if (path !== lastSeoPath) return; // a newer navigation won — ignore stale result
      seoOverride = res.data.match && res.data.seo ? (res.data.seo as SeoOverride) : null;
    } catch {
      if (path === lastSeoPath) seoOverride = null; // resolver unavailable → keep defaults
    }
  };

  $: if (browser) {
    if (isAdmin) {
      seoOverride = null;
      lastSeoPath = $page.url.pathname;
    } else if ($page.url.pathname !== lastSeoPath) {
      lastSeoPath = $page.url.pathname;
      seoOverride = null; // fall back to defaults while resolving
      void loadSeoOverride($page.url.pathname);
    }
  }

  // Effective head values: override ?? current default (defaults are byte-identical to before).
  $: seoTitle = seoOverride?.title || $branding.site_name;
  $: seoDescription = seoOverride?.meta_description || `${$branding.tagline}. ${$branding.positioning}`;
  $: seoOgTitle = seoOverride?.og_title || seoOverride?.title || $branding.site_name;
  $: seoOgDescription = seoOverride?.og_description || seoOverride?.meta_description || $branding.positioning;
  $: seoCanonical = seoOverride?.canonical_url || canonicalUrl;
  $: seoOgImage = seoOverride?.og_image_url || '';
  $: seoRobots = seoOverride?.robots || '';
  $: seoStructured = seoOverride?.structured_data && !Array.isArray(seoOverride.structured_data) ? seoOverride.structured_data : null;

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
    setupPwaInstall();
    if (!isAdmin) trackSession(); // fire-and-forget attribution beacon (public only)
    return () => {
      smoothScrollCleanup?.();
    };
  });
</script>

<svelte:head>
  <title>{seoTitle}</title>
  <meta name="description" content={seoDescription} />
  <meta property="og:title" content={seoOgTitle} />
  <meta property="og:description" content={seoOgDescription} />
  <meta property="og:type" content="website" />
  {#if seoOgImage}<meta property="og:image" content={seoOgImage} />{/if}
  <link rel="canonical" href={seoCanonical} />
  {#if seoRobots}<meta name="robots" content={seoRobots} />{/if}
</svelte:head>

<!-- Org-wide schema (JsonLd injects via {@html}; a {mustache} inside <script> is
     not interpolated by Svelte, which is what broke the old inline block). -->
<JsonLd data={{ '@type': 'TravelAgency', name: $branding.company_name, url: orgUrl, slogan: $branding.tagline }} />
<!-- Per-page structured data override (Tier 2), only when an admin has set one. -->
{#if seoStructured}
  <JsonLd data={seoStructured} />
{/if}

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
