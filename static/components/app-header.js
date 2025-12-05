/**
 * App Header Component - User info and sign out
 */

import { BaseComponent } from './base-component.js';
import { store } from '../js/store.js';
import { oauthService } from '../js/oauth-service.js';
import { showToast } from './toast-notification.js';

class AppHeader extends BaseComponent {
    subscribeToStore() {
        this.storeUnsubscribe = store.subscribe((state, prevState) => {
            if (state.isAuthenticated !== prevState.isAuthenticated ||
                state.handle !== prevState.handle ||
                state.did !== prevState.did) {
                this.updateHeader();
            }
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
            ${this.getBaseStyles()}
            <style>
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    background: rgba(0, 0, 0, 0.3);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .brand {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .logo {
                    width: 40px;
                    height: 40px;
                    border-radius: 0.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }

                .logo img {
                    width: 100%;
                    height: 100%;
                }

                .brand-text h1 {
                    font-size: 1.125rem;
                    font-weight: 700;
                    margin: 0;
                    line-height: 1.2;
                }

                .brand-text p {
                    font-size: 0.75rem;
                    color: rgba(255, 255, 255, 0.5);
                    margin: 0;
                }

                .user-section {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .user-info {
                    text-align: right;
                    display: none;
                }

                .user-info.visible {
                    display: block;
                }

                .user-handle {
                    font-weight: 600;
                    font-size: 0.875rem;
                }

                .user-did {
                    font-size: 0.7rem;
                    color: rgba(255, 255, 255, 0.5);
                    font-family: monospace;
                    max-width: 150px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: rgba(101, 105, 240, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid oklch(65.69% 0.196 275.75);
                }

                .avatar svg {
                    width: 20px;
                    height: 20px;
                    color: oklch(75% 0.15 275);
                }

                .sign-out-btn {
                    display: none;
                }

                .sign-out-btn.visible {
                    display: flex;
                }

                @media (max-width: 640px) {
                    .header {
                        padding: 0.75rem 1rem;
                    }

                    .user-did {
                        display: none;
                    }

                    .brand-text p {
                        display: none;
                    }
                }
            </style>
            <header class="header">
                <div class="brand">
                    <div class="logo">
                        <img src="/images/pins-logo.png" alt="Pins Logo" />
                    </div>
                    <div class="brand-text">
                        <h1>Pins</h1>
                        <p>AT Protocol File Storage</p>
                    </div>
                </div>
                <div class="user-section">
                    <div class="user-info" id="userInfo">
                        <div class="user-handle" id="userHandle">@handle</div>
                        <div class="user-did" id="userDid" title="">did:plc:...</div>
                    </div>
                    <div class="avatar" id="avatar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                    <button class="btn btn-ghost sign-out-btn" id="signOutBtn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Sign Out
                    </button>
                </div>
            </header>
        `;
    }

    setupEventListeners() {
        this.$('#signOutBtn').addEventListener('click', async () => {
            try {
                await oauthService.signOut();
                showToast('Signed out successfully', 'info');
            } catch (error) {
                showToast('Sign out failed: ' + error.message, 'error');
            }
        });
    }

    updateHeader() {
        const state = store.getState();
        const userInfo = this.$('#userInfo');
        const signOutBtn = this.$('#signOutBtn');
        const userHandle = this.$('#userHandle');
        const userDid = this.$('#userDid');

        if (state.isAuthenticated) {
            userInfo.classList.add('visible');
            signOutBtn.classList.add('visible');
            userHandle.textContent = `@${state.handle || 'unknown'}`;
            userDid.textContent = state.did || '';
            userDid.title = state.did || '';
        } else {
            userInfo.classList.remove('visible');
            signOutBtn.classList.remove('visible');
        }
    }
}

customElements.define('app-header', AppHeader);
