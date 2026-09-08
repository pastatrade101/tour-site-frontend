<script lang="ts">
  /**
   * Language switcher. Every option links to the SAME page in that language —
   * the visitor is never bounced to the homepage for changing language.
   *
   * Only languages an admin has enabled appear, and on entity pages only those
   * with a published translation, so a link never leads to a page that quietly
   * falls back to English.
   */
  import { Check, ChevronDown, Globe } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { localizeHref, rememberLocale, type KnownLocale } from '$lib/i18n';
  import type { Language } from '$lib/types';

  export let languages: Language[] = [];
  export let current: KnownLocale;
  /** Locales this page genuinely exists in; omit to offer every enabled one. */
  export let availableLocales: string[] | null = null;
  /** No border or background — for the dark utility strip. */
  export let bare = false;

  let open = false;

  $: options = languages
    .filter((language) => language.enabled)
    .filter((language) => !availableLocales || availableLocales.includes(language.code));
  $: activeLanguage = options.find((language) => language.code === current);

  const close = () => (open = false);

  let root: HTMLElement | null = null;
  let trigger: HTMLButtonElement | null = null;
  let panel: HTMLElement | null = null;
  let pos = { top: 0, left: 0, width: 224 };

  /*
   * The switcher sits in the header's utility strip, which is `overflow-hidden`
   * so it can animate its max-height on scroll. An absolutely-positioned list
   * was therefore clipped to the 32px strip: it opened, and 192 of its 194
   * pixels were cut off, so the language menu looked like it did nothing.
   *
   * Rendering the list on <body> at fixed coordinates escapes both the clip and
   * the header's stacking context — the same fix the currency selector beside
   * it already carries.
   */
  const place = () => {
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = 224;
    const gap = 8;
    const height = panel?.offsetHeight || 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipUp = spaceBelow < height + gap && rect.top > spaceBelow;
    pos = {
      top: flipUp ? Math.max(8, rect.top - height - gap) : rect.bottom + gap,
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
      width
    };
  };

  const portalPanel = (node: HTMLElement) => {
    document.body.appendChild(node);
    panel = node;
    place();
    return {
      destroy: () => {
        panel = null;
        node.remove();
      }
    };
  };

  const onWindowPointerDown = (event: PointerEvent) => {
    if (!open) return;
    const target = event.target as Node;
    // The list is portalled out of `root`, so it needs checking separately.
    if (root?.contains(target) || panel?.contains(target)) return;
    close();
  };

  /*
   * The list is positioned in viewport coordinates, so it has to follow the
   * trigger as the page scrolls. Closing on any scroll instead was too blunt:
   * a scroll-restoration jump right after opening shut the menu before it could
   * be seen. It closes only once the trigger itself is gone — which is what
   * happens when the utility strip folds away.
   */
  const onWindowScroll = () => {
    if (!open) return;
    const rect = trigger?.getBoundingClientRect();
    if (!rect || rect.height === 0) close();
    else place();
  };
</script>

<svelte:window on:pointerdown={onWindowPointerDown} on:scroll={onWindowScroll} on:resize={place} />

{#if options.length > 1}
  <div class="relative" bind:this={root} role="presentation">
    <button
      bind:this={trigger}
      class={bare
        ? 'inline-flex items-center gap-1.5 rounded text-inherit transition hover:text-white'
        : 'inline-flex h-11 items-center gap-2 rounded-xl border border-ink/15 bg-surface px-3 text-sm font-semibold text-heading transition hover:border-goldfinch-gold/60'}
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label="Change language"
      on:click={() => (open = !open)}
    >
      <Globe size={bare ? 13 : 16} class={bare ? '' : 'text-forest/70'} />
      <span class={bare ? 'text-[12px] font-medium uppercase' : 'uppercase'}>{current}</span>
      {#if bare}<ChevronDown size={12} class={`opacity-80 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />{/if}
    </button>

    {#if open}
      <ul
        use:portalPanel
        class="fixed z-[130] max-h-[min(60vh,340px)] overflow-y-auto rounded-[10px] border border-ink/10 bg-surface p-1.5 shadow-[0_20px_50px_rgba(57,61,50,0.18)]"
        style={`top:${pos.top}px; left:${pos.left}px; width:${pos.width}px;`}
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
              data-locale-switch
              on:click={() => rememberLocale(language.code)}
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
