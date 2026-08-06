import { env as publicEnv } from '$env/dynamic/public';

// ----------------------------------------------------------------------------
// imgUrl — return a right-sized image URL for the requested render width.
//   • Unsplash (images.unsplash.com): append CDN sizing (free, always safe).
//     Most seed/CMS images are raw Unsplash URLs with NO params, so they serve
//     the full multi-MB original — this is the single biggest perf win.
//   • Supabase storage public URLs: use the render/image transform, but ONLY
//     when PUBLIC_SUPABASE_IMG_TRANSFORM=true (image transforms are a paid
//     Supabase feature — default off so we never break uploaded images).
//   • Anything else: returned unchanged.
// ----------------------------------------------------------------------------

const UNSPLASH = 'images.unsplash.com';
const SUPABASE_PUBLIC = '/storage/v1/object/public/';

export const imgUrl = (url: string | null | undefined, width = 800, quality = 70): string => {
  if (!url) return '';
  try {
    if (url.includes(UNSPLASH)) {
      const base = url.split('?')[0];
      return `${base}?auto=format&fit=crop&w=${width}&q=${quality}`;
    }
    if (url.includes(SUPABASE_PUBLIC) && publicEnv.PUBLIC_SUPABASE_IMG_TRANSFORM === 'true') {
      const transformed = url.replace(SUPABASE_PUBLIC, '/storage/v1/render/image/public/');
      const sep = transformed.includes('?') ? '&' : '?';
      return `${transformed}${sep}width=${width}&quality=${quality}`;
    }
    return url;
  } catch {
    return url;
  }
};

// Width of the webp the backend generates alongside each upload
// (upload.service.ts THUMBNAIL_WIDTH). Anything asking for more than this from
// the thumbnail is upscaling it.
export const THUMBNAIL_WIDTH = 600;

// Pick the best source URL for a record's image: prefer the server-attached
// `<field>_thumbnail` (a small webp from media_library) over the full-size
// original, walking a fallback chain of fields. Pass the result to imgUrl().
export const thumbUrl = (record: Record<string, any> | null | undefined, ...fields: string[]): string => {
  if (!record) return '';
  for (const field of fields) {
    const value = record[field];
    if (typeof value === 'string' && value) {
      const thumbnail = record[`${field}_thumbnail`];
      return typeof thumbnail === 'string' && thumbnail ? thumbnail : value;
    }
  }
  return '';
};


// Width-aware source selection. `thumbUrl` always prefers the 600px thumbnail,
// which is right for a small tile and wrong for a hero or a large card: with
// Supabase transforms disabled (the default, since they are a paid feature)
// imgUrl cannot resize, so a 600px file gets stretched into a 1600px slot and
// looks soft. Above THUMBNAIL_WIDTH — including retina, so pass the CSS width
// times the DPR you design for — this returns the full-size original and lets
// the browser downscale instead.
export const sourceFor = (
  record: Record<string, any> | null | undefined,
  renderWidth: number,
  ...fields: string[]
): string => {
  if (!record) return '';
  for (const field of fields) {
    const original = record[field];
    if (typeof original !== 'string' || !original) continue;
    const thumbnail = record[`${field}_thumbnail`];
    const useThumbnail = renderWidth <= THUMBNAIL_WIDTH && typeof thumbnail === 'string' && thumbnail;
    return useThumbnail ? thumbnail : original;
  }
  return '';
};
