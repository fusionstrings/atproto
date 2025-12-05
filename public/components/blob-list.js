/**
 * Blob List - Full-featured file management with search, filter, sort, and bulk actions
 */

import { BaseComponent } from './base-component.js';
import { store } from '../js/store.js';
import { pinService } from '../js/pin-service.js';
import { showToast } from './toast-notification.js';
import { icons } from '../js/icons.js';
import './blob-item.js';

class BlobList extends BaseComponent {
    constructor() {
        super();
        this.viewMode = 'grid';
        this.searchQuery = '';
        this.filterType = 'all';
        this.sortBy = 'newest';
        this.selectMode = false;
        this.selectedItems = new Map();
    }

    subscribeToStore() {
        this.storeUnsubscribe = store.subscribe((state, prevState) => {
            if (state.blobs !== prevState.blobs || state.isLoadingBlobs !== prevState.isLoadingBlobs) {
                this.updateList();
            }
        });

        // Keyboard shortcuts
        this._keyHandler = (e) => this.handleKeyboard(e);
        document.addEventListener('keydown', this._keyHandler);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('keydown', this._keyHandler);
    }

    handleKeyboard(e) {
        if (e.key === 'Escape' && this.selectMode) {
            this.exitSelectMode();
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'a' && this.selectMode) {
            e.preventDefault();
            this.selectAll();
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            ${this.getBaseStyles()}
            <style>
                .list-container {
                    min-height: 200px;
                }

                /* Controls Bar */
                .controls-bar {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }

                .search-box {
                    flex: 1;
                    min-width: 200px;
                    position: relative;
                }

                .search-box input {
                    width: 100%;
                    padding-left: 2.25rem;
                }

                .search-icon {
                    position: absolute;
                    left: 0.75rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                    pointer-events: none;
                }

                .search-icon svg {
                    width: 16px;
                    height: 16px;
                }

                .control-group {
                    display: flex;
                    gap: 0.5rem;
                }

                select {
                    padding: 0.5rem 2rem 0.5rem 0.75rem;
                    font-size: 0.8125rem;
                    font-family: inherit;
                    color: var(--text-primary);
                    background: var(--bg-elevated);
                    border: 1px solid var(--border-default);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23a1a1aa' stroke-width='2'%3E%3Cpath d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 0.5rem center;
                }

                select:hover {
                    border-color: var(--border-strong);
                }

                select:focus {
                    outline: none;
                    border-color: var(--accent);
                }

                /* Filter Tabs */
                .filter-tabs {
                    display: flex;
                    gap: 0.25rem;
                    padding: 0.25rem;
                    background: var(--bg-elevated);
                    border-radius: var(--radius-md);
                    margin-bottom: 1rem;
                    overflow-x: auto;
                }

                .filter-tab {
                    padding: 0.5rem 0.875rem;
                    font-size: 0.8125rem;
                    font-weight: 500;
                    font-family: inherit;
                    color: var(--text-secondary);
                    background: transparent;
                    border: none;
                    border-radius: var(--radius-sm);
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all var(--transition-fast);
                }

                .filter-tab:hover {
                    color: var(--text-primary);
                    background: var(--bg-subtle);
                }

                .filter-tab.active {
                    color: var(--text-primary);
                    background: var(--bg-subtle);
                }

                .filter-tab .count {
                    margin-left: 0.375rem;
                    opacity: 0.6;
                }

                /* View Toggle */
                .view-toggle {
                    display: flex;
                    background: var(--bg-elevated);
                    border: 1px solid var(--border-default);
                    border-radius: var(--radius-md);
                    overflow: hidden;
                }

                .view-btn {
                    padding: 0.5rem 0.625rem;
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }

                .view-btn:hover {
                    color: var(--text-primary);
                }

                .view-btn.active {
                    background: var(--bg-subtle);
                    color: var(--text-primary);
                }

                .view-btn svg {
                    width: 16px;
                    height: 16px;
                    display: block;
                }

                /* Stats Bar */
                .stats-bar {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    padding: 0.625rem 1rem;
                    background: var(--bg-elevated);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-md);
                    margin-bottom: 1rem;
                    font-size: 0.8125rem;
                }

                .stat {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    color: var(--text-secondary);
                }

                .stat-value {
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .refresh-btn {
                    margin-left: auto;
                }

                /* Bulk Action Bar */
                .bulk-bar {
                    display: none;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.75rem 1rem;
                    background: var(--accent-muted);
                    border: 1px solid var(--accent);
                    border-radius: var(--radius-md);
                    margin-bottom: 1rem;
                }

                .bulk-bar.active {
                    display: flex;
                }

                .bulk-info {
                    font-size: 0.875rem;
                    color: var(--text-primary);
                }

                .bulk-count {
                    font-weight: 600;
                    color: var(--accent);
                }

                .bulk-actions {
                    display: flex;
                    gap: 0.5rem;
                    margin-left: auto;
                }

                /* Grid/List Views */
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

                /* Empty State */
                .empty-state {
                    text-align: center;
                    padding: 4rem 2rem;
                    color: var(--text-muted);
                }

                .empty-state svg {
                    width: 48px;
                    height: 48px;
                    margin-bottom: 1rem;
                    opacity: 0.4;
                }

                .empty-state h3 {
                    font-size: 1rem;
                    font-weight: 500;
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                }

                /* Loading */
                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem 2rem;
                    color: var(--text-muted);
                }

                .loading-state p {
                    margin-top: 1rem;
                    font-size: 0.875rem;
                }
            </style>

            <div class="list-container">
                <!-- Controls -->
                <div class="controls-bar">
                    <div class="search-box">
                        <span class="search-icon">${icons.search}</span>
                        <input type="text" class="input" id="searchInput" placeholder="Search files..." />
                    </div>
                    <div class="control-group">
                        <select id="sortSelect">
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                            <option value="largest">Largest</option>
                            <option value="smallest">Smallest</option>
                            <option value="name-asc">Name A-Z</option>
                            <option value="name-desc">Name Z-A</option>
                        </select>
                        <div class="view-toggle">
                            <button class="view-btn active" id="gridBtn" title="Grid view">${icons.grid}</button>
                            <button class="view-btn" id="listBtn" title="List view">${icons.list}</button>
                        </div>
                        <button class="btn btn-secondary btn-sm" id="selectBtn">
                            ${icons.selectMode}
                            Select
                        </button>
                        <button class="btn btn-ghost btn-sm" id="refreshBtn" title="Refresh">
                            ${icons.refresh}
                        </button>
                    </div>
                </div>

                <!-- Filter Tabs -->
                <div class="filter-tabs" id="filterTabs"></div>

                <!-- Stats Bar -->
                <div class="stats-bar" id="statsBar">
                    <div class="stat">
                        <span class="stat-value" id="countStat">0</span>
                        <span>files</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value" id="sizeStat">0 B</span>
                        <span>total</span>
                    </div>
                </div>

                <!-- Bulk Actions -->
                <div class="bulk-bar" id="bulkBar">
                    <span class="bulk-info">
                        <span class="bulk-count" id="selectedCount">0</span> selected
                    </span>
                    <div class="bulk-actions">
                        <button class="btn btn-ghost btn-sm" id="selectAllBtn">Select All</button>
                        <button class="btn btn-ghost btn-sm" id="deselectBtn">Clear</button>
                        <button class="btn btn-danger btn-sm" id="bulkDeleteBtn">
                            ${icons.trash}
                            Delete
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div id="content">
                    <div class="loading-state">
                        <div class="spinner"></div>
                        <p>Loading files...</p>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Search
        this.$('#searchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.updateList();
        });

