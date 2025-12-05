/**
 * Global State Store - Reactive state management for the application
 */

class Store extends EventTarget {
    constructor() {
        super();
        this._state = {
            // Auth state
            isAuthenticated: false,
            session: null,
            agent: null,
            userDid: null,
            userHandle: null,

            // UI state
            isLoading: false,
            loadingMessage: '',
            error: null,
            viewMode: 'list', // 'list' | 'grid'
            theme: 'night',

            // Blob state
            blobs: [],
            blobCursor: null,
            blobMetadata: new Map(),
            isLoadingBlobs: false,
            selectedBlob: null,

            // Upload state
            selectedFile: null,
            isUploading: false,
            uploadProgress: 0,
            lastUploadResult: null,

            // Stats
            stats: {
                total: 0,
                images: 0,
                videos: 0,
                audio: 0,
                other: 0,
            },
        };
    }

    get state() {
        return this._state;
    }

    setState(updates) {
        const oldState = { ...this._state };
        this._state = { ...this._state, ...updates };
        
        // Emit change event with details
        this.dispatchEvent(new CustomEvent('statechange', {
            detail: { oldState, newState: this._state, updates }
        }));

        // Emit specific events for key changes
        Object.keys(updates).forEach(key => {
            this.dispatchEvent(new CustomEvent(`${key}Changed`, {
                detail: { oldValue: oldState[key], newValue: updates[key] }
            }));
        });
    }

    // Auth actions
    setAuthenticated(session, agent) {
        const userDid = session?.sub || session?.did;
        const userHandle = session?.info?.handle || userDid?.substring(0, 20) + '...';
        
        this.setState({
            isAuthenticated: true,
            session,
            agent,
            userDid,
            userHandle,
        });
    }

    clearAuth() {
        this.setState({
            isAuthenticated: false,
            session: null,
            agent: null,
            userDid: null,
            userHandle: null,
            blobs: [],
            blobCursor: null,
            blobMetadata: new Map(),
            stats: { total: 0, images: 0, videos: 0, audio: 0, other: 0 },
        });
    }

    // Loading actions
    setLoading(isLoading, message = '') {
        this.setState({ isLoading, loadingMessage: message });
    }

    setError(error) {
        this.setState({ error });
    }

    clearError() {
        this.setState({ error: null });
    }

    // Blob actions
    setBlobs(blobs, cursor = null, append = false) {
        const newBlobs = append ? [...this._state.blobs, ...blobs] : blobs;
        this.setState({
            blobs: newBlobs,
            blobCursor: cursor,
            isLoadingBlobs: false,
        });
        this.updateStats();
    }

    setBlobMetadata(cid, metadata) {
        const newMetadata = new Map(this._state.blobMetadata);
        newMetadata.set(cid, { ...newMetadata.get(cid), ...metadata });
        this.setState({ blobMetadata: newMetadata });
        this.updateStats();
    }

    getBlobMetadata(cid) {
        return this._state.blobMetadata.get(cid) || {};
    }

    setLoadingBlobs(isLoading) {
        this.setState({ isLoadingBlobs: isLoading });
    }

    setSelectedBlob(cid) {
        this.setState({ selectedBlob: cid });
    }

    // Upload actions
    setSelectedFile(file) {
        this.setState({ selectedFile: file });
    }

    setUploading(isUploading, progress = 0) {
        this.setState({ isUploading, uploadProgress: progress });
    }

    setUploadResult(result) {
        this.setState({ lastUploadResult: result });
    }

    // View actions
    setViewMode(mode) {
        this.setState({ viewMode: mode });
        localStorage.setItem('blobstore-viewmode', mode);
    }

    setTheme(theme) {
        this.setState({ theme });
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('blobstore-theme', theme);
    }

    // Stats
    updateStats() {
        const { blobs, blobMetadata } = this._state;
        let images = 0, videos = 0, audio = 0, other = 0;

        blobs.forEach(cid => {
            const meta = blobMetadata.get(cid);
            const mime = meta?.mimeType || '';
            if (mime.startsWith('image/')) images++;
            else if (mime.startsWith('video/')) videos++;
            else if (mime.startsWith('audio/')) audio++;
            else other++;
        });

        // Count unknown as other
        other = blobs.length - images - videos - audio;

        this.setState({
            stats: {
                total: blobs.length,
                images,
                videos,
                audio,
                other,
            }
        });
    }

    // Initialize from localStorage
    init() {
        const savedViewMode = localStorage.getItem('blobstore-viewmode');
        const savedTheme = localStorage.getItem('blobstore-theme');
        
        if (savedViewMode) this.setState({ viewMode: savedViewMode });
        if (savedTheme) this.setTheme(savedTheme);
    }
}

// Singleton instance
const store = new Store();
export { store };
