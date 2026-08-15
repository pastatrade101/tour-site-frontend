import { browser } from '$app/environment';
import type { Action } from 'svelte/action';

type GsapContext = {
  gsap: any;
  ScrollTrigger: any;
};

type RevealOptions = {
  delay?: number;
  duration?: number;
  ease?: string;
  once?: boolean;
  start?: string;
  y?: number;
};

type StaggerOptions = RevealOptions & {
  selector?: string;
  stagger?: number;
};

type CounterOptions = {
  decimals?: number;
  duration?: number;
  formatter?: (value: number) => string;
  from?: number;
  prefix?: string;
  start?: string;
  suffix?: string;
  value?: number;
};

const HOME_MOTION_CARDS = [
  '.experience-card',
  '.destination-card',
  '.package-card',
  '.home-why-card',
  '.home-how-card',
  '.review-card',
  '.season-card',
  '.migration-card',
  '.gallery-card',
  '.blog-card',
  '.impact-point',
  '.faq-item'
].join(',');

let gsapContext: Promise<GsapContext | null> | null = null;

export function prefersReducedMotion() {
  return browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function setFinalVisible(node: HTMLElement) {
  node.style.opacity = '1';
  node.style.transform = 'none';
  node.style.visibility = 'visible';
}

// ── Lightweight CSS reveals (WOW.js-style) ────────────────────────────────
// Pure IntersectionObserver + GPU transitions (transform + opacity). No async
// library load, no blur — instant and smooth, fires the moment it scrolls in.
const REVEAL_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

function observeOnce(node: HTMLElement, onEnter: () => void) {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        onEnter();
        io.disconnect();
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0 }
  );
  io.observe(node);
  return () => io.disconnect();
}

function hideEl(el: HTMLElement, y: number, duration: number, delay: number) {
  el.style.opacity = '0';
  el.style.transform = `translate3d(0, ${y}px, 0)`;
  el.style.transition = `opacity ${duration}s ${REVEAL_EASE} ${delay}s, transform ${duration}s ${REVEAL_EASE} ${delay}s`;
  el.style.willChange = 'opacity, transform';
}

function showEl(el: HTMLElement) {
  el.style.opacity = '1';
  el.style.transform = 'translate3d(0, 0, 0)';
  const clear = () => {
    el.style.willChange = '';
    el.removeEventListener('transitionend', clear);
  };
  el.addEventListener('transitionend', clear);
}

export function setupGsap() {
  if (!browser) {
    return Promise.resolve(null);
  }

  if (!gsapContext) {
    gsapContext = Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([gsapModule, scrollTriggerModule]) => {
        const gsap = gsapModule.gsap;
        const ScrollTrigger = scrollTriggerModule.ScrollTrigger;

        gsap.registerPlugin(ScrollTrigger);

        return { gsap, ScrollTrigger };
      }
    );
  }

  return gsapContext;
}

export function initSmoothScrolling() {
  // Native, free scrolling — no smooth-scroll inertia (it made the page feel
  // "stuck"/laggy behind the wheel). Scroll reveals (IntersectionObserver) and
  // the hero parallax (ScrollTrigger) both work fine on native scroll.
  if (browser) {
    document.documentElement.classList.remove('lenis');
  }
  return () => {};
}

function withMotion(node: HTMLElement, setup: (context: GsapContext) => () => void) {
  let cleanup = () => {};
  let destroyed = false;

  if (!browser || prefersReducedMotion()) {
    setFinalVisible(node);
    return { destroy: cleanup };
  }

  void setupGsap().then((context) => {
    if (!context || destroyed) return;
    cleanup = setup(context);
  });

  return {
    destroy() {
      destroyed = true;
      cleanup();
    }
  };
}

export const fadeUpOnScroll: Action<HTMLElement, RevealOptions | undefined> = (node, params = {}) => {
  if (!browser || prefersReducedMotion()) {
    setFinalVisible(node);
    return {};
  }
  hideEl(node, params.y ?? 20, params.duration ?? 0.6, params.delay ?? 0);
  const stop = observeOnce(node, () => showEl(node));
  return { destroy: stop };
};

/**
 * One card, revealed as it reaches the viewport.
 *
 * Per card rather than per grid: `staggeredCardReveal` snapshots the children
 * it finds when it mounts, so anything rendered afterwards — a new filter, a
 * different sort — was never hidden and simply appeared. Hanging the reveal on
 * the card itself means every card gets one, whenever it arrives.
 */
