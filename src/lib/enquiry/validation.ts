/** Match the booking/contact API's email validation before making a request. */
export const isEnquiryEmail = (value: string): boolean => /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i.test(value.trim());
export const isEnquiryPhone = (value: string): boolean => /^\+?[\d\s().-]+$/.test(value.trim()) && /^\d{6,15}$/.test(value.replace(/\D/g, ''));

/**
 * How many digits a number has after its country code (without the leading 0
 * people type at home), for the dial codes the forms offer. Ranges allow
 * landlines as well as mobiles; anything else gets the international limit.
 */
const NATIONAL_DIGITS: Record<string, [number, number]> = {
  '+255': [9, 9], '+254': [9, 9], '+256': [9, 9], '+250': [9, 9],
  '+44': [9, 10], '+1': [10, 10], '+49': [6, 11], '+33': [9, 9],
  '+34': [9, 9], '+39': [6, 11], '+31': [9, 9], '+41': [9, 9],
  '+61': [9, 9], '+43': [6, 13], '+27': [9, 9], '+971': [8, 9]
};
export const phoneDigitRange = (dialCode: string): [number, number] =>
  NATIONAL_DIGITS[dialCode] ?? [6, Math.max(6, 15 - dialCode.replace(/\D/g, '').length)];

/** The number's own digits: punctuation and one leading trunk 0 removed. */
const nationalDigits = (value: string) => value.replace(/\D/g, '').replace(/^0/, '');

/** A real-length number for this country: only digits and the usual separators. */
export const isEnquiryPhoneFor = (dialCode: string, value: string): boolean => {
  if (!/^[\d\s().-]+$/.test(value.trim())) return false;
  const [min, max] = phoneDigitRange(dialCode);
  const count = nationalDigits(value).length;
  return count >= min && count <= max;
};

/**
 * What the phone box keeps of what was typed or pasted: digits and single
 * spaces, no more digits than the country's longest number (plus a typed
 * leading 0). A pasted "+49 151…" or "0049 151…" picks its own country code
 * when it is one of `codes`.
 */
export const cleanPhoneInput = (value: string, dialCode: string, codes: readonly string[]): { phone: string; dialCode: string } => {
  let phone = value;
  const international = value.trim().match(/^(?:\+|00)\s*(\d[\d\s().-]*)$/);
  if (international) {
    const digits = international[1].replace(/\D/g, '');
    const code = [...codes].sort((a, b) => b.length - a.length).find((c) => digits.startsWith(c.slice(1)));
    if (code) {
      dialCode = code;
      phone = digits.slice(code.length - 1);
    }
  }
  phone = phone.replace(/[^\d\s]/g, '').replace(/\s+/g, ' ').replace(/^\s/, '');
  const limit = phoneDigitRange(dialCode)[1] + (phone.replace(/\D/g, '').startsWith('0') ? 1 : 0);
  let kept = 0;
  phone = Array.from(phone).filter((char) => !/\d/.test(char) || ++kept <= limit).join('');
  return { phone, dialCode };
};
export const newEnquiryKey = (): string => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
/** A successful HTTP response alone is not proof that a lead was stored. */
export function savedEnquiryReference(data: unknown, booking = true): string {
  if (!data || typeof data !== 'object') throw new Error('Missing saved enquiry');
  const row = data as Record<string, unknown>;
  const reference = booking ? row.booking_code : row.id;
  if (typeof row.id !== 'string' || !row.id.trim() || typeof reference !== 'string' || !reference.trim()) throw new Error('Missing enquiry reference');
  return reference;
}
