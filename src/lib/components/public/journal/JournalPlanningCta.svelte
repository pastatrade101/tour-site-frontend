<script lang="ts">
  /**
   * The contact band that closes every journal page: WhatsApp, an enquiry and
   * a call. Numbers come from Settings; a channel without one is left out.
   */
  import { ArrowUpRight, Mail, Phone } from '@lucide/svelte';
  import { brand } from '$lib/brand';
  import { t } from '$lib/i18n/ui';
  import { publicSettings, settingText } from '$lib/settings';
  import { trackCta } from '$lib/analytics';
  import WhatsAppIcon from '../WhatsAppIcon.svelte';

  $: s = $publicSettings;
  $: phone = settingText(s, 'contact_phone');
  $: waDigits = (settingText(s, 'whatsapp_number') || phone).replace(/[^0-9]/g, '');
  $: waMessage = settingText(s, 'whatsapp_default_message') || `Hello ${brand.name}, I would like help planning an East Africa trip.`;
  $: items = [
    waDigits ? { key: 'whatsapp', title: 'WhatsApp', text: $t('journal.cta_whatsapp_text'), href: `https://wa.me/${waDigits}?text=${encodeURIComponent(waMessage)}`, external: true } : null,
    { key: 'enquiry', title: $t('journal.cta_enquiry'), text: $t('journal.cta_enquiry_text'), href: '/plan-my-trip?source=journal', external: false },
    phone ? { key: 'call', title: $t('journal.cta_call'), text: $t('journal.cta_call_text'), href: `tel:${phone.replace(/[^0-9+]/g, '')}`, external: false } : null
  ].filter((item): item is NonNullable<typeof item> => item !== null);
</script>

<section aria-labelledby="journal-planning-cta" class="container-shell pb-16">
  <div class="grid items-center gap-6 rounded-[12px] border border-ink/10 bg-surface p-5 md:p-7 lg:grid-cols-2 lg:gap-10">
    <div>
      <p class="text-[12px] font-semibold uppercase tracking-[0.14em] text-clay">{$t('journal.cta_eyebrow')}</p>
      <h2 id="journal-planning-cta" class="mt-1.5 font-serif text-[22px] font-semibold leading-tight text-heading md:text-[26px]">{$t('journal.cta_heading')}</h2>
      <p class="mt-2 text-[15px] leading-[1.65] text-ink/70">{$t('journal.cta_text')}</p>
    </div>
    <div class="grid gap-3 {items.length === 3 ? 'sm:grid-cols-3' : items.length === 2 ? 'sm:grid-cols-2' : ''}">
      {#each items as item (item.key)}
        <a
          href={item.href}
          class="group relative block border-b border-ink/10 py-4 transition-colors after:absolute after:-bottom-px after:left-0 after:h-px after:w-0 after:bg-goldfinch-gold after:transition-all hover:after:w-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldfinch-gold"
          target={item.external ? '_blank' : undefined}
          rel={item.external ? 'noopener noreferrer' : undefined}
          on:click={() => trackCta({ cta_name: item.title, cta_type: item.key === 'enquiry' ? 'link' : item.key === 'call' ? 'phone' : 'whatsapp', cta_location: 'journal' })}
        >
          <span class="flex items-center gap-2">
            {#if item.key === 'whatsapp'}<WhatsAppIcon size={15} brand />{:else if item.key === 'call'}<Phone size={15} strokeWidth={1.6} class="shrink-0 text-ink/60" />{:else}<Mail size={15} strokeWidth={1.6} class="shrink-0 text-ink/60" />{/if}
            <span class="flex-1 text-[14px] font-semibold text-heading transition-colors group-hover:text-clay">{item.title}</span>
            <ArrowUpRight size={15} strokeWidth={1.6} class="text-ink/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-goldfinch-gold" />
          </span>
          <span class="mt-1 block pl-[23px] text-[13px] leading-snug text-ink/60">{item.text}</span>
        </a>
      {/each}
    </div>
  </div>
</section>
