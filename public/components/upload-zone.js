/**
 * Upload Zone - Clean drag & drop file upload
 */

import { BaseComponent } from './base-component.js';
import { store } from '../js/store.js';
import { pinService } from '../js/pin-service.js';
import { showToast } from './toast-notification.js';
import { icons } from '../js/icons.js';

class UploadZone extends BaseComponent {
    constructor() {
        super();
        this.isUploading = false;
        this.uploadQueue = [];
    }

    render() {
        this.shadowRoot.innerHTML = `
            ${this.getBaseStyles()}
            <style>
                .upload-zone {
                    position: relative;
                    border: 2px dashed var(--border-default);
                    border-radius: var(--radius-lg);
                    padding: 2.5rem 2rem;
                    text-align: center;
                    transition: all var(--transition-fast);
                    cursor: pointer;
                }

                .upload-zone:hover {
                    border-color: var(--border-strong);
                    background: var(--bg-elevated);
                }

                .upload-zone.dragover {
                    border-color: var(--accent);
                    background: var(--accent-muted);
                }

                .upload-zone.uploading {
                    pointer-events: none;
                    opacity: 0.7;
                }

                .upload-icon {
                    width: 40px;
                    height: 40px;
                    margin: 0 auto 1rem;
                    color: var(--text-muted);
                }

                .upload-icon svg {
                    width: 100%;
                    height: 100%;
                }

                .upload-text {
                    color: var(--text-secondary);
                    font-size: 0.9375rem;
                    margin-bottom: 0.5rem;
                }

                .upload-hint {
                    color: var(--text-muted);
                    font-size: 0.8125rem;
                }

                .file-input {
                    position: absolute;
                    inset: 0;
                    opacity: 0;
                    cursor: pointer;
                }

                /* Upload Progress */
                .upload-progress {
                    margin-top: 1.5rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid var(--border-subtle);
                }

                .upload-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    background: var(--bg-elevated);
                    border-radius: var(--radius-md);
                    margin-bottom: 0.5rem;
                }

                .upload-item-icon {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-subtle);
                    border-radius: var(--radius-sm);
                    color: var(--text-muted);
                }

                .upload-item-icon svg {
                    width: 18px;
                    height: 18px;
                }

                .upload-item-info {
                    flex: 1;
                    min-width: 0;
                }

                .upload-item-name {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--text-primary);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .upload-item-size {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }

                .upload-item-status {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .upload-item-status .spinner {
                    width: 16px;
                    height: 16px;
                }

                .upload-item-status.success {
                    color: var(--success);
                }

                .upload-item-status.error {
                    color: var(--error);
                }

                .progress-bar {
                    height: 3px;
                    background: var(--bg-subtle);
                    border-radius: 2px;
                    margin-top: 0.5rem;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background: var(--accent);
                    border-radius: 2px;
                    transition: width 0.3s ease;
                }
            </style>

            <div class="upload-zone" id="dropZone">
                <input type="file" class="file-input" id="fileInput" multiple />
                <div class="upload-icon">${icons.upload}</div>
                <p class="upload-text">Drop files here or click to upload</p>
                <p class="upload-hint">Max 1MB per file</p>
                <div class="upload-progress" id="uploadProgress" style="display: none;"></div>
            </div>
        `;
    }

    setupEventListeners() {
        const zone = this.$('#dropZone');
        const input = this.$('#fileInput');

        // Click to select files
        zone.addEventListener('click', () => input.click());
        
        // File input change
        input.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
            input.value = ''; // Reset
        });

        // Drag events
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

        const { agent } = store.getState();
        if (!agent) {
            showToast('Not authenticated', 'error');
            return;
        }

        const zone = this.$('#dropZone');
        const progressContainer = this.$('#uploadProgress');
        
        zone.classList.add('uploading');
        progressContainer.style.display = 'block';
        progressContainer.innerHTML = '';

        for (const file of files) {
            // Create upload item UI
            const itemId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            progressContainer.innerHTML += `
                <div class="upload-item" id="${itemId}">
                    <div class="upload-item-icon">${this.getFileIcon(file.type)}</div>
                    <div class="upload-item-info">
                        <div class="upload-item-name">${file.name}</div>
                        <div class="upload-item-size">${this.formatBytes(file.size)}</div>
                        <div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>
                    </div>
                    <div class="upload-item-status">
                        <div class="spinner"></div>
                    </div>
                </div>
            `;

            try {
                // Check file size
                if (file.size > 1000000) {
                    throw new Error('File too large (max 1MB)');
                }

                // Read file
                const buffer = await file.arrayBuffer();
                const uint8 = new Uint8Array(buffer);

                // Update progress
                const item = this.$(`#${itemId}`);
                const progressFill = item?.querySelector('.progress-fill');
                if (progressFill) progressFill.style.width = '50%';

                // Upload blob
                const response = await agent.uploadBlob(uint8, { encoding: file.type });
                
                if (progressFill) progressFill.style.width = '80%';

                // Create pin record
                await pinService.createPin({
                    mimeType: file.type,
                    filename: file.name,
                    size: file.size,
                    blobRef: response.data.blob,
                });

                if (progressFill) progressFill.style.width = '100%';

                // Update status to success
                const statusEl = item?.querySelector('.upload-item-status');
                if (statusEl) {
                    statusEl.classList.add('success');
                    statusEl.innerHTML = icons.check;
                }

            } catch (error) {
                console.error('Upload failed:', error);
                const item = this.$(`#${itemId}`);
                const statusEl = item?.querySelector('.upload-item-status');
                if (statusEl) {
                    statusEl.classList.add('error');
                    statusEl.innerHTML = icons.x;
                }
                showToast(`Failed: ${error.message}`, 'error');
            }
        }

        zone.classList.remove('uploading');

        // Refresh blob list
        await pinService.loadAllBlobs();

        // Clear progress after delay
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

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

customElements.define('upload-zone', UploadZone);
