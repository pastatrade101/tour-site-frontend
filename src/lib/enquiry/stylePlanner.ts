import { isEnquiryEmail, isEnquiryPhoneFor } from './validation';
/** Data shared by the inline category/package enquiry; delivery stays on /bookings. */
export type PlannerField = 'route' | 'days' | 'travelDate' | 'adults' | 'children' | 'language' | 'fullName' | 'email' | 'phone';
export type PlannerValues = {
  days: number | undefined; daysUnsure: boolean; travelDate: string; dateUnsure: boolean;
  // null when a number box is cleared (Svelte's bind:value), undefined before it is touched.
  adults: number | null | undefined; children: number | null | undefined; language: string;
  comfort: string; beach: string; fullName: string; email: string; phone: string;
  dialCode: string; specialRequests: string; whatsappOptIn: boolean; route: string; hp: string;
};
export function plannerProblems(values: PlannerValues, step: number, today: string, hasRoutes: boolean) {
  const errors: Partial<Record<PlannerField, string>> = {};
  if (step === 1) {
    if (hasRoutes && !values.route) errors.route = 'ui.choose_the_route_option_you';
    if (!values.daysUnsure && (!Number.isSafeInteger(values.days) || Number(values.days) < 1)) errors.days = 'style_form.err_days';
    if (!values.dateUnsure) {
      const parsed = new Date(`${values.travelDate}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(values.travelDate) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== values.travelDate) errors.travelDate = 'form.err_start_date';
      else if (values.travelDate < today) errors.travelDate = 'ui.that_date_has_already_passed';
    }
  } else if (step === 2) {
    if (!Number.isSafeInteger(values.adults) || Number(values.adults) < 1) errors.adults = 'form.err_adult_count';
    if (values.children != null && (!Number.isSafeInteger(values.children) || values.children < 0)) errors.children = 'form.err_child_count';
    if (!['en', 'sw', 'de', 'fr', 'es', 'it'].includes(values.language)) errors.language = 'style_form.err_language';
  } else {
    if (values.fullName.trim().length < 2) errors.fullName = 'ui.please_enter_your_full_name';
    if (!isEnquiryEmail(values.email)) errors.email = 'ui.that_email_address_does_not';
    if (values.phone.trim() && !isEnquiryPhoneFor(values.dialCode, values.phone)) errors.phone = 'ui.add_a_number_we_can';
  }
  return errors;
}
type Context = {
  categoryName: string; categorySlug: string; packageName: string; packageSlug: string;
  route?: { label: string; tourTitle: string; tourSlug: string }; hasRouteOptions: boolean;
  pageLocale: string; recap: Array<{ label: string; value: string }>; attribution: unknown;
  pageUrl: string; idempotencyKey: string;
};
export function plannerPayload(values: PlannerValues, context: Context) {
  const tripDays = values.daysUnsure ? 'Not sure yet' : String(values.days);
  const phone = values.phone.trim() ? `${values.dialCode} ${values.phone.trim()}` : null;
  return {
    full_name: values.fullName.trim(), email: values.email.trim(), phone,
    number_of_adults: values.adults, number_of_children: values.children ?? 0,
    travel_date: values.dateUnsure ? null : values.travelDate,
    special_requests: values.specialRequests.trim() || null,
    source: 'category_enquiry', whatsapp_opt_in: Boolean(phone && values.whatsappOptIn),
    idempotency_key: context.idempotencyKey, hp_company: values.hp,
    lead_context: {
      v: 1, form_type: 'style_planner', form_name: 'style_planner',
      category: context.categorySlug ? { name: context.categoryName, slug: context.categorySlug } : undefined,
      selected_trip: context.packageName || undefined,
      safari_style: context.categoryName || undefined, safari_style_slug: context.categorySlug || undefined,
      safari_package: context.packageName || undefined, safari_package_slug: context.packageSlug || undefined,
      route_option: context.hasRouteOptions ? values.route : undefined,
      route_option_tour: context.route?.tourTitle, route_option_tour_slug: context.route?.tourSlug,
      trip_days: tripDays, comfort_level: values.comfort || undefined,
      language: values.language, page_locale: context.pageLocale,
      page: { url: context.pageUrl },
      // Named answers reach the staff brief as well as the stored lead context.
      answers: {
        trip_duration: values.daysUnsure ? tripDays : `${tripDays} days`,
        date_flexibility: values.dateUnsure ? 'Dates not decided yet' : 'Exact date',
        accommodation_style: values.comfort || undefined, beach_stay: values.beach || undefined,
        preferred_language: values.language,
        route_option: context.hasRouteOptions ? values.route : undefined
      },
      traveller_recap: context.recap, attribution: context.attribution
    }
  };
}
