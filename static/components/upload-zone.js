/**
 * Upload Zone Component - Drag & drop file upload with preview
 */

import { BaseComponent } from './base-component.js';
import { store } from '../js/store.js';
import { blobService } from '../js/blob-service.js';
import { showToast } from './toast-notification.js';
import { formatBytes, getFileIcon } from '../js/utils.js';

class UploadZone extends BaseComponent {
    constructor() {
        super();
        this.selectedFile = null;
        this.previewUrl = null;
    }

    render() {
        this.shadowRoot.innerHTML = `
            ${this.getBaseStyles()}
            <style>
                .upload-container {
                    padding: 1.5rem;
                }

                .dropzone {
                    border: 2px dashed rgba(255, 255, 255, 0.3);
                    border-radius: 1rem;
                    padding: 3rem 2rem;
                    text-align: center;
                    transition: all 0.2s ease;
                    cursor: pointer;
                    background: rgba(0, 0, 0, 0.2);
                }

                .dropzone:hover,
                .dropzone.dragover {
                    border-color: oklch(65.69% 0.196 275.75);
                    background: rgba(101, 105, 240, 0.1);
                }

                .dropzone.has-file {
                    border-style: solid;
                    border-color: oklch(65.69% 0.196 275.75);
                }

                .dropzone-icon {
                    width: 64px;
                    height: 64px;
                    margin: 0 auto 1rem;
                    color: oklch(65.69% 0.196 275.75);
                    opacity: 0.8;
                }

                .dropzone h3 {
                    font-size: 1.125rem;
                    font-weight: 600;
                    margin: 0 0 0.5rem;
                }

                .dropzone p {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 0.875rem;
                    margin: 0;
                }

                .file-input {
                    display: none;
                }

                .preview-card {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 0.75rem;
                    padding: 1rem;
                    margin-top: 1rem;
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                }

                .preview-thumbnail {
                    width: 80px;
                    height: 80px;
                    border-radius: 0.5rem;
                    background: rgba(0, 0, 0, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    flex-shrink: 0;
                }

                .preview-thumbnail img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .preview-thumbnail svg {
                    width: 40px;
                    height: 40px;
                    color: oklch(65.69% 0.196 275.75);
                }

                .preview-info {
                    flex: 1;
                    min-width: 0;
                }

                .preview-name {
                    font-weight: 500;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .preview-details {
                    font-size: 0.75rem;
                    color: rgba(255, 255, 255, 0.6);
                    margin-top: 0.25rem;
                }

                .preview-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .progress-container {
                    margin-top: 1rem;
                }

                .progress-bar {
                    height: 8px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 4px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background: oklch(65.69% 0.196 275.75);
                    width: 0%;
                    transition: width 0.3s ease;
                }

                .progress-text {
                    font-size: 0.75rem;
                    color: rgba(255, 255, 255, 0.6);
                    text-align: center;
                    margin-top: 0.5rem;
                }

                .upload-success {
                    background: rgba(40, 167, 69, 0.2);
                    border: 1px solid rgba(40, 167, 69, 0.4);
                    border-radius: 0.75rem;
                    padding: 1rem;
                    margin-top: 1rem;
                }

                .upload-success h4 {
                    color: oklch(72% 0.19 142);
                    font-weight: 600;
                    margin: 0 0 0.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .cid-display {
                    background: rgba(0, 0, 0, 0.3);
                    padding: 0.75rem;
                    border-radius: 0.5rem;
                    font-family: monospace;
                    font-size: 0.75rem;
                    word-break: break-all;
                    margin: 0.5rem 0;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .cid-text {
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .btn-copy {
                    padding: 0.25rem 0.5rem;
                    font-size: 0.75rem;
                }
            </style>
            <div class="upload-container">
                <div class="dropzone" id="dropzone">
                    <svg class="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <h3>Drop files here or click to browse</h3>
                    <p>Maximum file size: 1MB • Any file type</p>
                    <input type="file" class="file-input" id="fileInput" />
                </div>
                <div id="previewContainer"></div>
                <div id="resultContainer"></div>
            </div>
        `;
    }

