/**
 * Utility functions for the Blob Store application
 */

import { icons } from './icons.js';

// ═══════════════════════════════════════════════════════════════════════════
// DOM Utilities for Web Components
// ═══════════════════════════════════════════════════════════════════════════

/** Query selector within a root (shadowRoot or element) */
export const $ = (root, selector) => root.querySelector(selector);

/** Query selector all within a root */
export const $$ = (root, selector) => root.querySelectorAll(selector);

/** Emit a custom event that bubbles and crosses shadow DOM */
export function emit(element, name, detail = {}) {
    element.dispatchEvent(new CustomEvent(name, {
        bubbles: true,
        composed: true,
        detail,
    }));
}

/** Clone a template by ID into a shadow root */
export function cloneTemplate(templateId, shadowRoot) {
    const template = document.getElementById(templateId);
    if (template) {
        shadowRoot.appendChild(template.content.cloneNode(true));
    } else {
        console.warn(`Template #${templateId} not found`);
    }
}

/** Replace [data-icon] placeholders with SVG icons */
export function hydrateIcons(root) {
    $$(root, '[data-icon]').forEach(slot => {
        const iconName = slot.dataset.icon;
        if (iconName && icons[iconName]) {
            slot.innerHTML = icons[iconName];
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// Formatting Utilities
// ═══════════════════════════════════════════════════════════════════════════

// Format bytes to human readable
export function formatBytes(bytes, decimals = 1) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

// Get CDN URL for blob (images)
export function getCdnUrl(did, cid, size = 'feed_thumbnail') {
    return `https://cdn.bsky.app/img/${size}/plain/${did}/${cid}@jpeg`;
}

// Get raw blob URL
export function getRawBlobUrl(did, cid) {
    return `https://bsky.social/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}

// Get appropriate icon for mime type
export function getFileIcon(mimeType) {
    if (!mimeType) return 'file';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'film';
    if (mimeType.startsWith('audio/')) return 'music';
    if (mimeType.includes('pdf')) return 'file-text';
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('tar')) return 'archive';
    if (mimeType.includes('json')) return 'file-json';
    if (mimeType.includes('javascript') || mimeType.includes('typescript')) return 'file-code';
    if (mimeType.startsWith('text/')) return 'file-text';
    return 'file';
}

// Get human readable mime type label
export function formatMimeType(mimeType) {
    if (!mimeType) return 'Unknown';
    const parts = mimeType.split('/');
    const subtype = parts[1]?.split(';')[0] || parts[0];
    return subtype.toUpperCase();
}

// Escape HTML
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Truncate CID for display
export function truncateCid(cid, startChars = 8, endChars = 6) {
    if (!cid || cid.length <= startChars + endChars + 3) return cid;
    return `${cid.substring(0, startChars)}...${cid.substring(cid.length - endChars)}`;
}

// Copy to clipboard with feedback
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
}

// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Check if file is valid for upload
export function validateFile(file, maxSize = 1000000) {
    if (!file) {
        return { valid: false, error: 'No file selected' };
    }
    if (file.size > maxSize) {
        return { valid: false, error: `File too large. Maximum size is ${formatBytes(maxSize)}` };
    }
    return { valid: true };
}

// Generate a unique ID
export function generateId() {
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Check if mime type is previewable
export function isPreviewable(mimeType) {
    if (!mimeType) return false;
    return (
        mimeType.startsWith('image/') ||
        mimeType.startsWith('video/') ||
        mimeType.startsWith('audio/') ||
        mimeType.startsWith('text/') ||
        mimeType.includes('json') ||
        mimeType.includes('javascript')
    );
}

// Get file extension from name
export function getFileExtension(filename) {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

// Infer mime type from extension (fallback)
export function inferMimeType(filename) {
    const ext = getFileExtension(filename);
    const mimeMap = {
        // Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon',
        // Video
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        // Audio
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4',
        // Documents
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'json': 'application/json',
        'xml': 'application/xml',
        'md': 'text/markdown',
        // Archives
        'zip': 'application/zip',
        'tar': 'application/x-tar',
        'gz': 'application/gzip',
    };
    return mimeMap[ext] || 'application/octet-stream';
}
