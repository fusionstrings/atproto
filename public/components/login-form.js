/**
 * Login Form - Simple, clean authentication
 */

import { oauthService } from '../js/oauth-service.js';
import { showToast } from './toast-notification.js';
import { $, cloneTemplate, hydrateIcons } from '../js/utils.js';

export class LoginForm extends HTMLElement {
    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        cloneTemplate('login-form-template', this.shadowRoot);
        hydrateIcons(this.shadowRoot);

        const form = $(this.shadowRoot, '#loginForm');
        const input = $(this.shadowRoot, '#handle');
        const btn = $(this.shadowRoot, '#submitBtn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const handle = input.value.trim();
            if (!handle) {
                showToast('Please enter your handle', 'error');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Redirecting...';
            btn.classList.add('loading');

            try {
                await oauthService.signIn(handle);
            } catch (error) {
                showToast('Sign in failed: ' + error.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Sign in';
                btn.classList.remove('loading');
            }
        });
    }
}
