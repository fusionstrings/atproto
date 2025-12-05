/**
 * Toast Notification Component
 */

import { icons } from '../js/icons.js';
import { $, $$, cloneTemplate } from '../js/utils.js';

export class ToastContainer extends HTMLElement {
    constructor() {
        super();
        this.toasts = [];
    }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        cloneTemplate('toast-template', this.shadowRoot);
    }

    show(message, type = 'info', duration = 4000) {
        const id = Date.now();
        this.toasts.push({ id, message, type });
        this.renderToasts();

        if (duration > 0) {
            setTimeout(() => this.remove(id), duration);
        }
        return id;
    }

    remove(id) {
        const toastEl = $(this.shadowRoot, `[data-id="${id}"]`);
        if (toastEl) {
            toastEl.classList.add('removing');
            setTimeout(() => {
                this.toasts = this.toasts.filter(t => t.id !== id);
                this.renderToasts();
            }, 300);
        }
    }

    renderToasts() {
        const container = $(this.shadowRoot, '#toasts');
        container.innerHTML = this.toasts.map(toast => `
            <div class="toast toast-${toast.type}" data-id="${toast.id}">
                <span class="toast-icon">${icons[toast.type] || icons.info}</span>
                <span class="toast-message">${toast.message}</span>
                <button class="toast-close" data-close="${toast.id}">${icons.x}</button>
            </div>
        `).join('');

        $$(this.shadowRoot, '.toast-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.remove(parseInt(e.currentTarget.dataset.close));
            });
        });
    }
}

/**
 * Show a toast notification
 */
export function showToast(message, type = 'info', duration = 4000) {
    let container = document.querySelector('toast-notification');
    if (!container) {
        container = document.createElement('toast-notification');
        document.body.appendChild(container);
    }
    return container.show(message, type, duration);
}
