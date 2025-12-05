/**
 * Blob Item - Individual file card with selection and preview support
 */

import { auth } from '../js/state.js';
import { pinService } from '../js/pin-service.js';
import { showToast } from './toast-notification.js';
import { icons, getFileIcon } from '../js/icons.js';
import { $, cloneTemplate, emit, formatBytes } from '../js/utils.js';

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
            checkbox.innerHTML = icons.check;
        }

        const thumbnail = $(this.shadowRoot, '#thumbnail');
        if (thumbnail) {
            if (isImage && cdnUrl) {
                thumbnail.insertAdjacentHTML('afterbegin', 
                    `<img src="${cdnUrl}" alt="${this.filename || 'Image'}" loading="lazy" />`
                );
            } else {
                thumbnail.insertAdjacentHTML('afterbegin',
                    `<div class="thumbnail-icon">${getFileIcon(this.mimeType)}</div>`
                );
            }
        }

        const previewBtn = $(this.shadowRoot, '#previewBtn');
        if (previewBtn) {
            const iconSlot = previewBtn.querySelector('.icon-slot');
            if (iconSlot) iconSlot.innerHTML = icons.externalLink;
        }

        const filenameEl = $(this.shadowRoot, '#filename');
        if (filenameEl) {
            filenameEl.textContent = this.filename || 'Unnamed file';
            filenameEl.title = this.filename || this.cid;
        }

        const metaEl = $(this.shadowRoot, '#meta');
        if (metaEl) {
            metaEl.innerHTML = `
                <span>${formatBytes(this.size)}</span>
                <span>•</span>
                <span>${this.getMimeLabel()}</span>
            `;
        }

        const cidEl = $(this.shadowRoot, '#cid');
        if (cidEl) {
            cidEl.textContent = this.cid;
            cidEl.title = this.cid;
        }

        // Update action button icons
        [['#copyBtn', 'copy'], ['#downloadBtn', 'download'], ['#deleteBtn', 'trash']].forEach(([sel, icon]) => {
            const btn = $(this.shadowRoot, sel);
            const slot = btn?.querySelector('.icon-slot');
            if (slot) slot.innerHTML = icons[icon];
        });
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
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner spinner-sm"></div>';

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
