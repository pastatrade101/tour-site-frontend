/** Match the booking/contact API's email validation before making a request. */
export const isEnquiryEmail = (value: string): boolean => /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i.test(value.trim());
export const isEnquiryPhone = (value: string): boolean => /^\+?[\d\s().-]+$/.test(value.trim()) && /^\d{6,15}$/.test(value.replace(/\D/g, ''));
export const newEnquiryKey = (): string => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
/** A successful HTTP response alone is not proof that a lead was stored. */
export function savedEnquiryReference(data: unknown, booking = true): string {
  if (!data || typeof data !== 'object') throw new Error('Missing saved enquiry');
  const row = data as Record<string, unknown>;
  const reference = booking ? row.booking_code : row.id;
  if (typeof row.id !== 'string' || !row.id.trim() || typeof reference !== 'string' || !reference.trim()) throw new Error('Missing enquiry reference');
  return reference;
}
