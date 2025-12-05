/**
 * Pin Service - Manages pinned blobs with metadata in a custom collection
 * Uses the com.fusionstrings.pins lexicon for persistent storage
 */

import { store } from './store.js';

const COLLECTION = 'com.fusionstrings.pins';

class PinService {
    /**
     * Create a pin record for an uploaded blob
     * @param {Object} params - Pin parameters
     * @param {string} params.mimeType - MIME type of the blob
     * @param {string} params.filename - Original filename
     * @param {number} params.size - File size in bytes
     * @param {Object} params.blobRef - The blob reference from upload
     */
    async createPin({ mimeType, filename, size, blobRef }) {
        const { agent, userDid } = store.state;
        
        if (!agent || !userDid) {
            throw new Error('Not authenticated');
        }

        const record = {
            $type: COLLECTION,
            blob: blobRef,
            mimeType: mimeType || 'application/octet-stream',
            filename: filename || undefined,
            size: size || undefined,
            createdAt: new Date().toISOString(),
        };

        try {
            const response = await agent.com.atproto.repo.createRecord({
                repo: userDid,
                collection: COLLECTION,
                record,
            });

            return {
                uri: response.data.uri,
                cid: response.data.cid,
                rkey: response.data.uri.split('/').pop(),
            };
        } catch (error) {
            console.error('Failed to create pin:', error);
            throw error;
        }
    }

    /**
     * List all pinned blobs
     * @param {Object} options - List options
     * @param {string} options.cursor - Pagination cursor
     * @param {number} options.limit - Number of records to fetch
     */
    async listPins({ cursor, limit = 100 } = {}) {
        const { agent, userDid } = store.state;
        
        if (!agent || !userDid) {
            throw new Error('Not authenticated');
        }

        try {
            const params = {
                repo: userDid,
                collection: COLLECTION,
                limit,
            };
            if (cursor) params.cursor = cursor;

            const response = await agent.com.atproto.repo.listRecords(params);
            
            const pins = (response.data.records || []).map(record => {
                const blobRef = record.value.blob;
                const cid = blobRef?.ref?.$link || blobRef?.ref?.toString() || blobRef?.cid;
                
                return {
                    uri: record.uri,
                    rkey: record.uri.split('/').pop(),
                    cid,
                    mimeType: record.value.mimeType,
                    filename: record.value.filename,
                    size: record.value.size,
                    createdAt: record.value.createdAt,
                    isPinned: true,
                };
            });

            return {
                pins,
                cursor: response.data.cursor,
            };
        } catch (error) {
            console.error('Failed to list pins:', error);
            throw error;
        }
    }

    /**
     * Delete a pin record
     * @param {string} rkey - The record key to delete
     */
    async deletePin(rkey) {
        const { agent, userDid } = store.state;
        
        if (!agent || !userDid) {
            throw new Error('Not authenticated');
        }

        try {
            await agent.com.atproto.repo.deleteRecord({
                repo: userDid,
                collection: COLLECTION,
                rkey,
            });
            return true;
        } catch (error) {
            console.error('Failed to delete pin:', error);
            throw error;
        }
    }

    /**
     * Get a single pin by rkey
     * @param {string} rkey - The record key
     */
    async getPin(rkey) {
        const { agent, userDid } = store.state;
        
        if (!agent || !userDid) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await agent.com.atproto.repo.getRecord({
                repo: userDid,
                collection: COLLECTION,
                rkey,
            });

            const blobRef = response.data.value.blob;
            const cid = blobRef?.ref?.$link || blobRef?.ref?.toString() || blobRef?.cid;

            return {
                uri: response.data.uri,
                rkey,
                cid,
                mimeType: response.data.value.mimeType,
                filename: response.data.value.filename,
                size: response.data.value.size,
                createdAt: response.data.value.createdAt,
                isPinned: true,
            };
        } catch (error) {
            console.error('Failed to get pin:', error);
            throw error;
        }
    }

    /**
     * Load all pins and merge with orphan blobs from repo
     */
    async loadAllBlobs() {
        const { agent, userDid } = store.state;
        
        if (!agent || !userDid) {
            throw new Error('Not authenticated');
        }

        store.setLoadingBlobs(true);

        try {
            // Fetch all pins
            let allPins = [];
            let pinCursor = undefined;
            
            do {
                const { pins, cursor } = await this.listPins({ cursor: pinCursor });
                allPins = allPins.concat(pins);
                pinCursor = cursor;
            } while (pinCursor);

            // Fetch all repo blobs (includes profile pics, post images, etc.)
            let allRepoCids = [];
            try {
                let syncCursor = undefined;
                do {
                    const params = { did: userDid, limit: 1000 };
                    if (syncCursor) params.cursor = syncCursor;
                    const res = await agent.com.atproto.sync.listBlobs(params);
                    allRepoCids = allRepoCids.concat(res.data.cids || []);
                    syncCursor = res.data.cursor;
                } while (syncCursor);
            } catch (e) {
                console.log('Could not fetch sync blobs:', e.message);
            }

            // Create set of pinned CIDs
            const pinnedCids = new Set(allPins.map(p => p.cid));

            // Map other blobs (not pinned)
            const otherBlobs = allRepoCids
                .filter(cid => !pinnedCids.has(cid))
                .map(cid => ({
                    cid,
                    mimeType: null, // Unknown
                    filename: null,
                    size: null,
                    isPinned: false,
                    isOrphan: false, // Part of other records
                }));

            // Combine pins first, then other blobs
            const allBlobs = [...allPins, ...otherBlobs];

            // Update store
            store.setState({
                blobs: allBlobs,
                pinnedCount: allPins.length,
                otherCount: otherBlobs.length,
                isLoadingBlobs: false,
            });

            return allBlobs;
        } catch (error) {
            store.setLoadingBlobs(false);
            throw error;
        }
    }
}

// Singleton
const pinService = new PinService();
export { pinService };
