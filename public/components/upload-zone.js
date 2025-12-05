/**
 * Upload Zone - Clean drag & drop file upload
 */

import { auth } from '../js/state.js';
import { pinService } from '../js/pin-service.js';
import { showToast } from './toast-notification.js';
import { icons } from '../js/icons.js';
import { $, cloneTemplate, formatBytes } from '../js/utils.js';

export class UploadZone extends HTMLElement {
    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        cloneTemplate('upload-zone-template', this.shadowRoot);
        
        // Inject upload icon
        const iconEl = $(this.shadowRoot, '#uploadIcon');
        if (iconEl) iconEl.innerHTML = icons.upload;

        const zone = $(this.shadowRoot, '#dropZone');
        const input = $(this.shadowRoot, '#fileInput');

        zone.addEventListener('click', () => input.click());
        
        input.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
            input.value = '';
        });

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('dragover');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
    }

    async handleFiles(files) {
        if (!files || files.length === 0) return;

        const { agent } = auth.value;
        if (!agent) {
            showToast('Not authenticated', 'error');
            return;
        }

        const zone = $(this.shadowRoot, '#dropZone');
        const progressContainer = $(this.shadowRoot, '#uploadProgress');
        
        zone.classList.add('uploading');
        progressContainer.style.display = 'block';
        progressContainer.innerHTML = '';

        for (const file of files) {
            const itemId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            progressContainer.innerHTML += `
                <div class="upload-item" id="${itemId}">
                    <div class="upload-item-icon">${this.getFileIcon(file.type)}</div>
                    <div class="upload-item-info">
                        <div class="upload-item-name">${file.name}</div>
                        <div class="upload-item-size">${formatBytes(file.size)}</div>
                        <div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>
                    </div>
                    <div class="upload-item-status">
                        <div class="spinner spinner-sm"></div>
                    </div>
                </div>
            `;

            try {
                if (file.size > 1000000) {
                    throw new Error('File too large (max 1MB)');
                }

                const buffer = await file.arrayBuffer();
                const uint8 = new Uint8Array(buffer);

                const item = $(this.shadowRoot, `#${itemId}`);
                const progressFill = item?.querySelector('.progress-fill');
                if (progressFill) progressFill.style.width = '50%';

                const response = await agent.uploadBlob(uint8, { encoding: file.type });
                
                if (progressFill) progressFill.style.width = '80%';

                await pinService.createPin({
                    mimeType: file.type,
                    filename: file.name,
                    size: file.size,
                    blobRef: response.data.blob,
                });

                if (progressFill) progressFill.style.width = '100%';

                const statusEl = item?.querySelector('.upload-item-status');
                if (statusEl) {
                    statusEl.classList.add('success');
                    statusEl.innerHTML = icons.check;
                }

            } catch (error) {
                console.error('Upload failed:', error);
                const item = $(this.shadowRoot, `#${itemId}`);
                const statusEl = item?.querySelector('.upload-item-status');
                if (statusEl) {
                    statusEl.classList.add('error');
                    statusEl.innerHTML = icons.x;
                }
                showToast(`Failed: ${error.message}`, 'error');
            }
        }

        zone.classList.remove('uploading');
        await pinService.loadAllBlobs();

        setTimeout(() => {
            progressContainer.style.display = 'none';
            progressContainer.innerHTML = '';
        }, 3000);
    }

    getFileIcon(mimeType) {
        if (mimeType?.startsWith('image/')) return icons.image;
        if (mimeType?.startsWith('video/')) return icons.video;
        if (mimeType?.startsWith('audio/')) return icons.music;
        return icons.file;
    }
}
