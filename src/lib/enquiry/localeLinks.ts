import { localeNavigationHref } from '$lib/i18n';

/** Rewrite actual hrefs, so keyboard, modifier-click and new-tab navigation agree. */
export function installLocaleLinks(context: () => { locale: string; admin: boolean; origin: string }) {
  const originals = new WeakMap<HTMLAnchorElement, { original: string; written: string }>();
  let pending = false;
  let stopped = false;
  const refresh = () => {
    if (pending || stopped) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      if (stopped) return;
      const { locale, admin, origin } = context();
      for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
        const current = anchor.getAttribute('href') ?? '';
        const previous = originals.get(anchor);
        const original = previous?.written === current ? previous.original : current;
        const skip = admin || anchor.hasAttribute('download') || anchor.hasAttribute('data-locale-switch');
        const written = skip ? original : localeNavigationHref(original, location.href, locale, origin);
        originals.set(anchor, { original, written });
        if (current !== written) anchor.setAttribute('href', written);
      }
    });
  };
  const observer = new MutationObserver(refresh);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'data-locale-switch', 'download'] });
  refresh();
  return { refresh, stop: () => { stopped = true; observer.disconnect(); } };
}
