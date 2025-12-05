/**
 * Blob List Component - Container for blob items with view modes
 */

import { BaseComponent } from './base-component.js';
import { store } from '../js/store.js';
import { blobService } from '../js/blob-service.js';
import { formatBytes } from '../js/utils.js';
import './blob-item.js';

class BlobList extends BaseComponent {
    constructor() {
        super();
        this.viewMode = 'grid'; // grid | list
    }

    subscribeToStore() {
        this.storeUnsubscribe = store.subscribe((state, prevState) => {
            if (state.blobs !== prevState.blobs || state.loading !== prevState.loading) {
                this.updateList();
            }
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
            ${this.getBaseStyles()}
            <style>
                .blob-list-container {
                    padding: 1.5rem;
                }

                .list-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }

                .list-title {
                    font-size: 1.125rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .blob-count {
                    background: rgba(101, 105, 240, 0.2);
                    color: oklch(75% 0.15 275);
                    padding: 0.125rem 0.5rem;
                    border-radius: 1rem;
                    font-size: 0.75rem;
                    font-weight: 500;
                }

                .list-controls {
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                }

                .view-toggle {
                    display: flex;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 0.5rem;
                    padding: 0.25rem;
                }

                .view-btn {
                    padding: 0.375rem 0.5rem;
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.5);
                    cursor: pointer;
                    border-radius: 0.375rem;
                    transition: all 0.2s ease;
                }

                .view-btn:hover {
                    color: rgba(255, 255, 255, 0.8);
                }

                .view-btn.active {
                    background: oklch(65.69% 0.196 275.75);
                    color: white;
                }

                .view-btn svg {
                    width: 18px;
                    height: 18px;
                    display: block;
                }

                .blobs-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    gap: 1rem;
                }

                .blobs-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .empty-state {
                    text-align: center;
                    padding: 4rem 2rem;
                    color: rgba(255, 255, 255, 0.5);
                }

                .empty-state svg {
                    width: 64px;
                    height: 64px;
                    margin: 0 auto 1rem;
                    opacity: 0.5;
                }

                .empty-state h3 {
                    font-size: 1.125rem;
                    margin: 0 0 0.5rem;
                    color: rgba(255, 255, 255, 0.7);
                }

                .empty-state p {
                    margin: 0;
                    font-size: 0.875rem;
                }

                .loading-state {
                    text-align: center;
                    padding: 4rem 2rem;
                }

                .stats-bar {
                    display: flex;
                    gap: 1.5rem;
                    padding: 0.75rem 1rem;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 0.5rem;
                    margin-bottom: 1rem;
                    font-size: 0.875rem;
                }

                .stat-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: rgba(255, 255, 255, 0.7);
                }

                .stat-item svg {
                    width: 16px;
                    height: 16px;
                    opacity: 0.7;
                }

                .stat-value {
                    font-weight: 600;
                    color: white;
                }
            </style>
            <div class="blob-list-container">
                <div class="list-header">
                    <div class="list-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                        </svg>
                        Your Blobs
                        <span class="blob-count" id="blobCount">0</span>
                    </div>
                    <div class="list-controls">
                        <button class="btn btn-ghost btn-sm" id="refreshBtn" title="Refresh">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <polyline points="1 20 1 14 7 14"></polyline>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                        </button>
                        <div class="view-toggle">
                            <button class="view-btn active" id="gridViewBtn" title="Grid view">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="14" width="7" height="7"></rect>
                                    <rect x="3" y="14" width="7" height="7"></rect>
                                </svg>
                            </button>
                            <button class="view-btn" id="listViewBtn" title="List view">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="8" y1="6" x2="21" y2="6"></line>
                                    <line x1="8" y1="12" x2="21" y2="12"></line>
                                    <line x1="8" y1="18" x2="21" y2="18"></line>
                                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="stats-bar" id="statsBar"></div>
                <div id="blobsContainer"></div>
            </div>
        `;
    }

    setupEventListeners() {
        // Refresh button
        this.$('#refreshBtn').addEventListener('click', async () => {
            const btn = this.$('#refreshBtn');
            btn.disabled = true;
            btn.querySelector('svg').style.animation = 'spin 1s linear infinite';
            await blobService.listBlobs();
            btn.disabled = false;
            btn.querySelector('svg').style.animation = '';
        });

        // View mode toggles
        this.$('#gridViewBtn').addEventListener('click', () => {
            this.viewMode = 'grid';
            this.$('#gridViewBtn').classList.add('active');
            this.$('#listViewBtn').classList.remove('active');
            this.updateList();
        });

        this.$('#listViewBtn').addEventListener('click', () => {
            this.viewMode = 'list';
            this.$('#listViewBtn').classList.add('active');
            this.$('#gridViewBtn').classList.remove('active');
            this.updateList();
        });
    }

    updateList() {
        const state = store.getState();
        const container = this.$('#blobsContainer');
        const countEl = this.$('#blobCount');
        const statsBar = this.$('#statsBar');

        if (state.loading) {
            container.innerHTML = `
                <div class="loading-state">
                    <span class="loading loading-lg"></span>
                    <p style="margin-top: 1rem; color: rgba(255, 255, 255, 0.6);">Loading your blobs...</p>
                </div>
            `;
            return;
        }

        const blobs = state.blobs || [];
        countEl.textContent = blobs.length;

        // Calculate stats
        const totalSize = blobs.reduce((sum, b) => sum + (b.size || 0), 0);
        const imageCount = blobs.filter(b => b.mimeType?.startsWith('image/')).length;
        const videoCount = blobs.filter(b => b.mimeType?.startsWith('video/')).length;

        statsBar.innerHTML = `
            <div class="stat-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                </svg>
                <span class="stat-value">${blobs.length}</span> blobs
            </div>
            <div class="stat-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
                <span class="stat-value">${formatBytes(totalSize)}</span> total
            </div>
            ${imageCount > 0 ? `
                <div class="stat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <span class="stat-value">${imageCount}</span> images
                </div>
            ` : ''}
            ${videoCount > 0 ? `
                <div class="stat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                    <span class="stat-value">${videoCount}</span> videos
                </div>
            ` : ''}
        `;

        if (blobs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    <h3>No blobs yet</h3>
                    <p>Upload your first file to get started!</p>
                </div>
            `;
            statsBar.style.display = 'none';
            return;
        }

        statsBar.style.display = 'flex';

        container.className = this.viewMode === 'grid' ? 'blobs-grid' : 'blobs-list';
        container.innerHTML = blobs.map(blob => `
            <blob-item 
                cid="${blob.cid}" 
                mimetype="${blob.mimeType || 'application/octet-stream'}" 
                size="${blob.size || 0}">
            </blob-item>
        `).join('');
    }
}

customElements.define('blob-list', BlobList);
