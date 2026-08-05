<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, MessageCircle } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { trackEvent } from '$lib/analytics';
  import { brand } from '$lib/brand';
  import { publicSettings, settingText } from '$lib/settings';

  type Item = { label: string; href: string };

  const SOCIAL = [
    { key: 'facebook_url', label: 'Facebook' },
    { key: 'instagram_url', label: 'Instagram' },
    { key: 'youtube_url', label: 'YouTube' },
    { key: 'tiktok_url', label: 'TikTok' },
    { key: 'linkedin_url', label: 'LinkedIn' },
    { key: 'tripadvisor_url', label: 'TripAdvisor' }
  ];

  $: s = $publicSettings;
  $: siteName = settingText(s, 'site_name') || brand.name;
  $: statement = settingText(s, 'brand_statement') || brand.positioning;
  $: contactEmail = settingText(s, 'contact_email');
  $: contactPhone = settingText(s, 'contact_phone');
  $: address = settingText(s, 'contact_address') || settingText(s, 'office_address');
  $: socials = SOCIAL.filter((item) => settingText(s, item.key));

  $: waNumber = settingText(s, 'whatsapp_number') || contactPhone;
  $: waDigits = waNumber.replace(/[^0-9]/g, '');
  $: waMessage =
    settingText(s, 'whatsapp_default_message') || `Hello ${brand.name}, I would like help planning an East Africa trip.`;
  $: waHref = `https://wa.me/${waDigits}?text=${encodeURIComponent(waMessage)}`;

  // Legal links: the admin-set URL when provided, else the on-site page.
  $: privacyUrl = settingText(s, 'privacy_policy_url') || '/privacy';
  $: termsUrl = settingText(s, 'terms_url') || '/terms';
  $: cancellationUrl = settingText(s, 'cancellation_policy_url') || '/cancellation-policy';

  // Destination + experience columns come from REAL published CMS records, so
  // every link resolves to a page that exists. An empty list simply renders a
  // shorter footer instead of dead links.
  let destinations: Item[] = [];
  let experiences: Item[] = [];

  onMount(() => {
    void (async () => {
      try {
        const res = await api.destinations.list({ status: 'published', limit: 7 });
        destinations = (res.data.items ?? []).map((d) => ({
          label: String(d.name ?? d.slug),
          href: `/destinations/${d.slug}`
        }));
      } catch {
        // leave empty — the column self-hides
      }
      try {
        const res = await api.categories.list({ status: 'published', limit: 12 });
        experiences = (res.data.items ?? []).map((c) => ({
          label: String(c.name ?? c.slug),
          href: `/safari-styles/${c.slug}`
        }));
      } catch {
        // leave empty — the column self-hides
      }
    })();
  });

  const expertAdvice: Item[] = [
    { label: 'Expert advice', href: '/expert-advice' },
    { label: 'Compare destinations', href: '/compare' },
    { label: 'Destination scores', href: '/destination-scores' },
    { label: 'Travel styles', href: '/travel-styles' },
    { label: 'Gallery', href: '/gallery' }
  ];

  const company: Item[] = [
    { label: 'About us', href: '/about' },
    { label: 'Experiences', href: '/experiences' },
    { label: 'All tours', href: '/tours' },
    { label: 'Health & safety', href: '/safety' },
    { label: 'Contact', href: '/contact' }
  ];

  const year = new Date().getFullYear();
</script>

