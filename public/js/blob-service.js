/**
 * Blob Service - Handles blob operations with the PDS
 */

import { auth, isLoadingBlobs, setBlobs, setBlobMeta, getBlobMeta, setUploading, upload } from './state.js';
import { getRawBlobUrl, getCdnUrl } from './utils.js';

class BlobService {
    // List blobs for the current user
    async listBlobs(reset = false) {
        const { agent, userDid } = auth.value;
        
        if (!agent || !userDid) {
            throw new Error('Not authenticated');
        }

        isLoadingBlobs.value = true;

        try {
            const params = { did: userDid, limit: 50 };

            const response = await agent.com.atproto.sync.listBlobs(params);
            const blobs = response.data.cids || [];

            setBlobs(blobs, !reset);

            // Try to load metadata for new blobs
            this.loadBlobMetadata(blobs);

            isLoadingBlobs.value = false;
            return { blobs };
        } catch (error) {
            console.error('Failed to list blobs:', error);
            isLoadingBlobs.value = false;
            throw error;
        }
    }

    // Upload a blob
    async uploadBlob(file, onProgress) {
        const { agent } = auth.value;
        
        if (!agent) {
            throw new Error('Not authenticated');
        }

        setUploading(true, 0, file.name);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            // Simulate progress since the API doesn't provide it
            const progressInterval = setInterval(() => {
                const currentProgress = upload.value.progress;
                if (currentProgress < 90) {
                    const newProgress = currentProgress + Math.random() * 15;
                    setUploading(true, Math.min(newProgress, 90), file.name);
                    onProgress?.(Math.min(newProgress, 90));
                }
            }, 200);

            const { data } = await agent.uploadBlob(uint8Array, {
                encoding: file.type || 'application/octet-stream',
            });

            clearInterval(progressInterval);
            setUploading(true, 100, file.name);
            onProgress?.(100);

            const result = {
                cid: data.blob.ref.toString(),
                mimeType: data.blob.mimeType,
                size: data.blob.size,
                uploadedAt: new Date().toISOString(),
            };

            // Cache metadata
            setBlobMeta(result.cid, {
                mimeType: result.mimeType,
                size: result.size,
                uploadedAt: result.uploadedAt,
            });

            setUploading(false, 0, null);

            return result;
        } catch (error) {
            setUploading(false, 0, null);
            console.error('Upload error:', error);
            throw error;
        }
    }

    // Load metadata for blobs (tries CDN for images, HEAD request for others)
    async loadBlobMetadata(cids) {
        const { userDid } = auth.value;
        if (!userDid) return;

        for (const cid of cids) {
            // Skip if already have metadata
            if (getBlobMeta(cid).mimeType) continue;

            // Try to detect if it's an image via CDN
            this.tryLoadImageMetadata(cid, userDid);
        }
    }

    // Try to load image from CDN to detect if blob is an image
    async tryLoadImageMetadata(cid, did) {
        const cdnUrl = getCdnUrl(did, cid, 'feed_thumbnail');
        
        const img = new Image();
        img.onload = () => {
            setBlobMeta(cid, { 
                mimeType: 'image/*',
                isImage: true,
            });
        };
        img.onerror = () => {
            // Not an image or failed to load
        };
        img.src = cdnUrl;
    }

    // Fetch blob content for preview
    async fetchBlobContent(cid) {
        const { userDid } = auth.value;
        if (!userDid) throw new Error('Not authenticated');

        const url = getRawBlobUrl(userDid, cid);
        
        // First do HEAD to get content type
        const headResponse = await fetch(url, { method: 'HEAD' });
        const contentType = headResponse.headers.get('content-type') || '';
        const contentLength = headResponse.headers.get('content-length');

        // Update metadata
        setBlobMeta(cid, {
            mimeType: contentType,
            size: contentLength ? parseInt(contentLength) : undefined,
        });

        return {
            url,
            contentType,
            size: contentLength ? parseInt(contentLength) : undefined,
        };
    }

    // Get blob URLs
    getBlobUrls(cid) {
        const { userDid } = auth.value;
        if (!userDid) return null;

        return {
            raw: getRawBlobUrl(userDid, cid),
            cdn: getCdnUrl(userDid, cid, 'feed_fullsize'),
            thumbnail: getCdnUrl(userDid, cid, 'feed_thumbnail'),
        };
    }
}

// Singleton
const blobService = new BlobService();
export { blobService };
