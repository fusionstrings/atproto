# Bluesky CID Uploader

A Deno application to upload files to Bluesky (AT Protocol) and retrieve their Content Identifier (CID).

## Features

- **OAuth 2.0 Authentication**: Secure browser-based OAuth login with Bluesky using `@atproto/oauth-client-browser`
- **Modern UI**: Built with DaisyUI and Tailwind CSS with a beautiful dark theme
- **Drag & Drop**: Easy file upload interface
- **Instant CID**: Returns the CID, MIME type, and size of the uploaded blob
- **No App Passwords**: Uses the recommended OAuth flow instead of deprecated app passwords

## Prerequisites

- [Deno](https://deno.com/) installed
- A Bluesky account

## Quick Start

1. Start the server:
   ```bash
   deno task start
   ```

2. Open your browser and navigate to:
   ```
   http://127.0.0.1:8000
   ```
   
   > **Important**: Use `127.0.0.1` (not `localhost`) for the OAuth loopback to work correctly.

3. Enter your Bluesky handle (e.g., `user.bsky.social`) and click **Sign in with OAuth**

4. Authorize the application in the Bluesky OAuth flow

5. Once authenticated, drag & drop or select a file to upload

6. Copy the generated CID!

## Architecture

This application uses a pure browser-based OAuth flow:

- **Frontend**: The `@atproto/oauth-client-browser` package handles all OAuth operations in the browser, including:
  - Session management with IndexedDB storage
  - PKCE and DPoP for secure token exchange
  - Automatic token refresh
  
- **Backend (Deno/Hono)**: Minimal server that:
  - Serves the static SPA
  - Can optionally proxy blob uploads

## Project Structure

```
├── server.ts           # Deno server using Hono
├── static/
│   └── index.html      # SPA with OAuth client
├── deno.json           # Deno configuration
└── README.md
```

## How OAuth Works

1. User enters their handle (e.g., `alice.bsky.social`)
2. The browser OAuth client resolves the user's PDS
3. User is redirected to their PDS authorization server
4. After approval, user is redirected back with an authorization code
5. The browser client exchanges the code for tokens (using PKCE)
6. Sessions are stored in IndexedDB and automatically refreshed

## Development Notes

- The OAuth client uses loopback mode for local development (`http://127.0.0.1:8000`)
- Sessions persist in the browser's IndexedDB
- Token refresh happens automatically

## References

- [AT Protocol OAuth Spec](https://atproto.com/specs/oauth)
- [@atproto/oauth-client-browser](https://www.npmjs.com/package/@atproto/oauth-client-browser)
- [OAuth Quickstart Guide](https://github.com/bluesky-social/atproto/blob/main/packages/api/OAUTH.md)
