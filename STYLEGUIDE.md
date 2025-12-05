# Pins — Code Style Guide & Architecture

This document defines the coding standards, patterns, and architecture for the Pins application. All components should follow these guidelines for consistency and maintainability.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Signals (Reactive State)](#signals-reactive-state)
3. [HTML Templates](#html-templates)
4. [Web Components](#web-components)
5. [CSS Architecture](#css-architecture)
6. [File Organization](#file-organization)
7. [Naming Conventions](#naming-conventions)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  <template id="pins-app-template">...</template>    │   │
│  │  <template id="login-form-template">...</template>  │   │
│  │  <template id="upload-zone-template">...</template> │   │
│  │  <template id="blob-list-template">...</template>   │   │
│  │  <template id="blob-item-template">...</template>   │   │
│  │  <template id="preview-modal-template">...</template│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  <pins-app></pins-app>                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     js/signals.js                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  signal()    - Create reactive value                │   │
│  │  computed()  - Derived reactive value               │   │
│  │  effect()    - Side effect on signal change         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     js/state.js                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  auth     = signal({ isAuthenticated, user, agent })│   │
│  │  blobs    = signal([])                              │   │
│  │  ui       = signal({ viewMode, isLoading })         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Signals (Reactive State)

### Implementation

We use [usignal](https://github.com/WebReflection/usignal) for reactive state — a tiny (~1KB) signals library with the TC39 Signals proposal API.

```javascript
// js/signals.js — just re-exports from usignal
export { signal, computed, effect, batch } from 'usignal';
```

The importmap in `index.html` maps `usignal` to a CDN:

```html
<script type="importmap">
{
    "imports": {
        "usignal": "https://esm.sh/usignal@0.9.0"
    }
}
</script>
```

### Usage in State

```javascript
// js/state.js
import { signal, computed, batch } from 'usignal';

// Auth state
export const auth = signal({
    isAuthenticated: false,
    user: null,
    agent: null,
});

// Blob state  
export const blobs = signal([]);
export const blobMetadata = signal(new Map());

// UI state
export const ui = signal({
    viewMode: 'grid',
    isLoading: false,
    searchQuery: '',
    filterType: 'all',
});

// Computed values (auto-track dependencies)
export const filteredBlobs = computed(() => {
    const { searchQuery, filterType } = ui.value;  // .value for reading
    const allBlobs = blobs.value;
    const metadata = blobMetadata.value;
    
    return allBlobs.filter(cid => {
        const meta = metadata.get(cid) || {};
        if (filterType !== 'all') {
            const mime = meta.mimeType || '';
            if (filterType === 'images' && !mime.startsWith('image/')) return false;
            if (filterType === 'videos' && !mime.startsWith('video/')) return false;
        }
        if (searchQuery) {
            const filename = meta.filename || '';
            if (!filename.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        }
        return true;
    });
});

// Mutating state
export function setSearch(query) {
    const current = ui.value;
    ui.value = { ...current, searchQuery: query };  // .value for writing
}
```

### Usage in Components

```javascript
import { auth, blobs, ui, filteredBlobs } from '../js/state.js';
import { effect } from 'usignal';

class MyComponent extends HTMLElement {
    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.render();
        
        // Auto-update on state change
        this.cleanup = effect(() => {
            const items = filteredBlobs.value;  // .value for computed too
            this.updateList(items);
        });
    }
    
    disconnectedCallback() {
        this.cleanup?.();
    }
}
```

---

## HTML Templates

### Location

All templates live in `index.html`, **not** in JavaScript strings.

### Structure

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Pins — AT Protocol File Storage</title>
    <link rel="stylesheet" href="/css/tokens.css">
</head>
<body>
    <!-- ═══════════════════════════════════════════════════════════
         TEMPLATES
         ═══════════════════════════════════════════════════════════ -->
    
    <!-- Login Form Template -->
    <template id="login-form-template">
        <style>
            @import '/css/components/login-form.css';
        </style>
        <form class="form">
            <div class="input-group">
                <label class="label" for="handle">Handle or DID</label>
                <div class="input-wrapper">
                    <span class="input-prefix">@</span>
                    <input type="text" id="handle" placeholder="username.bsky.social" required>
                </div>
            </div>
            <button type="submit" class="btn btn-primary">Sign in</button>
        </form>
    </template>

    <!-- Blob Item Template -->
    <template id="blob-item-template">
        <style>
            @import '/css/components/blob-item.css';
        </style>
        <article class="card">
            <div class="thumbnail">
                <slot name="thumbnail"></slot>
            </div>
            <div class="info">
                <h3 class="filename"></h3>
                <p class="meta"></p>
            </div>
            <div class="actions">
                <button class="btn-icon" data-action="copy" aria-label="Copy CID">
                    <slot name="icon-copy"></slot>
                </button>
                <button class="btn-icon" data-action="download" aria-label="Download">
                    <slot name="icon-download"></slot>
                </button>
                <button class="btn-icon btn-danger" data-action="delete" aria-label="Delete">
                    <slot name="icon-delete"></slot>
                </button>
            </div>
        </article>
    </template>

    <!-- ═══════════════════════════════════════════════════════════
         APP ROOT
         ═══════════════════════════════════════════════════════════ -->
    <pins-app></pins-app>

    <!-- ═══════════════════════════════════════════════════════════
         SCRIPTS (type=module)
         ═══════════════════════════════════════════════════════════ -->
    <script type="module" src="/js/components/pins-app.js"></script>
</body>
</html>
```

### Template Rules

1. **One template per component** — Named `{component-name}-template`
2. **External CSS via @import** — Keep styles in separate `.css` files
3. **Slots for dynamic content** — Use `<slot>` for icons, thumbnails, etc.
4. **Data attributes for actions** — Use `data-action="..."` for event delegation
5. **No inline JavaScript** — All behavior in component class

---

## Web Components

### Base Class

```javascript
// js/components/base-component.js

export class BaseComponent extends HTMLElement {
    static templateId = null; // Override in subclass
    
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.bindEvents();
        this.subscribe();
    }

    disconnectedCallback() {
        this.unsubscribe();
    }

    // Clone template from DOM
    render() {
        const templateId = this.constructor.templateId;
        if (!templateId) throw new Error(`${this.constructor.name} must define static templateId`);
        
        const template = document.getElementById(templateId);
        if (!template) throw new Error(`Template #${templateId} not found`);
        
        const content = template.content.cloneNode(true);
        this.shadowRoot.replaceChildren(content);
    }

    // Override for event binding
    bindEvents() {}

    // Override for state subscriptions
    subscribe() {}
    unsubscribe() {}

    // Utility: Query shadow DOM
    $(selector) {
        return this.shadowRoot.querySelector(selector);
    }

    $$(selector) {
        return this.shadowRoot.querySelectorAll(selector);
    }

    // Utility: Emit custom event
    emit(name, detail = {}) {
        this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
    }
}
```

### Component Structure

```javascript
// js/components/login-form.js

import { BaseComponent } from './base-component.js';
import { auth } from '../state.js';
import { oauthService } from '../services/oauth.js';

class LoginForm extends BaseComponent {
    static templateId = 'login-form-template';

    bindEvents() {
        this.$('form').addEventListener('submit', this.handleSubmit.bind(this));
    }

    async handleSubmit(e) {
        e.preventDefault();
        const handle = this.$('#handle').value.trim();
        if (!handle) return;

        this.$('button').disabled = true;
        try {
            await oauthService.signIn(handle);
        } catch (err) {
            this.emit('error', { message: err.message });
        } finally {
            this.$('button').disabled = false;
        }
    }
}

customElements.define('login-form', LoginForm);
```

### Component Checklist

- [ ] Extends `BaseComponent`
- [ ] Defines `static templateId`
- [ ] Template exists in `index.html`
- [ ] Uses `bindEvents()` for event handlers
- [ ] Uses `subscribe()`/`unsubscribe()` for signals
- [ ] Emits events via `this.emit()` for parent communication
- [ ] No inline HTML strings in JavaScript

---

## CSS Architecture

### File Structure

```
public/
├── css/
│   ├── tokens.css              # Design tokens (CSS custom properties)
│   ├── base.css                # Reset, typography, global styles
│   └── components/
│       ├── login-form.css
│       ├── upload-zone.css
│       ├── blob-list.css
│       ├── blob-item.css
│       └── preview-modal.css
```

### Design Tokens

```css
/* css/tokens.css */

:root {
    /* Colors */
    --color-bg-base: #09090b;
    --color-bg-elevated: #18181b;
    --color-bg-subtle: #27272a;

    --color-text-primary: #fafafa;
    --color-text-secondary: #a1a1aa;
    --color-text-muted: #71717a;

    --color-border-subtle: rgba(255, 255, 255, 0.06);
    --color-border-default: rgba(255, 255, 255, 0.1);

    --color-accent: #3b82f6;
    --color-accent-hover: #60a5fa;
    --color-accent-muted: rgba(59, 130, 246, 0.15);

    --color-success: #22c55e;
    --color-error: #ef4444;

    /* Spacing */
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-6: 1.5rem;
    --space-8: 2rem;

    /* Radius */
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 14px;

    /* Transitions */
    --transition-fast: 150ms ease;
    --transition-base: 200ms ease;

    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
}
```

### Component CSS

```css
/* css/components/blob-item.css */

.card {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: border-color var(--transition-fast);
}

.card:hover {
    border-color: var(--color-border-default);
}

.thumbnail {
    aspect-ratio: 16 / 10;
    background: var(--color-bg-subtle);
    display: grid;
    place-items: center;
}

.info {
    padding: var(--space-3);
}

.filename {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.meta {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin-top: var(--space-1);
}

.actions {
    display: flex;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    border-top: 1px solid var(--color-border-subtle);
}
```

---

## File Organization

### Final Structure

```
public/
├── index.html                  # Templates + app root
├── css/
│   ├── tokens.css
│   ├── base.css
│   └── components/
│       ├── login-form.css
│       ├── upload-zone.css
│       ├── blob-list.css
│       ├── blob-item.css
│       └── preview-modal.css
├── js/
│   ├── signals.js              # Reactive primitives
│   ├── state.js                # App state (signals)
│   ├── services/
│   │   ├── oauth.js
│   │   └── blobs.js
│   ├── components/
│   │   ├── base-component.js
│   │   ├── pins-app.js
│   │   ├── login-form.js
│   │   ├── upload-zone.js
│   │   ├── blob-list.js
│   │   ├── blob-item.js
│   │   └── preview-modal.js
│   └── utils/
│       ├── icons.js
│       └── format.js
└── images/
    └── pins-logo.svg
```

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | `kebab-case` | `<blob-item>`, `<upload-zone>` |
| Template IDs | `{component}-template` | `blob-item-template` |
| CSS files | `{component}.css` | `blob-item.css` |
| JS files | `{component}.js` | `blob-item.js` |
| CSS tokens | `--{category}-{name}` | `--color-bg-base` |
| Signals | `camelCase` | `filteredBlobs` |
| Event names | `kebab-case` | `selection-change` |
| Data attributes | `data-{action}` | `data-action="delete"` |

---

## Migration Checklist

- [ ] Create `js/signals.js` with signal/computed/effect
- [ ] Create `js/state.js` using signals
- [ ] Create `css/tokens.css` with design tokens
- [ ] Create `css/base.css` with reset and typography
- [ ] Move templates from JS to `index.html`
- [ ] Create component CSS files in `css/components/`
- [ ] Update `BaseComponent` to use `templateId` pattern
- [ ] Refactor each component to:
  - [ ] Define `static templateId`
  - [ ] Use `subscribe()` with signals
  - [ ] Move styles to external CSS
- [ ] Remove `getBaseStyles()` method
- [ ] Remove `store.js` (replaced by signals)
