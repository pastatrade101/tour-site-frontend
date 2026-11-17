import { writable } from 'svelte/store';
import type { TwoFactorStatus } from '$lib/api/client';

/**
 * The signed-in account's two-step sign-in state, shared by the CMS shell
 * (the reminder under the top bar, the profile menu) and the Sign-in security
 * page, so turning it on there takes the reminder away at once.
 * Null until it has been read, or when it could not be.
 */
export const twoFactorStatus = writable<TwoFactorStatus | null>(null);

/**
 * "Not now" on the reminder. Kept in this browser only, and cleared by signing
 * in or out, so every sign-in asks again until two-step sign-in is on.
 */
export const TWO_STEP_LATER_KEY = 'admin_two_step_later';
