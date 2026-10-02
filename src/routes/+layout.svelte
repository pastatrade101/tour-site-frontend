<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { afterNavigate, goto } from '$app/navigation';
  import { env as publicEnv } from '$env/dynamic/public';
  import { onMount } from 'svelte';
  import '../app.css';
  import Navbar from '$lib/components/public/Navbar.svelte';
  import Footer from '$lib/components/public/Footer.svelte';
  import ConsentBanner from '$lib/components/public/ConsentBanner.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import BackToTop from '$lib/components/public/BackToTop.svelte';
  import NavigationProgress from '$lib/components/public/NavigationProgress.svelte';
  import ShortlistFab from '$lib/components/public/ShortlistFab.svelte';
  import { consent } from '$lib/consent';
  import { setupPwaInstall } from '$lib/pwa';
  import { initSmoothScrolling, setupGsap } from '$lib/animations';
  import { api } from '$lib/api/client';
  import { trackSession, trackPageView } from '$lib/analytics';
  import { loadClarity } from '$lib/clarity';
  import { applyBranding, branding } from '$lib/branding';
  import { SITE_URL } from '$lib/config/env';
  import { defaultPageLocales, disallowsIndexing, isPrivateOrUtilityPath, siteOrigin as resolveSiteOrigin } from '$lib/seoPolicy';
  import { KNOWN_LOCALES, stripLocale } from '$lib/i18n';
  import { loadPublicSettings } from '$lib/settings';
  import { initCurrency } from '$lib/currency';
  import { cdnUrl } from '$lib/img';
  import LanguageSwitcher from '$lib/components/public/LanguageSwitcher.svelte';
  import { DEFAULT_LOCALE, localeFromPath, localizeHref, rememberedLocale } from '$lib/i18n';
  import { locale as localeStore } from '$lib/i18n/ui';
  import type { LayoutData } from './$types';

  export let data: LayoutData;

  $: isAdmin = stripLocale($page.url.pathname).startsWith('/admin');

  // ── Locale ──────────────────────────────────────────────────────────────────
  // One assignment drives every static UI string on the page.
  $: activeLocale = data.locale ?? DEFAULT_LOCALE;
  $: localeStore.set(activeLocale);
  // The server stamps <html lang> for the address it rendered. A client-side
  // move between locales — the remembered-language redirect below — does not go
  // back through it, so the attribute is kept in step here. A document that
  // says it is English while showing German is what a screen reader reads out.
  $: if (typeof document !== 'undefined') document.documentElement.lang = activeLocale;
  $: languages = data.languages ?? [];
  // Entity pages publish the locales they actually exist in; everything else
  // (static pages, listings) is available in every enabled language because its
  // chrome is dictionary-translated and its content falls back per field.
  $: pageLocales = ($page.data as { availableLocales?: string[] })?.availableLocales ?? defaultPageLocales($page.url.pathname);
  /**
   * Keep the locale while browsing.
   *
   * Links across the site are written unprefixed (/tours), which is correct
   * for the default language and correct in the markup a crawler reads. In a
   * non-default locale a plain /tours click would silently drop the visitor
   * back to English, so same-origin navigations are rewritten here — one
   * handler instead of localising every href in the codebase, which is also
   * what keeps hreflang and the canonical tags as the single source of truth
   * for search engines.
   */
  const keepLocale = (event: MouseEvent) => {
    if (activeLocale === DEFAULT_LOCALE || isAdmin) return;
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const anchor = (event.target as HTMLElement | null)?.closest?.('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith('/') || href.startsWith('//')) return;
    // Leave downloads, new tabs, API routes and already-localised links alone.
    if (anchor.target && anchor.target !== '_self') return;
    if (anchor.hasAttribute('download') || href.startsWith('/api')) return;
    // The language switcher's own links are the one place an unprefixed href is
    // a deliberate request for the default language. Rewriting those sent every
    // "English" click straight back to the language it was leaving, which made
    // it impossible to switch back at all.
    if (anchor.hasAttribute('data-locale-switch')) return;
    if (localeFromPath(href) !== DEFAULT_LOCALE) return;

    event.preventDefault();
    void goto(localizeHref(href, activeLocale));
  };

  $: alternateLocales = languages
    .filter((language) => language.enabled && (KNOWN_LOCALES as readonly string[]).includes(language.code))
    .filter((language) => !pageLocales || pageLocales.includes(language.code))
    .map((language) => language.code);

  // Site origin from PUBLIC_SITE_URL (.env), falling back to the live request origin.
  $: siteOrigin = resolveSiteOrigin(SITE_URL, $page.url.origin);
  // A locale URL is only canonical when that language actually has published
  // content. /de/… on an untranslated page serves English text at a German
  // address — pointing its canonical at the default-language URL is what stops
  // it competing with the original as duplicate content.
  $: localeIsPublished = (activeLocale === DEFAULT_LOCALE || alternateLocales.includes(activeLocale)) && (!pageLocales || pageLocales.includes(activeLocale));
  $: canonicalUrl = `${siteOrigin}${localizeHref($page.url.pathname, localeIsPublished ? activeLocale : DEFAULT_LOCALE)}`;
  $: orgUrl = `${siteOrigin}/`;
  $: mediaCdnOrigin = (publicEnv.PUBLIC_MEDIA_CDN_URL || '').trim().replace(/\/+$/, '');

  // Resolve SEO before rendering so crawlers receive the same indexing rules
  // and canonical target used by the sitemap.
  $: seoOverride = data.seoOverride ?? null;

  // Effective head values: override ?? current default (defaults are byte-identical to before).
  // A page can publish its own SEO through load data — that is how entity
  // pages get a server-rendered title and description instead of emitting a
  // second <head> block of their own, which would leave two titles and two
  // canonicals in the document. Admin overrides still win over everything.
  $: pageSeo = ($page.data as { seo?: { title?: string; description?: string } })?.seo ?? null;
  $: seoTitle = seoOverride?.title || pageSeo?.title || $branding.site_name;
  $: seoDescription = seoOverride?.meta_description || pageSeo?.description || `${$branding.tagline}. ${$branding.positioning}`;
  $: seoOgTitle = seoOverride?.og_title || seoOverride?.title || pageSeo?.title || $branding.site_name;
  $: seoOgDescription = seoOverride?.og_description || seoOverride?.meta_description || pageSeo?.description || $branding.positioning;
  $: seoCanonical = seoOverride?.canonical_url || canonicalUrl;
  $: seoOgImage = cdnUrl(seoOverride?.og_image_url || '');
  $: indexingData = $page.data as { package?: { indexable?: boolean }; lodge?: { indexable?: boolean } };
  $: contentNoindex = (indexingData.package && indexingData.package.indexable !== true) || indexingData.lodge?.indexable === false;
  $: seoRobots = contentNoindex || isPrivateOrUtilityPath($page.url.pathname) ? 'noindex, nofollow' : seoOverride?.robots || '';
  $: seoStructured = seoOverride?.structured_data && !Array.isArray(seoOverride.structured_data) ? seoOverride.structured_data : null;

  let smoothScrollCleanup: (() => void) | undefined;

  const runWhenIdle = (fn: () => void) => {
    if (!browser) return;
    const idle = (window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number })
      .requestIdleCallback;
    if (idle) idle(() => fn(), { timeout: 1800 });
    else window.setTimeout(fn, 500);
  };

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

  // Google Tag Manager — the official container snippet, behind the same gates as
  // GA4 and Clarity: consent granted, production host, public site, and a configured
  // PUBLIC_GTM_ID. It shares the `dataLayer` gtag already uses. If the container also
  // fires a GA4 page-view tag, page views will count twice alongside loadGa4 — pick one.
  const loadGtm = () => {
    const id = publicEnv.PUBLIC_GTM_ID;
    if (!browser || !id || isAdmin || !isProdHost() || document.getElementById('gtm-src')) return;
    const w = window as unknown as { dataLayer: unknown[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    const script = document.createElement('script');
    script.id = 'gtm-src';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
    const first = document.getElementsByTagName('script')[0];
    (first?.parentNode ?? document.head).insertBefore(script, first ?? null);
  };

  // Load analytics (GA4 + Clarity + GTM) only once the visitor has explicitly granted consent.
  $: if (browser && $consent === 'granted') { loadGa4(); loadClarityIfReady(); loadGtm(); }

  // One page_view per navigation (initial + every client-side route change). Deduped
  // + query-stripped inside trackPageView. Public site only.
  afterNavigate(() => {
    if (!isAdmin) trackPageView();
  });

  /**
   * Arrive in the language you last chose.
   *
   * The prefix in the address already carries the locale through refreshes,
   * shared links and browsing. What it cannot carry is an arrival with no
   * prefix at all — the bare domain, an old bookmark, a link from elsewhere —
   * so the remembered choice is applied once, on load.
   *
   * An address that names its own locale always wins, and this never runs for
   * the default language, so nobody who switched back to English is dragged
   * away from it.
   */
  const applyRememberedLocale = () => {
    if (isAdmin) return;
    const stored = rememberedLocale();
    if (!stored || stored === DEFAULT_LOCALE || stored === activeLocale) return;
    if (localeFromPath($page.url.pathname) !== DEFAULT_LOCALE) return;
    // Entity pages publish the locales they exist in; do not send anyone to one
    // this page has no translation for.
    if (pageLocales && !pageLocales.includes(stored)) return;

    const target = localizeHref($page.url.pathname, stored) + $page.url.search;
    if (target !== $page.url.pathname + $page.url.search) void goto(target, { replaceState: true });
  };

  onMount(() => {
    runWhenIdle(() => void setupGsap());
    void loadBranding();
    void loadPublicSettings();
    void initCurrency();
    setupPwaInstall();
    applyRememberedLocale();
    if (!isAdmin) trackSession(); // fire-and-forget attribution beacon (public only)
    return () => {
      smoothScrollCleanup?.();
    };
  });
</script>

<svelte:body on:click={keepLocale} />

<svelte:head>
  <title>{seoTitle}</title>
  <meta name="description" content={seoDescription} />
  <meta property="og:title" content={seoOgTitle} />
  <meta property="og:description" content={seoOgDescription} />
  <meta property="og:type" content="website" />
  {#if seoOgImage}<meta property="og:image" content={seoOgImage} />{/if}
  <link rel="canonical" href={seoCanonical} />
  {#if seoRobots}<meta name="robots" content={seoRobots} />{/if}
  <!-- hreflang for every locale this page genuinely exists in, plus x-default
       pointing at the unprefixed default-language address. Locales without a
       published translation are excluded, so search engines are never sent to
       a page that would simply fall back to English. -->
  {#if !isPrivateOrUtilityPath($page.url.pathname) && !disallowsIndexing(seoRobots) && seoCanonical === canonicalUrl && alternateLocales.length > 1}
    {#each alternateLocales as code (code)}
      <link rel="alternate" hreflang={code} href={`${siteOrigin}${localizeHref($page.url.pathname, code)}`} />
    {/each}
    <link rel="alternate" hreflang="x-default" href={`${siteOrigin}${localizeHref($page.url.pathname, DEFAULT_LOCALE)}`} />
  {/if}
  {#if mediaCdnOrigin}
    <link rel="preconnect" href={mediaCdnOrigin} crossorigin="anonymous" />
    <link rel="dns-prefetch" href={mediaCdnOrigin} />
  {/if}
</svelte:head>

<!-- Org-wide schema (JsonLd injects via {@html}; a {mustache} inside <script> is
     not interpolated by Svelte, which is what broke the old inline block). -->
<JsonLd data={{ '@type': 'TravelAgency', name: $branding.company_name, url: orgUrl, slogan: $branding.tagline }} />
<!-- Per-page structured data override (Tier 2), only when an admin has set one. -->
{#if seoStructured}
  <JsonLd data={seoStructured} />
{/if}

{#if !isAdmin}
  <NavigationProgress />
  <Navbar />
{/if}

<slot />

{#if !isAdmin}
  <Footer />
  <ShortlistFab />
  <BackToTop />
  <ConsentBanner />
{/if}
