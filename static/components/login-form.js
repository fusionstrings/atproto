/**
 * Login Form Component
 */

import { BaseComponent } from './base-component.js';
import { store } from '../js/store.js';
import { oauthService } from '../js/oauth-service.js';
import { showToast } from './toast-notification.js';

class LoginForm extends BaseComponent {
    render() {
        this.shadowRoot.innerHTML = `
            ${this.getBaseStyles()}
            <style>
                .login-container {
                    text-align: center;
                    max-width: 400px;
                    margin: 0 auto;
                }

                .avatar {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: rgba(101, 105, 240, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1rem;
                }

                .avatar svg {
                    width: 40px;
                    height: 40px;
                    color: oklch(65.69% 0.196 275.75);
                }

                h2 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin: 0 0 0.5rem;
                }

                .subtitle {
                    color: rgba(255, 255, 255, 0.7);
                    margin-bottom: 1.5rem;
                }

                .form-group {
                    margin-bottom: 1rem;
                    text-align: left;
                }

                .label {
                    display: block;
                    font-size: 0.875rem;
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                }

                .input-group {
                    display: flex;
                }

                .input-prefix {
                    padding: 0.5rem 0.75rem;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-right: none;
                    border-radius: 0.5rem 0 0 0.5rem;
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 0.875rem;
                }

                .input-group .input {
                    border-radius: 0 0.5rem 0.5rem 0;
                }

                .hint {
                    font-size: 0.75rem;
                    color: rgba(255, 255, 255, 0.5);
                    margin-top: 0.25rem;
                }

                .features {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                    margin-top: 2rem;
                    text-align: center;
                }

                .feature {
                    padding: 1rem 0.5rem;
                }

                .feature svg {
                    width: 32px;
                    height: 32px;
                    margin-bottom: 0.5rem;
                    opacity: 0.8;
                }

                .feature h4 {
                    font-size: 0.875rem;
                    font-weight: 500;
                    margin: 0 0 0.25rem;
                }

                .feature p {
                    font-size: 0.7rem;
                    opacity: 0.6;
                    margin: 0;
                }

                .loading-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    gap: 1rem;
                    border-radius: inherit;
                }
            </style>
            <div class="login-container">
                <div class="avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
                <h2>Welcome</h2>
                <p class="subtitle">Sign in with your Bluesky account</p>

                <div class="alert alert-info mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    <div>
                        <strong>Secure OAuth</strong>
                        <div class="text-xs">Your credentials stay with your PDS</div>
                    </div>
                </div>

                <form id="loginForm">
                    <div class="form-group">
                        <label class="label">Handle or DID</label>
                        <div class="input-group">
                            <span class="input-prefix">@</span>
                            <input type="text" class="input" id="handleInput" placeholder="username.bsky.social" required autocomplete="username" />
                        </div>
                        <p class="hint">Your Bluesky handle, DID, or PDS URL</p>
                    </div>

                    <button type="submit" class="btn btn-primary w-full" id="submitBtn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                            <polyline points="10 17 15 12 10 7"></polyline>
                            <line x1="15" y1="12" x2="3" y2="12"></line>
                        </svg>
                        Sign in with Bluesky
                    </button>
                </form>

                <div class="features">
                    <div class="feature">
                        <svg viewBox="0 0 24 24" fill="none" stroke="oklch(65.69% 0.196 275.75)" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <h4>Upload Files</h4>
                        <p>Any file up to 1MB</p>
                    </div>
                    <div class="feature">
                        <svg viewBox="0 0 24 24" fill="none" stroke="oklch(70% 0.15 180)" stroke-width="2">
                            <path d="M12 3v12"></path>
                            <circle cx="12" cy="12" r="9"></circle>
                        </svg>
                        <h4>Get CIDs</h4>
                        <p>Content identifiers</p>
                    </div>
                    <div class="feature">
                        <svg viewBox="0 0 24 24" fill="none" stroke="oklch(72% 0.19 142)" stroke-width="2">
                            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                        </svg>
                        <h4>Manage Blobs</h4>
                        <p>View & organize</p>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const form = this.$('#loginForm');
        const input = this.$('#handleInput');
        const btn = this.$('#submitBtn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const handle = input.value.trim();
            if (!handle) {
                showToast('Please enter your handle', 'error');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<span class="loading"></span> Redirecting...';

            try {
                await oauthService.signIn(handle);
            } catch (error) {
                showToast('Sign in failed: ' + error.message, 'error');
                btn.disabled = false;
                btn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                        <polyline points="10 17 15 12 10 7"></polyline>
                        <line x1="15" y1="12" x2="3" y2="12"></line>
                    </svg>
                    Sign in with Bluesky
                `;
            }
        });
    }
}

customElements.define('login-form', LoginForm);
