<script lang="ts">
  import { onMount } from 'svelte';
  import { afterNavigate, goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { ArrowDownToLine, ArrowRight, ChevronDown, ChevronRight, CircleHelp, Compass, Globe, MapPin, Menu, MessageCircle, Search, TicketsPlane, User, X } from '@lucide/svelte';
  import { fade, fly } from 'svelte/transition';
  import { api } from '$lib/api/client';
  import { trackEvent } from '$lib/analytics';
  import { navbarEntrance } from '$lib/animations';
  import { brand } from '$lib/brand';
  import { imgUrl } from '$lib/img';
  import { publicSettings, settingText } from '$lib/settings';
  import { canInstall, promptInstall } from '$lib/pwa';
  import CurrencySelector from './CurrencySelector.svelte';

  type NavLink = { href: string; label: string; image?: string; description?: string };
  type DropdownKey = 'destinations' | 'tours' | 'safariStyles';
  type NavItem = { dropdown?: DropdownKey; href: string; label: string };

  // Featured image panel + copy for each mega menu.
  const FEATURE: Record<DropdownKey, { eyebrow: string; title: string; blurb: string; cta: string; href: string }> = {
    destinations: {
      eyebrow: 'Where to go',
      title: 'Explore East Africa',
      blurb: 'From savannahs to seascapes, mountains to markets — your adventure starts here.',
      cta: 'Explore all destinations',
      href: '/destinations'
    },
    tours: {
      eyebrow: 'Featured trips',
      title: 'Find your safari',
      blurb: 'Compare published itineraries, signature routes, and guest-ready tour ideas from the Goldfinch collection.',
      cta: 'Explore all tours',
      href: '/tours'
    },
    safariStyles: {
      eyebrow: 'How to travel',
      title: 'Choose your safari style',
      blurb: 'Browse the live Goldfinch trip categories and start from the travel style that fits you.',
      cta: 'Explore safari styles',
      href: '/safari-styles'
    }
  };

  // Left-panel header (icon + title + subtitle) and the "view all" pill label.
  const MENU_META: Record<DropdownKey, { icon: typeof Globe; title: string; subtitle: string; viewAll: string }> = {
    destinations: { icon: Globe, title: 'All Destinations', subtitle: 'Discover the best of East Africa', viewAll: 'View all destinations' },
    tours: { icon: TicketsPlane, title: 'Tour Packages', subtitle: 'Published safari itineraries', viewAll: 'View all tours' },
    safariStyles: { icon: Compass, title: 'Safari Styles', subtitle: 'Browse by travel category', viewAll: 'View all styles' }
  };
  const featureImage = (key: DropdownKey) => dropdownLinks(key).find((l) => l.image)?.image || '';

  const NAV: NavItem[] = [
    { href: '/', label: 'Home' },
    { href: '/destinations', label: 'Destinations', dropdown: 'destinations' },
    { href: '/tours', label: 'Tours', dropdown: 'tours' },
    { href: '/safari-styles', label: 'Safari Styles', dropdown: 'safariStyles' },
    { href: '/experiences', label: 'Experiences' },
    { href: '/expert-advice', label: 'Expert Advice' },
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Contact' }
  ];

  // Real CMS content only — no fabricated fallbacks. When a list is empty the
  // nav item renders as a plain link (its mega-menu dropdown is not shown).
  let destinations: NavLink[] = [];
  let tours: NavLink[] = [];
  let categories: NavLink[] = [];

  let menuOpen = false;
  let openDropdown: '' | DropdownKey = '';
  let mobileAccordion: '' | DropdownKey = '';
  let searchQuery = '';
  let scrolled = false;

  // The mega-menu is `fixed` (to escape the collapsing header's overflow), so we
  // position it under the hovered nav item by measuring that item's rect, and
  // clamp it so a wide menu never spills off the right edge.
  const MEGA_W = 1000;
  let ddLeft = 16;
  let ddTop = 120;
  const openDropdownAt = (key: DropdownKey | undefined, el: EventTarget | null) => {
    openDropdown = key ?? '';
    if (el instanceof HTMLElement && typeof window !== 'undefined') {
      const rect = el.getBoundingClientRect();
      const w = Math.min(MEGA_W, window.innerWidth - 32);
      ddLeft = Math.max(16, Math.min(rect.left, window.innerWidth - w - 16));
      ddTop = rect.bottom;
    }
  };

  const submitSearch = () => {
    const query = searchQuery.trim();
    void goto(query ? `/tours?search=${encodeURIComponent(query)}` : '/tours');
    menuOpen = false;
    openDropdown = '';
  };

  // Render the mobile drawer on <body>. The header carries a leftover GSAP
  // transform (navbarEntrance), and a transformed ancestor re-anchors
  // position:fixed — so inside the header the drawer's "full-screen" backdrop
  // only covered the header's box, letting taps fall through to the page.
  const portal = (node: HTMLElement) => {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  };

  // Lock page scroll while the drawer is open so the page can't scroll or
  // react underneath it.
  $: if (typeof document !== 'undefined') {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  }

  // ── active route ──────────────────────────────────────────────────────────
  $: path = $page.url.pathname;
  const isActive = (currentPath: string, href: string) => {
    if (href === '/') return currentPath === '/';
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  // Close menus whenever the route changes.
  let lastPath = '';
  $: if (path !== lastPath) {
    lastPath = path;
    menuOpen = false;
    openDropdown = '';
    mobileAccordion = '';
  }

  // ── WhatsApp CTA (from public settings, with safe fallback) ─────────────────
  $: s = $publicSettings;
  $: waNumber = settingText(s, 'whatsapp_number') || '+255 700 000 000';
  $: waMessage = settingText(s, 'whatsapp_default_message') || 'Hello Goldfinch Adventures, I would like help planning an East Africa trip.';
  $: waDigits = waNumber.replace(/[^0-9]/g, '');
  $: waHref = `https://wa.me/${waDigits}?text=${encodeURIComponent(waMessage)}`;
  $: waButtonText = settingText(s, 'whatsapp_button_text') || brand.whatsappCta;
  $: supportEmail = settingText(s, 'contact_email') || 'hello@goldfinch.local';
  $: supportPhone = settingText(s, 'contact_phone') || waNumber;

  const dropdownLinks = (key: DropdownKey) => (key === 'destinations' ? destinations : key === 'tours' ? tours : categories);

  const toggleDropdown = (key: DropdownKey) => {
    openDropdown = openDropdown === key ? '' : key;
  };

  // Always close the mobile drawer (and any open dropdowns) after a navigation,
  // so tapping any link reliably closes it.
  afterNavigate(() => {
    menuOpen = false;
    mobileAccordion = '';
    openDropdown = '';
  });

  onMount(() => {
    const loadNav = async () => {
      try {
        const res = await api.destinations.list({ status: 'published', limit: 9 });
        const items = res.data.items ?? [];
        if (items.length) destinations = items.map((d) => ({ label: String(d.name ?? d.slug), href: `/destinations/${d.slug}`, image: d.main_image_url || d.image_url || d.banner_image_url || undefined, description: (d.short_description as string) || (d.description as string) || undefined }));
      } catch {
        // keep fallback
      }
      try {
        const res = await api.tours.list({ status: 'published', limit: 9 });
        const items = res.data.items ?? [];
        if (items.length) tours = items.map((t) => ({ label: String(t.title ?? t.slug), href: `/tours/${t.slug}`, image: t.main_image_url || t.banner_image_url || undefined, description: t.short_description || t.full_description || undefined }));
      } catch {
        // keep fallback
      }
      try {
        const res = await api.categories.list({ status: 'published', limit: 9 });
        const items = res.data.items ?? [];
        if (items.length) categories = items.map((c) => ({ label: String(c.name ?? c.slug), href: `/safari-styles/${c.slug}`, image: c.image_url || c.icon_url || undefined, description: c.description || c.who_its_for || undefined }));
      } catch {
        // keep fallback
      }
    };
    void loadNav();

    const onClick = (event: MouseEvent) => {
      if (!(event.target as HTMLElement)?.closest?.('.nav-dropdown')) openDropdown = '';
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        openDropdown = '';
        menuOpen = false;
      }
    };
    // Hysteresis: collapse the top row only once we're well past the header,
    // and only re-expand when scrolled back near the top. The wide dead zone
    // (40–120px) stops the sticky header shrinking from nudging scrollY back
    // across a single threshold, which caused the infinite on/off "vibration".
    const onScroll = () => {
      const y = window.scrollY;
      if (!scrolled && y > 120) scrolled = true;
      else if (scrolled && y < 40) scrolled = false;
    };
    onScroll();
    window.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
    };
  });
