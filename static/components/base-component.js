/**
 * Base Component - Abstract base class for all web components
 */

import { store } from '../js/store.js';

export class BaseComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._subscriptions = [];
    }

    // Called when component is added to DOM
    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    // Called when component is removed from DOM
    disconnectedCallback() {
        this.cleanup();
    }

    // Subscribe to store changes
    subscribe(eventName, handler) {
        const boundHandler = handler.bind(this);
        store.addEventListener(eventName, boundHandler);
        this._subscriptions.push({ eventName, handler: boundHandler });
    }

    // Cleanup subscriptions
    cleanup() {
        this._subscriptions.forEach(({ eventName, handler }) => {
            store.removeEventListener(eventName, handler);
        });
        this._subscriptions = [];
    }

    // Get shared styles (DaisyUI classes won't work in shadow DOM, so we use Tailwind directly)
    getBaseStyles() {
        return `
            <style>
                :host {
                    display: block;
                }
                
                * {
                    box-sizing: border-box;
                }

                .btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    outline: none;
                }

                .btn-primary {
                    background: oklch(65.69% 0.196 275.75);
                    color: white;
                }

                .btn-primary:hover {
                    background: oklch(55.69% 0.196 275.75);
                }

                .btn-ghost {
                    background: transparent;
                    color: inherit;
                }

                .btn-ghost:hover {
                    background: rgba(255, 255, 255, 0.1);
                }

                .btn-sm {
                    padding: 0.25rem 0.5rem;
                    font-size: 0.75rem;
                }

                .btn-square {
                    padding: 0.5rem;
                    aspect-ratio: 1;
                }

                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .input {
                    padding: 0.5rem 1rem;
                    border-radius: 0.5rem;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    background: rgba(0, 0, 0, 0.2);
                    color: inherit;
                    font-size: 0.875rem;
                    width: 100%;
                }

                .input:focus {
                    outline: 2px solid oklch(65.69% 0.196 275.75);
                    outline-offset: 2px;
                }

                .card {
                    background: oklch(25.33% 0.016 252.42);
                    border-radius: 1rem;
                    padding: 1.5rem;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }

                .alert {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    padding: 1rem;
                    border-radius: 0.5rem;
                }

                .alert-info {
                    background: rgba(58, 191, 248, 0.1);
                    border: 1px solid rgba(58, 191, 248, 0.3);
                }

                .alert-success {
                    background: rgba(74, 222, 128, 0.1);
                    border: 1px solid rgba(74, 222, 128, 0.3);
                }

                .alert-error {
                    background: rgba(248, 114, 114, 0.1);
                    border: 1px solid rgba(248, 114, 114, 0.3);
                }

                .badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 0.125rem 0.5rem;
                    font-size: 0.75rem;
                    border-radius: 9999px;
                    background: rgba(255, 255, 255, 0.1);
                }

                .loading {
                    display: inline-block;
                    width: 1.5rem;
                    height: 1.5rem;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    border-top-color: oklch(65.69% 0.196 275.75);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .hidden {
                    display: none !important;
                }

                .truncate {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .font-mono {
                    font-family: ui-monospace, monospace;
                }

                .text-sm {
                    font-size: 0.875rem;
                }

                .text-xs {
                    font-size: 0.75rem;
                }

                .text-muted {
                    opacity: 0.7;
                }

                .flex {
                    display: flex;
                }

                .flex-col {
                    flex-direction: column;
                }

                .items-center {
                    align-items: center;
                }

                .justify-center {
                    justify-content: center;
                }

                .justify-between {
                    justify-content: space-between;
                }

                .gap-1 { gap: 0.25rem; }
                .gap-2 { gap: 0.5rem; }
                .gap-3 { gap: 0.75rem; }
                .gap-4 { gap: 1rem; }

                .p-2 { padding: 0.5rem; }
                .p-3 { padding: 0.75rem; }
                .p-4 { padding: 1rem; }

                .mb-2 { margin-bottom: 0.5rem; }
                .mb-4 { margin-bottom: 1rem; }
                .mt-4 { margin-top: 1rem; }

                .w-full { width: 100%; }
                .min-w-0 { min-width: 0; }
                .flex-1 { flex: 1; }

                .rounded { border-radius: 0.5rem; }
                .rounded-lg { border-radius: 0.75rem; }

                .overflow-hidden { overflow: hidden; }
                .overflow-auto { overflow: auto; }

                .cursor-pointer { cursor: pointer; }
                .pointer-events-none { pointer-events: none; }

                .opacity-50 { opacity: 0.5; }

                .transition {
                    transition: all 0.2s;
                }

                /* Scrollbar styling */
                ::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
            </style>
        `;
    }

    // Abstract method - must be implemented by subclasses
    render() {
        throw new Error('render() must be implemented');
    }

    // Optional - override to setup event listeners
    setupEventListeners() {}

    // Helper to emit custom events
    emit(eventName, detail = {}) {
        this.dispatchEvent(new CustomEvent(eventName, {
            bubbles: true,
            composed: true,
            detail,
        }));
    }

    // Helper to query shadow DOM
    $(selector) {
        return this.shadowRoot.querySelector(selector);
    }

    $$(selector) {
        return this.shadowRoot.querySelectorAll(selector);
    }
}
