import { writable } from 'svelte/store';
import { brand } from '$lib/brand';

export type BrandColors = {
  clay: string;
  deep_green: string;
  forest: string;
  goldfinch_gold: string;
  ink: string;
  sand: string;
  savanna: string;
};

export type Branding = {
  ai_advisor_name: string;
  colors: BrandColors;
  company_name: string;
  favicon_url: string;
  logo_url: string;
  positioning: string;
  primary_cta: string;
  secondary_cta: string;
  site_name: string;
  support_email: string;
  support_phone: string;
  tagline: string;
  whatsapp_cta: string;
};

export const defaultColors: BrandColors = {
  clay: '#b86b45',
  deep_green: '#0F2F24',
  forest: '#1f4d3a',
  goldfinch_gold: '#D9A441',
  ink: '#18211f',
  sand: '#F7F1E3',
  savanna: '#E9D8A6'
};

export const defaultBranding: Branding = {
  ai_advisor_name: brand.aiAdvisorName,
  colors: { ...defaultColors },
  company_name: brand.companyName,
  favicon_url: '',
  logo_url: '',
  positioning: brand.positioning,
  primary_cta: brand.primaryCta,
  secondary_cta: brand.secondaryCta,
  site_name: brand.name,
  support_email: '',
  support_phone: '',
  tagline: brand.tagline,
  whatsapp_cta: brand.whatsappCta
};

export const branding = writable<Branding>(defaultBranding);

// Maps each color key to its CSS custom property (defined in app.css :root).
const cssVarMap: Record<keyof BrandColors, string> = {
  clay: '--c-clay',
  deep_green: '--c-deep-green',
  forest: '--c-forest',
  goldfinch_gold: '--c-goldfinch-gold',
  ink: '--c-ink',
  sand: '--c-sand',
  savanna: '--c-savanna'
};

/** Convert "#1f4d3a" → "31 77 58" (the space-separated RGB Tailwind needs). */
export const hexToRgbTriple = (hex: string): string | null => {
  const match = /^#?([0-9a-fA-F]{6})$/.exec((hex ?? '').trim());
  if (!match) return null;
  const int = parseInt(match[1], 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
};

export const applyBrandColors = (colors: Partial<BrandColors>) => {
  if (typeof document === 'undefined') return;
  for (const key of Object.keys(cssVarMap) as (keyof BrandColors)[]) {
    const value = colors[key];
    if (!value) continue;
    const triple = hexToRgbTriple(value);
    if (triple) document.documentElement.style.setProperty(cssVarMap[key], triple);
  }
};

const setFavicon = (url: string) => {
  if (typeof document === 'undefined' || !url) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
};

/** Merge incoming branding with defaults, update the store, and apply colors + favicon live. */
export const applyBranding = (data: Partial<Branding> | null | undefined) => {
  const incoming = data ?? {};
  const merged: Branding = {
    ...defaultBranding,
    ...incoming,
    colors: { ...defaultColors, ...(incoming.colors ?? {}) }
  };
  branding.set(merged);
  applyBrandColors(merged.colors);
  if (merged.favicon_url) setFavicon(merged.favicon_url);
  return merged;
};
