class FileLoader {
    constructor() {
        this.fileInput = null;
        this.setupFileInput();
    }

    setupFileInput() {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.md,.mdx';
        this.fileInput.style.display = 'none';
        document.body.appendChild(this.fileInput);
    }

    async loadFile() {
        return new Promise((resolve, reject) => {
            this.fileInput.click();
            
            this.fileInput.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) {
                    reject('No file selected');
                    return;
                }

                try {
                    const content = await this.readFile(file);
                    const parsed = this.parseMarkdown(content);
                    resolve(parsed);
                } catch (error) {
                    reject(error);
                }
            };
        });
    }

    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    parseMarkdown(content) {
        // Split frontmatter and content
        const parts = content.split('---');
        let frontMatter = {};
        let markdownContent = content;

        // If there's front matter, parse it
        if (parts.length >= 3) {
            const frontMatterString = parts[1];
            markdownContent = parts.slice(2).join('---').trim();
            
            // Parse front matter
            frontMatterString.split('\n').forEach(line => {
                if (line.includes(':')) {
                    const [key, ...values] = line.split(':');
                    let value = values.join(':').trim();
                    
                    // Handle arrays (like tags)
                    if (value.startsWith('[') && value.endsWith(']')) {
                        value = value.slice(1, -1).split(',')
                            .map(item => item.trim().replace(/"/g, ''))
                            .join(', ');
                    }
                    
                    frontMatter[key.trim()] = value;
                }
            });
        }

        return {
            title: frontMatter.title || '',
            description: frontMatter.description || '',
            category: frontMatter.category || 'tech',
            tags: frontMatter.tags || '',
            content: markdownContent,
            slug: frontMatter.slug || this.generateSlug(frontMatter.title || '')
        };
    }

    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    }
}

// Export for use in the main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileLoader;
}