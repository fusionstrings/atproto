/**
 * Main App Shell - Clean, minimal architecture
 */

import { BaseComponent } from './base-component.js';
import { store } from '../js/store.js';
import { oauthService } from '../js/oauth-service.js';
import { pinService } from '../js/pin-service.js';
import { icons } from '../js/icons.js';

// Import components
import './login-form.js';
import './upload-zone.js';
import './blob-list.js';
import './blob-item.js';
import './preview-modal.js';

class BlobStoreApp extends BaseComponent {
    async connectedCallback() {
        super.connectedCallback();
        await this.initializeApp();
    }

    subscribeToStore() {
        this.storeUnsubscribe = store.subscribe((state, prevState) => {
            if (state.isAuthenticated !== prevState.isAuthenticated) {
                this.updateView();
            }
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
            ${this.getBaseStyles()}
            <style>
                :host {
                    display: block;
                    min-height: 100vh;
                }

                .app {
                    max-width: 960px;
                    margin: 0 auto;
                    padding: 0 1.5rem;
                }

                /* Header */
                .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1.25rem 0;
                    border-bottom: 1px solid var(--border-subtle);
                    margin-bottom: 2rem;
                }

                .brand {
                    display: flex;
                    align-items: center;
                    gap: 0.625rem;
                }

                .brand-icon {
                    width: 32px;
                    height: 32px;
                    color: var(--accent);
                }

                .brand-icon svg {
                    width: 100%;
                    height: 100%;
                }

                .brand-name {
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .user-area {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .user-handle {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                /* Login View */
                .login-view {
                    min-height: calc(100vh - 100px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .login-card {
                    width: 100%;
                    max-width: 400px;
                    padding: 2.5rem;
                    background: var(--bg-elevated);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-xl);
                }

                .login-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }

                .login-header h1 {
                    font-size: 1.5rem;
                    margin-bottom: 0.5rem;
                }

                .login-header p {
                    color: var(--text-secondary);
                    font-size: 0.9375rem;
                }

                /* Dashboard */
                .dashboard {
                    padding-bottom: 4rem;
                }

                .section {
                    margin-bottom: 2.5rem;
                }

                .section-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1rem;
                }

                .section-title {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                /* Init Loading */
                .init-loading {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                }

                .init-loading p {
                    color: var(--text-muted);
                    font-size: 0.875rem;
                }

                /* Error State */
                .error-state {
                    text-align: center;
                    color: var(--error);
                }

                .error-state p {
                    margin-top: 0.5rem;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }
            </style>

            <div class="app" id="app">
                <div class="init-loading">
                    <div class="spinner"></div>
                    <p>Initializing...</p>
                </div>
            </div>
            <preview-modal></preview-modal>
        `;
    }

    async initializeApp() {
        try {
            await oauthService.init();
            this.updateView();

            if (store.getState().isAuthenticated) {
                await pinService.loadAllBlobs();
            }
        } catch (error) {
            console.error('Init failed:', error);
            this.$('#app').innerHTML = `
                <div class="init-loading">
                    <div class="error-state">
                        <p>Failed to initialize</p>
                        <p>${error.message}</p>
                        <button class="btn btn-primary" style="margin-top: 1rem" onclick="location.reload()">
                            Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }

    updateView() {
        const state = store.getState();
        const app = this.$('#app');

        if (!state.isAuthenticated) {
            // Login View
            app.innerHTML = `
                <div class="login-view">
                    <div class="login-card">
                        <div class="login-header">
                            <div class="brand" style="justify-content: center; margin-bottom: 1rem;">
                                <div class="brand-icon">${icons.logo}</div>
                                <span class="brand-name">Pins</span>
                            </div>
                            <h1>Welcome</h1>
                            <p>Sign in with your AT Protocol identity</p>
                        </div>
                        <login-form></login-form>
                    </div>
                </div>
            `;
        } else {
            // Dashboard View
            app.innerHTML = `
                <header class="header">
                    <div class="brand">
                        <div class="brand-icon">${icons.logo}</div>
                        <span class="brand-name">Pins</span>
                    </div>
                    <div class="user-area">
                        <span class="user-handle">@${state.userHandle || 'user'}</span>
                        <button class="btn btn-ghost btn-sm" id="signOutBtn">
                            Sign out
                        </button>
                    </div>
                </header>

                <main class="dashboard">
                    <section class="section">
                        <upload-zone></upload-zone>
                    </section>

                    <section class="section">
                        <div class="section-header">
                            <h2 class="section-title">Your Files</h2>
                        </div>
                        <blob-list></blob-list>
                    </section>
                </main>
            `;

            // Sign out handler
            this.$('#signOutBtn')?.addEventListener('click', async () => {
                await oauthService.signOut();
            });
        }
    }
}

customElements.define('blob-store-app', BlobStoreApp);
