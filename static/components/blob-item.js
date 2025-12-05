/**
 * Blob Item - Individual file card with selection and preview support
 */

import { BaseComponent } from './base-component.js';
import { store } from '../js/store.js';
import { pinService } from '../js/pin-service.js';
import { showToast } from './toast-notification.js';
import { icons, getFileIcon } from '../js/icons.js';

class BlobItem extends BaseComponent {
    static get observedAttributes() {
        return ['cid', 'mimetype', 'size', 'filename', 'rkey', 'selectable', 'selected'];
    }

    get cid() { return this.getAttribute('cid'); }
    get mimeType() { return this.getAttribute('mimetype'); }
    get size() { return parseInt(this.getAttribute('size')) || 0; }
    get filename() { return this.getAttribute('filename'); }
    get rkey() { return this.getAttribute('rkey'); }
    get selectable() { return this.hasAttribute('selectable'); }
    get selected() { return this.hasAttribute('selected'); }

    render() {
        const isImage = this.mimeType?.startsWith('image/');
        const { userDid } = store.getState();
        
        const cdnUrl = userDid && this.cid 
            ? `https://cdn.bsky.app/img/feed_thumbnail/plain/${userDid}/${this.cid}@jpeg`
            : null;

        this.shadowRoot.innerHTML = `
            ${this.getBaseStyles()}
            <style>
                .blob-card {
                    background: var(--bg-elevated);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    transition: all var(--transition-fast);
                    cursor: pointer;
                    position: relative;
                }

                .blob-card:hover {
                    border-color: var(--border-default);
                    box-shadow: var(--shadow-md);
                }

                .blob-card.selected {
                    border-color: var(--accent);
                    background: var(--accent-muted);
                }

                /* Selection checkbox */
                .select-checkbox {
                    position: absolute;
                    top: 0.75rem;
                    left: 0.75rem;
                    z-index: 10;
                    width: 20px;
                    height: 20px;
                    background: var(--bg-base);
                    border: 2px solid var(--border-strong);
                    border-radius: 4px;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }

                .blob-card.selectable .select-checkbox {
                    display: flex;
                }

                .select-checkbox.checked {
                    background: var(--accent);
                    border-color: var(--accent);
                }

                .select-checkbox svg {
                    width: 12px;
                    height: 12px;
                    color: white;
                    display: none;
                }

                .select-checkbox.checked svg {
                    display: block;
                }

                /* Thumbnail */
                .thumbnail {
                    aspect-ratio: 16/10;
                    background: var(--bg-subtle);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    overflow: hidden;
                }

                .thumbnail img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.3s ease;
                }

                .blob-card:hover .thumbnail img {
                    transform: scale(1.05);
                }

                .thumbnail-icon {
                    color: var(--text-muted);
                    width: 32px;
                    height: 32px;
                }

                .thumbnail-icon svg {
                    width: 100%;
                    height: 100%;
                }

                /* Preview overlay */
                .preview-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity var(--transition-fast);
                }

                .blob-card:hover .preview-overlay {
                    opacity: 1;
                }

                .preview-btn {
                    padding: 0.5rem 1rem;
                    background: white;
                    color: black;
                    border: none;
                    border-radius: var(--radius-md);
                    font-size: 0.8125rem;
                    font-weight: 500;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                }

                .preview-btn svg {
                    width: 14px;
                    height: 14px;
                }

                /* Info */
                .info {
                    padding: 0.75rem;
                }

                .filename {
                    font-size: 0.8125rem;
                    font-weight: 500;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .meta {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.6875rem;
                    color: var(--text-muted);
                }

                .cid {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.625rem;
                    color: var(--text-muted);
                    margin-top: 0.375rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                /* Actions */
                .actions {
                    display: flex;
                    gap: 0.125rem;
                    padding: 0.5rem 0.75rem 0.75rem;
                    border-top: 1px solid var(--border-subtle);
                }

                .action-btn {
                    flex: 1;
                    padding: 0.375rem;
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    border-radius: var(--radius-sm);
                    transition: all var(--transition-fast);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.25rem;
                    font-size: 0.6875rem;
                    font-family: inherit;
                }

                .action-btn:hover {
                    background: var(--bg-subtle);
                    color: var(--text-primary);
                }

                .action-btn.danger:hover {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--error);
                }

                .action-btn svg {
                    width: 14px;
                    height: 14px;
                }
            </style>

            <div class="blob-card ${this.selectable ? 'selectable' : ''} ${this.selected ? 'selected' : ''}" id="card">
                <div class="select-checkbox ${this.selected ? 'checked' : ''}" id="checkbox">
                    ${icons.check}
                </div>
                
                <div class="thumbnail" id="thumbnail">
                    ${isImage && cdnUrl 
                        ? `<img src="${cdnUrl}" alt="${this.filename || 'Image'}" loading="lazy" />`
                        : `<div class="thumbnail-icon">${getFileIcon(this.mimeType)}</div>`
                    }
                    <div class="preview-overlay">
                        <button class="preview-btn" id="previewBtn">
                            ${icons.externalLink}
                            Preview
                        </button>
                    </div>
                </div>
                
                <div class="info">
                    <div class="filename" title="${this.filename || this.cid}">${this.filename || 'Unnamed file'}</div>
                    <div class="meta">
                        <span>${this.formatBytes(this.size)}</span>
                        <span>•</span>
                        <span>${this.getMimeLabel()}</span>
                    </div>
                    <div class="cid" title="${this.cid}">${this.cid}</div>
                </div>

                <div class="actions">
                    <button class="action-btn" id="copyBtn" title="Copy CID">
                        ${icons.copy}
                        Copy
                    </button>
                    <button class="action-btn" id="downloadBtn" title="Download">
                        ${icons.download}
                        Download
                    </button>
                    <button class="action-btn danger" id="deleteBtn" title="Delete">
                        ${icons.trash}
                    </button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const card = this.$('#card');
        const checkbox = this.$('#checkbox');

        // Selection toggle
        if (this.selectable) {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.action-btn') || e.target.closest('.preview-btn')) return;
                this.toggleSelection();
            });

            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSelection();
            });
        }

        // Preview
        this.$('#previewBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openPreview();
        });

        // Copy CID
        this.$('#copyBtn').addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await navigator.clipboard.writeText(this.cid);
                showToast('CID copied!', 'success');
            } catch {
                showToast('Failed to copy', 'error');
            }
        });

        // Download
        this.$('#downloadBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            const { userDid } = store.getState();
            if (userDid && this.cid) {
                const url = `https://cdn.bsky.app/img/feed_fullsize/plain/${userDid}/${this.cid}@jpeg`;
                const a = document.createElement('a');
                a.href = url;
                a.download = this.filename || `blob-${this.cid.substring(0, 8)}`;
                a.click();
            }
        });

        // Delete
        this.$('#deleteBtn').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!this.rkey) {
                showToast('Cannot delete this file', 'error');
                return;
            }

            if (!confirm(`Delete "${this.filename || 'this file'}"?`)) {
                return;
            }

            const btn = this.$('#deleteBtn');
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;"></div>';

            try {
                await pinService.deletePin(this.rkey);
                showToast('File deleted', 'success');
                await pinService.loadAllBlobs();
            } catch (error) {
                showToast('Delete failed: ' + error.message, 'error');
                btn.disabled = false;
                btn.innerHTML = icons.trash;
            }
        });
    }

    toggleSelection() {
        const isSelected = !this.selected;
        if (isSelected) {
            this.setAttribute('selected', '');
        } else {
            this.removeAttribute('selected');
        }
        
        this.$('#card').classList.toggle('selected', isSelected);
        this.$('#checkbox').classList.toggle('checked', isSelected);

        this.emit('selection-change', {
            cid: this.cid,
            rkey: this.rkey,
            filename: this.filename,
            size: this.size,
            selected: isSelected,
        });
    }

    openPreview() {
        const event = new CustomEvent('preview', {
            bubbles: true,
            composed: true,
            detail: {
                cid: this.cid,
                mimeType: this.mimeType,
                filename: this.filename,
                size: this.size,
            },
        });
        document.dispatchEvent(event);
    }

    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    getMimeLabel() {
        const mime = this.mimeType || '';
        if (mime.startsWith('image/')) return 'Image';
        if (mime.startsWith('video/')) return 'Video';
        if (mime.startsWith('audio/')) return 'Audio';
        if (mime.includes('pdf')) return 'PDF';
        if (mime.includes('json')) return 'JSON';
        if (mime.startsWith('text/')) return 'Text';
        return 'File';
    }
}

customElements.define('blob-item', BlobItem);
