class FileWatcher {
    constructor(watchPath, options = {}) {
        this.watchPath = watchPath;
        this.options = {
            interval: 5000,
            ...options
        };
        this.lastChecked = new Map();
        this.isWatching = false;
        this.handlers = new Map();
    }

    async start() {
        if (this.isWatching) return;
        this.isWatching = true;
        await this.scanDirectory();
        this.intervalId = setInterval(() => this.scanDirectory(), this.options.interval);
    }

    stop() {
        if (!this.isWatching) return;
        clearInterval(this.intervalId);
        this.isWatching = false;
    }

    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event).add(handler);
    }

    off(event, handler) {
        if (this.handlers.has(event)) {
            this.handlers.get(event).delete(handler);
        }
    }

    async trigger(event, data) {
        if (this.handlers.has(event)) {
            for (const handler of this.handlers.get(event)) {
                await handler(data);
            }
        }
    }

    async scanDirectory() {
        try {
            const files = await this.getDirectoryContents(this.watchPath);
            
            // Process files
            for (const file of files) {
                const lastModified = new Date(file.mtime).getTime();
                if (!this.lastChecked.has(file.path)) {
                    await this.trigger('add', file);
                } else if (lastModified > this.lastChecked.get(file.path)) {
                    await this.trigger('change', file);
                }
                this.lastChecked.set(file.path, lastModified);
            }

            // Check for deleted files
            for (const [path, time] of this.lastChecked) {
                if (!files.some(f => f.path === path)) {
                    await this.trigger('unlink', { path });
                    this.lastChecked.delete(path);
                }
            }
        } catch (error) {
            console.error('Directory scan failed:', error);
            await this.trigger('error', error);
        }
    }

    async getDirectoryContents(path) {
        const response = await fetch('/api/files/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
        if (!response.ok) throw new Error('Failed to get directory contents');
        return await response.json();
    }
}

class FileProcessor {
    constructor(watcher) {
        this.watcher = watcher;
        this.setupHandlers();
    }

    setupHandlers() {
        this.watcher.on('add', file => this.processFile(file, 'add'));
        this.watcher.on('change', file => this.processFile(file, 'change'));
        this.watcher.on('unlink', file => this.processFile(file, 'delete'));
    }

    async processFile(file, action) {
        try {
            if (action === 'delete') {
                await this.handleDeletedFile(file);
                return;
            }

            const content = await this.readFile(file.path);
            const metadata = await this.extractMetadata(content, file);

            switch (action) {
                case 'add':
                    await this.handleNewFile(content, metadata);
                    break;
                case 'change':
                    await this.handleModifiedFile(content, metadata);
                    break;
            }
        } catch (error) {
            console.error(`Error processing file ${file.path}:`, error);
        }
    }

    async readFile(path) {
        const response = await fetch('/api/files/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
        if (!response.ok) throw new Error('Failed to read file');
        return await response.text();
    }

    async extractMetadata(content, file) {
        // Default metadata from filename and content
        const defaultMetadata = {
            title: this.getTitleFromFilename(file.path),
            type: this.getContentType(file.path),
            date: new Date().toISOString(),
            tags: [],
            category: ''
        };

        // Try to extract front matter if present
        try {
            const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
            if (frontMatterMatch) {
                const frontMatter = frontMatterMatch[1];
                const parsed = {};
                frontMatter.split('\n').forEach(line => {
                    const [key, ...values] = line.split(':');
                    if (key && values.length) {
                        parsed[key.trim()] = values.join(':').trim();
                    }
                });
                return { ...defaultMetadata, ...parsed };
            }
        } catch (error) {
            console.warn('Failed to parse front matter:', error);
        }

        return defaultMetadata;
    }

    getTitleFromFilename(path) {
        const filename = path.split('/').pop();
        return filename
            .replace(/\.[^/.]+$/, '') // Remove extension
            .replace(/-/g, ' ') // Replace hyphens with spaces
            .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words
    }

    getContentType(path) {
        // Determine if it's a Marp presentation or regular post
        return path.toLowerCase().includes('marp') ? 'marp' : 'post';
    }

    async handleNewFile(content, metadata) {
        await PublisherAPI.createPost(metadata.type, content, metadata);
    }

    async handleModifiedFile(content, metadata) {
        const slug = metadata.slug || this.generateSlug(metadata.title);
        await PublisherAPI.updatePost(slug, content, metadata);
    }

    async handleDeletedFile(file) {
        // Extract slug from filename
        const filename = file.path.split('/').pop();
        const slug = filename.replace(/\.[^/.]+$/, '');
        await PublisherAPI.deletePost(slug);
    }

    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
}

// Export both classes
export { FileWatcher, FileProcessor };