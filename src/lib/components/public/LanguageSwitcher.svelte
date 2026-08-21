<script lang="ts">
  /**
   * Language switcher. Every option links to the SAME page in that language —
   * the visitor is never bounced to the homepage for changing language.
   *
   * Only languages an admin has enabled appear, and on entity pages only those
   * with a published translation, so a link never leads to a page that quietly
   * falls back to English.
   */
  import { Check, Globe } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { localizeHref, type KnownLocale } from '$lib/i18n';
  import type { Language } from '$lib/types';

  export let languages: Language[] = [];
  export let current: KnownLocale;
  /** Locales this page genuinely exists in; omit to offer every enabled one. */
  export let availableLocales: string[] | null = null;

  let open = false;

  $: options = languages
    .filter((language) => language.enabled)
    .filter((language) => !availableLocales || availableLocales.includes(language.code));
  $: activeLanguage = options.find((language) => language.code === current);

  const close = () => (open = false);
</script>

<svelte:window on:click={close} />

{#if options.length > 1}
  <div class="relative" on:click|stopPropagation role="presentation">
    <button
      class="inline-flex h-11 items-center gap-2 rounded-xl border border-ink/15 bg-surface px-3 text-sm font-semibold text-heading transition hover:border-goldfinch-gold/60"
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label="Change language"
      on:click={() => (open = !open)}
    >
      <Globe size={16} class="text-forest/70" />
      <span class="uppercase">{current}</span>
    </button>

    {#if open}
      <ul
        class="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-[10px] border border-ink/10 bg-surface p-1.5 shadow-[0_20px_50px_rgba(57,61,50,0.18)]"
        role="listbox"
        aria-label="Language"
      >
        {#each options as language (language.code)}
          <li>
            <a
              class={`flex items-center justify-between gap-3 rounded-[8px] px-3 py-2 text-sm transition hover:bg-sand ${language.code === current ? 'bg-goldfinch-gold/12 font-bold text-heading' : 'text-ink/75'}`}
              href={localizeHref($page.url.pathname, language.code)}
              hreflang={language.code}
              role="option"
              aria-selected={language.code === current}
              data-sveltekit-reload
            >
              <span>
                {language.native_name}
                {#if language.native_name !== language.name}
                  <span class="text-ink/45">· {language.name}</span>
                {/if}
              </span>
              {#if language.code === current}<Check size={15} class="shrink-0 text-forest" />{/if}
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{:else if activeLanguage}
  <span class="sr-only">Language: {activeLanguage.name}</span>
{/if}
