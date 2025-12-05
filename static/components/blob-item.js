/**
 * Blob Item Component - Individual blob card with actions
 */

import { BaseComponent } from './base-component.js';
import { store } from '../js/store.js';
import { getCdnUrl, getRawBlobUrl, formatBytes, getFileIcon, copyToClipboard, formatMimeType } from '../js/utils.js';
import { showToast } from './toast-notification.js';

class BlobItem extends BaseComponent {
    static get observedAttributes() {
        return ['cid', 'mimetype', 'size'];
    }

    get cid() {
        return this.getAttribute('cid');
    }

    get mimeType() {
        return this.getAttribute('mimetype') || 'application/octet-stream';
    }

    get size() {
        return parseInt(this.getAttribute('size') || '0', 10);
    }

    render() {
        const cid = this.cid;
        const mimeType = this.mimeType;
        const size = this.size;
        const isImage = mimeType.startsWith('image/');
        const isVideo = mimeType.startsWith('video/');
        const isAudio = mimeType.startsWith('audio/');
        const cdnUrl = getCdnUrl(store.getState().did, cid);
        const rawUrl = getRawBlobUrl(store.getState().did, cid);
        const iconSvg = getFileIcon(mimeType);

        this.shadowRoot.innerHTML = `
            ${this.getBaseStyles()}
            <style>
                .blob-card {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 0.75rem;
                    overflow: hidden;
                    transition: all 0.2s ease;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .blob-card:hover {
                    border-color: rgba(255, 255, 255, 0.2);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                }

                .thumbnail {
                    aspect-ratio: 16/10;
                    background: rgba(0, 0, 0, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    position: relative;
                    cursor: pointer;
                }

                .thumbnail img,
                .thumbnail video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .thumbnail svg {
                    width: 48px;
                    height: 48px;
                    color: oklch(65.69% 0.196 275.75);
                    opacity: 0.7;
                }

                .thumbnail-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }

                .thumbnail:hover .thumbnail-overlay {
                    opacity: 1;
                }

                .thumbnail-overlay svg {
                    width: 36px;
                    height: 36px;
                    color: white;
                    opacity: 1;
                }

                .blob-info {
                    padding: 0.75rem;
                }

                .blob-cid {
                    font-family: monospace;
                    font-size: 0.7rem;
                    color: rgba(255, 255, 255, 0.7);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-bottom: 0.25rem;
                }

                .blob-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.75rem;
                }

                .blob-type {
                    background: rgba(101, 105, 240, 0.2);
                    color: oklch(75% 0.15 275);
                    padding: 0.125rem 0.5rem;
                    border-radius: 0.25rem;
                    font-weight: 500;
                }

                .blob-size {
                    color: rgba(255, 255, 255, 0.5);
                }

                .blob-actions {
                    display: flex;
                    gap: 0.25rem;
                    padding: 0 0.75rem 0.75rem;
                }

                .blob-actions .btn {
                    flex: 1;
                    padding: 0.375rem 0.5rem;
                    font-size: 0.75rem;
                }

                .blob-actions .btn svg {
                    width: 14px;
                    height: 14px;
                }
            </style>
            <div class="blob-card">
                <div class="thumbnail" id="thumbnail">
                    ${isImage ? `<img src="${cdnUrl}" alt="Blob preview" loading="lazy" />` : ''}
                    ${isVideo ? `<video src="${rawUrl}" preload="metadata"></video>` : ''}
                    ${!isImage && !isVideo ? iconSvg : ''}
                    <div class="thumbnail-overlay">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </div>
                </div>
                <div class="blob-info">
                    <div class="blob-cid" title="${cid}">${cid}</div>
                    <div class="blob-meta">
                        <span class="blob-type">${formatMimeType(mimeType)}</span>
                        <span class="blob-size">${formatBytes(size)}</span>
                    </div>
                </div>
                <div class="blob-actions">
                    <button class="btn btn-ghost" id="copyBtn" title="Copy CID">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button class="btn btn-ghost" id="downloadBtn" title="Download">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </button>
                    <button class="btn btn-ghost" id="openBtn" title="Open in new tab">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const cid = this.cid;
        const rawUrl = getRawBlobUrl(store.getState().did, cid);
        const cdnUrl = getCdnUrl(store.getState().did, cid);

        // Thumbnail click - preview
        this.$('#thumbnail').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('preview', {
                detail: { cid, mimeType: this.mimeType, size: this.size },
                bubbles: true,
                composed: true
            }));
        });

        // Copy CID
        this.$('#copyBtn').addEventListener('click', async (e) => {
            e.stopPropagation();
            await copyToClipboard(cid);
            showToast('CID copied to clipboard!', 'success');
        });

        // Download
        this.$('#downloadBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            const link = document.createElement('a');
            link.href = rawUrl;
            link.download = `blob-${cid.substring(0, 8)}`;
            link.click();
            showToast('Download started', 'info');
        });

        // Open in new tab
        this.$('#openBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            window.open(cdnUrl, '_blank');
        });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue && this.shadowRoot.innerHTML) {
            this.render();
            this.setupEventListeners();
        }
    }
}

customElements.define('blob-item', BlobItem);
