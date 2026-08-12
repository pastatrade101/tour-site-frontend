# Goldfinch Cloudflare R2/CDN Runbook

## Invariant

Never rewrite a media lookup key. `media_library.file_url` and all CMS image
columns keep their existing Supabase public URL. `file_path` is the portable
object key. The browser alone rewrites a managed URL to the CDN origin.

This preserves thumbnail/variant joins, makes rollback immediate, and avoids a
destructive database migration.

## Cloudflare setup

1. Create an R2 bucket (recommended name: `goldfinch-media`).
2. Create an R2 API token with Object Read & Write for that bucket.
3. Record the account ID, access-key ID, and secret access key.
4. Attach a public custom domain (recommended) or enable an `r2.dev` URL.
5. Configure cache rules for immutable media objects as appropriate.

## Backend configuration

See `backend/.env.example`:

```env
R2_ENABLED=false
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=goldfinch-media
R2_PUBLIC_URL=https://media.example.com
MEDIA_MAX_ORIGINAL_WIDTH=2400
MEDIA_ORIGINAL_QUALITY=82
```

R2 credentials are backend-only. The write path falls back to Supabase unless
`R2_ENABLED=true` and every required R2 value is present.

## Frontend configuration

```env
PUBLIC_MEDIA_CDN_URL=https://media.example.com
```

`cdnUrl()` maps only managed Supabase public-object URLs to this origin. External
URLs, data URLs, blobs, and local assets are unchanged. `origUrl()` exists for
database/API lookup and mutation flows that must retain the raw value.

## Strict rollout order

1. Deploy the code with R2 disabled and `PUBLIC_MEDIA_CDN_URL` unset.
2. Back up the Supabase bucket and database.
3. Down-cap oversized originals in place:
   `npm run media:downcap` (backend, with `R2_ENABLED=false`).
4. Generate any missing responsive variants: `npm run backfill:responsive`.
5. Set complete R2 credentials temporarily and run `npm run media:migrate-r2`.
6. Verify representative originals, thumbnails, WebP variants, AVIF variants,
   videos, and Lottie files directly on `R2_PUBLIC_URL`.
7. Deploy backend with `R2_ENABLED=true`. Confirm a new admin upload and delete.
8. Only then deploy frontend with `PUBLIC_MEDIA_CDN_URL` set.
9. Verify homepage, tours, destinations, accommodation, blog, gallery, admin
   media previews, Open Graph images, and mobile rendering.

## Rollback

Unset `PUBLIC_MEDIA_CDN_URL` to make browsers use the untouched Supabase URLs.
Set `R2_ENABLED=false` to send new writes back to Supabase. No database rewrite
is required in either direction.

## Verification commands

- Backend: `npm run build && npm test`
- Frontend: `npm run check && npm run build`
- Migration is idempotent and may be rerun; any failed object makes it exit 1.
- Compare object counts and sample file hashes before enabling the frontend CDN.

## Gotchas

- Never store a CDN URL back into CMS/database image fields.
- Never enable the frontend CDN before every referenced object exists in R2.
- Preserve the full object key, including nested `responsive/` and `thumbnails/`.
- Do not apply image rewriting to third-party URLs.
- Keep `R2_SECRET_ACCESS_KEY` and the access-key ID out of frontend environments.
- R2 custom-domain CORS/cache settings are separate from the S3 API endpoint.
- A missing srcset candidate can break browser selection; migrate all recorded
  `variant_widths` and AVIF objects before cutover.
