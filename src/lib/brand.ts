export const brand = {
  adminName: 'Goldfinch CMS',
  aiAdvisorName: 'Goldfinch AI Travel Advisor',
  companyName: 'Goldfinch Adventures Limited',
  name: 'Goldfinch Adventures',
  platformName: 'Goldfinch Travel Platform',
  positioning: 'Travelers do not need more options. They need more confidence.',
  primaryCta: 'Plan My Trip',
  productName: 'East Africa Travel Platform',
  secondaryCta: 'Talk to a Travel Advisor',
  tagline: "Africa's Most Trusted Travel Planning Brand",
  whatsappCta: 'Chat on WhatsApp'
};

/**
 * i18n keys for the visitor-facing lines of `brand`. The English values above
 * still seed the admin Branding defaults; public pages render these keys with
 * `$t(brandKeys.x)` so the copy follows the visitor's language. The en.json
 * entry for each key carries the same English as the value above.
 */
export const brandKeys = {
  positioning: 'brand.positioning',
  primaryCta: 'cta.plan_my_trip',
  secondaryCta: 'cta.talk_to_advisor',
  tagline: 'brand.tagline',
  whatsappCta: 'brand.whatsapp_cta'
} as const;
