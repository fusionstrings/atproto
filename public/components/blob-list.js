/**
 * Blob List - Full-featured file management with search, filter, sort, and bulk actions
 */

import { effect } from 'usignal';
import { blobs, blobMetadata, isLoadingBlobs } from '../js/state.js';
import { pinService } from '../js/pin-service.js';
import { showToast } from './toast-notification.js';
import { icons } from '../js/icons.js';
import { $, $$, cloneTemplate, formatBytes } from '../js/utils.js';

export class BlobList extends HTMLElement {
    constructor() {
        super();
        this.viewMode = 'grid';
        this.searchQuery = '';
        this.filterType = 'all';
        this.sortBy = 'newest';
        this.selectMode = false;
        this.selectedItems = new Map();
    }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        cloneTemplate('blob-list-template', this.shadowRoot);
        this.injectIcons();
        this.setupEventListeners();
        
        this.cleanup = effect(() => {
            const _ = blobs.value;
            const __ = blobMetadata.value;
            const ___ = isLoadingBlobs.value;
            this.updateList();
        });
    }

    injectIcons() {
        const iconMap = {
            '#searchIcon': icons.search,
            '#gridBtn': icons.grid,
            '#listBtn': icons.list,
            '#refreshBtn': icons.refresh,
        };
        
        Object.entries(iconMap).forEach(([sel, icon]) => {
            const el = $(this.shadowRoot, sel);
            if (el) el.innerHTML = icon;
        });
        
        $(this.shadowRoot, '#selectBtn').innerHTML = `${icons.selectMode} Select`;
        $(this.shadowRoot, '#bulkDeleteBtn').innerHTML = `${icons.trash} Delete`;
    }

    disconnectedCallback() {
        this.cleanup?.();
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

    setupEventListeners() {
        this._keyHandler = (e) => this.handleKeyboard(e);
        document.addEventListener('keydown', this._keyHandler);

        $(this.shadowRoot, '#searchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.updateList();
        });

        $(this.shadowRoot, '#sortSelect').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.updateList();
        });

        $(this.shadowRoot, '#gridBtn').addEventListener('click', () => {
            this.viewMode = 'grid';
            $(this.shadowRoot, '#gridBtn').classList.add('active');
            $(this.shadowRoot, '#listBtn').classList.remove('active');
            this.updateList();
        });

        $(this.shadowRoot, '#listBtn').addEventListener('click', () => {
            this.viewMode = 'list';
            $(this.shadowRoot, '#listBtn').classList.add('active');
            $(this.shadowRoot, '#gridBtn').classList.remove('active');
            this.updateList();
        });

        $(this.shadowRoot, '#selectBtn').addEventListener('click', () => {
            if (this.selectMode) {
                this.exitSelectMode();
            } else {
                this.enterSelectMode();
            }
        });

        $(this.shadowRoot, '#selectAllBtn').addEventListener('click', () => this.selectAll());
        $(this.shadowRoot, '#deselectBtn').addEventListener('click', () => this.deselectAll());
        $(this.shadowRoot, '#bulkDeleteBtn').addEventListener('click', () => this.bulkDelete());

        $(this.shadowRoot, '#refreshBtn').addEventListener('click', async () => {
            const btn = $(this.shadowRoot, '#refreshBtn');
            btn.disabled = true;
            await pinService.loadAllBlobs();
            btn.disabled = false;
        });

        $(this.shadowRoot, '#filterTabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.filter-tab');
            if (tab) {
                this.filterType = tab.dataset.filter;
                $$(this.shadowRoot, '.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.updateList();
            }
        });
    }

    enterSelectMode() {
        this.selectMode = true;
        $(this.shadowRoot, '#selectBtn').textContent = 'Cancel';
        $(this.shadowRoot, '#bulkBar').classList.add('active');
        this.updateList();
    }

    exitSelectMode() {
        this.selectMode = false;
        this.selectedItems.clear();
        $(this.shadowRoot, '#selectBtn').innerHTML = `${icons.selectMode} Select`;
        $(this.shadowRoot, '#bulkBar').classList.remove('active');
        this.updateList();
    }

    selectAll() {
        const blobsList = this.getFilteredBlobs();
        blobsList.forEach(b => {
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
        $(this.shadowRoot, '#selectedCount').textContent = this.selectedItems.size;
    }

    async bulkDelete() {
        const count = this.selectedItems.size;
        if (count === 0) return;

        if (!confirm(`Delete ${count} file${count > 1 ? 's' : ''}? This cannot be undone.`)) {
            return;
        }

        const btn = $(this.shadowRoot, '#bulkDeleteBtn');
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner spinner-sm"></div> Deleting...';

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
        const allCids = blobs.value;
        const metadata = blobMetadata.value;
        
        let blobsList = allCids.map(cid => ({
            cid,
            ...(metadata.get(cid) || {}),
        })).filter(b => b.rkey);

        if (this.filterType !== 'all') {
            blobsList = blobsList.filter(b => {
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

        if (this.searchQuery) {
            blobsList = blobsList.filter(b => {
                const filename = (b.filename || '').toLowerCase();
                const cid = (b.cid || '').toLowerCase();
                const mime = (b.mimeType || '').toLowerCase();
                return filename.includes(this.searchQuery) || cid.includes(this.searchQuery) || mime.includes(this.searchQuery);
            });
        }

        return this.sortBlobs(blobsList);
    }

    sortBlobs(blobsList) {
        const sorted = [...blobsList];
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
        const content = $(this.shadowRoot, '#content');
        const loading = isLoadingBlobs.value;

        if (loading) {
            content.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading files...</p>
                </div>
            `;
            return;
        }

        const allCids = blobs.value;
        const metadata = blobMetadata.value;
        
        const allBlobs = allCids.map(cid => ({
            cid,
            ...(metadata.get(cid) || {}),
        })).filter(b => b.rkey);
        
        const filteredBlobs = this.getFilteredBlobs();

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

        $(this.shadowRoot, '#filterTabs').innerHTML = `
            <button class="filter-tab ${this.filterType === 'all' ? 'active' : ''}" data-filter="all">All<span class="count">${counts.all}</span></button>
            <button class="filter-tab ${this.filterType === 'images' ? 'active' : ''}" data-filter="images">Images<span class="count">${counts.images}</span></button>
            <button class="filter-tab ${this.filterType === 'videos' ? 'active' : ''}" data-filter="videos">Videos<span class="count">${counts.videos}</span></button>
            <button class="filter-tab ${this.filterType === 'documents' ? 'active' : ''}" data-filter="documents">Docs<span class="count">${counts.documents}</span></button>
            <button class="filter-tab ${this.filterType === 'other' ? 'active' : ''}" data-filter="other">Other<span class="count">${counts.other}</span></button>
        `;

        $(this.shadowRoot, '#countStat').textContent = filteredBlobs.length;
        const totalSize = filteredBlobs.reduce((sum, b) => sum + (b.size || 0), 0);
        $(this.shadowRoot, '#sizeStat').textContent = formatBytes(totalSize);

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
}
