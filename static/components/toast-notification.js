/**
 * Toast Notification Component
 */

import { BaseComponent } from './base-component.js';
import { icons } from '../js/icons.js';

class ToastContainer extends BaseComponent {
    constructor() {
        super();
        this.toasts = [];
    }

    render() {
        this.shadowRoot.innerHTML = `
            ${this.getBaseStyles()}
            <style>
                :host {
                    position: fixed;
                    bottom: 1rem;
                    right: 1rem;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    max-width: 400px;
                }

                .toast {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    border-radius: 0.5rem;
                    background: oklch(30% 0.02 250);
                    color: white;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
                    animation: slideIn 0.3s ease-out;
                    transition: all 0.3s;
                }

                .toast.removing {
                    opacity: 0;
                    transform: translateX(100%);
                }

                .toast-success {
                    border-left: 4px solid oklch(72% 0.19 142);
                }
                .toast-success .toast-icon {
                    color: oklch(72% 0.19 142);
                }

                .toast-error {
                    border-left: 4px solid oklch(65% 0.24 16);
                }
                .toast-error .toast-icon {
                    color: oklch(65% 0.24 16);
                }

                .toast-info {
                    border-left: 4px solid oklch(70% 0.15 230);
                }
                .toast-info .toast-icon {
                    color: oklch(70% 0.15 230);
                }

                .toast-warning {
                    border-left: 4px solid oklch(80% 0.15 85);
                }
                .toast-warning .toast-icon {
                    color: oklch(80% 0.15 85);
                }

                .toast-icon {
                    width: 20px;
                    height: 20px;
                    flex-shrink: 0;
                }

                .toast-icon svg {
                    width: 100%;
                    height: 100%;
                }

                .toast-message {
                    flex: 1;
                    font-size: 0.875rem;
                }

                .toast-close {
                    background: transparent;
                    border: none;
                    color: inherit;
                    opacity: 0.6;
                    cursor: pointer;
                    padding: 0.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .toast-close:hover {
                    opacity: 1;
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            </style>
            <div id="toasts"></div>
        `;
    }

    show(message, type = 'info', duration = 4000) {
        const id = Date.now();
        const toast = { id, message, type };
        this.toasts.push(toast);
        this.renderToasts();

        if (duration > 0) {
            setTimeout(() => this.remove(id), duration);
        }

        return id;
    }

    remove(id) {
        const toastEl = this.$(`[data-id="${id}"]`);
        if (toastEl) {
            toastEl.classList.add('removing');
            setTimeout(() => {
                this.toasts = this.toasts.filter(t => t.id !== id);
                this.renderToasts();
            }, 300);
        }
    }

    renderToasts() {
        const container = this.$('#toasts');
        container.innerHTML = this.toasts.map(toast => `
            <div class="toast toast-${toast.type}" data-id="${toast.id}">
                <span class="toast-icon">${this.getIcon(toast.type)}</span>
                <span class="toast-message">${toast.message}</span>
                <button class="toast-close" data-close="${toast.id}">
                    ${icons.x}
                </button>
            </div>
        `).join('');

        // Add close handlers
        this.$$('.toast-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.close);
                this.remove(id);
            });
        });
    }

    getIcon(type) {
        return icons[type] || icons.info;
    }
}

customElements.define('toast-notification', ToastContainer);

// Global toast helper
export function showToast(message, type = 'info', duration = 4000) {
    let container = document.querySelector('toast-notification');
    if (!container) {
        container = document.createElement('toast-notification');
        document.body.appendChild(container);
    }
    return container.show(message, type, duration);
}
