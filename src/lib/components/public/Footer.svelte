<script lang="ts">
  import { t } from '$lib/i18n/ui';
  import { onMount } from 'svelte';
  import { ArrowRight, Mail, MapPin, MessageCircle, Phone } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { trackEvent } from '$lib/analytics';
  import { brand } from '$lib/brand';
  import { publicSettings, settingText } from '$lib/settings';
  import SocialIcon from './SocialIcon.svelte';

  type Item = { label: string; href: string };

  const SOCIAL = [
    { key: 'facebook_url', label: 'Facebook', network: 'facebook' },
    { key: 'instagram_url', label: 'Instagram', network: 'instagram' },
    { key: 'youtube_url', label: 'YouTube', network: 'youtube' },
    { key: 'tiktok_url', label: 'TikTok', network: 'tiktok' },
    { key: 'linkedin_url', label: 'LinkedIn', network: 'linkedin' },
    { key: 'tripadvisor_url', label: 'TripAdvisor', network: 'tripadvisor' }
  ];

  $: s = $publicSettings;
  $: siteName = settingText(s, 'site_name') || brand.name;
  $: statement = settingText(s, 'brand_statement') || brand.positioning;
  $: contactEmail = settingText(s, 'contact_email');
  $: contactPhone = settingText(s, 'contact_phone');
  $: address = settingText(s, 'contact_address') || settingText(s, 'office_address');
  // The address opens the office on the map when Settings has a Maps link.
  $: mapsUrl = settingText(s, 'google_maps_url');
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
  $: dataRetentionUrl = settingText(s, 'data_retention_url') || '/data-retention';

  // Destination + experience columns come from REAL published CMS records, so
  // every link resolves to a page that exists. An empty list simply renders a
  // shorter footer instead of dead links.
  let destinations: Item[] = [];
  let experiences: Item[] = [];
  let packages: Item[] = [];

  onMount(() => {
    void (async () => {
      try {
        const res = await api.destinations.list({ status: 'published', limit: 6 });
        destinations = (res.data.items ?? []).map((d) => ({
          label: String(d.name ?? d.slug),
          href: `/destinations/${d.slug}`
        }));
      } catch {
        // leave empty — the column self-hides
      }
      try {
        const res = await api.categories.list({ status: 'published', limit: 6 });
        experiences = (res.data.items ?? []).map((c) => ({
          label: String(c.name ?? c.slug),
          href: `/safari-styles/${c.slug}`
        }));
      } catch {
        // leave empty — the column self-hides
      }
      try {
        // Only pages a crawler is allowed on. A draft or a not-yet-indexable
        // page has no business being linked from every page of the site.
        const res = await api.safariPackages.list({ status: 'published', limit: 6 });
        packages = (res.data.items ?? [])
          .filter((row) => row?.slug && row.indexable === true)
          .map((row) => ({ label: String(row.name ?? row.slug), href: `/${row.slug}` }));
      } catch {
        // leave empty — the column self-hides
      }
    })();
  });

  // Reactive: the labels are the reader's language, the links are not.
  let expertAdvice: Item[] = [];
  $: expertAdvice = [
    { label: $t('footer.link_expert_advice'), href: '/expert-advice' },
    { label: $t('footer.link_compare_destinations'), href: '/compare' },
    { label: $t('footer.link_destination_scores'), href: '/destination-scores' },
    { label: $t('footer.link_travel_styles'), href: '/travel-styles' },
    { label: $t('nav.gallery'), href: '/gallery' }
  ];

  let company: Item[] = [];
  $: company = [
    { label: $t('footer.link_about_us'), href: '/about' },
    { label: $t('nav.experiences'), href: '/experiences' },
    { label: $t('footer.link_all_tours'), href: '/tours' },
    { label: $t('footer.link_health_safety'), href: '/safety' },
    { label: $t('nav.contact'), href: '/contact' }
  ];

  const year = new Date().getFullYear();
</script>