        // Sort
        this.$('#sortSelect').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.updateList();
        });

        // View toggle
        this.$('#gridBtn').addEventListener('click', () => {
            this.viewMode = 'grid';
            this.$('#gridBtn').classList.add('active');
            this.$('#listBtn').classList.remove('active');
            this.updateList();
        });

        this.$('#listBtn').addEventListener('click', () => {
            this.viewMode = 'list';
            this.$('#listBtn').classList.add('active');
            this.$('#gridBtn').classList.remove('active');
            this.updateList();
        });

        // Selection mode
        this.$('#selectBtn').addEventListener('click', () => {
            if (this.selectMode) {
                this.exitSelectMode();
            } else {
                this.enterSelectMode();
            }
        });

        // Bulk actions
        this.$('#selectAllBtn').addEventListener('click', () => this.selectAll());
        this.$('#deselectBtn').addEventListener('click', () => this.deselectAll());
        this.$('#bulkDeleteBtn').addEventListener('click', () => this.bulkDelete());

        // Refresh
        this.$('#refreshBtn').addEventListener('click', async () => {
            const btn = this.$('#refreshBtn');
            btn.disabled = true;
            await pinService.loadAllBlobs();
            btn.disabled = false;
        });

        // Filter tabs (delegated)
        this.$('#filterTabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.filter-tab');
            if (tab) {
                this.filterType = tab.dataset.filter;
                this.$$('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.updateList();
            }
        });
    }

    enterSelectMode() {
        this.selectMode = true;
        this.$('#selectBtn').textContent = 'Cancel';
        this.$('#bulkBar').classList.add('active');
        this.updateList();
    }

    exitSelectMode() {
        this.selectMode = false;
        this.selectedItems.clear();
        this.$('#selectBtn').innerHTML = `${icons.selectMode} Select`;
        this.$('#bulkBar').classList.remove('active');
        this.updateList();
    }

    selectAll() {
        const blobs = this.getFilteredBlobs();
        blobs.forEach(b => {
            if (b.rkey) this.selectedItems.set(b.cid, b);
        });
        this.updateSelectionUI();
        this.updateList();
    }

    deselectAll() {
        this.selectedItems.clear();
        this.updateSelectionUI();
        this.updateList();
    }

    updateSelectionUI() {
        this.$('#selectedCount').textContent = this.selectedItems.size;
    }

    async bulkDelete() {
        const count = this.selectedItems.size;
        if (count === 0) return;

        if (!confirm(`Delete ${count} file${count > 1 ? 's' : ''}? This cannot be undone.`)) {
            return;
        }

        const btn = this.$('#bulkDeleteBtn');
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;"></div> Deleting...';

        let success = 0, failed = 0;
        for (const [_cid, blob] of this.selectedItems) {
            try {
                await pinService.deletePin(blob.rkey);
                success++;
            } catch {
                failed++;
            }
        }

        this.exitSelectMode();
        await pinService.loadAllBlobs();

        if (failed > 0) {
            showToast(`Deleted ${success}, ${failed} failed`, 'warning');
        } else {
            showToast(`Deleted ${success} file${success > 1 ? 's' : ''}`, 'success');
        }

        btn.disabled = false;
        btn.innerHTML = `${icons.trash} Delete`;
    }

    getFilteredBlobs() {
        const state = store.getState();
        let blobs = (state.blobs || []).filter(b => b.rkey); // Only pinned

        // Filter by type
        if (this.filterType !== 'all') {
            blobs = blobs.filter(b => {
                const mime = b.mimeType || '';
                switch (this.filterType) {
                    case 'images': return mime.startsWith('image/');
                    case 'videos': return mime.startsWith('video/');
                    case 'documents': return mime.startsWith('text/') || mime.includes('pdf') || mime.includes('document');
                    case 'other': return !mime.startsWith('image/') && !mime.startsWith('video/') && !mime.startsWith('text/') && !mime.includes('pdf');
                    default: return true;
                }
            });
        }

        // Search
        if (this.searchQuery) {
            blobs = blobs.filter(b => {
                const filename = (b.filename || '').toLowerCase();
                const cid = (b.cid || '').toLowerCase();
                const mime = (b.mimeType || '').toLowerCase();
                return filename.includes(this.searchQuery) || cid.includes(this.searchQuery) || mime.includes(this.searchQuery);
            });
        }

        // Sort
        blobs = this.sortBlobs(blobs);

        return blobs;
    }

    sortBlobs(blobs) {
        const sorted = [...blobs];
        switch (this.sortBy) {
            case 'newest': return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            case 'oldest': return sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
            case 'largest': return sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
            case 'smallest': return sorted.sort((a, b) => (a.size || 0) - (b.size || 0));
            case 'name-asc': return sorted.sort((a, b) => (a.filename || '').localeCompare(b.filename || ''));
            case 'name-desc': return sorted.sort((a, b) => (b.filename || '').localeCompare(a.filename || ''));
            default: return sorted;
        }
    }

    updateList() {
        const state = store.getState();
        const content = this.$('#content');

        if (state.isLoadingBlobs) {
            content.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading files...</p>
                </div>
            `;
            return;
        }

        const allBlobs = (state.blobs || []).filter(b => b.rkey);
        const filteredBlobs = this.getFilteredBlobs();

        // Update filter tabs with counts
        const counts = {
            all: allBlobs.length,
            images: allBlobs.filter(b => b.mimeType?.startsWith('image/')).length,
            videos: allBlobs.filter(b => b.mimeType?.startsWith('video/')).length,
            documents: allBlobs.filter(b => b.mimeType?.startsWith('text/') || b.mimeType?.includes('pdf')).length,
            other: allBlobs.filter(b => {
                const m = b.mimeType || '';
                return !m.startsWith('image/') && !m.startsWith('video/') && !m.startsWith('text/') && !m.includes('pdf');
            }).length,
        };

        this.$('#filterTabs').innerHTML = `
            <button class="filter-tab ${this.filterType === 'all' ? 'active' : ''}" data-filter="all">All<span class="count">${counts.all}</span></button>
            <button class="filter-tab ${this.filterType === 'images' ? 'active' : ''}" data-filter="images">Images<span class="count">${counts.images}</span></button>
            <button class="filter-tab ${this.filterType === 'videos' ? 'active' : ''}" data-filter="videos">Videos<span class="count">${counts.videos}</span></button>
            <button class="filter-tab ${this.filterType === 'documents' ? 'active' : ''}" data-filter="documents">Docs<span class="count">${counts.documents}</span></button>
            <button class="filter-tab ${this.filterType === 'other' ? 'active' : ''}" data-filter="other">Other<span class="count">${counts.other}</span></button>
        `;

        // Update stats
        this.$('#countStat').textContent = filteredBlobs.length;
        const totalSize = filteredBlobs.reduce((sum, b) => sum + (b.size || 0), 0);
        this.$('#sizeStat').textContent = this.formatBytes(totalSize);

        if (allBlobs.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    ${icons.package}
                    <h3>No files yet</h3>
                    <p>Upload your first file to get started</p>
                </div>
            `;
            return;
        }

        if (filteredBlobs.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    ${icons.search}
                    <h3>No matches</h3>
                    <p>Try adjusting your search or filters</p>
                </div>
            `;
            return;
        }

        const viewClass = this.viewMode === 'grid' ? 'blobs-grid' : 'blobs-list';
        content.innerHTML = `
            <div class="${viewClass}">
                ${filteredBlobs.map(blob => `
                    <blob-item 
                        cid="${blob.cid}" 
                        mimetype="${blob.mimeType || 'application/octet-stream'}" 
                        size="${blob.size || 0}"
                        filename="${blob.filename || ''}"
                        rkey="${blob.rkey || ''}"
                        ${this.selectMode ? 'selectable' : ''}
                        ${this.selectedItems.has(blob.cid) ? 'selected' : ''}
                    ></blob-item>
                `).join('')}
            </div>
        `;

        // Selection handlers
        if (this.selectMode) {
            content.querySelectorAll('blob-item').forEach(item => {
                item.addEventListener('selection-change', (e) => {
                    const { cid, selected, rkey, filename, size } = e.detail;
                    if (selected) {
                        this.selectedItems.set(cid, { cid, rkey, filename, size });
                    } else {
                        this.selectedItems.delete(cid);
                    }
                    this.updateSelectionUI();
                });
            });
        }
    }

    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

customElements.define('blob-list', BlobList);
