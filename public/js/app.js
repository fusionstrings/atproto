/**
 * App Initialization
 * - Registers all custom elements
 * - Handles OAuth callback
 * - Manages view switching via body[data-view]
 */

import { effect } from 'usignal';
import { auth } from './state.js';
import { oauthService } from './oauth-service.js';
import { pinService } from './pin-service.js';

// Import component classes
import { UserStatus } from '../components/user-status.js';
import { LoginForm } from '../components/login-form.js';
import { UploadZone } from '../components/upload-zone.js';
import { BlobList } from '../components/blob-list.js';
import { BlobItem } from '../components/blob-item.js';
import { PreviewModal } from '../components/preview-modal.js';
import { ToastContainer } from '../components/toast-notification.js';

/**
 * Register a custom element if not already defined
 */
function define(name, constructor) {
    if (!customElements.get(name)) {
        customElements.define(name, constructor);
    }
}

// Register all components
define('user-status', UserStatus);
define('login-form', LoginForm);
define('upload-zone', UploadZone);
define('blob-list', BlobList);
define('blob-item', BlobItem);
define('preview-modal', PreviewModal);
define('toast-notification', ToastContainer);

/**
 * Set the current view based on auth state
 * Views: 'loading' | 'login' | 'dashboard'
 */
function updateView(view) {
    document.body.dataset.view = view;
}

/**
 * Initialize the application
 */
async function init() {
    updateView('loading');

    // Handle OAuth callback if present
    const params = new URLSearchParams(window.location.search);
    if (params.has('code') || params.has('iss')) {
        try {
            await oauthService.handleCallback();
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        } catch (error) {
            console.error('OAuth callback failed:', error);
        }
    }

    // Try to restore session
    try {
        await oauthService.init();
    } catch (error) {
        console.error('Session restore failed:', error);
    }

    // React to auth state changes for view switching
    effect(() => {
        const { isAuthenticated, isInitializing } = auth.value;
        
        if (isInitializing) {
            updateView('loading');
        } else if (isAuthenticated) {
            updateView('dashboard');
            // Load blobs when authenticated
            pinService.loadAllBlobs();
        } else {
            updateView('login');
        }
    });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