<footer class="border-t border-white/5 bg-forest text-white/[0.72]">
  <div class="container-shell py-14 md:py-16">
    <!--
      Brand on the left, link columns in their own grid on the right.
      They used to share one six-track grid, and the unit count never fitted it:
      brand spans two and there are five or six link groups depending on what
      the CMS returns, so a column always dropped to a second row under a gap as
      tall as the longest list. A nested grid arranges whatever it is given.
    -->
    <div class="grid gap-10 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-14">
      <!-- Brand -->
      <div>
        <a href="/" class="flex items-center gap-2.5" aria-label={`${siteName} — ${$t('nav.home')}`}>
          <img src="/favicon1.png" alt={siteName} class="h-9 w-9 shrink-0 object-contain" />
          <span class="font-serif text-lg font-semibold text-goldfinch-gold">{siteName}</span>
        </a>
        <p class="mt-4 max-w-sm text-sm leading-relaxed">{statement}</p>
        <a
          href="/plan-my-trip"
          class="mt-6 inline-flex items-center gap-2 rounded-md bg-goldfinch-gold px-4 py-2.5 text-sm font-semibold text-heading transition hover:brightness-105"
        >
          {$t('cta.plan_my_trip')}
          <ArrowRight size={16} />
        </a>

        {#if socials.length}
          <div class="mt-6 flex flex-wrap gap-2">
            {#each socials as social (social.key)}
              <a
                class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-goldfinch-gold hover:text-heading"
                href={settingText(s, social.key)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
              >
                <SocialIcon network={social.network} size={14} />
                {social.label}
              </a>
            {/each}
          </div>
        {/if}

        <!-- Contact sits with the name and the logo: it is who you are
             reaching, not another list of places to click. -->
        {#if address || contactEmail || contactPhone || waDigits}
          <div class="mt-8">
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-goldfinch-gold" aria-hidden="true"></span>
              <span class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">{$t('footer.contact')}</span>
            </div>
            <!-- One icon per line, in the brand gold, so each line reads as
                 what it is before the text does. -->
            <ul class="mt-4 space-y-2.5 text-sm">
              {#if address}
                <li>
                  {#if mapsUrl}
                    <a class="footer-contact transition hover:text-white" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                      <MapPin size={16} class="footer-contact-icon" />
                      <span>{address}</span>
                    </a>
                  {:else}
                    <span class="footer-contact">
                      <MapPin size={16} class="footer-contact-icon" />
                      <span>{address}</span>
                    </span>
                  {/if}
                </li>
              {/if}
              {#if contactEmail}
                <li>
                  <a class="footer-contact transition hover:text-white" href={`mailto:${contactEmail}`} on:click={() => trackEvent('email_click')}>
                    <Mail size={16} class="footer-contact-icon" />
                    <span class="break-all">{contactEmail}</span>
                  </a>
                </li>
              {/if}
              {#if contactPhone}
                <li>
                  <a
                    class="footer-contact transition hover:text-white"
                    href={`tel:${contactPhone.replace(/\s+/g, '')}`}
                    on:click={() => trackEvent('phone_click')}
                  >
                    <Phone size={16} class="footer-contact-icon" />
                    <span>{contactPhone}</span>
                  </a>
                </li>
              {/if}
              {#if waDigits}
                <li>
                  <a
                    class="footer-contact transition hover:text-white"
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    on:click={() => trackEvent('whatsapp_click')}
                  >
                    <MessageCircle size={16} class="footer-contact-icon" />
                    <span class="break-all">{$t('cta.whatsapp')}<span class="ml-1 text-white/55">{waNumber}</span></span>
                  </a>
                </li>
              {/if}
            </ul>
          </div>
        {/if}
      </div>

      <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {#if destinations.length}
        <div>
          <div class="inline-flex items-center gap-2">
            <span class="h-px w-6 bg-goldfinch-gold" aria-hidden="true"></span>
            <span class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">{$t('footer.destinations')}</span>
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
            <span class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">{$t('footer.experiences')}</span>
          </div>
          <ul class="mt-4 space-y-2.5 text-sm">
            {#each experiences as item (item.href)}
              <li><a class="transition hover:text-white" href={item.href}>{item.label}</a></li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if packages.length}
        <div>
          <div class="inline-flex items-center gap-2">
            <span class="h-px w-6 bg-goldfinch-gold" aria-hidden="true"></span>
            <span class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">{$t('footer.safari_packages')}</span>
          </div>
          <ul class="mt-4 space-y-2.5 text-sm">
            {#each packages as item (item.href)}
              <li><a class="transition hover:text-white" href={item.href}>{item.label}</a></li>
            {/each}
          </ul>
        </div>
      {/if}

      <div>
        <div class="inline-flex items-center gap-2">
          <span class="h-px w-6 bg-goldfinch-gold" aria-hidden="true"></span>
          <span class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">{$t('footer.expert_advice')}</span>
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
          <span class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">{$t('footer.company')}</span>
        </div>
        <ul class="mt-4 space-y-2.5 text-sm">
          {#each company as item (item.href)}
            <li><a class="transition hover:text-white" href={item.href}>{item.label}</a></li>
          {/each}
        </ul>

      </div>

      </div>
    </div>

    <div class="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
      <p>© {year} {settingText(s, 'company_name') || brand.companyName}. {$t('footer.rights')}</p>
      <nav class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <a class="transition hover:text-white" href={privacyUrl}>{$t('footer.privacy')}</a>
        <a class="transition hover:text-white" href={termsUrl}>{$t('footer.terms')}</a>
        <a class="transition hover:text-white" href={cancellationUrl}>{$t('footer.cancellation')}</a>
        <a class="transition hover:text-white" href={dataRetentionUrl}>{$t('footer.data_retention')}</a>
        <!-- Where staff sign in. It sat in the top bar as a button, competing
             with the one call to action meant for visitors; down here it is
             still one click from every page for the people who need it. -->
        <a class="transition hover:text-white" href="/admin/login">{$t('nav.staff_login')}</a>
      </nav>
    </div>
  </div>
</footer>

<style>
  .footer-contact {
    display: inline-flex;
    max-width: 100%;
    align-items: flex-start;
    gap: 0.625rem;
  }

  /* Lucide renders its own <svg>, so the class reaches it through :global. */
  .footer-contact :global(.footer-contact-icon) {
    flex-shrink: 0;
    margin-top: 0.125rem;
    color: rgb(var(--c-goldfinch-gold));
  }
</style>
