/**
 * Preview Modal Component - Full-screen blob preview
 */

import { auth } from '../js/state.js';
import { getCdnUrl, getRawBlobUrl, formatBytes, copyToClipboard, $, cloneTemplate, hydrateIcons } from '../js/utils.js';
import { showToast } from './toast-notification.js';
import { icons } from '../js/icons.js';

export class PreviewModal extends HTMLElement {
    constructor() {
        super();
        this.isOpen = false;
        this.currentBlob = null;
    }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        cloneTemplate('preview-modal-template', this.shadowRoot);
        hydrateIcons(this.shadowRoot);
        this.setupEventListeners();
    }

    setupEventListeners() {
        $(this.shadowRoot, '#closeBtn').addEventListener('click', () => this.close());
        $(this.shadowRoot, '#backdrop').addEventListener('click', () => this.close());

        this._keyHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        };
        document.addEventListener('keydown', this._keyHandler);
        document.addEventListener('preview', (e) => this.open(e.detail));

        $(this.shadowRoot, '#copyCidBtn').addEventListener('click', async () => {
            if (this.currentBlob) {
                await copyToClipboard(this.currentBlob.cid);
                showToast('CID copied!', 'success');
            }
        });

        $(this.shadowRoot, '#copyLinkBtn').addEventListener('click', async () => {
            if (this.currentBlob) {
                const did = auth.value.userDid;
                await copyToClipboard(getCdnUrl(did, this.currentBlob.cid));
                showToast('Link copied!', 'success');
            }
        });

        $(this.shadowRoot, '#downloadBtn').addEventListener('click', () => {
            if (this.currentBlob) {
                const did = auth.value.userDid;
                const link = document.createElement('a');
                link.href = getRawBlobUrl(did, this.currentBlob.cid);
                link.download = this.currentBlob.filename || `blob-${this.currentBlob.cid.substring(0, 8)}`;
                link.click();
            }
        });

        $(this.shadowRoot, '#openTabBtn').addEventListener('click', () => {
            if (this.currentBlob) {
                const did = auth.value.userDid;
                globalThis.open(getCdnUrl(did, this.currentBlob.cid), '_blank');
            }
        });
    }

    disconnectedCallback() {
        document.removeEventListener('keydown', this._keyHandler);
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
        this.hideAllPreviews();
    }

    hideAllPreviews() {
        ['#imagePreview', '#videoPreview', '#audioPreview', '#textPreview', '#placeholder', '#loadingState'].forEach(sel => {
            const el = $(this.shadowRoot, sel);
            if (el) el.hidden = true;
        });
    }

    renderContent() {
        if (!this.currentBlob) return;

        const { cid, mimeType, size, filename } = this.currentBlob;
        const did = auth.value.userDid;
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

        const displayName = filename || `blob-${cid.substring(0, 8)}`;

        // Update title info
        $(this.shadowRoot, '#filename').textContent = displayName;
        $(this.shadowRoot, '#filename').title = displayName;
        $(this.shadowRoot, '#mimeType').textContent = mimeType || 'Unknown';
        $(this.shadowRoot, '#fileSize').textContent = formatBytes(size);
        $(this.shadowRoot, '#cidValue').textContent = cid;

        this.hideAllPreviews();

        if (isImage) {
            const preview = $(this.shadowRoot, '#imagePreview');
            const img = $(this.shadowRoot, '#previewImg');
            img.src = cdnUrl;
            img.alt = displayName;
            preview.hidden = false;
        } else if (isVideo) {
            const preview = $(this.shadowRoot, '#videoPreview');
            const video = $(this.shadowRoot, '#previewVideo');
            video.src = rawUrl;
            preview.hidden = false;
        } else if (isAudio) {
            const preview = $(this.shadowRoot, '#audioPreview');
            const audio = $(this.shadowRoot, '#previewAudio');
            audio.src = rawUrl;
            preview.hidden = false;
        } else if (isText) {
            $(this.shadowRoot, '#loadingState').hidden = false;
            this.loadTextContent(rawUrl);
        } else {
            const placeholder = $(this.shadowRoot, '#placeholder');
            $(this.shadowRoot, '#placeholderIcon').innerHTML = icons.file;
            placeholder.hidden = false;
        }
    }

    async loadTextContent(url) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            
            $(this.shadowRoot, '#loadingState').hidden = true;
            const preview = $(this.shadowRoot, '#textPreview');
            const content = $(this.shadowRoot, '#textContent');
            
            const displayText = text.length > 100000 
                ? text.substring(0, 100000) + '\n\n... (truncated, file too large to display fully)'
                : text;
            content.textContent = displayText;
            preview.hidden = false;
        } catch (error) {
            $(this.shadowRoot, '#loadingState').hidden = true;
            const preview = $(this.shadowRoot, '#textPreview');
            const content = $(this.shadowRoot, '#textContent');
            content.textContent = `Failed to load text content: ${error.message}`;
            content.style.color = 'rgba(255,100,100,0.8)';
            preview.hidden = false;
        }
    }
}
