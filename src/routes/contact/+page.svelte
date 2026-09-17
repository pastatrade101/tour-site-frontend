<script lang="ts">
  import { t } from '$lib/i18n/ui';
  /**
   * /contact
   *
   * The page used to be a section header whose description was an internal note
   * about where the form posts, a heading that said "Plan a Trip", and an empty
   * left column. Every detail a visitor actually wants — the address, the phone
   * number, the inbox, the hours — was already in public settings and only the
   * footer used it.
   *
   * Each channel below self-hides when its setting is empty, so the panel is
   * short and true rather than padded with placeholders.
   */
  import { ArrowUpRight, Clock, Mail, MapPin, MessageCircle, Phone } from '@lucide/svelte';
  import { brand } from '$lib/brand';
  import { trackEvent } from '$lib/analytics';
  import { publicSettings, settingBool, settingText } from '$lib/settings';
  import ContactForm from '$lib/components/public/ContactForm.svelte';

  $: s = $publicSettings;
  $: siteName = settingText(s, 'site_name') || brand.name;
  $: email = settingText(s, 'contact_email') || settingText(s, 'support_email');
  $: phone = settingText(s, 'contact_phone') || settingText(s, 'support_phone');

  $: waNumber = settingText(s, 'whatsapp_number') || phone;
  $: waDigits = settingBool(s, 'whatsapp_enabled', true) ? waNumber.replace(/[^0-9]/g, '') : '';
  $: waMessage =
    settingText(s, 'whatsapp_default_message') || `Hello ${siteName}, I would like help planning an East Africa trip.`;
  $: waHref = `https://wa.me/${waDigits}?text=${encodeURIComponent(waMessage)}`;

  $: address = [
    settingText(s, 'contact_address') || settingText(s, 'office_address'),
    settingText(s, 'city'),
    settingText(s, 'country')
  ]
    .filter(Boolean)
    .join(', ');
  $: mapUrl = settingText(s, 'google_maps_url');
  $: hours = settingText(s, 'business_hours');
  $: responseTime = settingText(s, 'default_response_time_message');
</script>

<svelte:head>
  <title>{$t('nav.contact')} | {siteName}</title>
  <meta
    name="description"
    content="Contact Goldfinch Adventures — message a travel specialist about safaris, Kilimanjaro climbs, gorilla trekking and beach add-ons in East Africa."
  />
</svelte:head>

<section class="container-shell py-12 md:py-16">
  <nav class="flex items-center gap-2 text-sm font-medium text-ink/50">
    <a class="transition hover:text-forest" href="/">{$t('nav.home')}</a>
    <span class="text-ink/30">/</span>
    <span class="text-ink/75">{$t('nav.contact')}</span>
  </nav>

  <div class="mt-6 max-w-2xl">
    <p class="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-goldfinch-gold">
      <span class="h-px w-8 bg-goldfinch-gold/70"></span>
      {$t('nav.contact')}
    </p>
    <h1 class="mt-3 text-3xl font-bold leading-tight tracking-normal text-heading md:text-4xl">
      {$t('ui.talk_to_a_specialist')}
    </h1>
    <p class="mt-3 text-base leading-7 text-ink/70">{$t('ui.tell_us_who_is_travelling')}</p>
  </div>

  <div class="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
    <!-- Ways to reach a person, in the order people use them. -->
    <aside class="rounded-[10px] bg-deep-green p-5 text-white shadow-[0_24px_70px_rgba(57,61,50,0.18)] sm:p-6">
      <h2 class="text-lg font-bold">{$t('ui.contact_details')}</h2>
      {#if responseTime}
        <p class="mt-2 inline-flex items-start gap-2 rounded-[8px] border border-goldfinch-gold/30 bg-white/[0.06] px-3 py-2 text-[13px] leading-5 text-white/80">
          <Clock size={14} class="mt-0.5 shrink-0 text-goldfinch-gold" />{responseTime}
        </p>
      {/if}

      <div class="mt-5 grid gap-1">
        {#if email}
          <a
            class="group flex items-start gap-3 rounded-[8px] px-3 py-3 transition hover:bg-white/[0.07]"
            href={`mailto:${email}`}
            on:click={() => trackEvent('email_click')}
          >
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-goldfinch-gold">
              <Mail size={16} />
            </span>
            <span class="min-w-0">
              <span class="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">{$t('form.email')}</span>
              <span class="block break-words text-sm font-semibold text-white">{email}</span>
            </span>
          </a>
        {/if}

        {#if phone}
          <a
            class="group flex items-start gap-3 rounded-[8px] px-3 py-3 transition hover:bg-white/[0.07]"
            href={`tel:${phone.replace(/\s+/g, '')}`}
            on:click={() => trackEvent('phone_click')}
          >
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-goldfinch-gold">
              <Phone size={16} />
            </span>
            <span class="min-w-0">
              <span class="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">{$t('ui.phone')}</span>
              <span class="block text-sm font-semibold text-white">{phone}</span>
            </span>
          </a>
        {/if}

        {#if waDigits}
          <a
            class="group flex items-start gap-3 rounded-[8px] px-3 py-3 transition hover:bg-white/[0.07]"
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            on:click={() => trackEvent('whatsapp_click')}
          >
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-goldfinch-gold">
              <MessageCircle size={16} />
            </span>
            <span class="min-w-0">
              <span class="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">{$t('cta.whatsapp')}</span>
              <span class="inline-flex items-center gap-1 text-sm font-semibold text-white">
                {waNumber}<ArrowUpRight size={13} class="text-white/50 transition-transform group-hover:translate-x-0.5" />
              </span>
            </span>
          </a>
        {/if}

        {#if address}
          <div class="flex items-start gap-3 px-3 py-3">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-goldfinch-gold">
              <MapPin size={16} />
            </span>
            <span class="min-w-0">
              <span class="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">{$t('ui.office')}</span>
              <span class="block text-sm font-semibold text-white">{address}</span>
              {#if mapUrl}
                <a
                  class="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-goldfinch-gold hover:underline"
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {$t('ui.view_on_google_maps')}<ArrowUpRight size={12} />
                </a>
              {/if}
            </span>
          </div>
        {/if}

        {#if hours}
          <div class="flex items-start gap-3 px-3 py-3">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-goldfinch-gold">
              <Clock size={16} />
            </span>
            <span class="min-w-0">
              <span class="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">{$t('ui.opening_hours')}</span>
              <span class="block text-sm font-semibold text-white">{hours}</span>
            </span>
          </div>
        {/if}
      </div>
    </aside>

    <ContactForm />
  </div>
</section>
