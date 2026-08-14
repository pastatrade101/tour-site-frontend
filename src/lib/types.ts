export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown[];
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  items: T[];
  pagination: Pagination;
};

export type Specialist = {
  id?: string;
  name: string;
  role: string;
  photo?: string | null;
  photo_url?: string | null;
  photo_url_thumbnail?: string | null;
  photo_url_variants?: unknown;
  blurb?: string | null;
  whatsapp_number?: string | null;
  tripadvisor_url?: string | null;
  status?: 'draft' | 'published' | 'archived';
  is_featured?: boolean;
  sort_order?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type CurrencyConfig = {
  code: string;
  name: string;
  symbol: string;
  locale: string;
  decimalDigits: number;
  enabled: boolean;
  available?: boolean;
};

export type CurrencyApiState = {
  provider: string;
  baseCurrency: string;
  supportedCurrencies: CurrencyConfig[];
  rates: Record<string, string>;
  lastUpdated: string | null;
  providerTimestamp: string | null;
  expiresAt: string | null;
  nextRefresh: string | null;
  isStale: boolean;
  status: 'success' | 'stale' | 'missing';
  markupPercent: number;
};

export type Tour = {
  id: string;
  title: string;
  slug: string;
  short_description?: string;
  full_description?: string;
  seo_title?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  destination_id?: string | null;
  category_id?: string | null;
  specialist_id?: string | null;
  specialist?: Specialist | null;
  destinations?: { name?: string; slug?: string; country?: string } | null;
  destination_ids?: string[];
  tour_destinations?: Array<{
    destination_id?: string | null;
    sort_order?: number | null;
    is_primary?: boolean | null;
    destinations?: { id?: string; name?: string; slug?: string; country?: string } | null;
  }> | null;
  tour_categories?: { name?: string; slug?: string } | null;
  experience_type?: string | null;
  persona_tags?: string[];
  duration_days?: number;
  duration_nights?: number;
  budget_tier?: string | null;
  price_from?: number;
  currency?: string;
  main_image_url?: string;
  banner_image_url?: string;
  highlights?: string[];
  customization_intro?: string | null;
  customization_options?: string[];
  tour_price_options?: TourPriceOption[];
  tour_pricing_seasons?: TourPricingSeason[];
  difficulty_level?: string | null;
  group_size?: string;
  group_size_min?: number | null;
  group_size_max?: number | null;
  minimum_age?: number | null;
  start_location?: string | null;
  end_location?: string | null;
  itinerary_days?: ItineraryDay[];
  tour_inclusions?: { title: string; sort_order?: number }[];
  tour_exclusions?: { title: string; sort_order?: number }[];
  status?: string;
  is_available?: boolean | null;
  seats_remaining?: number | null;
  is_featured?: boolean;
  is_popular?: boolean;
};

export type TourPriceOption = {
  id: string;
  tour_id: string;
  title: string;
  label?: string | null;
  price: number;
  currency?: string | null;
  price_type: 'per_person' | 'per_group' | 'per_child' | 'single_supplement' | 'upgrade' | 'discount';
  description?: string | null;
  sort_order?: number | null;
};

export type TourGroupPrice = {
  id?: string;
  minimum_travelers: number;
  maximum_travelers?: number | null;
  room_count: number;
  price?: number | null;
  price_status: 'FIXED_PRICE' | 'ON_REQUEST' | 'NOT_AVAILABLE';
  sort_order?: number;
};

export type TourPricingSeason = {
  id?: string;
  tour_id?: string;
  season_type: 'STANDARD_SEASON' | 'PEAK_SEASON' | 'CUSTOM';
  season_name: string;
  start_date?: string | null;
  end_date?: string | null;
  currency: string;
  pricing_basis: 'PER_PERSON' | 'PER_GROUP';
  status: 'ACTIVE' | 'INACTIVE';
  sort_order?: number;
  group_prices: TourGroupPrice[];
};

export type TourCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  who_its_for?: string | null;
  fitness?: string | null;
  highlights?: string[] | null;
  icon_url?: string | null;
  image_url?: string | null;
  lottie_url?: string | null;
  status?: 'draft' | 'published' | 'archived';
  sort_order?: number | null;
  meta_title?: string | null;
  meta_description?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ItineraryDay = {
  day_number: number;
  title: string;
  description?: string | null;
  /** Free text — still the fallback for any day with no linked property. */
  accommodation?: string | null;
  accommodation_id?: string | null;
  /** The linked property, joined by the API. Null when the day uses free text. */
  lodge?: {
    id: string;
    name: string;
    slug: string;
    lodge_type?: string | null;
    accommodation_level?: string | null;
    hero_image_url?: string | null;
    image_url?: string | null;
    lodge_images?: Array<{ id?: string; image_url?: string | null; alt_text?: string | null; caption?: string | null; sort_order?: number; is_cover?: boolean }>;
    destinations?: { name?: string | null } | null;
  } | null;
  meals?: string | null;
  activities?: string | null;
  image_url?: string | null;
};

export type Destination = {
  id: string;
  name: string;
  slug: string;
  country?: string;
  region?: string;
  location?: string;
  short_description?: string;
  description?: string;
  image_url?: string;
  main_image_url?: string;
  banner_image_url?: string;
  latitude?: number;
  longitude?: number;
  safety_overview?: string;
  health_vaccinations?: string;
  security_advice?: string;
  travel_insurance_note?: string;
  emergency_contacts?: string;
  score_wildlife?: number | null;
  score_luxury?: number | null;
  score_family?: number | null;
  score_photography?: number | null;
  score_adventure?: number | null;
  score_budget_from?: number | null;
  guide?: Array<Record<string, unknown>> | null;
  guide_reviewed_at?: string | null;
  status?: string;
  is_featured?: boolean;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
};

export type Country = {
  id: string;
  name: string;
  slug: string;
  hero_image_url?: string;
  intro_text?: string;
  best_months?: string[];
  visa_info?: string;
  health_info?: string;
  currency?: string;
  capital?: string;
  phase?: string;
  status?: string;
  is_featured?: boolean;
  seo_title?: string;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
};

export type LodgeImage = {
  id?: string;
  image_url: string;
  alt_text?: string | null;
  caption?: string | null;
  sort_order?: number;
  is_cover?: boolean;
  category?: string;
  is_featured?: boolean;
};

export type Amenity = {
  id: string;
  name: string;
  icon_key?: string | null;
  sort_order?: number;
};

export type Lodge = {
  /** Attached by GET /lodges/:slug. Empty until the gallery is populated. */
  /** Gallery cover, attached by the list endpoint as a card fallback. */
  cover_image_url?: string | null;
  images?: LodgeImage[];
  amenities?: Amenity[];
  /** Tours whose itinerary genuinely stays here — never a same-area guess. */
  featured_in_tours?: Tour[];
  highlights?: Array<{ id?: string; title: string; sort_order?: number }>;
  rooms?: Array<{ id:string; name:string; room_type?:string; short_description?:string; max_adults?:number; max_children?:number; max_guests?:number; bed_types?:string[]; bed_configuration?:string; unit_count?:number; views?:string[]; view?:string; amenities?:string[]; lodge_room_images?:LodgeImage[] }>;
  rates?: Array<{season_name:string;valid_from:string;valid_until:string;currency:string;rack_rate?:number;single_rate?:number;double_rate?:number;triple_rate?:number;child_rate?:number;single_supplement?:number;pricing_basis:string;meal_plan:string}>;
  inclusions?: Array<{title:string;is_included:boolean;sort_order?:number}>;
  experiences?: Array<{id:string;name:string;slug:string}>;
  related_destinations?: Array<{id:string;name:string;slug:string;country?:string}>;
  alternatives?: Lodge[];
  id: string;
  name: string;
  slug: string;
  destination_id?: string | null;
  destinations?: { name: string; slug: string } | null;
  accommodation_level: 'BUDGET' | 'MID_RANGE' | 'LUXURY' | 'PREMIUM_LUXURY';
  lodge_type: 'HOTEL'|'SAFARI_LODGE'|'TENTED_CAMP'|'MOBILE_CAMP'|'BEACH_RESORT'|'VILLA'|'GUEST_HOUSE'|'ECO_LODGE'|'BOUTIQUE_HOTEL';
  short_description?: string;
  country?: string; region?: string; park_area?: string; settings?: string[]; recommended_nights?: number; best_months?: string[];
  google_maps_url?: string; latitude?: number; longitude?: number; nearest_airport?: string; transfer_time?: string; distance_airstrip?: string; distance_park_gate?: string; road_accessibility?: string; fly_in_available?: boolean; transfer_available?: boolean;
  mobile_hero_image_url?: string; social_image_url?: string; indexable?: boolean;
  children_allowed?: boolean; minimum_child_age?: number; family_friendly?: boolean; honeymoon_friendly?: boolean; accessibility?: string; electricity_availability?: string; wifi_availability?: string; mobile_networks?: string[]; wheelchair_accessible?:boolean; show_rates_publicly?:boolean; show_property_publicly?:boolean; arrival_instructions?: string; traveler_notes?: string;
  description?: string;
  why_we_recommend?: string;
  hero_image_url?: string;
  image_url?: string;
  price_per_night_from?: number | null;
  currency?: string;
  best_for?: string[];
  romantic_rating?: number | null;
  family_rating?: number | null;
  website_url?: string;
  status?: string;
  is_featured?: boolean;
  seo_title?: string;
  meta_title?: string;
  meta_description?: string;
};

export type Activity = {
  id: string;
  name: string;
  slug: string;
  destination_id?: string | null;
  destinations?: { name: string; slug: string } | null;
  location_label?: string | null;
  category: 'wildlife' | 'adventure' | 'cultural' | 'water' | 'trekking' | 'relaxation';
  difficulty?: 'easy' | 'moderate' | 'challenging' | 'strenuous' | null;
  description?: string;
  why_we_recommend?: string;
  highlights?: string[];
  hero_image_url?: string;
  image_url?: string;
  duration_label?: string | null;
  price_from?: number | null;
  currency?: string;
  price_unit?: string | null;
  badge?: string | null;
  best_season?: string[];
  status?: string;
  is_featured?: boolean;
  seo_title?: string;
  meta_title?: string;
  meta_description?: string;
};

export type TripPoint = {
  id: string;
  name: string;
  slug: string;
  destination_id?: string | null;
  destinations?: { name: string; slug: string } | null;
  role: 'start' | 'end' | 'both';
  gateway_type: 'airport' | 'city' | 'hotel' | 'border' | 'station';
  airport_code?: string | null;
  description?: string;
  transfer_info?: string;
  hero_image_url?: string;
  image_url?: string;
  status?: string;
  is_featured?: boolean;
  sort_order?: number | null;
  seo_title?: string;
  meta_title?: string;
  meta_description?: string;
};

export type SafetyTopic = {
  id: string;
  title: string;
  slug: string;
  category: 'general' | 'health' | 'security' | 'wildlife' | 'practical';
  icon?: string | null;
  summary?: string;
  content?: string;
  image_url?: string;
  status?: string;
  is_featured?: boolean;
  sort_order?: number | null;
  seo_title?: string;
  meta_title?: string;
  meta_description?: string;
};

export type TravelStyle = {
  id: string;
  name: string;
  slug: string;
  emotional_promise?: string;
  description?: string;
  desires?: string[];
  concerns?: string[];
  persona?: string | null;
  hero_image_url?: string;
  image_url?: string;
  status?: string;
  is_featured?: boolean;
  sort_order?: number | null;
  seo_title?: string;
  meta_title?: string;
  meta_description?: string;
};

export type ComparisonDimension = { label: string; a: string; b: string };
export type ComparisonFaq = { q: string; a: string };

export type Comparison = {
  id: string;
  title: string;
  slug: string;
  eyebrow?: string;
  intro?: string;
  a_name: string;
  a_image_url?: string | null;
  b_name: string;
  b_image_url?: string | null;
  dimensions?: ComparisonDimension[];
  verdict?: string;
  cta_label?: string | null;
  cta_href?: string | null;
  faqs?: ComparisonFaq[];
  status?: string;
  is_featured?: boolean;
  sort_order?: number | null;
  seo_title?: string;
  meta_title?: string;
  meta_description?: string;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  featured_image_url?: string;
  status?: string;
  author_name?: string;
};

export type Testimonial = {
  id: string;
  client_name: string;
  client_country?: string;
  client_image_url?: string;
  rating?: number;
  message: string;
  tour_id?: string | null;
  tours?: { id: string; slug: string; title: string } | null;
  status?: 'draft' | 'published' | 'archived';
  is_featured?: boolean;
  sort_order?: number;
};

// Platform-attributed review (TripAdvisor / SafariBookings / Google). Distinct
// from Testimonial: powers the reviews trust widget + AggregateRating JSON-LD.
export type ReviewPlatform = 'TripAdvisor' | 'SafariBookings' | 'Google';

export type Review = {
  id: string;
  platform: ReviewPlatform;
  author_name: string;
  author_initials?: string;
  author_photo_url?: string | null;
  country?: string;
  message: string;
  rating: number;
  source_url?: string;
  tour_id?: string | null;
  tour_title?: string | null;
  tours?: {
    id: string;
    title: string;
    slug: string;
    main_image_url?: string | null;
    banner_image_url?: string | null;
  } | null;
  status?: 'pending' | 'approved';
  is_featured?: boolean;
  sort_order?: number;
  created_at?: string;
};

// GET /reviews/summary — aggregate for AggregateRating rich snippets.
export type ReviewSummary = {
  count: number;
  average: number;
  by_platform: Array<{ platform: string; count: number; average: number }>;
};

// Per-page SEO override (Tier 2). When a row exists for a path, the public page
// uses these values on top of the site defaults; absence changes nothing.
export type PageSeo = {
  id: string;
  path: string;
  title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  canonical_url?: string | null;
  robots?: string;
  structured_data?: Record<string, unknown> | unknown[] | null;
  is_active?: boolean;
  created_at?: string;
};

// Serengeti Great Migration month-by-month calendar entry.
export type MigrationEntry = {
  id: string;
  month: string;
  location?: string;
  note?: string;
  image_url?: string;
  display_order?: number;
  is_published?: boolean;
};

export type FAQ = {
  id: string;
  question: string;
  answer: string;
};

export type AiChatResponse = {
  conversationId: string;
  reply: string;
  tourMatches: Array<Record<string, unknown>>;
};

// Goldfinch AI Travel Advisor — streamed chat (v2).
export type AdvisorRecommendation = {
  tour_id: string;
  title: string;
  slug: string;
  destination: string | null;
  duration_days: number | null;
  price_from: number | null;
  currency: string;
  availability_note: string;
  score: number; // internal — not shown to the visitor
  confidence_label: string; // user-facing qualitative label
  reasons: string[];
  limitations: string[];
  cta: string;
};

export type AdvisorAction = { type: string; label: string; url?: string };

export type AdvisorMeta = { conversation_id: string; language: string; route: string; degraded: boolean };

export type AdvisorDonePayload = {
  conversation_id: string;
  reply: string;
  language: string;
  lead_context?: Record<string, unknown>;
  recommendations: AdvisorRecommendation[];
  suggested_actions: AdvisorAction[];
  handoff_required: boolean;
  usage?: Record<string, unknown>;
};

export type AdvisorPageContext = {
  path?: string;
  tour_id?: string;
  tour_slug?: string;
  destination_id?: string;
  departure_id?: string;
};