export const cardReveal: Action<HTMLElement, { index?: number; y?: number } | undefined> = (
  node,
  params = {}
) => {
  if (!browser || prefersReducedMotion()) {
    setFinalVisible(node);
    return {};
  }

  // The cascade covers a screenful and then stops. Staggering by the true index
  // would leave the fortieth card waiting most of a second after the scroll had
  // already reached it.
  hideEl(node, params.y ?? 14, 0.55, Math.min(params.index ?? 0, 8) * 0.045);

  // …but without the will-change it sets. A card that is never scrolled to
  // would hold that hint for the life of the page, and on a fifty-card index
  // that is fifty compositor layers standing by for an animation most of them
  // never run — more than the reveal itself costs. Opacity and transform are
  // composited here regardless; the hint only ever bought the first frame.
  node.style.willChange = '';

  const io = new IntersectionObserver(
    (entries) => {
      if (!entries[0]?.isIntersecting) return;
      showEl(node);
      io.disconnect();
    },
    // Fires a little before the card is actually on screen, so the stagger is
    // spent by the time anyone is looking at it.
    { rootMargin: '0px 0px 12% 0px', threshold: 0 }
  );
  io.observe(node);

  return { destroy: () => io.disconnect() };
};

/**
 * `animate:flip` settings for the stay cards when the filters change.
 *
 * Distance-scaled: a card crossing the grid takes longer than one nudged along
 * by its neighbour, and it is that difference in pace that reads as a shuffle
 * rather than everything sliding in lockstep.
 *
 * Phones sit it out. There the cards live in horizontal scrollers where a
 * filter change swaps the whole row out, so there is no reflow to animate and
 * the work would be spent for nothing.
 */
export const shuffle = {
  duration: (distance: number) =>
    !browser || prefersReducedMotion() || !window.matchMedia('(min-width: 768px)').matches
      ? 0
      : Math.min(620, 200 + Math.sqrt(distance) * 24)
};

export const staggeredCardReveal: Action<HTMLElement, StaggerOptions | undefined> = (node, params = {}) => {
  const targets = (
    params.selector ? Array.from(node.querySelectorAll<HTMLElement>(params.selector)) : (Array.from(node.children) as HTMLElement[])
  );

  if (!browser || prefersReducedMotion()) {
    targets.forEach(setFinalVisible);
    return {};
  }
  if (!targets.length) return {};

  const y = params.y ?? 20;
  const duration = params.duration ?? 0.6;
  const stagger = params.stagger ?? 0.07;
  const base = params.delay ?? 0;
  targets.forEach((el, i) => hideEl(el, y, duration, base + i * stagger));
  const stop = observeOnce(node, () => targets.forEach(showEl));
  return { destroy: stop };
};

export const heroImageParallax: Action<HTMLElement, { amount?: number } | undefined> = (node, params = {}) => {
  return withMotion(node, ({ gsap }) => {
    const amount = params.amount ?? 5;
    // Promote to its own GPU layer so the scrubbed transform composites instead of
    // repainting/re-decoding the image each frame (the "image reloading" effect).
    node.style.willChange = 'transform';
    node.style.backfaceVisibility = 'hidden';
    const tween = gsap.fromTo(
      node,
      { scale: 1.12, yPercent: -amount },
      {
        ease: 'none',
        force3D: true,
        scrollTrigger: {
          end: 'bottom top',
          invalidateOnRefresh: true,
          scrub: 0.6,
          start: 'top top',
          trigger: node.parentElement ?? node
        },
        yPercent: amount
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      node.style.willChange = '';
    };
  });
};

export const sectionReveal: Action<HTMLElement, RevealOptions | undefined> = (node, params = {}) => {
  if (!browser || prefersReducedMotion()) {
    setFinalVisible(node);
    return {};
  }
  hideEl(node, params.y ?? 16, params.duration ?? 0.6, params.delay ?? 0);
  const stop = observeOnce(node, () => showEl(node));
  return { destroy: stop };
};

// Homepage-wide motion director. It also observes deferred CMS content, so cards
// loaded after the first paint receive the same reveal choreography.
export const homepageMotion: Action<HTMLElement> = (node) => {
  if (!browser || prefersReducedMotion()) {
    node.classList.add('home-motion-ready', 'home-motion-reduced');
    return {};
  }

  node.classList.add('home-motion-ready');
  const prepared = new WeakSet<Element>();
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const section = entry.target as HTMLElement;
        section.classList.add('home-motion-visible');
        sectionObserver.unobserve(section);
      }
    },
    { rootMargin: '0px 0px -9% 0px', threshold: 0.08 }
  );

  const prepare = () => {
    const sections = Array.from(node.querySelectorAll<HTMLElement>(':scope > section'));
    sections.forEach((section, sectionIndex) => {
      if (section.matches('[data-hero]') || prepared.has(section)) return;
      prepared.add(section);
      section.classList.add('home-motion-section');
      section.style.setProperty('--home-section-index', String(sectionIndex));

      const cards = Array.from(section.querySelectorAll<HTMLElement>(HOME_MOTION_CARDS));
      cards.forEach((card, index) => {
        card.classList.add('home-motion-card');
        card.style.setProperty('--home-card-index', String(Math.min(index, 9)));
      });
      sectionObserver.observe(section);
    });
  };

  prepare();
  const mutationObserver = new MutationObserver(prepare);
  mutationObserver.observe(node, { childList: true, subtree: true });

  return {
    destroy() {
      sectionObserver.disconnect();
      mutationObserver.disconnect();
    }
  };
};

