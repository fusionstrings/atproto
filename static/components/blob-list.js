/**
 * Blob List Component - Container for blob items with view modes
 */

import { BaseComponent } from './base-component.js';
import { store } from '../js/store.js';
import { pinService } from '../js/pin-service.js';
import { formatBytes } from '../js/utils.js';
import { showToast } from './toast-notification.js';
import './blob-item.js';

class BlobList extends BaseComponent {
    constructor() {
        super();
        this.viewMode = 'grid'; // grid | list
        this.searchQuery = '';
        this.filterType = 'all'; // all | images | videos | documents | other
        this.sortBy = 'newest'; // newest | oldest | largest | smallest | name
        this.selectedItems = new Map(); // Map<cid, {rkey, filename, size}>
        this.selectMode = false;
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
                    flex-wrap: wrap;
                    gap: 1rem;
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

                .sort-select {
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 0.5rem;
                    padding: 0.375rem 0.75rem;
                    color: white;
                    font-size: 0.75rem;
                    cursor: pointer;
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 0.5rem center;
                    padding-right: 1.75rem;
                }

                .sort-select:focus {
                    outline: none;
                    border-color: oklch(65.69% 0.196 275.75);
                }

                .sort-select option {
                    background: #1a1a1a;
                    color: white;
                }

                .search-bar {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }

                .search-input {
                    flex: 1;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 0.5rem;
                    padding: 0.5rem 0.75rem 0.5rem 2.5rem;
                    color: white;
                    font-size: 0.875rem;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'%3E%3C/circle%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'%3E%3C/line%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: 0.75rem center;
                }

                .search-input:focus {
                    outline: none;
                    border-color: oklch(65.69% 0.196 275.75);
                }

                .search-input::placeholder {
                    color: rgba(255, 255, 255, 0.4);
                }

                .filter-tabs {
                    display: flex;
                    gap: 0.25rem;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 0.5rem;
                    padding: 0.25rem;
                    margin-bottom: 1rem;
                    overflow-x: auto;
                }

                .filter-tab {
                    padding: 0.375rem 0.75rem;
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.6);
                    cursor: pointer;
                    border-radius: 0.375rem;
                    font-size: 0.75rem;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }

                .filter-tab:hover {
                    color: rgba(255, 255, 255, 0.9);
                    background: rgba(255, 255, 255, 0.1);
                }

                .filter-tab.active {
                    background: oklch(65.69% 0.196 275.75);
                    color: white;
                }

                .filter-tab .count {
                    opacity: 0.7;
                    margin-left: 0.25rem;
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

                .no-results {
                    text-align: center;
                    padding: 3rem 2rem;
                    color: rgba(255, 255, 255, 0.5);
                }

                .no-results svg {
                    width: 48px;
                    height: 48px;
                    margin: 0 auto 1rem;
                    opacity: 0.4;
                }

                .bulk-action-bar {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.75rem 1rem;
                    background: linear-gradient(135deg, rgba(101, 105, 240, 0.2), rgba(139, 92, 246, 0.2));
                    border: 1px solid rgba(101, 105, 240, 0.3);
                    border-radius: 0.5rem;
                    margin-bottom: 1rem;
                }

                .bulk-action-bar.hidden {
                    display: none;
                }

                .bulk-selection-info {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                }

                .bulk-selection-count {
                    font-weight: 600;
                    color: oklch(75% 0.15 275);
                }

                .bulk-actions {
                    display: flex;
                    gap: 0.5rem;
                    margin-left: auto;
                }

                .bulk-actions .btn {
                    padding: 0.375rem 0.75rem;
                    font-size: 0.75rem;
                }

                .btn-select-toggle {
                    background: rgba(101, 105, 240, 0.2);
                    border: 1px solid rgba(101, 105, 240, 0.3);
                    border-radius: 0.5rem;
                    padding: 0.375rem 0.75rem;
                    color: oklch(75% 0.15 275);
                    font-size: 0.75rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    transition: all 0.2s ease;
                }

                .btn-select-toggle:hover {
                    background: rgba(101, 105, 240, 0.3);
                }

                .btn-select-toggle.active {
                    background: oklch(65.69% 0.196 275.75);
                    color: white;
                    border-color: transparent;
                }

                .btn-select-toggle svg {
                    width: 14px;
                    height: 14px;
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
                        <select class="sort-select" id="sortSelect" title="Sort by">
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                            <option value="largest">Largest</option>
                            <option value="smallest">Smallest</option>
                            <option value="name-asc">Name A-Z</option>
                            <option value="name-desc">Name Z-A</option>
                        </select>
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
                        <button class="btn-select-toggle" id="selectToggle" title="Toggle selection mode">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 11 12 14 22 4"></polyline>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                            </svg>
                            Select
                        </button>
                    </div>
                </div>
                <div class="bulk-action-bar hidden" id="bulkActionBar">
                    <div class="bulk-selection-info">
                        <span class="bulk-selection-count" id="selectionCount">0</span> items selected
                        <span id="selectionSize"></span>
                    </div>
                    <div class="bulk-actions">
                        <button class="btn btn-ghost btn-sm" id="selectAllBtn">Select All</button>
                        <button class="btn btn-ghost btn-sm" id="deselectAllBtn">Deselect All</button>
                        <button class="btn btn-primary btn-sm" id="bulkDeleteBtn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Delete Selected
                        </button>
                    </div>
                </div>
                <div class="search-bar">
                    <input type="text" class="search-input" id="searchInput" placeholder="Search by filename or CID..." />
                </div>
                <div class="filter-tabs" id="filterTabs">
                    <button class="filter-tab active" data-filter="all">All</button>
                    <button class="filter-tab" data-filter="images">Images</button>
                    <button class="filter-tab" data-filter="videos">Videos</button>
                    <button class="filter-tab" data-filter="documents">Documents</button>
                    <button class="filter-tab" data-filter="other">Other</button>
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
            await pinService.loadAllBlobs();
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

        // Sort select
        this.$('#sortSelect').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.updateList();
        });