</script>

<header class={`sticky top-0 z-40 border-b bg-surface transition-[box-shadow,border-color] duration-[400ms] ease-out ${scrolled ? 'border-transparent shadow-[0_8px_28px_rgba(57,61,50,0.10)]' : 'border-ink/10'}`} use:navbarEntrance>
  <!-- ── mobile top bar ─────────────────────────────────────────────────── -->
  <div class="grid h-[70px] grid-cols-[44px_minmax(0,1fr)_112px] items-center gap-3 px-4 sm:px-5 lg:hidden">
    <button class="grid h-11 w-11 place-items-center rounded-xl border border-ink/15 bg-surface text-ink" type="button" aria-label="Toggle menu" aria-expanded={menuOpen} on:click={() => (menuOpen = !menuOpen)}>
      <Menu size={24} strokeWidth={2.4} />
    </button>

    <a href="/" class="flex min-w-0 items-center justify-center gap-2" aria-label="Goldfinch Adventures home">
      <img src="/favicon1.png" alt="Goldfinch Adventures" class="h-10 w-10 shrink-0 object-contain" />
      <div class="min-w-0 leading-none">
        <p class="truncate text-xl font-extrabold tracking-normal text-heading">Goldfinch</p>
        <p class="mt-1 truncate text-xs font-semibold text-ink/70">Adventures</p>
      </div>
    </a>

    <div class="justify-self-end">
      <CurrencySelector compact />
    </div>
  </div>

  <!-- ── desktop top row (collapses smoothly on scroll) ──────────────────── -->
  <div class={`hidden overflow-hidden transition-[max-height,opacity] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:block ${scrolled ? 'max-h-0 opacity-0' : 'max-h-[96px] opacity-100'}`}>
    <div class="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-7 px-4 lg:h-[80px]">
      <a href="/" class="flex min-w-[150px] items-center gap-2.5" aria-label="Goldfinch Adventures home">
        <img src="/favicon1.png" alt="Goldfinch Adventures" class="h-12 w-12 shrink-0 object-contain" />
        <div class="leading-none">
          <p class="text-2xl font-extrabold tracking-normal text-heading">Goldfinch</p>
          <p class="mt-1.5 text-sm font-semibold text-ink/70">Adventures</p>
        </div>
      </a>

      <form class="flex h-[50px] w-full max-w-[640px] items-center rounded-full bg-[#f0f0f0] px-3 transition focus-within:ring-2 focus-within:ring-goldfinch-gold/30" on:submit|preventDefault={submitSearch} role="search">
        <button class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink transition hover:text-forest" type="submit" aria-label="Search tours">
          <Search size={19} strokeWidth={2.4} />
        </button>
        <input class="min-w-0 flex-1 bg-transparent px-2 text-sm font-medium text-[#222222] outline-none placeholder:text-[#a9a9a9]" aria-label="Search tour packages" placeholder="Search safaris, Kilimanjaro, Zanzibar..." bind:value={searchQuery} />
      </form>

      <div class="flex items-center gap-4 text-[13px] font-semibold">
        <CurrencySelector compact />
        <a class="inline-flex items-center gap-1 text-forest transition hover:text-heading" href="/contact">
          <CircleHelp size={15} strokeWidth={2.6} />
          Need help?
        </a>
        {#if $canInstall}
          <button type="button" class="inline-flex items-center gap-1.5 rounded-full bg-forest px-3 py-1.5 text-white transition hover:bg-deep-green" on:click={() => promptInstall()}>
            <ArrowDownToLine size={14} strokeWidth={2.6} /> Install app
          </button>
        {/if}
      </div>

      <a href="/admin/login" class="inline-flex h-12 items-center gap-2.5 rounded-xl bg-deep-green px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-forest">
        <User size={16} strokeWidth={2.6} />
        Login
      </a>
    </div>
  </div>

  <!-- ── desktop nav row ────────────────────────────────────────────────── -->
  <div class="hidden border-t border-ink/10 lg:block">
    <div class="mx-auto flex w-full max-w-[1500px] items-stretch justify-between px-4">
      <nav class="flex items-center gap-1" aria-label="Primary">
        {#if scrolled}
          <a href="/" class="mr-1 flex shrink-0 items-center gap-2" aria-label="Goldfinch Adventures home" transition:fly={{ x: -14, duration: 320 }}>
            <img src="/favicon1.png" alt="Goldfinch Adventures" class="h-9 w-9 shrink-0 object-contain" />
            <span class="text-lg font-extrabold tracking-normal text-heading">Goldfinch</span>
          </a>
          <form class="mr-2 hidden h-9 items-center rounded-full bg-[#f1f1f1] pl-1 pr-2 transition focus-within:ring-2 focus-within:ring-goldfinch-gold/30 xl:flex" on:submit|preventDefault={submitSearch} role="search" transition:fly={{ x: -14, duration: 320 }}>
            <button class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#111]" type="submit" aria-label="Search tours"><Search size={15} strokeWidth={2.6} /></button>
            <input class="w-32 min-w-0 bg-transparent text-xs font-medium outline-none placeholder:text-[#a9a9a9]" aria-label="Search tour packages" placeholder="Search tours..." bind:value={searchQuery} />
          </form>
        {/if}
        {#each NAV as item}
          {@const active = isActive(path, item.href)}
          {@const links = item.dropdown === 'destinations' ? destinations : item.dropdown === 'tours' ? tours : item.dropdown === 'safariStyles' ? categories : []}
          {#if item.dropdown && links.length}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="nav-dropdown relative" on:mouseenter={(e) => openDropdownAt(item.dropdown, e.currentTarget)} on:mouseleave={() => (openDropdown = '')}>
              <div class="flex items-center">
                <a
                  class={`relative inline-flex items-center gap-1 rounded px-3 py-[22px] text-[15px] font-semibold transition hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/40 ${active ? 'text-forest dark:text-goldfinch-gold' : 'text-ink/80'}`}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                  {#if active}<span class="absolute inset-x-2.5 bottom-1 h-0.5 rounded-full bg-goldfinch-gold"></span>{/if}
                </a>
                <button
                  class="grid h-8 w-7 place-items-center rounded text-ink/70 transition hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/40"
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={openDropdown === item.dropdown}
                  aria-controls={`dd-${item.dropdown}`}
                  aria-label={`${item.label} menu`}
                  on:click|stopPropagation={() => item.dropdown && toggleDropdown(item.dropdown)}
                >
                  <ChevronDown size={15} strokeWidth={2.6} class={`transition-transform ${openDropdown === item.dropdown ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {#if openDropdown === item.dropdown}
                {@const feat = FEATURE[item.dropdown]}
                {@const meta = MENU_META[item.dropdown]}
                {@const featureImg = featureImage(item.dropdown)}
                {@const previewLinks = links.slice(0, 6)}
                <div
                  id={`dd-${item.dropdown}`}
                  class="fixed z-50 grid w-[min(1000px,calc(100vw-2rem))] grid-cols-[minmax(0,1fr)_340px] overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-[0_26px_76px_rgba(57,61,50,0.22)]"
                  style={`left:${ddLeft}px;top:${ddTop}px`}
                  role="menu"
                  transition:fly={{ y: 6, duration: 140 }}
                >
                  <!-- left: header + thumbnail card grid + view-all action -->
                  <div class="min-w-0 p-5">
                    <div class="flex items-center justify-between gap-4 border-b border-ink/[0.08] pb-4">
                      <div class="flex items-center gap-3">
                        <span class="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] bg-goldfinch-gold/12 text-goldfinch-gold ring-1 ring-goldfinch-gold/25">
                          <svelte:component this={meta.icon} size={21} strokeWidth={2.2} />
                        </span>
                        <div class="min-w-0">
                          <p class="text-[13px] font-extrabold uppercase tracking-[0.12em] text-goldfinch-gold">{meta.title}</p>
                          <p class="mt-1 text-sm font-medium text-ink/60">{meta.subtitle}</p>
                        </div>
                      </div>
                      <a href={item.href} class="inline-flex h-10 shrink-0 items-center gap-2 rounded-[8px] border border-goldfinch-gold/35 px-4 text-sm font-bold text-clay transition hover:bg-goldfinch-gold hover:text-heading" role="menuitem" aria-label={meta.viewAll}>
                        {meta.viewAll}
                        <ArrowRight size={15} strokeWidth={2.5} />
                      </a>
                    </div>

                    <div class="mt-4 grid grid-cols-2 gap-2.5">
                      {#each previewLinks as link (link.href)}
                        <a class="group/li flex min-h-[88px] items-start gap-3 rounded-[8px] border border-transparent p-3 transition hover:border-goldfinch-gold/25 hover:bg-canvas" href={link.href} role="menuitem">
                          <span class={`grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[6px] ${link.image ? 'bg-deep-green' : 'bg-sand ring-1 ring-goldfinch-gold/20'}`}>
                            {#if link.image}
                              <img class="h-full w-full object-cover transition duration-500 group-hover/li:scale-105" src={imgUrl(link.image, 160)} alt={link.label} loading="lazy" decoding="async" />
                            {:else}
                              <svelte:component this={item.dropdown === 'destinations' ? MapPin : item.dropdown === 'tours' ? TicketsPlane : Compass} size={18} strokeWidth={2} class="text-forest/55 transition group-hover/li:text-forest" />
                            {/if}
                          </span>
                          <span class="min-w-0 flex-1">
                            <span class="block text-[14px] font-extrabold leading-5 text-heading transition group-hover/li:text-forest">{link.label}</span>
                            {#if link.description}<span class="mega-menu-subtitle mt-1 block text-[12px] font-medium leading-[18px] text-ink/58" title={link.description}>{link.description}</span>{/if}
                          </span>
                        </a>
                      {/each}
                    </div>

                    <a href={item.href} class="mt-4 flex h-11 items-center justify-between gap-4 rounded-[8px] border border-ink/10 bg-sand/55 px-4 text-sm font-bold text-heading transition hover:border-goldfinch-gold/30 hover:bg-sand" role="menuitem">
                      <span class="inline-flex items-center gap-2">
                        <svelte:component this={meta.icon} size={16} strokeWidth={2.4} />
                        {meta.viewAll}
                      </span>
                      <span class="text-xs font-semibold text-ink/50">{links.length} option{links.length === 1 ? '' : 's'}</span>
                    </a>
                  </div>

                  <!-- right: featured image panel with gold CTA -->
                  <a href={feat.href} class="group/feat relative m-3.5 block min-h-[370px] overflow-hidden rounded-[8px] bg-deep-green" role="menuitem" aria-label={feat.cta}>
                    {#if featureImg}
                      <img class="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover/feat:scale-105" src={imgUrl(featureImg, 720)} alt={feat.title} loading="lazy" decoding="async" />
                    {:else}
                      <div class="absolute inset-0 grid place-items-center bg-deep-green text-goldfinch-gold/45">
                        <svelte:component this={meta.icon} size={56} strokeWidth={1.7} />
                      </div>
                    {/if}
                    <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-deep-green/58 to-deep-green/10"></div>
                    <div class="absolute inset-x-0 bottom-0 p-6 text-white">
                      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">{feat.eyebrow}</p>
                      <p class="mt-2 text-2xl font-extrabold leading-tight">{feat.title}</p>
                      <p class="mt-2.5 text-sm leading-6 text-white/82">{feat.blurb}</p>
                      <span class="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-goldfinch-gold px-4 text-sm font-bold text-heading transition group-hover/feat:brightness-105">
                        {feat.cta} <ArrowRight size={15} strokeWidth={2.6} class="transition-transform group-hover/feat:translate-x-0.5" />
                      </span>
                    </div>
                  </a>
                </div>
              {/if}
            </div>
          {:else}
            <a
              class={`relative inline-flex items-center rounded px-3 py-[22px] text-[15px] font-semibold transition hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/40 ${active ? 'text-forest dark:text-goldfinch-gold' : 'text-ink/80'}`}
              href={item.href}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
              {#if active}<span class="absolute inset-x-2.5 bottom-1 h-0.5 rounded-full bg-goldfinch-gold"></span>{/if}
            </a>
          {/if}
        {/each}

        <!-- Plan My Trip CTA -->
        <a
          class={`ml-2 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/50 ${isActive(path, '/plan-my-trip') ? 'bg-deep-green text-white' : 'bg-goldfinch-gold text-heading hover:brightness-105'}`}
          href="/plan-my-trip"
          aria-current={isActive(path, '/plan-my-trip') ? 'page' : undefined}
        >
          {brand.primaryCta}
        </a>
      </nav>

      <!-- WhatsApp icon only -->
      <div class="flex min-h-[54px] items-center border-l border-ink/10 px-5 lg:px-6">
        <a
          class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#25D366] text-white shadow-sm ring-4 ring-[#25D366]/15 transition hover:brightness-105"
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          on:click={() => trackEvent('whatsapp_click')}
          aria-label={`${waButtonText} ${waNumber}`}
          title={`${waButtonText} — ${waNumber}`}
        >
          <MessageCircle size={20} strokeWidth={2.6} />
        </a>
      </div>
    </div>
  </div>

  <!-- ── mobile drawer ──────────────────────────────────────────────────── -->
  {#if menuOpen}
    <div use:portal class="fixed inset-0 z-[120] lg:hidden" transition:fade={{ duration: 120 }}>
      <button class="absolute inset-0 bg-black/45 backdrop-blur-md" type="button" aria-label="Close menu" on:click={() => (menuOpen = false)}></button>

      <!-- h-dvh (not min-h) so the panel is capped at the viewport and its content
           scrolls internally — with min-h it grew past the screen and the links
           below the fold (e.g. an open accordion) were unreachable. -->
      <aside class="absolute right-0 top-0 flex h-dvh w-[86vw] min-w-[300px] max-w-[380px] flex-col overflow-y-auto overscroll-contain border-l border-ink/10 bg-surface px-5 py-5 shadow-[-20px_0_55px_rgba(0,0,0,0.12)]" transition:fly={{ x: 60, duration: 200 }}>
        <div class="flex items-center justify-between gap-4">
          <a href="/" class="flex shrink-0 items-center gap-2.5" on:click={() => (menuOpen = false)}>
            <img src="/favicon1.png" alt="Goldfinch Adventures" class="h-10 w-10 shrink-0 object-contain" />
            <div class="leading-none">
              <p class="text-xl font-extrabold tracking-normal text-heading">Goldfinch</p>
              <p class="mt-1 text-xs font-semibold text-ink/70">Adventures</p>
            </div>
          </a>
          <button class="grid h-11 w-11 place-items-center rounded-xl border border-ink/15 bg-surface text-ink" type="button" aria-label="Close menu" on:click={() => (menuOpen = false)}>
            <X size={22} strokeWidth={2.4} />
          </button>
        </div>

        <form class="mt-5 flex h-11 items-center rounded-full bg-[#f1f1f1] px-2 transition focus-within:ring-2 focus-within:ring-goldfinch-gold/30" on:submit|preventDefault={submitSearch} role="search">
          <button class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#111]" type="submit" aria-label="Search tours"><Search size={17} strokeWidth={2.6} /></button>
          <input class="min-w-0 flex-1 bg-transparent px-1 text-sm font-medium outline-none placeholder:text-[#a9a9a9]" aria-label="Search tour packages" placeholder="Search tours..." bind:value={searchQuery} />
        </form>

        <nav class="mt-5 grid gap-1" aria-label="Mobile">
          {#each NAV as item}
            {@const active = isActive(path, item.href)}
            {@const links = item.dropdown === 'destinations' ? destinations : item.dropdown === 'tours' ? tours : item.dropdown === 'safariStyles' ? categories : []}
            {#if item.dropdown && links.length}
              <div class="rounded-[8px]">
                <div class="flex items-center">
                  <a class={`flex-1 rounded-[8px] px-3 py-3 text-[17px] font-semibold transition ${active ? 'text-forest dark:text-goldfinch-gold' : 'text-ink'}`} href={item.href} on:click={() => (menuOpen = false)}>{item.label}</a>
                  <button class="grid h-11 w-11 place-items-center rounded-[8px] text-ink/70 transition hover:bg-sand/50" type="button" aria-expanded={mobileAccordion === item.dropdown} aria-label={`Toggle ${item.label}`} on:click={() => (mobileAccordion = mobileAccordion === item.dropdown ? '' : (item.dropdown ?? ''))}>
                    <ChevronDown size={18} strokeWidth={2.6} class={`transition-transform ${mobileAccordion === item.dropdown ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {#if mobileAccordion === item.dropdown}
                  {@const meta = MENU_META[item.dropdown]}
                  <div class="mb-2 grid gap-2 rounded-[8px] border border-ink/10 bg-canvas p-2" transition:fly={{ y: -4, duration: 150 }}>
                    {#each links as link (link.href)}
                      <a class="group/mobile-link flex min-h-[70px] items-center gap-3 rounded-[6px] px-2 py-2 transition hover:bg-sand/60" href={link.href} on:click={() => (menuOpen = false)}>
                        <span class={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[6px] ${link.image ? 'bg-deep-green' : 'bg-sand ring-1 ring-goldfinch-gold/20'}`}>
                          {#if link.image}
                            <img class="h-full w-full object-cover" src={imgUrl(link.image, 120)} alt={link.label} loading="lazy" decoding="async" />
                          {:else}
                            <svelte:component this={item.dropdown === 'destinations' ? MapPin : item.dropdown === 'tours' ? TicketsPlane : Compass} size={17} strokeWidth={2} class="text-forest/60" />
                          {/if}
                        </span>
                        <span class="min-w-0 flex-1">
                          <span class="block text-[15px] font-bold leading-5 text-heading transition group-hover/mobile-link:text-forest">{link.label}</span>
                          {#if link.description}<span class="mega-menu-subtitle mt-0.5 text-[12px] leading-4 text-ink/55" title={link.description}>{link.description}</span>{/if}
                        </span>
                        <ChevronRight size={16} strokeWidth={2.5} class="shrink-0 text-ink/25" />
                      </a>
                    {/each}
                    <a href={item.href} class="flex h-10 items-center justify-between rounded-[6px] bg-sand/70 px-3 text-sm font-bold text-heading transition hover:bg-sand" on:click={() => (menuOpen = false)}>
                      <span class="inline-flex items-center gap-2">
                        <svelte:component this={meta.icon} size={15} strokeWidth={2.4} />
                        {meta.viewAll}
                      </span>
                      <ArrowRight size={15} strokeWidth={2.5} />
                    </a>
                  </div>
                {/if}
              </div>
            {:else}
              <a class={`rounded-xl px-3 py-3 text-[17px] font-semibold transition ${active ? 'text-forest dark:text-goldfinch-gold' : 'text-ink'}`} href={item.href} on:click={() => (menuOpen = false)}>{item.label}</a>
            {/if}
          {/each}

        </nav>

        <div class="mt-6 grid gap-2.5 border-t border-ink/10 pt-5">
          {#if $canInstall}
            <button type="button" class="flex w-full items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-3 text-sm font-bold text-white transition hover:bg-deep-green" on:click={() => { void promptInstall(); menuOpen = false; }}>
              <ArrowDownToLine size={18} strokeWidth={2.6} /> Install app
            </button>
          {/if}
          <a class="flex items-center gap-3 rounded-2xl bg-[#25D366]/10 px-4 py-3" href={waHref} target="_blank" rel="noopener noreferrer" on:click={() => { trackEvent('whatsapp_click'); menuOpen = false; }}>
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#25D366] text-white"><MessageCircle size={20} strokeWidth={2.6} /></span>
            <span class="grid leading-tight">
              <span class="text-xs font-medium text-ink/70">{waButtonText}</span>
              <span class="text-[15px] font-bold text-ink">{waNumber}</span>
            </span>
          </a>
          <a class="mt-1 text-center text-xs font-medium text-ink/40 transition hover:text-forest" href="/admin/login" on:click={() => (menuOpen = false)}>Staff login</a>
        </div>
      </aside>
    </div>
  {/if}
</header>

<style>
  .mega-menu-subtitle {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }
</style>
