<script lang="ts">
  /**
   * The floating WhatsApp button, bottom right on every public page.
   *
   * Number, message and label come from Settings (the same ones the footer
   * uses); with no WhatsApp number set the button is not drawn. Clicks are
   * counted by the site-wide WhatsApp listener (analytics.ts) as a lead, with
   * location "floating_button" — this component must not track them itself.
   *
   * It sits in the bottom-right corner and pushes Back to top up above it
   * (--wa-fab-space). On a tour page below lg it rises above the booking bar,
   * and it hides with the package dock like the other package-aware buttons.
   */
  import { page } from '$app/stores';
  import { t } from '$lib/i18n/ui';
  import { brand, brandKeys } from '$lib/brand';
  import { publicSettings, settingText, settingOrTranslated } from '$lib/settings';

  $: s = $publicSettings;
  $: digits = settingText(s, 'whatsapp_number').replace(/[^0-9]/g, '');
  $: message = settingText(s, 'whatsapp_default_message') || `Hello ${brand.name}, I would like help planning an East Africa trip.`;
  $: href = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : '';
  $: label = settingOrTranslated(s, 'whatsapp_button_text', brandKeys.whatsappCta, $t);
  $: isTourDetail = /^(\/[a-z]{2})?\/tours\/[^/]+\/?$/.test($page.url.pathname);
</script>

{#if href}
  <a
    {href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    data-track-location="floating_button"
    class={`whatsapp-fab package-aware-fab group fixed right-4 z-50 flex items-center md:right-6 ${isTourDetail ? 'bottom-[5.75rem] lg:bottom-6' : 'bottom-5 md:bottom-6'}`}
    style="margin-bottom: calc(env(safe-area-inset-bottom) + var(--package-dock-space, 0px));"
  >
    <!-- Desktop: the label slides out on hover or keyboard focus. -->
    <span
      class="pointer-events-none mr-3 hidden translate-x-2 whitespace-nowrap rounded-full bg-surface px-4 py-2 text-sm font-semibold text-heading opacity-0 shadow-[0_10px_30px_rgba(57,61,50,0.18)] transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 md:block"
      aria-hidden="true">{label}</span>
    <span
      class="grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_12px_34px_rgba(18,140,74,0.38)] transition group-hover:scale-105 group-hover:bg-[#1ebe5b] group-focus-visible:ring-4 group-focus-visible:ring-[#25D366]/35"
    >
      <!-- The WhatsApp logo: phone in a speech bubble. -->
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true" focusable="false"
        ><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg
      >
    </span>
  </a>
{/if}

<style>
  /* Back to top stacks above this button (56px + 12px gap), centred on it (48px wide). */
  :global(html:has(.whatsapp-fab)) {
    --wa-fab-space: 68px;
    --wa-fab-inset: 4px;
  }
</style>
