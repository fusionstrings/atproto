/**
 * Blob Item - Individual file card with selection and preview support
 */

import { auth } from '../js/state.js';
import { pinService } from '../js/pin-service.js';
import { showToast } from './toast-notification.js';
import { getFileIcon } from '../js/icons.js';
import { $, cloneTemplate, emit, formatBytes, hydrateIcons } from '../js/utils.js';

export class BlobItem extends HTMLElement {
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

    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        cloneTemplate('blob-item-template', this.shadowRoot);
        hydrateIcons(this.shadowRoot);
        this.populateContent();
        this.setupEventListeners();
    }

    populateContent() {
        const isImage = this.mimeType?.startsWith('image/');
        const { userDid } = auth.value;
        
        const cdnUrl = userDid && this.cid 
            ? `https://cdn.bsky.app/img/feed_thumbnail/plain/${userDid}/${this.cid}@jpeg`
            : null;

        const card = $(this.shadowRoot, '#card');
        if (card) {
            card.classList.toggle('selectable', this.selectable);
            card.classList.toggle('selected', this.selected);
        }

        const checkbox = $(this.shadowRoot, '#checkbox');
        if (checkbox) {
            checkbox.classList.toggle('checked', this.selected);
        }

        const thumbnailImg = $(this.shadowRoot, '#thumbnailImg');
        const thumbnailIcon = $(this.shadowRoot, '#thumbnailIcon');
        
        if (isImage && cdnUrl) {
            thumbnailImg.src = cdnUrl;
            thumbnailImg.alt = this.filename || 'Image';
            thumbnailImg.hidden = false;
        } else {
            thumbnailIcon.innerHTML = getFileIcon(this.mimeType);
            thumbnailIcon.hidden = false;
        }

        const filenameEl = $(this.shadowRoot, '#filename');
        if (filenameEl) {
            filenameEl.textContent = this.filename || 'Unnamed file';
            filenameEl.title = this.filename || this.cid;
        }

        const sizeEl = $(this.shadowRoot, '#size');
        if (sizeEl) sizeEl.textContent = formatBytes(this.size);
        
        const typeEl = $(this.shadowRoot, '#type');
        if (typeEl) typeEl.textContent = this.getMimeLabel();

        const cidEl = $(this.shadowRoot, '#cid');
        if (cidEl) {
            cidEl.textContent = this.cid;
            cidEl.title = this.cid;
        }
    }

    setupEventListeners() {
        const card = $(this.shadowRoot, '#card');
        const checkbox = $(this.shadowRoot, '#checkbox');

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

        $(this.shadowRoot, '#previewBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.dispatchEvent(new CustomEvent('preview', {
                bubbles: true,
                composed: true,
                detail: { cid: this.cid, mimeType: this.mimeType, filename: this.filename, size: this.size },
            }));
        });

        $(this.shadowRoot, '#copyBtn').addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await navigator.clipboard.writeText(this.cid);
                showToast('CID copied!', 'success');
            } catch {
                showToast('Failed to copy', 'error');
            }
        });

        $(this.shadowRoot, '#downloadBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            const { userDid } = auth.value;
            if (userDid && this.cid) {
                const url = `https://cdn.bsky.app/img/feed_fullsize/plain/${userDid}/${this.cid}@jpeg`;
                const a = document.createElement('a');
                a.href = url;
                a.download = this.filename || `blob-${this.cid.substring(0, 8)}`;
                a.click();
            }
        });

        $(this.shadowRoot, '#deleteBtn').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!this.rkey) {
                showToast('Cannot delete this file', 'error');
                return;
            }

            if (!confirm(`Delete "${this.filename || 'this file'}"?`)) return;

            const btn = $(this.shadowRoot, '#deleteBtn');
            const originalContent = btn.innerHTML;
            btn.disabled = true;
            btn.textContent = '';
            const spinner = document.createElement('div');
            spinner.className = 'spinner spinner-sm';
            btn.appendChild(spinner);

            try {
                await pinService.deletePin(this.rkey);
                showToast('File deleted', 'success');
                await pinService.loadAllBlobs();
            } catch (error) {
                showToast('Delete failed: ' + error.message, 'error');
                btn.disabled = false;
                btn.innerHTML = originalContent;
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
        
        $(this.shadowRoot, '#card').classList.toggle('selected', isSelected);
        $(this.shadowRoot, '#checkbox').classList.toggle('checked', isSelected);

        emit(this, 'selection-change', {
            cid: this.cid,
            rkey: this.rkey,
            filename: this.filename,
            size: this.size,
            selected: isSelected,
        });
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
