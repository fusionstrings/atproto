/**
 * Main App Shell - Clean, template-based architecture with signals
 */

import { effect } from 'usignal';
import { BaseComponent } from './base-component.js';
import { auth, clearAuth } from '../js/state.js';
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
    static templateId = 'blob-store-app-template';

    async connectedCallback() {
        super.connectedCallback();
        
        // React to auth changes
        this.cleanup = effect(() => {
            const { isAuthenticated } = auth.value;
            this.updateView();
        });
        
        await this.initializeApp();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.cleanup?.();
    }

    async initializeApp() {
        try {
            await oauthService.init();

            if (auth.value.isAuthenticated) {
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
        const { isAuthenticated, userHandle } = auth.value;
        const app = this.$('#app');

        if (!isAuthenticated) {
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
                        <span class="user-handle">@${userHandle || 'user'}</span>
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

            this.$('#signOutBtn')?.addEventListener('click', async () => {
                await oauthService.signOut();
            });
        }
    }
}

customElements.define('blob-store-app', BlobStoreApp);
