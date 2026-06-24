import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Captures the browser's install prompt so we can offer an in-app "Install app"
// button only when it's actually available (and not already installed).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: BeforeInstallPromptEvent | null = null;

/** True only when the browser has offered an install prompt we can replay. */
export const canInstall = writable(false);

const isInstalled = (): boolean =>
  browser &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true);

export const setupPwaInstall = (): void => {
  if (!browser || isInstalled()) return;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // stop Chrome's mini-infobar; we show our own button
    deferred = event as BeforeInstallPromptEvent;
    canInstall.set(true);
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    canInstall.set(false);
  });
};

/** Replay the captured prompt. No-op if unavailable. */
export const promptInstall = async (): Promise<void> => {
  if (!deferred) return;
  try {
    await deferred.prompt();
    await deferred.userChoice;
  } catch {
    /* user dismissed or prompt unavailable */
  }
  deferred = null;
  canInstall.set(false);
};
