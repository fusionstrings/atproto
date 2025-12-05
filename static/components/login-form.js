/**
 * Login Form - Simple, clean authentication
 */

import { BaseComponent } from './base-component.js';
import { oauthService } from '../js/oauth-service.js';
import { showToast } from './toast-notification.js';
import { icons } from '../js/icons.js';

class LoginForm extends BaseComponent {
    render() {
        this.shadowRoot.innerHTML = `
            ${this.getBaseStyles()}
            <style>
                .form {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .label {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--text-secondary);
                }

                .input-wrapper {
                    display: flex;
                    align-items: center;
                    background: var(--bg-base);
                    border: 1px solid var(--border-default);
                    border-radius: var(--radius-md);
                    transition: all var(--transition-fast);
                }

                .input-wrapper:focus-within {
                    border-color: var(--accent);
                    box-shadow: 0 0 0 3px var(--accent-muted);
                }

                .input-prefix {
                    padding: 0 0 0 0.875rem;
                    color: var(--text-muted);
                    font-size: 0.9375rem;
                    user-select: none;
                }

                .input-wrapper input {
                    flex: 1;
                    padding: 0.625rem 0.875rem 0.625rem 0.25rem;
                    font-size: 0.9375rem;
                    font-family: inherit;
                    color: var(--text-primary);
                    background: transparent;
                    border: none;
                    outline: none;
                }

                .input-wrapper input::placeholder {
                    color: var(--text-muted);
                }

                .hint {
                    font-size: 0.8125rem;
                    color: var(--text-muted);
                }

                .submit-btn {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    margin-top: 0.5rem;
                }

                .submit-btn svg {
                    width: 18px;
                    height: 18px;
                }

                .info-box {
                    display: flex;
                    gap: 0.75rem;
                    padding: 0.875rem;
                    background: var(--accent-muted);
                    border-radius: var(--radius-md);
                    font-size: 0.8125rem;
                    color: var(--text-secondary);
                    margin-top: 0.5rem;
                }

                .info-box svg {
                    width: 16px;
                    height: 16px;
                    color: var(--accent);
                    flex-shrink: 0;
                    margin-top: 0.125rem;
                }
            </style>

            <form class="form" id="loginForm">
                <div class="input-group">
                    <label class="label" for="handle">Handle or DID</label>
                    <div class="input-wrapper">
                        <span class="input-prefix">@</span>
                        <input 
                            type="text" 
                            id="handle" 
                            placeholder="username.bsky.social"
                            autocomplete="username"
                            autocapitalize="none"
                            spellcheck="false"
                            required
                        />
                    </div>
                    <p class="hint">Your Bluesky handle or DID</p>
                </div>

                <button type="submit" class="btn btn-primary submit-btn" id="submitBtn">
                    Sign in
                </button>

                <div class="info-box">
                    ${icons.shield}
                    <span>Secure OAuth — your credentials never leave your PDS</span>
                </div>
            </form>
        `;
    }

    setupEventListeners() {
        const form = this.$('#loginForm');
        const input = this.$('#handle');
        const btn = this.$('#submitBtn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const handle = input.value.trim();
            if (!handle) {
                showToast('Please enter your handle', 'error');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<div class="spinner"></div> Redirecting...';

            try {
                await oauthService.signIn(handle);
            } catch (error) {
                showToast('Sign in failed: ' + error.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Sign in';
            }
        });
    }
}

customElements.define('login-form', LoginForm);
