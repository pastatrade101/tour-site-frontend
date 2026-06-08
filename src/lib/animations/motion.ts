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

let gsapContext: Promise<GsapContext | null> | null = null;

export function prefersReducedMotion() {
  return browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function setFinalVisible(node: HTMLElement) {
  node.style.opacity = '1';
  node.style.transform = 'none';
  node.style.visibility = 'visible';
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
  let destroyed = false;
  let cleanup = () => {};

  if (!browser) {
    return cleanup;
  }

  if (prefersReducedMotion()) {
    document.documentElement.classList.remove('lenis');
    return cleanup;
  }

  void Promise.all([import('lenis'), setupGsap()]).then(([lenisModule, context]) => {
    if (destroyed || !context) return;

    const { gsap, ScrollTrigger } = context;
    const Lenis = lenisModule.default;
    const lenis = new Lenis({
      duration: 0.9,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5
    });

    // Drive Lenis from the GSAP ticker so smooth scroll and ScrollTrigger share a
    // single frame loop — two competing requestAnimationFrame loops are the main
    // cause of stutter and elements/images appearing to "reload" while scrolling.
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    document.documentElement.classList.add('lenis');

    // Recompute trigger positions once late-loading (lazy / API) images settle,
    // otherwise reveals and the hero parallax fire against a stale page height.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    const refreshTimer = window.setTimeout(refresh, 800);

    cleanup = () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      window.removeEventListener('load', refresh);
      window.clearTimeout(refreshTimer);
      lenis.destroy();
      document.documentElement.classList.remove('lenis');
    };
  });

  return () => {
    destroyed = true;
    cleanup();
  };
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
  return withMotion(node, ({ gsap }) => {
    const tween = gsap.fromTo(
      node,
      { autoAlpha: 0, y: params.y ?? 22 },
      {
        autoAlpha: 1,
        delay: params.delay ?? 0,
        duration: params.duration ?? 0.7,
        ease: params.ease ?? 'power3.out',
        scrollTrigger: {
          once: params.once ?? true,
          start: params.start ?? 'top 86%',
          trigger: node
        },
        y: 0
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  });
};

export const staggeredCardReveal: Action<HTMLElement, StaggerOptions | undefined> = (node, params = {}) => {
  return withMotion(node, ({ gsap }) => {
    const targets = params.selector
      ? Array.from(node.querySelectorAll(params.selector))
      : Array.from(node.children);

    if (!targets.length) return () => {};

    const tween = gsap.fromTo(
      targets,
      { autoAlpha: 0, y: params.y ?? 18 },
      {
        autoAlpha: 1,
        delay: params.delay ?? 0,
        duration: params.duration ?? 0.6,
        ease: params.ease ?? 'power3.out',
        scrollTrigger: {
          once: params.once ?? true,
          start: params.start ?? 'top 84%',
          trigger: node
        },
        stagger: params.stagger ?? 0.08,
        y: 0
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  });
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
  return withMotion(node, ({ gsap }) => {
    const tween = gsap.fromTo(
      node,
      { autoAlpha: 0, y: params.y ?? 16 },
      {
        autoAlpha: 1,
        delay: params.delay ?? 0,
        duration: params.duration ?? 0.75,
        ease: params.ease ?? 'power2.out',
        scrollTrigger: {
          once: params.once ?? true,
          start: params.start ?? 'top 88%',
          trigger: node
        },
        y: 0
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  });
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
