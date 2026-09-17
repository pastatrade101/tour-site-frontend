<script lang="ts">
  import { t } from '$lib/i18n/ui';
  import { Heart } from '@lucide/svelte';
  import { shortlist } from '$lib/shortlist';

  $: count = $shortlist.length;
</script>

{#if count > 0}
  <a
    class="package-aware-fab fixed bottom-5 left-4 z-40 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-surface/95 px-4 py-2.5 text-sm font-bold text-heading shadow-[0_10px_30px_rgba(57,61,50,0.15)] backdrop-blur transition hover:bg-surface lg:bottom-6"
    style="margin-bottom: calc(env(safe-area-inset-bottom) + var(--package-dock-space, 0px));"
    href="/shortlist"
    aria-label={`${count} saved trips`}
  >
    <span class="grid h-6 w-6 place-items-center rounded-full bg-clay text-white"><Heart size={13} fill="currentColor" /></span>{$t('ui.saved')}<span class="grid h-5 min-w-[20px] place-items-center rounded-full bg-deep-green px-1 text-xs text-white">{count}</span>
  </a>
{/if}