export const numberCounter: Action<HTMLElement, CounterOptions | undefined> = (node, params = {}) => {
  const value = params.value ?? Number(node.textContent?.replace(/[^\d.-]/g, '') || 0);
  const decimals = params.decimals ?? 0;
  const format =
    params.formatter ??
    ((current: number) => `${params.prefix ?? ''}${current.toFixed(decimals)}${params.suffix ?? ''}`);

  if (!browser || prefersReducedMotion()) {
    node.textContent = format(value);
    return {};
  }

  return withMotion(node, ({ gsap }) => {
    const state = { value: params.from ?? 0 };
    const tween = gsap.to(state, {
      duration: params.duration ?? 1,
      ease: 'power1.out',
      onUpdate: () => {
        node.textContent = format(state.value);
      },
      scrollTrigger: {
        once: true,
        start: params.start ?? 'top 90%',
        trigger: node
      },
      value
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  });
};

// 3D cursor tilt (vanilla-tilt style) for cards. Pure transforms, no library.
export const tilt: Action<HTMLElement, { max?: number; scale?: number; glare?: boolean } | undefined> = (node, params = {}) => {
  if (!browser || prefersReducedMotion()) return {};

  const max = params.max ?? 7;
  const scale = params.scale ?? 1.02;
  let raf = 0;

  node.style.transformStyle = 'preserve-3d';
  node.style.willChange = 'transform';

  const onMove = (event: MouseEvent) => {
    const rect = node.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      node.style.transition = 'transform 0.08s ease-out';
      node.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) scale(${scale})`;
    });
  };

  const onLeave = () => {
    cancelAnimationFrame(raf);
    node.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
    node.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
  };

  node.addEventListener('mousemove', onMove);
  node.addEventListener('mouseleave', onLeave);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      node.removeEventListener('mousemove', onMove);
      node.removeEventListener('mouseleave', onLeave);
    }
  };
};

// Cinematic heading reveal — words rise + de-blur in sequence on scroll.
export const revealHeading: Action<HTMLElement, { stagger?: number; y?: number; start?: string } | undefined> = (node, params = {}) => {
  if (!(node.textContent ?? '').trim()) return {};

  if (!browser || prefersReducedMotion()) {
    setFinalVisible(node);
    return {};
  }

  /**
   * Keep whatever Svelte rendered here alive, just out of sight.
   *
   * This used to overwrite node.innerHTML outright, which detached the text
   * node Svelte writes updates into. On a same-route navigation — a different
   * destination from the mega menu, say — Svelte reuses the <h1>, sets the new
   * title on a node that is no longer in the document, and the old heading
   * stays on screen indefinitely while the rest of the page changes around it.
   *
   * Moving Svelte's children into a hidden holder keeps them in the DOM, so
   * updates still land and a MutationObserver can pick them up and re-split.
   */
  const source = document.createElement('span');
  source.style.display = 'none';
  while (node.firstChild) source.appendChild(node.firstChild);
  node.appendChild(source);

  const stage = document.createElement('span');
  node.appendChild(stage);

  const stagger = params.stagger ?? 0.025;
  const ease = 'cubic-bezier(0.34, 1.4, 0.64, 1)'; // slight Back-style overshoot
  const esc = (c: string) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c);

  let stopObserving = () => {};
  let rendered = '';

  const render = () => {
    const text = (source.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!text || text === rendered) return;
    rendered = text;

    // Split into per-character spans, kept word-safe so words never break
    // across lines, then animate each in with a stagger.
    node.setAttribute('aria-label', text);
    stage.innerHTML = text
      .split(/(\s+)/)
      .map((part) => {
        if (/^\s+$/.test(part)) return part;
        const chars = Array.from(part)
          .map((c) => `<span class="reveal-char" style="display:inline-block;will-change:transform,opacity">${esc(c)}</span>`)
          .join('');
        return `<span style="display:inline-block;white-space:nowrap">${chars}</span>`;
      })
      .join('');

    const chars = Array.from(stage.querySelectorAll<HTMLElement>('.reveal-char'));
    chars.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(0.4em)';
      el.style.transition = `opacity 0.5s ease ${(i * stagger).toFixed(3)}s, transform 0.7s ${ease} ${(i * stagger).toFixed(3)}s`;
    });

    stopObserving();
    stopObserving = observeOnce(node, () => {
      chars.forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'translateX(0)';
      });
    });
  };

  render();

  // Fires when Svelte writes a new title into the hidden holder.
  const watcher = new MutationObserver(render);
  watcher.observe(source, { characterData: true, childList: true, subtree: true });

  return {
    destroy() {
      watcher.disconnect();
      stopObserving();
    }
  };
};

export const navbarEntrance: Action<HTMLElement, RevealOptions | undefined> = (node, params = {}) => {
  return withMotion(node, ({ gsap }) => {
    const tween = gsap.fromTo(
      node,
      { autoAlpha: 0, y: params.y ?? -12 },
      {
        autoAlpha: 1,
        delay: params.delay ?? 0.04,
        duration: params.duration ?? 0.5,
        ease: params.ease ?? 'power2.out',
        y: 0
      }
    );

    return () => tween.kill();
  });
};
