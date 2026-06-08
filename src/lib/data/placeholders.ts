import type { BlogPost, Destination, FAQ, Testimonial, Tour } from '$lib/types';

export const placeholderTours: Tour[] = [
  {
    id: 'sample-tour-1',
    title: 'Serengeti Migration Safari',
    slug: 'serengeti-migration-safari',
    short_description: 'A guided wildlife itinerary through open savannah and migration corridors.',
    duration_days: 5,
    duration_nights: 4,
    price_from: 1850,
    currency: 'USD',
    main_image_url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801'
  },
  {
    id: 'sample-tour-2',
    title: 'Kenya Safari and Coast',
    slug: 'kenya-safari-and-coast',
    short_description: 'A balanced Kenya safari and beach itinerary with advisor-reviewed pacing.',
    duration_days: 4,
    duration_nights: 3,
    price_from: 920,
    currency: 'USD',
    main_image_url: 'https://images.unsplash.com/photo-1558981001-1995369a39cd'
  }
];

export const placeholderDestinations: Destination[] = [
  {
    id: 'sample-destination-1',
    name: 'Serengeti National Park',
    slug: 'serengeti-national-park',
    country: 'Tanzania',
    region: 'Northern Circuit',
    description: 'Wildlife plains, big cats, and seasonal migration routes.',
    image_url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801'
  },
  {
    id: 'sample-destination-2',
    name: 'Kenya',
    slug: 'kenya',
    country: 'Kenya',
    region: 'Masai Mara and Coast',
    description: 'Big cat safaris, migration crossings, and Indian Ocean beach stays.',
    image_url: 'https://images.unsplash.com/photo-1558981001-1995369a39cd'
  }
];

export const placeholderPosts: BlogPost[] = [
  {
    id: 'sample-post-1',
    title: 'How to Choose Your First Safari',
    slug: 'how-to-choose-your-first-safari',
    excerpt: 'A practical planning note for first-time safari travelers.',
    featured_image_url: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e',
    author_name: 'Tour Team'
  }
];

export const placeholderTestimonials: Testimonial[] = [
  {
    id: 'sample-testimonial-1',
    client_name: 'Amelia Carter',
    client_country: 'United Kingdom',
    message: 'The itinerary was clear, the guide team was prepared, and the whole trip felt carefully managed.',
    rating: 5
  }
];

export const placeholderFaqs: FAQ[] = [
  {
    id: 'sample-faq-1',
    question: 'Can I customize a tour itinerary?',
    answer: 'Yes. The CMS and booking request flow are prepared for custom notes, dates, and group details.'
  },
  {
    id: 'sample-faq-2',
    question: 'Can admins upload images?',
    answer: 'Yes. The backend includes a Supabase Storage upload endpoint and the admin UI includes an uploader component.'
  }
];
