// schema.org JSON-LD builders (SRS v2.0 §7.4). Pair with <JsonLd data={...} />.
import { toPlainText } from '$lib/richText';

export const breadcrumbLd = (origin: string, items: { name: string; path: string }[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: `${origin}${it.path}`
  }))
});

export const faqLd = (faqs: { q: string; a: string }[]) => ({
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: toPlainText(f.a).replace(/\s+/g, ' ').trim() }
  }))
});

// AggregateRating attached to the tour operator (TravelAgency) so Google can show
// review stars. Optionally embeds a few individual reviews. Only emit when there
// is at least one approved review — Google flags AggregateRating with count 0.
export const aggregateRatingLd = (opts: {
  name: string;
  url: string;
  ratingValue: number;
  reviewCount: number;
  reviews?: { author: string; rating: number; body: string; datePublished?: string }[];
}) => ({
  '@type': 'TravelAgency',
  name: opts.name,
  url: opts.url,
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: opts.ratingValue,
    reviewCount: opts.reviewCount,
    bestRating: 5,
    worstRating: 1
  },
  ...(opts.reviews?.length
    ? {
        review: opts.reviews.map((r) => ({
          '@type': 'Review',
          author: { '@type': 'Person', name: r.author },
          reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
          reviewBody: r.body,
          ...(r.datePublished ? { datePublished: r.datePublished } : {})
        }))
      }
    : {})
});
