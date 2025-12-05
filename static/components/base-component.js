/**
 * Base Component - Clean, minimal base class
 */

export class BaseComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        if (this.subscribeToStore) {
            this.subscribeToStore();
        }
    }

    disconnectedCallback() {
        if (this.storeUnsubscribe) {
            this.storeUnsubscribe();
        }
    }

    getBaseStyles() {
        return `
            <style>
                /* Reset */
                *, *::before, *::after {
                    box-sizing: border-box;
                }

                :host {
                    display: block;
                }

                /* Typography */
                h1, h2, h3, h4 {
                    margin: 0;
                    font-weight: 600;
                    line-height: 1.3;
                    letter-spacing: -0.02em;
                }

                p { margin: 0; }

                /* Buttons */
                .btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.625rem 1rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    font-family: inherit;
                    border-radius: var(--radius-md);
                    border: 1px solid transparent;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    outline: none;
                    text-decoration: none;
                }

                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .btn-primary {
                    background: var(--accent);
                    color: white;
                    border-color: var(--accent);
                }

                .btn-primary:hover:not(:disabled) {
                    background: var(--accent-hover);
                    border-color: var(--accent-hover);
                }

                .btn-secondary {
                    background: var(--bg-elevated);
                    color: var(--text-primary);
                    border-color: var(--border-default);
                }

                .btn-secondary:hover:not(:disabled) {
                    background: var(--bg-subtle);
                    border-color: var(--border-strong);
                }

                .btn-ghost {
                    background: transparent;
                    color: var(--text-secondary);
                }

                .btn-ghost:hover:not(:disabled) {
                    background: var(--bg-elevated);
                    color: var(--text-primary);
                }

                .btn-danger {
                    background: transparent;
                    color: var(--error);
                    border-color: transparent;
                }

                .btn-danger:hover:not(:disabled) {
                    background: rgba(239, 68, 68, 0.1);
                }

                .btn-sm {
                    padding: 0.375rem 0.75rem;
                    font-size: 0.8125rem;
                }

                .btn-icon {
                    padding: 0.5rem;
                    border-radius: var(--radius-sm);
                }

                .btn svg {
                    width: 16px;
                    height: 16px;
                    flex-shrink: 0;
                }

                /* Inputs */
                .input {
                    width: 100%;
                    padding: 0.625rem 0.875rem;
                    font-size: 0.9375rem;
                    font-family: inherit;
                    color: var(--text-primary);
                    background: var(--bg-base);
                    border: 1px solid var(--border-default);
                    border-radius: var(--radius-md);
                    outline: none;
                    transition: all var(--transition-fast);
                }

                .input:hover {
                    border-color: var(--border-strong);
                }

                .input:focus {
                    border-color: var(--accent);
                    box-shadow: 0 0 0 3px var(--accent-muted);
                }

                .input::placeholder {
                    color: var(--text-muted);
                }

                /* Cards */
                .card {
                    background: var(--bg-elevated);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-lg);
                }

                /* Loading */
                .spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid var(--border-default);
                    border-top-color: var(--accent);
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* Utilities */
                .sr-only {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    border: 0;
                }

                .truncate {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .mono {
                    font-family: 'JetBrains Mono', monospace;
                }
            <\/style>
        `;
    }

    render() {
        throw new Error('render() must be implemented');
    }

    setupEventListeners() {}

    $(selector) {
        return this.shadowRoot.querySelector(selector);
    }

    $$(selector) {
        return this.shadowRoot.querySelectorAll(selector);
    }

    emit(name, detail = {}) {
        this.dispatchEvent(new CustomEvent(name, {
            bubbles: true,
            composed: true,
            detail,
        }));
    }
}
