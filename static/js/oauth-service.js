/**
 * OAuth Service - Handles AT Protocol OAuth authentication
 */

import { store } from './store.js';

class OAuthService {
    constructor() {
        this.client = null;
        this.BrowserOAuthClient = null;
        this.Agent = null;
    }

    async init() {
        try {
            // Dynamic imports for AT Protocol libraries
            const [{ BrowserOAuthClient }, { Agent }] = await Promise.all([
                import('https://esm.sh/@atproto/oauth-client-browser@0.3.36'),
                import('https://esm.sh/@atproto/api@0.15.8'),
            ]);
            
            this.BrowserOAuthClient = BrowserOAuthClient;
            this.Agent = Agent;

            // Create OAuth client with loopback config for local dev
            const clientId = 'http://localhost/?scope=' + encodeURIComponent('atproto transition:generic');
            
            this.client = new BrowserOAuthClient({
                handleResolver: 'https://bsky.social',
                clientMetadata: {
                    client_id: clientId,
                    redirect_uris: [window.location.origin + '/'],
                    scope: 'atproto transition:generic',
                    grant_types: ['authorization_code', 'refresh_token'],
                    response_types: ['code'],
                    application_type: 'native',
                    token_endpoint_auth_method: 'none',
                    dpop_bound_access_tokens: true,
                },
            });

            // Check for existing session or OAuth callback
            const result = await this.client.init();
            
            if (result) {
                const { session } = result;
                const agent = new this.Agent(session);
                
                // Fetch the user's profile to get their handle
                let handle = null;
                try {
                    const did = session?.sub || session?.did;
                    if (did) {
                        const profile = await agent.getProfile({ actor: did });
                        handle = profile?.data?.handle;
                    }
                } catch (err) {
                    console.warn('Could not fetch profile for handle:', err);
                }
                
                store.setAuthenticated(session, agent, handle);
                return { authenticated: true, session };
            }
            
            return { authenticated: false };
        } catch (error) {
            console.error('OAuth init error:', error);
            throw error;
        }
    }

    async signIn(handle) {
        if (!this.client) {
            throw new Error('OAuth client not initialized');
        }

        // Clean handle
        let cleanHandle = handle.trim();
        if (cleanHandle.startsWith('@')) {
            cleanHandle = cleanHandle.substring(1);
        }

        try {
            await this.client.signIn(cleanHandle, {
                scope: 'atproto transition:generic',
            });
            // This won't execute - browser redirects
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    async signOut() {
        const { session } = store.state;
        if (session) {
            try {
                await session.signOut();
            } catch (error) {
                console.error('Sign out error:', error);
            }
        }
        store.clearAuth();
    }
}

// Singleton
const oauthService = new OAuthService();
export { oauthService };