        // Search input
        const searchInput = this.$('#searchInput');
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.updateList();
        });

        // Filter tabs
        this.$('#filterTabs').addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-tab')) {
                this.$$('.filter-tab').forEach(tab => tab.classList.remove('active'));
                e.target.classList.add('active');
                this.filterType = e.target.dataset.filter;
                this.updateList();
            }
        });

        // Selection toggle
        this.$('#selectToggle').addEventListener('click', () => {
            this.selectMode = !this.selectMode;
            const toggle = this.$('#selectToggle');
            toggle.classList.toggle('active', this.selectMode);
            toggle.innerHTML = this.selectMode ? `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Cancel
            ` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 11 12 14 22 4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                Select
            `;
            
            if (!this.selectMode) {
                this.selectedItems.clear();
            }
            this.updateBulkActionBar();
            this.updateList();
        });

        // Select all
        this.$('#selectAllBtn').addEventListener('click', () => {
            const state = store.getState();
            const filteredBlobs = this.getFilteredBlobs(state.blobs || []);
            filteredBlobs.forEach(blob => {
                if (blob.rkey) {
                    this.selectedItems.set(blob.cid, { rkey: blob.rkey, filename: blob.filename, size: blob.size });
                }
            });
            this.updateBulkActionBar();
            this.updateList();
        });

        // Deselect all
        this.$('#deselectAllBtn').addEventListener('click', () => {
            this.selectedItems.clear();
            this.updateBulkActionBar();
            this.updateList();
        });

        // Bulk delete
        this.$('#bulkDeleteBtn').addEventListener('click', async () => {
            const count = this.selectedItems.size;
            if (count === 0) return;
            
            if (!confirm(`Delete ${count} selected item${count > 1 ? 's' : ''}? This cannot be undone.`)) {
                return;
            }

            const btn = this.$('#bulkDeleteBtn');
            btn.disabled = true;
            btn.innerHTML = '<span class="loading"></span> Deleting...';

            try {
                const deletePromises = [];
                for (const [_cid, data] of this.selectedItems) {
                    deletePromises.push(pinService.deletePin(data.rkey));
                }
                
                const results = await Promise.allSettled(deletePromises);
                const successCount = results.filter(r => r.status === 'fulfilled').length;
                const failCount = results.filter(r => r.status === 'rejected').length;

                this.selectedItems.clear();
                this.selectMode = false;
                
                const toggle = this.$('#selectToggle');
                toggle.classList.remove('active');
                toggle.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    Select
                `;
                
                this.updateBulkActionBar();
                await pinService.loadAllBlobs();

                if (failCount > 0) {
                    showToast(`Deleted ${successCount} items, ${failCount} failed`, 'warning');
                } else {
                    showToast(`Deleted ${successCount} item${successCount > 1 ? 's' : ''}`, 'success');
                }
            } catch (error) {
                showToast('Failed to delete: ' + error.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete Selected
                `;
            }
        });
    }

    updateBulkActionBar() {
        const bar = this.$('#bulkActionBar');
        const countEl = this.$('#selectionCount');
        const sizeEl = this.$('#selectionSize');

        if (this.selectMode) {
            bar.classList.remove('hidden');
            countEl.textContent = this.selectedItems.size;
            
            // Calculate total size
            let totalSize = 0;
            for (const [_cid, data] of this.selectedItems) {
                totalSize += data.size || 0;
            }
            sizeEl.textContent = totalSize > 0 ? `(${formatBytes(totalSize)})` : '';
        } else {
            bar.classList.add('hidden');
        }
    }

    getFilteredBlobs(blobs) {
        let filtered = blobs;

        // Apply type filter
        if (this.filterType !== 'all') {
            filtered = filtered.filter(blob => {
                const mime = blob.mimeType || '';
                switch (this.filterType) {
                    case 'images':
                        return mime.startsWith('image/');
                    case 'videos':
                        return mime.startsWith('video/');
                    case 'documents':
                        return mime.startsWith('text/') || 
                               mime.includes('pdf') || 
                               mime.includes('document') ||
                               mime.includes('spreadsheet') ||
                               mime.includes('presentation');
                    case 'other':
                        return !mime.startsWith('image/') && 
                               !mime.startsWith('video/') &&
                               !mime.startsWith('text/') &&
                               !mime.includes('pdf') &&
                               !mime.includes('document');
                    default:
                        return true;
                }
            });
        }

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(blob => {
                const filename = (blob.filename || '').toLowerCase();
                const cid = (blob.cid || '').toLowerCase();
                const mime = (blob.mimeType || '').toLowerCase();
                return filename.includes(this.searchQuery) || 
                       cid.includes(this.searchQuery) ||
                       mime.includes(this.searchQuery);
            });
        }

        // Apply sorting
        filtered = this.sortBlobs(filtered);

        return filtered;
    }

    sortBlobs(blobs) {
        const sorted = [...blobs];
        
        switch (this.sortBy) {
            case 'newest':
                return sorted.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0);
                    const dateB = new Date(b.createdAt || 0);
                    return dateB - dateA;
                });
            case 'oldest':
                return sorted.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0);
                    const dateB = new Date(b.createdAt || 0);
                    return dateA - dateB;
                });
            case 'largest':
                return sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
            case 'smallest':
                return sorted.sort((a, b) => (a.size || 0) - (b.size || 0));
            case 'name-asc':
                return sorted.sort((a, b) => {
                    const nameA = (a.filename || '').toLowerCase();
                    const nameB = (b.filename || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            case 'name-desc':
                return sorted.sort((a, b) => {
                    const nameA = (a.filename || '').toLowerCase();
                    const nameB = (b.filename || '').toLowerCase();
                    return nameB.localeCompare(nameA);
                });
            default:
                return sorted;
        }
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

        const allBlobs = state.blobs || [];
        const filteredBlobs = this.getFilteredBlobs(allBlobs);
        
        countEl.textContent = allBlobs.length;

        // Update filter tab counts
        const imageCount = allBlobs.filter(b => b.mimeType?.startsWith('image/')).length;
        const videoCount = allBlobs.filter(b => b.mimeType?.startsWith('video/')).length;
        const docCount = allBlobs.filter(b => {
            const m = b.mimeType || '';
            return m.startsWith('text/') || m.includes('pdf') || m.includes('document') || m.includes('spreadsheet');
        }).length;
        const otherCount = allBlobs.length - imageCount - videoCount - docCount;

        const filterTabs = this.$('#filterTabs');
        filterTabs.innerHTML = `
            <button class="filter-tab ${this.filterType === 'all' ? 'active' : ''}" data-filter="all">All <span class="count">(${allBlobs.length})</span></button>
            <button class="filter-tab ${this.filterType === 'images' ? 'active' : ''}" data-filter="images">Images <span class="count">(${imageCount})</span></button>
            <button class="filter-tab ${this.filterType === 'videos' ? 'active' : ''}" data-filter="videos">Videos <span class="count">(${videoCount})</span></button>
            <button class="filter-tab ${this.filterType === 'documents' ? 'active' : ''}" data-filter="documents">Documents <span class="count">(${docCount})</span></button>
            <button class="filter-tab ${this.filterType === 'other' ? 'active' : ''}" data-filter="other">Other <span class="count">(${otherCount})</span></button>
        `;

        // Calculate stats
        const totalSize = allBlobs.reduce((sum, b) => sum + (b.size || 0), 0);
        const pinnedCount = allBlobs.filter(b => b.pinned).length;

        statsBar.innerHTML = `
            <div class="stat-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                </svg>
                <span class="stat-value">${filteredBlobs.length}</span> ${filteredBlobs.length === allBlobs.length ? 'blobs' : `of ${allBlobs.length} blobs`}
            </div>
            <div class="stat-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
                <span class="stat-value">${formatBytes(totalSize)}</span> total
            </div>
            ${pinnedCount > 0 ? `
                <div class="stat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path>
                    </svg>
                    <span class="stat-value">${pinnedCount}</span> pinned
                </div>
            ` : ''}
        `;

        if (allBlobs.length === 0) {
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

        if (filteredBlobs.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <h3>No matching blobs</h3>
                    <p>Try adjusting your search or filter criteria.</p>
                </div>
            `;
            return;
        }

        container.className = this.viewMode === 'grid' ? 'blobs-grid' : 'blobs-list';
        container.innerHTML = filteredBlobs.map(blob => `
            <blob-item 
                cid="${blob.cid}" 
                mimetype="${blob.mimeType || 'application/octet-stream'}" 
                size="${blob.size || 0}"
                filename="${blob.filename || ''}"
                rkey="${blob.rkey || ''}"
                ${blob.pinned ? 'pinned' : ''}
                ${this.selectMode ? 'selectable' : ''}
                ${this.selectedItems.has(blob.cid) ? 'selected' : ''}>
            </blob-item>
        `).join('');

        // Add selection change listeners
        container.querySelectorAll('blob-item').forEach(item => {
            item.addEventListener('selection-change', (e) => {
                const { cid, rkey, selected, filename, size } = e.detail;
                if (selected) {
                    this.selectedItems.set(cid, { rkey, filename, size });
                } else {
                    this.selectedItems.delete(cid);
                }
                this.updateBulkActionBar();
            });
        });
    }
}

customElements.define('blob-list', BlobList);
