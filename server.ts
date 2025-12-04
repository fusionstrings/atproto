import { Hono } from 'hono';
import { serveStatic } from 'hono/deno';

const app = new Hono();

// Serve static files
app.use('/static/*', serveStatic({ root: './' }));

// Main page - serves the SPA
app.get('/', async (c) => {
  const html = await Deno.readTextFile('./static/index.html');
  return c.html(html);
});

// All OAuth is handled in the browser by @atproto/oauth-client-browser
// The browser OAuth client handles:
// - OAuth flow initiation and callback
// - Session storage in IndexedDB
// - Token refresh
// - Blob uploads via Agent

console.log('Server running at http://127.0.0.1:8000');
Deno.serve({ port: 8000 }, app.fetch);