    setupEventListeners() {
        const dropzone = this.$('#dropzone');
        const fileInput = this.$('#fileInput');

        // Click to browse
        dropzone.addEventListener('click', () => fileInput.click());

        // File selected
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.handleFile(e.target.files[0]);
            }
        });

        // Drag and drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files[0]) {
                this.handleFile(e.dataTransfer.files[0]);
            }
        });
    }

    handleFile(file) {
        // Validate file size (1MB limit)
        if (file.size > 1024 * 1024) {
            showToast('File size exceeds 1MB limit', 'error');
            return;
        }

        this.selectedFile = file;
        
        // Revoke previous preview URL
        if (this.previewUrl) {
            URL.revokeObjectURL(this.previewUrl);
        }

        // Create preview for images
        if (file.type.startsWith('image/')) {
            this.previewUrl = URL.createObjectURL(file);
        }

        this.renderPreview();
    }

    renderPreview() {
        const container = this.$('#previewContainer');
        const resultContainer = this.$('#resultContainer');
        const file = this.selectedFile;
        const iconSvg = getFileIcon(file.type);
        
        // Clear previous result
        resultContainer.innerHTML = '';
        
        container.innerHTML = `
            <div class="preview-card">
                <div class="preview-thumbnail">
                    ${this.previewUrl 
                        ? `<img src="${this.previewUrl}" alt="Preview" />`
                        : iconSvg
                    }
                </div>
                <div class="preview-info">
                    <div class="preview-name">${file.name}</div>
                    <div class="preview-details">${formatBytes(file.size)} • ${file.type || 'Unknown type'}</div>
                </div>
                <div class="preview-actions">
                    <button class="btn btn-ghost" id="clearBtn" title="Clear">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    <button class="btn btn-primary" id="uploadBtn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Upload
                    </button>
                </div>
            </div>
        `;

        // Setup preview buttons
        this.$('#clearBtn').addEventListener('click', () => this.clearFile());
        this.$('#uploadBtn').addEventListener('click', () => this.uploadFile());
    }

    clearFile() {
        if (this.previewUrl) {
            URL.revokeObjectURL(this.previewUrl);
            this.previewUrl = null;
        }
        this.selectedFile = null;
        this.$('#previewContainer').innerHTML = '';
        this.$('#resultContainer').innerHTML = '';
        this.$('#fileInput').value = '';
    }

    async uploadFile() {
        if (!this.selectedFile) return;

        const uploadBtn = this.$('#uploadBtn');
        const resultContainer = this.$('#resultContainer');
        const file = this.selectedFile;

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="loading"></span> Uploading...';

        // Show progress
        resultContainer.innerHTML = `
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <div class="progress-text" id="progressText">Reading file...</div>
            </div>
        `;

        try {
            // Simulate progress stages
            const progressFill = this.$('#progressFill');
            const progressText = this.$('#progressText');

            progressFill.style.width = '30%';
            progressText.textContent = 'Uploading to PDS...';

            const response = await blobService.uploadBlob(file);

            progressFill.style.width = '100%';
            progressText.textContent = 'Complete!';

            const cid = response.blob.ref?.toString() || response.blob.cid || 'Unknown';

            // Show success
            setTimeout(() => {
                resultContainer.innerHTML = `
                    <div class="upload-success">
                        <h4>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            Upload Successful!
                        </h4>
                        <div class="cid-display">
                            <span class="cid-text">${cid}</span>
                            <button class="btn btn-primary btn-copy" id="copyCidBtn">Copy</button>
                        </div>
                        <button class="btn btn-primary w-full" id="uploadAnotherBtn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Upload Another File
                        </button>
                    </div>
                `;

                // Copy CID button
                this.$('#copyCidBtn').addEventListener('click', async () => {
                    await navigator.clipboard.writeText(cid);
                    showToast('CID copied to clipboard!', 'success');
                });

                // Upload another button
                this.$('#uploadAnotherBtn').addEventListener('click', () => {
                    this.clearFile();
                });
            }, 500);

            showToast('File uploaded successfully!', 'success');
            
            // Refresh blob list
            await blobService.listBlobs();

        } catch (error) {
            resultContainer.innerHTML = '';
            showToast('Upload failed: ' + error.message, 'error');
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload
            `;
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.previewUrl) {
            URL.revokeObjectURL(this.previewUrl);
        }
    }
}

customElements.define('upload-zone', UploadZone);
