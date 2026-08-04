<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { afterNavigate } from '$app/navigation';
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
  import { trackSession, trackPageView } from '$lib/analytics';
  import { loadClarity } from '$lib/clarity';
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

  // Local dev / preview hosts must never pollute the production GA4 / Clarity data.
  const isProdHost = () =>
    browser && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname) && !window.location.hostname.endsWith('.local');

  // Load GA4 (gtag) on the public site — gated by consent ('granted') above and a
  // configured PUBLIC_GA4_MEASUREMENT_ID. send_page_view is off so the SPA page-view
  // tracker (afterNavigate → trackPageView) is the single source of truth; we send
  // the current page once here to catch the entry page.
  const loadGa4 = () => {
    const id = publicEnv.PUBLIC_GA4_MEASUREMENT_ID;
    if (!browser || !id || isAdmin || !isProdHost() || document.getElementById('ga4-src')) return;
    const script = document.createElement('script');
    script.id = 'ga4-src';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(script);
    const w = window as unknown as { dataLayer: unknown[]; gtag: (...args: unknown[]) => void };
    w.dataLayer = w.dataLayer || [];
    w.gtag = function gtag() { w.dataLayer.push(arguments); };
    w.gtag('js', new Date());
    w.gtag('config', id, { anonymize_ip: true, send_page_view: false });
    trackPageView();
  };

  // Microsoft Clarity — UX companion to GA4 (session recordings, heatmaps, rage/dead
  // clicks). Same gates as GA4: consent granted, production host, public site, and a
  // configured PUBLIC_CLARITY_PROJECT_ID. Clarity handles SPA route changes itself.
  const loadClarityIfReady = () => {
    const id = publicEnv.PUBLIC_CLARITY_PROJECT_ID;
    if (!browser || !id || isAdmin || !isProdHost()) return;
    loadClarity(id);
  };

  // Load analytics (GA4 + Clarity) only once the visitor has explicitly granted consent.
  $: if (browser && $consent === 'granted') { loadGa4(); loadClarityIfReady(); }

  // One page_view per navigation (initial + every client-side route change). Deduped
  // + query-stripped inside trackPageView. Public site only.
  afterNavigate(() => {
    if (!isAdmin) trackPageView();
  });

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
