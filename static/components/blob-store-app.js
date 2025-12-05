/**
 * Blob Store App - Main application shell
 */

import { BaseComponent } from './base-component.js';
import { store } from '../js/store.js';
import { oauthService } from '../js/oauth-service.js';
import { pinService } from '../js/pin-service.js';

// Import all components
import './app-header.js';
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
                    background: linear-gradient(135deg, 
                        oklch(20% 0.02 270) 0%, 
                        oklch(15% 0.03 280) 50%,
                        oklch(18% 0.025 260) 100%
                    );
                }

                .app-container {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                }

                .main-content {
                    flex: 1;
                    max-width: 1200px;
                    margin: 0 auto;
                    width: 100%;
                    padding: 2rem 1rem;
                }

                .login-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: calc(100vh - 80px);
                    padding: 2rem;
                }

                .login-card {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 1.5rem;
                    padding: 2.5rem;
                    width: 100%;
                    max-width: 480px;
                    backdrop-filter: blur(10px);
                }

                .dashboard {
                    display: grid;
                    gap: 1.5rem;
                }

                .dashboard-section {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 1rem;
                    backdrop-filter: blur(10px);
                    overflow: hidden;
                }

                .section-header {
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 600;
                }

                .section-header svg {
                    width: 20px;
                    height: 20px;
                    color: oklch(65.69% 0.196 275.75);
                }

                .init-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    gap: 1rem;
                }

                .init-loading .loading {
                    width: 48px;
                    height: 48px;
                }

                .init-loading p {
                    color: rgba(255, 255, 255, 0.6);
                }

                @media (min-width: 1024px) {
                    .dashboard {
                        grid-template-columns: 400px 1fr;
                    }
                }
            </style>
            <div class="app-container" id="appContainer">
                <div class="init-loading" id="initLoading">
                    <span class="loading"></span>
                    <p>Initializing...</p>
                </div>
            </div>
            <preview-modal></preview-modal>
        `;
    }

    async initializeApp() {
        const loading = this.$('#initLoading');

        try {
            // Initialize OAuth
            await oauthService.init();
            
            // Remove loading state
            loading.remove();
            
            // Render appropriate view
            this.updateView();

            // If authenticated, load blobs
            if (store.getState().isAuthenticated) {
                await pinService.loadAllBlobs();
            }

        } catch (error) {
            console.error('App initialization failed:', error);
            loading.innerHTML = `
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="oklch(65% 0.2 25)" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p style="color: oklch(65% 0.2 25);">Failed to initialize app</p>
                <p style="font-size: 0.875rem; color: rgba(255,255,255,0.5);">${error.message}</p>
                <button class="btn btn-primary" onclick="location.reload()">Retry</button>
            `;
        }
    }

    updateView() {
        const container = this.$('#appContainer');
        const state = store.getState();

        if (!state.isAuthenticated) {
            container.innerHTML = `
                <app-header></app-header>
                <div class="login-wrapper">
                    <div class="login-card">
                        <login-form></login-form>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <app-header></app-header>
                <main class="main-content">
                    <div class="dashboard">
                        <div class="dashboard-section">
                            <div class="section-header">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                Upload Files
                            </div>
                            <upload-zone></upload-zone>
                        </div>
                        <div class="dashboard-section">
                            <blob-list></blob-list>
                        </div>
                    </div>
                </main>
            `;
        }
    }
}

customElements.define('blob-store-app', BlobStoreApp);
