/**
 * User Status Component
 * Shows logged-in user handle and logout button
 * Hides itself when not authenticated
 */

import { effect } from 'usignal';
import { auth } from '../js/state.js';
import { oauthService } from '../js/oauth-service.js';
import { $, cloneTemplate } from '../js/utils.js';

export class UserStatus extends HTMLElement {
    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        cloneTemplate('user-status-template', this.shadowRoot);
        
        $(this.shadowRoot, '#logoutBtn')?.addEventListener('click', () => {
            oauthService.logout();
        });

        // React to auth changes
        this._cleanup = effect(() => {
            const { isAuthenticated, handle } = auth.value;
            this.style.display = isAuthenticated ? '' : 'none';
            
            const handleEl = $(this.shadowRoot, '#handle');
            if (handleEl) {
                handleEl.textContent = handle ? `@${handle}` : '';
            }
        });
    }

    disconnectedCallback() {
        this._cleanup?.();
    }
}
