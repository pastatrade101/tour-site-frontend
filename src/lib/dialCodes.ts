/**
 * The dial codes the phone controls offer.
 *
 * East Africa first because that is where a trip starts, then the countries our
 * travellers actually come from. Deliberately short: a picker with every code in
 * the world is slower to use and no more accurate — anyone outside this list can
 * type their number with its own prefix.
 */
export type DialCode = { code: string; label: string };

export const DIAL_CODES: DialCode[] = [
  { code: '+255', label: '🇹🇿 +255' },
  { code: '+254', label: '🇰🇪 +254' },
  { code: '+256', label: '🇺🇬 +256' },
  { code: '+250', label: '🇷🇼 +250' },
  { code: '+44', label: '🇬🇧 +44' },
  { code: '+1', label: '🇺🇸 +1' },
  { code: '+49', label: '🇩🇪 +49' },
  { code: '+33', label: '🇫🇷 +33' },
  { code: '+34', label: '🇪🇸 +34' },
  { code: '+39', label: '🇮🇹 +39' },
  { code: '+31', label: '🇳🇱 +31' },
  { code: '+61', label: '🇦🇺 +61' }
];

export const DEFAULT_DIAL_CODE = '+255';

/**
 * Split a stored "+255 712 345 678" back into its parts, so reopening a form
 * shows the code the visitor picked rather than resetting it to the default.
 */
export const splitDialCode = (stored: string): { code: string; number: string } => {
  const value = String(stored ?? '').trim();
  if (!value) return { code: DEFAULT_DIAL_CODE, number: '' };
  // Longest first: '+255' must win over '+25' — and over '+2' if it is ever added.
  const match = [...DIAL_CODES]
    .sort((a, b) => b.code.length - a.code.length)
    .find((entry) => value.startsWith(entry.code));
  if (!match) return { code: DEFAULT_DIAL_CODE, number: value };
  return { code: match.code, number: value.slice(match.code.length).trim() };
};
