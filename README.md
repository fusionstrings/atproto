# Pins — AT Protocol File Storage

A lightweight, serverless web client for managing files on an AT Protocol Personal Data Server (PDS).

**Live Demo:** [https://pins-atproto.fusionstrings.workers.dev/](https://pins-atproto.fusionstrings.workers.dev/)

## Tech Stack

- **Frontend:** Vanilla Web Components (Shadow DOM), CSS Variables (Linear-style theme).
- **Auth:** `@atproto/oauth-client-browser` (PKCE + DPoP).
- **Backend:** Cloudflare Workers (serves static assets + dynamic OAuth metadata).
- **Storage:** IndexedDB (session persistence).

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start dev server:**
   ```bash
   npx wrangler dev
   ```

3. **Open App:**
   Navigate to `http://127.0.0.1:8787`
   > **Note:** Must use `127.0.0.1`, not `localhost`, for the OAuth loopback client to function.

### Deployment

Deploy to Cloudflare Workers:

```bash
npx wrangler deploy
```

The application is origin-agnostic. It automatically detects the deployment domain and serves the correct OAuth metadata.

## Architecture & OAuth Implementation

This project solves the "static site OAuth" problem using a Cloudflare Worker to serve dynamic client metadata.

### The Problem
AT Protocol OAuth requires a `client_id` URL that returns JSON metadata containing the exact `redirect_uris`. Hardcoding this prevents deploying to multiple environments (preview, staging, prod) without rebuilding.

### The Solution
1. **Worker (`worker.js`)**: Intercepts requests to `/client-metadata.json`.
2. **Dynamic Generation**: Constructs the metadata JSON using the request's `origin`.
3. **Client (`oauth-service.js`)**:
   - **Localhost**: Uses the special "loopback" client mode (no metadata URL needed).
   - **Production**: Sets `client_id` to `${origin}/client-metadata.json`.

### Project Structure

```
├── worker.js              # CF Worker: Serves assets & dynamic metadata
├── wrangler.jsonc         # CF Configuration
├── public/
│   ├── index.html         # Entry point
│   ├── components/        # Web Components (blob-list, upload-zone, etc.)
│   └── js/
│       ├── oauth-service.js # Auth logic (Loopback vs Prod switching)
│       ├── pin-service.js   # PDS Blob interaction
│       └── store.js         # Reactive state store
```

## Key Components

- **`oauth-service.js`**: Handles the dual-mode initialization (Loopback for dev, Metadata URL for prod).
- **`pin-service.js`**: Manages blob operations (upload, delete, list) using the authenticated agent.
- **`store.js`**: A simple event-target based state management system.

## References

- [AT Protocol OAuth Spec](https://atproto.com/specs/oauth)
- [@atproto/oauth-client-browser Docs](https://github.com/bluesky-social/atproto/tree/main/packages/oauth/oauth-client-browser)
