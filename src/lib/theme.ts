import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

// The site is LIGHT-ONLY — dark mode has been removed. These exports remain for
// backwards compatibility, but the theme always resolves to light and dark mode
// can never be enabled.
export const theme = writable<Theme>('light');

const forceLight = () => {
  if (!browser) return;
  document.documentElement.classList.remove('dark');
  try {
    localStorage.setItem('theme', 'light');
  } catch {
    // storage may be unavailable — light still applies in-session
  }
};

// Ensure any previously-saved dark preference is cleared on load.
if (browser) forceLight();

export const toggleTheme = forceLight;
export const setTheme = (_value?: Theme) => forceLight();
