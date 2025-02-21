class Editor {
    constructor() {
        this.editor = null;
        this.preview = null;
        this.imageUploader = null;
        this.init();
    }

    init() {
        this.setupEditor();
        this.setupPreview();
        this.setupImageUploader();
        this.setupEventListeners();
    }

    setupEditor() {
        this.editor = document.getElementById('markdownContent');
        if (!this.editor) return;

        // Add editor toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'editor-toolbar';
        toolbar.innerHTML = `
            <button type="button" data-action="bold" title="Bold">B</button>
            <button type="button" data-action="italic" title="Italic">I</button>
            <button type="button" data-action="link" title="Link">🔗</button>
            <button type="button" data-action="image" title="Image">📷</button>
            <button type="button" data-action="code" title="Code">{'}</button>
            <button type="button" data-action="preview" title="Toggle Preview">👁️</button>
        `;
        this.editor.parentNode.insertBefore(toolbar, this.editor);
    }

    setupPreview() {
        // Create preview container
        const container = document.createElement('div');
        container.className = 'editor-container';
        this.editor.parentNode.replaceChild(container, this.editor);
        
        // Add editor and preview panels
        container.innerHTML = `
            <div class="editor-panel">
                ${this.editor.outerHTML}
            </div>
            <div class="preview-panel">
                <div class="preview-content"></div>
            </div>
        `;

        this.editor = container.querySelector('#markdownContent');
        this.preview = container.querySelector('.preview-content');

        // Update preview on input
        this.editor.addEventListener('input', () => this.updatePreview());
    }

    setupImageUploader() {
        // Create drop zone
        const dropZone = document.createElement('div');
        dropZone.className = 'image-drop-zone';
        dropZone.innerHTML = 'Drop images here or click to upload';
        this.editor.parentNode.appendChild(dropZone);

        // Handle drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.type.startsWith('image/'));
            
            for (const file of files) {
                await this.uploadImage(file);
            }
        });

        // Handle click to upload
        dropZone.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = async () => {
                for (const file of input.files) {
                    await this.uploadImage(file);
                }
            };
            input.click();
        });
    }

    async uploadImage(file) {
        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(CONFIG.getApiUrl('upload/image'), {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const { path } = await response.json();
            const imageMarkdown = `![${file.name}](${path})`;
            
            // Insert at cursor position
            const pos = this.editor.selectionStart;
            const content = this.editor.value;
            this.editor.value = content.slice(0, pos) + imageMarkdown + content.slice(pos);
            
            this.updatePreview();
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload image');
        }
    }

    setupEventListeners() {
        // Handle toolbar actions
        document.querySelector('.editor-toolbar').addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action) return;

            const actions = {
                bold: () => this.wrapText('**', '**'),
                italic: () => this.wrapText('_', '_'),
                link: () => {
                    const url = prompt('Enter URL:');
                    if (url) this.wrapText('[', `](${url})`);
                },
                image: () => {
                    const url = prompt('Enter image URL:');
                    if (url) this.insertText(`![](${url})`);
                },
                code: () => this.wrapText('`', '`'),
                preview: () => this.togglePreview()
            };

            if (actions[action]) actions[action]();
        });
    }

    wrapText(before, after) {
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        const text = this.editor.value;
        const selectedText = text.substring(start, end);
        
        this.editor.value = text.substring(0, start) + 
            before + selectedText + after + 
            text.substring(end);
        
        this.updatePreview();
    }

    insertText(text) {
        const pos = this.editor.selectionStart;
        const content = this.editor.value;
        this.editor.value = content.slice(0, pos) + text + content.slice(pos);
        this.updatePreview();
    }

    updatePreview() {
        if (!this.preview) return;
        this.preview.innerHTML = marked.parse(this.editor.value);
    }

    togglePreview() {
        document.querySelector('.editor-container').classList.toggle('preview-mode');
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Editor;
}