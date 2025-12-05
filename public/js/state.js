/**
 * Application State - Reactive signals for global state
 * Uses usignal: https://github.com/WebReflection/usignal
 */

import { signal, computed, batch } from 'usignal';

// ═══════════════════════════════════════════════════════════════════════════
// AUTH STATE
// ═══════════════════════════════════════════════════════════════════════════

export const auth = signal({
    isInitializing: true,
    isAuthenticated: false,
    session: null,
    agent: null,
    userDid: null,
    handle: null,
});

export function setAuthenticated(session, agent, handle = null) {
    const userDid = session?.sub || session?.did;
    const userHandle = handle || session?.info?.handle || userDid?.substring(0, 20) + '...';
    
    auth.value = {
        isInitializing: false,
        isAuthenticated: true,
        session,
        agent,
        userDid,
        handle: userHandle,
    };
}

export function setInitialized() {
    auth.value = { ...auth.value, isInitializing: false };
}

export function clearAuth() {
    batch(() => {
        auth.value = {
            isInitializing: false,
            isAuthenticated: false,
            session: null,
            agent: null,
            userDid: null,
            handle: null,
        };
        blobs.value = [];
        blobMetadata.value = new Map();
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOB STATE
// ═══════════════════════════════════════════════════════════════════════════

export const blobs = signal([]);
export const blobMetadata = signal(new Map());
export const isLoadingBlobs = signal(false);

export function setBlobs(newBlobs, append = false) {
    const current = blobs.value;
    blobs.value = append ? [...current, ...newBlobs] : newBlobs;
}

export function setBlobMeta(cid, meta) {
    const map = new Map(blobMetadata.value);
    map.set(cid, { ...map.get(cid), ...meta });
    blobMetadata.value = map;
}

export function getBlobMeta(cid) {
    return blobMetadata.value.get(cid) || {};
}

// ═══════════════════════════════════════════════════════════════════════════
// UI STATE
// ═══════════════════════════════════════════════════════════════════════════

export const ui = signal({
    viewMode: localStorage.getItem('pins-viewmode') || 'grid',
    searchQuery: '',
    filterType: 'all',
    sortBy: 'newest',
    selectMode: false,
    selectedItems: new Set(),
});

export function setViewMode(mode) {
    const current = ui.value;
    ui.value = { ...current, viewMode: mode };
    localStorage.setItem('pins-viewmode', mode);
}

export function setSearch(query) {
    const current = ui.value;
    ui.value = { ...current, searchQuery: query };
}

export function setFilter(type) {
    const current = ui.value;
    ui.value = { ...current, filterType: type };
}

export function setSort(sortBy) {
    const current = ui.value;
    ui.value = { ...current, sortBy };
}

export function toggleSelectMode(enabled) {
    const current = ui.value;
    ui.value = { 
        ...current, 
        selectMode: enabled,
        selectedItems: enabled ? current.selectedItems : new Set(),
    };
}

export function toggleSelection(cid) {
    const current = ui.value;
    const selected = new Set(current.selectedItems);
    if (selected.has(cid)) {
        selected.delete(cid);
    } else {
        selected.add(cid);
    }
    ui.value = { ...current, selectedItems: selected };
}

export function selectAll(cids) {
    const current = ui.value;
    ui.value = { ...current, selectedItems: new Set(cids) };
}

export function clearSelection() {
    const current = ui.value;
    ui.value = { ...current, selectedItems: new Set() };
}

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD STATE
// ═══════════════════════════════════════════════════════════════════════════

export const upload = signal({
    isUploading: false,
    progress: 0,
    currentFile: null,
});

export function setUploading(isUploading, progress = 0, currentFile = null) {
    upload.value = { isUploading, progress, currentFile };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPUTED (DERIVED STATE)
// ═══════════════════════════════════════════════════════════════════════════

export const filteredBlobs = computed(() => {
    const { searchQuery, filterType, sortBy } = ui.value;
    const allBlobs = blobs.value;
    const metadata = blobMetadata.value;

    // Filter
    let result = allBlobs.filter(cid => {
        const meta = metadata.get(cid) || {};
        const mime = meta.mimeType || '';
        const filename = (meta.filename || '').toLowerCase();

        // Type filter
        if (filterType !== 'all') {
            if (filterType === 'images' && !mime.startsWith('image/')) return false;
            if (filterType === 'videos' && !mime.startsWith('video/')) return false;
            if (filterType === 'documents' && !mime.includes('pdf') && !mime.startsWith('text/') && !mime.includes('document')) return false;
            if (filterType === 'other' && (mime.startsWith('image/') || mime.startsWith('video/') || mime.includes('pdf'))) return false;
        }

        // Search filter
        if (searchQuery && !filename.includes(searchQuery.toLowerCase()) && !cid.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }

        return true;
    });

    // Sort
    result = [...result].sort((a, b) => {
        const metaA = metadata.get(a) || {};
        const metaB = metadata.get(b) || {};

        switch (sortBy) {
            case 'oldest':
                return (metaA.createdAt || 0) - (metaB.createdAt || 0);
            case 'newest':
                return (metaB.createdAt || 0) - (metaA.createdAt || 0);
            case 'largest':
                return (metaB.size || 0) - (metaA.size || 0);
            case 'smallest':
                return (metaA.size || 0) - (metaB.size || 0);
            case 'name-az':
                return (metaA.filename || '').localeCompare(metaB.filename || '');
            case 'name-za':
                return (metaB.filename || '').localeCompare(metaA.filename || '');
            default:
                return 0;
        }
    });

    return result;
});

export const stats = computed(() => {
    const allBlobs = blobs.value;
    const metadata = blobMetadata.value;
    
    let images = 0, videos = 0, documents = 0, other = 0, totalSize = 0;

    allBlobs.forEach(cid => {
        const meta = metadata.get(cid) || {};
        const mime = meta.mimeType || '';
        totalSize += meta.size || 0;

        if (mime.startsWith('image/')) images++;
        else if (mime.startsWith('video/')) videos++;
        else if (mime.includes('pdf') || mime.startsWith('text/') || mime.includes('document')) documents++;
        else other++;
    });

    return { total: allBlobs.length, images, videos, documents, other, totalSize };
});
