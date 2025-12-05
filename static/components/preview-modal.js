/**
 * Preview Modal Component - Full-screen blob preview
 */

import { BaseComponent } from './base-component.js';
import { store } from '../js/store.js';
import { getCdnUrl, getRawBlobUrl, formatBytes, copyToClipboard } from '../js/utils.js';
import { showToast } from './toast-notification.js';

class PreviewModal extends BaseComponent {
    constructor() {
        super();
        this.isOpen = false;
        this.currentBlob = null;
        this.textContent = null;
    }

    render() {
        this.shadowRoot.innerHTML = `
            ${this.getBaseStyles()}
            <style>
                :host {
                    display: none;
                    position: fixed;
                    inset: 0;
                    z-index: 1000;
                }

                :host(.open) {
                    display: flex;
                }

                .modal-backdrop {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.9);
                    backdrop-filter: blur(10px);
                }

                .modal-container {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    background: rgba(0, 0, 0, 0.5);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .modal-title {
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                    min-width: 0;
                }

                .modal-filename {
                    max-width: 300px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .modal-title .badge {
                    background: rgba(101, 105, 240, 0.2);
                    color: oklch(75% 0.15 275);
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    font-size: 0.75rem;
                    font-weight: 500;
                    white-space: nowrap;
                }

                .modal-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .modal-body {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    overflow: auto;
                }

                .preview-content {
                    max-width: 100%;
                    max-height: 100%;
                }

                .preview-content img {
                    max-width: 100%;
                    max-height: calc(100vh - 200px);
                    object-fit: contain;
                    border-radius: 0.5rem;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                }

                .preview-content video {
                    max-width: 100%;
                    max-height: calc(100vh - 200px);
                    border-radius: 0.5rem;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                }

                .preview-content audio {
                    width: 400px;
                    max-width: 100%;
                }

                .text-preview {
                    background: rgba(0, 0, 0, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 0.75rem;
                    padding: 1.5rem;
                    max-width: 900px;
                    width: 100%;
                    max-height: calc(100vh - 200px);
                    overflow: auto;
                }

                .text-preview pre {
                    margin: 0;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.875rem;
                    line-height: 1.6;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    color: rgba(255, 255, 255, 0.9);
                }

                .text-preview.loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 200px;
                }

                .preview-placeholder {
                    text-align: center;
                    color: rgba(255, 255, 255, 0.6);
                }

                .preview-placeholder svg {
                    width: 80px;
                    height: 80px;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .preview-placeholder h3 {
                    margin: 0 0 0.5rem;
                }

                .preview-placeholder p {
                    margin: 0;
                    font-size: 0.875rem;
                }

                .modal-footer {
                    padding: 1rem 1.5rem;
                    background: rgba(0, 0, 0, 0.5);
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .cid-row {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: rgba(0, 0, 0, 0.3);
                    padding: 0.5rem 0.75rem;
                    border-radius: 0.5rem;
                    margin-bottom: 0.75rem;
                }

                .cid-label {
                    font-size: 0.75rem;
                    color: rgba(255, 255, 255, 0.5);
                    font-weight: 500;
                }

                .cid-value {
                    flex: 1;
                    font-family: monospace;
                    font-size: 0.8rem;
                    word-break: break-all;
                }

                .footer-actions {
                    display: flex;
                    gap: 0.5rem;
                    justify-content: flex-end;
                }

                .footer-actions .btn {
                    flex: 1;
                }

                @media (max-width: 640px) {
                    .modal-header,
                    .modal-footer {
                        padding: 0.75rem 1rem;
                    }

                    .modal-body {
                        padding: 1rem;
                    }

                    .footer-actions {
                        flex-direction: column;
                    }

                    .modal-filename {
                        max-width: 150px;
                    }
                }
            </style>
            <div class="modal-backdrop" id="backdrop"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <div class="modal-title" id="modalTitle">Preview</div>
                    <div class="modal-actions">
                        <button class="btn btn-ghost" id="closeBtn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="modal-body" id="modalBody">
                    <!-- Preview content goes here -->
                </div>
                <div class="modal-footer" id="modalFooter">
                    <!-- Footer content goes here -->
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Close button
        this.$('#closeBtn').addEventListener('click', () => this.close());

        // Click backdrop to close
        this.$('#backdrop').addEventListener('click', () => this.close());

        // Escape key to close
        this.handleKeyDown = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        };
        document.addEventListener('keydown', this.handleKeyDown);

        // Listen for preview events from blob items
        document.addEventListener('preview', (e) => {
            this.open(e.detail);
        });
    }

    open(blob) {
        this.currentBlob = blob;
        this.isOpen = true;
        this.classList.add('open');
        document.body.style.overflow = 'hidden';
        this.renderContent();
    }

    close() {
        this.isOpen = false;
        this.classList.remove('open');
        document.body.style.overflow = '';
        this.currentBlob = null;
    }

    renderContent() {
        if (!this.currentBlob) return;

        const { cid, mimeType, size, filename } = this.currentBlob;
        const did = store.getState().did;
        const cdnUrl = getCdnUrl(did, cid);
        const rawUrl = getRawBlobUrl(did, cid);
        const isImage = mimeType?.startsWith('image/');
        const isVideo = mimeType?.startsWith('video/');
        const isAudio = mimeType?.startsWith('audio/');
        const isText = mimeType?.startsWith('text/') || 
                       mimeType?.includes('json') || 
                       mimeType?.includes('xml') ||
                       mimeType?.includes('javascript') ||
                       mimeType?.includes('typescript');

        // Update title with filename if available
        const displayName = filename || `blob-${cid.substring(0, 8)}`;
        this.$('#modalTitle').innerHTML = `
            <span class="modal-filename" title="${displayName}">${displayName}</span>
            <span class="badge">${mimeType || 'Unknown'}</span>
            <span class="badge">${formatBytes(size)}</span>
        `;

        // Render preview content
        const body = this.$('#modalBody');
        
        if (isImage) {
            body.innerHTML = `
                <div class="preview-content">
                    <img src="${cdnUrl}" alt="${displayName}" />
                </div>
            `;
        } else if (isVideo) {
            body.innerHTML = `
                <div class="preview-content">
                    <video src="${rawUrl}" controls autoplay></video>
                </div>
            `;
        } else if (isAudio) {
            body.innerHTML = `
                <div class="preview-content">
                    <audio src="${rawUrl}" controls autoplay></audio>
                </div>
            `;
        } else if (isText) {
            body.innerHTML = `
                <div class="text-preview loading">
                    <span class="loading loading-lg"></span>
                </div>
            `;
            // Fetch and display text content
            this.loadTextContent(rawUrl);
        } else {
            body.innerHTML = `
                <div class="preview-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <h3>Preview not available</h3>
                    <p>This file type cannot be previewed. Use the download button below.</p>
                </div>
            `;
        }

        // Render footer
        this.$('#modalFooter').innerHTML = `
            <div class="cid-row">
                <span class="cid-label">CID:</span>
                <span class="cid-value">${cid}</span>
                <button class="btn btn-ghost btn-sm" id="copyCidBtn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
            </div>
            <div class="footer-actions">
                <button class="btn btn-ghost" id="copyLinkBtn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                    Copy Link
                </button>
                <button class="btn btn-ghost" id="downloadBtn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download
                </button>
                <button class="btn btn-primary" id="openTabBtn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    Open in Tab
                </button>
            </div>
        `;

        // Setup footer button events
        this.$('#copyCidBtn').addEventListener('click', async () => {
            await copyToClipboard(cid);
            showToast('CID copied!', 'success');
        });

        this.$('#copyLinkBtn').addEventListener('click', async () => {
            await copyToClipboard(cdnUrl);
            showToast('Link copied!', 'success');
        });

        this.$('#downloadBtn').addEventListener('click', () => {
            const link = document.createElement('a');
            link.href = rawUrl;
            link.download = filename || `blob-${cid.substring(0, 8)}`;
            link.click();
        });

        this.$('#openTabBtn').addEventListener('click', () => {
            globalThis.open(cdnUrl, '_blank');
        });
    }

    async loadTextContent(url) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            this.textContent = text;
            
            const container = this.$('.text-preview');
            if (container) {
                container.classList.remove('loading');
                // Limit displayed text to avoid performance issues
                const displayText = text.length > 100000 
                    ? text.substring(0, 100000) + '\n\n... (truncated, file too large to display fully)'
                    : text;
                container.innerHTML = `<pre>${this.escapeHtml(displayText)}</pre>`;
            }
        } catch (error) {
            const container = this.$('.text-preview');
            if (container) {
                container.classList.remove('loading');
                container.innerHTML = `<pre style="color: rgba(255,100,100,0.8);">Failed to load text content: ${error.message}</pre>`;
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('keydown', this.handleKeyDown);
    }
}

customElements.define('preview-modal', PreviewModal);
