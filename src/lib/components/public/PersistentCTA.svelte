<script lang="ts">
  import { MessageCircle, Sparkles } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { publicSettings, settingText } from '$lib/settings';

  // Persistent conversion CTAs (spec §3): a mobile bottom action bar with the two
  // primary actions, plus a WhatsApp float on desktop. Hidden on admin routes.
  $: s = $publicSettings;
  $: waNumber = settingText(s, 'whatsapp_number') || '+255 700 000 000';
  $: waDigits = waNumber.replace(/\D/g, '');
  $: waMessage =
    settingText(s, 'whatsapp_default_message') ||
    'Hello Goldfinch Adventures, I would like help planning an East Africa trip.';
  $: waHref = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(waMessage)}` : '#';

  // Don't show a redundant "Plan My Trip" button while already on that page.
  $: onPlanPage = $page.url.pathname.startsWith('/plan-my-trip');
</script>

<!-- Mobile bottom action bar -->
<div
  class="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 backdrop-blur lg:hidden"
  style="padding-bottom: env(safe-area-inset-bottom);"
>
  <div class="flex items-center gap-2.5 px-3 py-2.5">
    {#if !onPlanPage}
      <a
        href="/plan-my-trip"
        class="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-goldfinch-gold px-4 text-[15px] font-bold text-deep-green shadow-sm transition active:brightness-95"
      >
        <Sparkles size={18} strokeWidth={2.4} />
        Plan My Trip
      </a>
    {/if}
    <a
      href={waHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      class={`inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] font-bold text-white shadow-sm transition active:brightness-95 ${
        onPlanPage ? 'flex-1 px-4 text-[15px]' : 'w-12 shrink-0'
      }`}
    >
      <MessageCircle size={22} strokeWidth={2.2} />
      {#if onPlanPage}Chat on WhatsApp{/if}
    </a>
  </div>
</div>

<!-- Desktop WhatsApp float -->
<a
  href={waHref}
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Chat on WhatsApp"
  class="fixed bottom-6 right-6 z-40 hidden h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_rgba(37,211,102,0.45)] transition hover:scale-105 lg:grid"
>
  <MessageCircle size={26} strokeWidth={2.2} />
</a>
