/**
 * Production server: adapter-node's request handler, plus the two things it
 * does not do for you.
 *
 * 1. Compression. adapter-node precompresses the files it builds, which is why
 *    the CSS and JS bundles already arrive as brotli — but a server-rendered
 *    page is generated per request and went out raw. The homepage document was
 *    138,871 bytes uncompressed; gzipped it is 22,014. That is 114 KiB removed
 *    from the critical path, and on a throttled connection it is worth more
 *    than the byte count suggests: 138 KiB takes roughly ten round trips to
 *    get through TCP slow start, 22 KiB takes about three, and nothing else on
 *    the page can be discovered until the document has arrived.
 *
 * 2. Cache lifetimes for static files. adapter-node sets an immutable
 *    year-long header on /_app/immutable (the hashed bundles) and sets nothing
 *    at all on everything else, so the logo, the icons and the manifest were
 *    refetched on every navigation.
 *
 * Both would normally live in a reverse proxy. They are here so that the fix
 * ships with the container and cannot be lost when the host config changes.
 */
import http from 'node:http';
import compression from 'compression';
import { handler } from './build/handler.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Below about a kilobyte the gzip header costs more than it saves, and the
// round trip is the same either way.
const compress = compression({ threshold: 1024 });

/**
 * Static files that are safe to hold for a week: they are content that changes
 * only on a deploy, and none of them are hashed, so they cannot be immutable.
 * The hashed bundles are excluded because adapter-node already gives them a
 * year — this only fills in the gap it leaves.
 */
const CACHEABLE = /\.(png|jpe?g|svg|ico|webmanifest|webp|avif|woff2?)$/i;
const WEEK = 60 * 60 * 24 * 7;

const server = http.createServer((req, res) => {
  if (CACHEABLE.test(req.url ?? '')) {
    // Set at write time rather than up front: adapter-node's own immutable
    // header is applied while it serves the file, and whichever of us writes
    // last would otherwise win by accident. Deferring means we only fill in a
    // Cache-Control when nothing else has set one.
    const writeHead = res.writeHead.bind(res);
    res.writeHead = (...args) => {
      if (!res.hasHeader('cache-control')) {
        res.setHeader('cache-control', `public, max-age=${WEEK}`);
      }
      return writeHead(...args);
    };
  }

  compress(req, res, () => handler(req, res));
});

server.listen(PORT, HOST, () => {
  console.log(`Goldfinch frontend listening on http://${HOST}:${PORT}`);
});
