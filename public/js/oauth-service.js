/**
 * OAuth Service - Handles AT Protocol OAuth authentication
 */

import { auth, setAuthenticated, setInitialized, clearAuth } from './state.js';

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
                import('@atproto/oauth-client-browser'),
                import('@atproto/api'),
            ]);
            
            this.BrowserOAuthClient = BrowserOAuthClient;
            this.Agent = Agent;

            // Determine client ID based on environment
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            
            if (isLocalhost) {
                // Local development: use loopback client
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
            } else {
                // Production: burn metadata into client with dynamic origin
                // This allows deployment to any domain (custom domains, preview URLs, etc.)
                const origin = window.location.origin;
                const clientId = origin + '/client-metadata.json';
                
                this.client = new BrowserOAuthClient({
                    handleResolver: 'https://bsky.social',
                    clientMetadata: {
                        client_id: clientId,
                        client_name: 'Pins - AT Protocol File Storage',
                        client_uri: origin + '/',
                        redirect_uris: [origin + '/'],
                        scope: 'atproto transition:generic',
                        grant_types: ['authorization_code', 'refresh_token'],
                        response_types: ['code'],
                        application_type: 'web',
                        token_endpoint_auth_method: 'none',
                        dpop_bound_access_tokens: true,
                    },
                });
            }

            // Check for existing session or OAuth callback
            let result;
            try {
                result = await this.client.init();
            } catch (initError) {
                // Token refresh failed (expired/revoked) - clear invalid session
                console.warn('Session expired or invalid, clearing auth:', initError.message);
                clearAuth();
                setInitialized();
                return { authenticated: false };
            }
            
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
                    // Profile fetch failed - could be auth issue
                    if (err?.status === 401 || err?.message?.includes('401')) {
                        console.warn('Auth invalid during profile fetch, clearing session');
                        clearAuth();
                        setInitialized();
                        return { authenticated: false };
                    }
                    console.warn('Could not fetch profile for handle:', err);
                }
                
                setAuthenticated(session, agent, handle);
                return { authenticated: true, session };
            }
            
            setInitialized();
            return { authenticated: false };
        } catch (error) {
            console.error('OAuth init error:', error);
            setInitialized();
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
        const { session } = auth.value;
        if (session) {
            try {
                await session.signOut();
            } catch (error) {
                console.error('Sign out error:', error);
            }
        }
        clearAuth();
    }

    // Alias for consistency
    logout() {
        return this.signOut();
    }
}

// Singleton
const oauthService = new OAuthService();
export { oauthService };
