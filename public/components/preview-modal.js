/**
 * Preview Modal Component - Full-screen blob preview
 */

import { auth } from '../js/state.js';
import { getCdnUrl, getRawBlobUrl, formatBytes, copyToClipboard, escapeHtml, $, cloneTemplate } from '../js/utils.js';
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
        
        // Close button icon
        const closeBtn = $(this.shadowRoot, '#closeBtn');
        if (closeBtn) closeBtn.innerHTML = icons.x;

        // Close button
        $(this.shadowRoot, '#closeBtn').addEventListener('click', () => this.close());

        // Click backdrop to close
        $(this.shadowRoot, '#backdrop').addEventListener('click', () => this.close());

        // Escape key to close
        this._keyHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        };
        document.addEventListener('keydown', this._keyHandler);

        // Listen for preview events from blob items
        document.addEventListener('preview', (e) => this.open(e.detail));
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
        $(this.shadowRoot, '#modalTitle').innerHTML = `
            <span class="modal-filename" title="${displayName}">${displayName}</span>
            <span class="badge">${mimeType || 'Unknown'}</span>
            <span class="badge">${formatBytes(size)}</span>
        `;

        const body = $(this.shadowRoot, '#modalBody');
        
        if (isImage) {
            body.innerHTML = `<div class="preview-content"><img src="${cdnUrl}" alt="${displayName}" /></div>`;
        } else if (isVideo) {
            body.innerHTML = `<div class="preview-content"><video src="${rawUrl}" controls autoplay></video></div>`;
        } else if (isAudio) {
            body.innerHTML = `<div class="preview-content"><audio src="${rawUrl}" controls autoplay></audio></div>`;
        } else if (isText) {
            body.innerHTML = `<div class="text-preview loading"><span class="loading loading-lg"></span></div>`;
            this.loadTextContent(rawUrl);
        } else {
            body.innerHTML = `
                <div class="preview-placeholder">
                    ${icons.file}
                    <h3>Preview not available</h3>
                    <p>This file type cannot be previewed. Use the download button below.</p>
                </div>
            `;
        }

        $(this.shadowRoot, '#modalFooter').innerHTML = `
            <div class="cid-row">
                <span class="cid-label">CID:</span>
                <span class="cid-value">${cid}</span>
                <button class="btn btn-ghost btn-sm" id="copyCidBtn">${icons.copy}</button>
            </div>
            <div class="footer-actions">
                <button class="btn btn-ghost" id="copyLinkBtn">${icons.link} Copy Link</button>
                <button class="btn btn-ghost" id="downloadBtn">${icons.download} Download</button>
                <button class="btn btn-primary" id="openTabBtn">${icons.externalLink} Open in Tab</button>
            </div>
        `;

        $(this.shadowRoot, '#copyCidBtn').addEventListener('click', async () => {
            await copyToClipboard(cid);
            showToast('CID copied!', 'success');
        });

        $(this.shadowRoot, '#copyLinkBtn').addEventListener('click', async () => {
            await copyToClipboard(cdnUrl);
            showToast('Link copied!', 'success');
        });

        $(this.shadowRoot, '#downloadBtn').addEventListener('click', () => {
            const link = document.createElement('a');
            link.href = rawUrl;
            link.download = filename || `blob-${cid.substring(0, 8)}`;
            link.click();
        });

        $(this.shadowRoot, '#openTabBtn').addEventListener('click', () => {
            globalThis.open(cdnUrl, '_blank');
        });
    }

    async loadTextContent(url) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            
            const container = $(this.shadowRoot, '.text-preview');
            if (container) {
                container.classList.remove('loading');
                const displayText = text.length > 100000 
                    ? text.substring(0, 100000) + '\n\n... (truncated, file too large to display fully)'
                    : text;
                container.innerHTML = `<pre>${escapeHtml(displayText)}</pre>`;
            }
        } catch (error) {
            const container = $(this.shadowRoot, '.text-preview');
            if (container) {
                container.classList.remove('loading');
                container.innerHTML = `<pre style="color: rgba(255,100,100,0.8);">Failed to load text content: ${error.message}</pre>`;
            }
        }
    }
}
