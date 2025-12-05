/**
 * Blob Item Component - Individual blob card with actions
 */

import { BaseComponent } from './base-component.js';
import { store } from '../js/store.js';
import { pinService } from '../js/pin-service.js';
import { getCdnUrl, getRawBlobUrl, formatBytes, getFileIcon, copyToClipboard, formatMimeType } from '../js/utils.js';
import { showToast } from './toast-notification.js';

class BlobItem extends BaseComponent {
    static get observedAttributes() {
        return ['cid', 'mimetype', 'size', 'filename', 'rkey', 'pinned', 'selected', 'selectable'];
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

    get filename() {
        return this.getAttribute('filename') || '';
    }

    get rkey() {
        return this.getAttribute('rkey') || '';
    }

    get pinned() {
        return this.hasAttribute('pinned');
    }

    get selected() {
        return this.hasAttribute('selected');
    }

    set selected(value) {
        if (value) {
            this.setAttribute('selected', '');
        } else {
            this.removeAttribute('selected');
        }
    }

    get selectable() {
        return this.hasAttribute('selectable');
    }

    render() {
        const cid = this.cid;
        const mimeType = this.mimeType;
        const size = this.size;
        const filename = this.filename;
        const isPinned = this.pinned;
        const isImage = mimeType.startsWith('image/');
        const isVideo = mimeType.startsWith('video/');
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
                    position: relative;
                }

                .blob-card:hover {
                    border-color: rgba(255, 255, 255, 0.2);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                }

                .blob-card.pinned {
                    border-color: rgba(101, 105, 240, 0.3);
                }

                .pin-badge {
                    position: absolute;
                    top: 0.5rem;
                    right: 0.5rem;
                    background: oklch(65.69% 0.196 275.75);
                    color: white;
                    padding: 0.25rem;
                    border-radius: 50%;
                    z-index: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .pin-badge svg {
                    width: 12px;
                    height: 12px;
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

                .blob-filename {
                    font-size: 0.8rem;
                    font-weight: 500;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-bottom: 0.25rem;
                    color: white;
                }

                .blob-cid {
                    font-family: monospace;
                    font-size: 0.65rem;
                    color: rgba(255, 255, 255, 0.5);
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

                .btn-danger {
                    color: oklch(65% 0.2 25);
                }

                .btn-danger:hover {
                    background: rgba(239, 68, 68, 0.2);
                    color: oklch(70% 0.2 25);
                }

                .selection-checkbox {
                    position: absolute;
                    top: 0.5rem;
                    left: 0.5rem;
                    z-index: 2;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }

                .blob-card:hover .selection-checkbox,
                .blob-card.selected .selection-checkbox,
                :host([selectable]) .selection-checkbox {
                    opacity: 1;
                }

                .selection-checkbox input {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                    accent-color: oklch(65.69% 0.196 275.75);
                }

                .blob-card.selected {
                    border-color: oklch(65.69% 0.196 275.75);
                    background: rgba(101, 105, 240, 0.1);
                }
            </style>
            <div class="blob-card ${isPinned ? 'pinned' : ''} ${this.selected ? 'selected' : ''}">
                <div class="selection-checkbox">
                    <input type="checkbox" id="selectCheckbox" ${this.selected ? 'checked' : ''} />
                </div>
                ${isPinned ? `
                    <div class="pin-badge" title="Pinned">
                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path>
                        </svg>
                    </div>
                ` : ''}
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
                    ${filename ? `<div class="blob-filename" title="${filename}">${filename}</div>` : ''}
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
                    ${isPinned ? `
                        <button class="btn btn-ghost btn-danger" id="deleteBtn" title="Delete pin">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const cid = this.cid;
        const filename = this.filename;
        const rkey = this.rkey;
        const rawUrl = getRawBlobUrl(store.getState().did, cid);
        const cdnUrl = getCdnUrl(store.getState().did, cid);

        // Selection checkbox
        this.$('#selectCheckbox').addEventListener('change', (e) => {
            e.stopPropagation();
            this.selected = e.target.checked;
            this.dispatchEvent(new CustomEvent('selection-change', {
                detail: { cid, rkey, selected: this.selected, filename, size: this.size },
                bubbles: true,
                composed: true
            }));
        });

        // Thumbnail click - preview
        this.$('#thumbnail').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('preview', {
                detail: { cid, mimeType: this.mimeType, size: this.size, filename },
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
            link.download = filename || `blob-${cid.substring(0, 8)}`;
            link.click();
            showToast('Download started', 'info');
        });

        // Open in new tab
        this.$('#openBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            globalThis.open(cdnUrl, '_blank');
        });

        // Delete button (only for pinned blobs)
        const deleteBtn = this.$('#deleteBtn');
        if (deleteBtn && rkey) {
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                
                // Confirm deletion
                if (!confirm(`Delete "${filename || cid.substring(0, 16)}..."?`)) {
                    return;
                }

                deleteBtn.disabled = true;
                deleteBtn.innerHTML = '<span class="loading"></span>';

                try {
                    await pinService.deletePin(rkey);
                    showToast('Blob deleted successfully', 'success');
                    // Refresh the list
                    await pinService.loadAllBlobs();
                } catch (error) {
                    showToast('Failed to delete: ' + error.message, 'error');
                    deleteBtn.disabled = false;
                    deleteBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    `;
                }
            });
        }
    }

    attributeChangedCallback(_name, oldValue, newValue) {
        if (oldValue !== newValue && this.shadowRoot.innerHTML) {
            this.render();
            this.setupEventListeners();
        }
    }
}

customElements.define('blob-item', BlobItem);
