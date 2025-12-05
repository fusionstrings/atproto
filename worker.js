/**
 * Cloudflare Worker for Pins - AT Protocol File Storage
 * Serves dynamic OAuth client metadata with the correct origin
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const origin = url.origin;

        // Serve dynamic client-metadata.json with correct origin
        if (url.pathname === '/client-metadata.json') {
            const metadata = {
                client_id: `${origin}/client-metadata.json`,
                client_name: 'Pins - AT Protocol File Storage',
                client_uri: `${origin}/`,
                redirect_uris: [`${origin}/`],
                scope: 'atproto transition:generic',
                grant_types: ['authorization_code', 'refresh_token'],
                response_types: ['code'],
                application_type: 'web',
                token_endpoint_auth_method: 'none',
                dpop_bound_access_tokens: true,
            };

            return new Response(JSON.stringify(metadata, null, 2), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=3600',
                },
            });
        }

        // For all other requests, serve from static assets
        return env.ASSETS.fetch(request);
    },
};
