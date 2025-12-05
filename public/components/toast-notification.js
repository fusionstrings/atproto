/**
 * Toast Notification Component
 */

import { icons } from '../js/icons.js';
import { $, cloneTemplate, hydrateIcons } from '../js/utils.js';

export class ToastContainer extends HTMLElement {
    constructor() {
        super();
        this.toasts = new Map();
    }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        cloneTemplate('toast-template', this.shadowRoot);
    }

    show(message, type = 'info', duration = 4000) {
        const id = Date.now();
        const container = $(this.shadowRoot, '#toasts');
        const itemTemplate = $(this.shadowRoot, '#toast-item');
        
        const toastFragment = itemTemplate.content.cloneNode(true);
        const toast = toastFragment.querySelector('.toast');
        
        toast.classList.add(`toast-${type}`);
        toast.dataset.id = id;
        
        const iconEl = toast.querySelector('.toast-icon');
        iconEl.innerHTML = icons[type] || icons.info;
        
        const messageEl = toast.querySelector('.toast-message');
        messageEl.textContent = message;
        
        const closeBtn = toast.querySelector('.toast-close');
        hydrateIcons(closeBtn);
        closeBtn.addEventListener('click', () => this.remove(id));
        
        container.appendChild(toast);
        this.toasts.set(id, toast);

        if (duration > 0) {
            setTimeout(() => this.remove(id), duration);
        }
        return id;
    }

    remove(id) {
        const toast = this.toasts.get(id);
        if (toast) {
            toast.classList.add('removing');
            setTimeout(() => {
                toast.remove();
                this.toasts.delete(id);
            }, 300);
        }
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