<footer class="border-t border-white/5 bg-[#272B22] text-white/[0.72]">
  <div class="container-shell py-14 md:py-16">
    <div class="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
      <!-- Brand -->
      <div class="lg:col-span-2">
        <a href="/" class="flex items-center gap-2.5" aria-label={`${siteName} home`}>
          <img src="/favicon1.png" alt={siteName} class="h-9 w-9 shrink-0 object-contain" />
          <span class="font-serif text-lg font-semibold text-goldfinch-gold">{siteName}</span>
        </a>
        <p class="mt-4 max-w-sm text-sm leading-relaxed">{statement}</p>
        <a
          href="/plan-my-trip"
          class="mt-6 inline-flex items-center gap-2 rounded-md bg-goldfinch-gold px-4 py-2.5 text-sm font-semibold text-heading transition hover:brightness-105"
        >
          {brand.primaryCta}
          <ArrowRight size={16} />
        </a>

        {#if socials.length}
          <div class="mt-6 flex flex-wrap gap-2">
            {#each socials as social (social.key)}
              <a
                class="inline-flex items-center rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-goldfinch-gold hover:text-heading"
                href={settingText(s, social.key)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
              >
                {social.label}
              </a>
            {/each}
          </div>
        {/if}
      </div>

      {#if destinations.length}
        <div>
          <div class="inline-flex items-center gap-2">
            <span class="h-px w-6 bg-goldfinch-gold" aria-hidden="true"></span>
            <span class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">Destinations</span>
          </div>
          <ul class="mt-4 space-y-2.5 text-sm">
            {#each destinations as item (item.href)}
              <li><a class="transition hover:text-white" href={item.href}>{item.label}</a></li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if experiences.length}
        <div>
          <div class="inline-flex items-center gap-2">
            <span class="h-px w-6 bg-goldfinch-gold" aria-hidden="true"></span>
            <span class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">Experiences</span>
          </div>
          <ul class="mt-4 space-y-2.5 text-sm">
            {#each experiences as item (item.href)}
              <li><a class="transition hover:text-white" href={item.href}>{item.label}</a></li>
            {/each}
          </ul>
        </div>
      {/if}

      <div>
        <div class="inline-flex items-center gap-2">
          <span class="h-px w-6 bg-goldfinch-gold" aria-hidden="true"></span>
          <span class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">Expert Advice</span>
        </div>
        <ul class="mt-4 space-y-2.5 text-sm">
          {#each expertAdvice as item (item.href)}
            <li><a class="transition hover:text-white" href={item.href}>{item.label}</a></li>
          {/each}
        </ul>
      </div>

      <div>
        <div class="inline-flex items-center gap-2">
          <span class="h-px w-6 bg-goldfinch-gold" aria-hidden="true"></span>
          <span class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">Company</span>
        </div>
        <ul class="mt-4 space-y-2.5 text-sm">
          {#each company as item (item.href)}
            <li><a class="transition hover:text-white" href={item.href}>{item.label}</a></li>
          {/each}
        </ul>

        {#if address || contactEmail || contactPhone || waDigits}
          <div class="mt-8">
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-goldfinch-gold" aria-hidden="true"></span>
              <span class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">Contact</span>
            </div>
            <ul class="mt-4 space-y-2 text-sm">
              {#if address}<li>{address}</li>{/if}
              {#if contactEmail}
                <li>
                  <a class="transition hover:text-white" href={`mailto:${contactEmail}`} on:click={() => trackEvent('email_click')}>
                    {contactEmail}
                  </a>
                </li>
              {/if}
              {#if contactPhone}
                <li>
                  <a
                    class="transition hover:text-white"
                    href={`tel:${contactPhone.replace(/\s+/g, '')}`}
                    on:click={() => trackEvent('phone_click')}
                  >
                    {contactPhone}
                  </a>
                </li>
              {/if}
              {#if waDigits}
                <li class="pt-1">
                  <a
                    class="inline-flex items-center gap-2 transition hover:text-white"
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    on:click={() => trackEvent('whatsapp_click')}
                  >
                    <MessageCircle size={14} class="shrink-0" />
                    <span>WhatsApp<span class="ml-1 text-white/55">{waNumber}</span></span>
                  </a>
                </li>
              {/if}
            </ul>
          </div>
        {/if}
      </div>
    </div>

    <div class="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
      <p>© {year} {settingText(s, 'company_name') || brand.companyName}. All rights reserved.</p>
      <nav class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <a class="transition hover:text-white" href={privacyUrl}>Privacy Policy</a>
        <a class="transition hover:text-white" href={termsUrl}>Terms</a>
        <a class="transition hover:text-white" href={cancellationUrl}>Cancellation Policy</a>
        <a class="transition hover:text-white" href="/data-retention">Data Retention</a>
      </nav>
    </div>
  </div>
</footer>
