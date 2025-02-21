class Publisher {
    constructor() {
        this.currentTab = 'blog';
        this.setupEventListeners();
        this.loadSavedContent();
    }

    setupEventListeners() {
        // File upload handling
        document.getElementById('fileInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                showStatus('Uploading file...', 'info');
                const { content, metadata } = await PublisherAPI.uploadFile(file);
                this.setFormData({ ...metadata, content });
                showStatus('File loaded successfully!', 'success');
            } catch (error) {
                showStatus('Error loading file: ' + error.message, 'error');
            }
        });

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.type));
        });

        // Form submission
        document.getElementById('publishForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.publishContent();
        });

        // Draft saving
        document.getElementById('saveDraft').addEventListener('click', () => {
            this.saveDraft();
        });
    }

    async loadSavedContent() {
        try {
            const type = this.currentTab;
            const content = await PublisherAPI.getContent(type);
            this.updateContentList(content);
        } catch (error) {
            showStatus('Error loading saved content', 'error');
        }
    }

    updateContentList(content) {
        const listContainer = document.getElementById('contentList');
        listContainer.innerHTML = content.map(item => `
            <div class="content-item">
                <h3>${item.title}</h3>
                <p>${item.excerpt}</p>
                <div class="content-actions">
                    <button onclick="publisher.loadContent('${item.filename}')">Edit</button>
                    <button onclick="publisher.deleteContent('${item.filename}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async publishContent() {
        try {
            const formData = this.getFormData();
            if (!this.validateForm(formData)) {
                showStatus('Please fill in all required fields', 'error');
                return;
            }

            showStatus('Publishing content...', 'info');
            await PublisherAPI.publishContent(
                this.currentTab,
                formData.content,
                {
                    title: formData.title,
                    description: formData.description,
                    category: formData.category,
                    tags: formData.tags,
                    deployHook: localStorage.getItem('vercelHook')
                }
            );

            showStatus('Content published successfully!', 'success');
            this.clearForm();
            this.loadSavedContent();
        } catch (error) {
            showStatus('Error publishing content: ' + error.message, 'error');
        }
    }

    async loadContent(filename) {
        try {
            const content = await PublisherAPI.getContent(this.currentTab);
            const item = content.find(i => i.filename === filename);
            if (item) {
                this.setFormData(item);
                showStatus('Content loaded', 'success');
            }
        } catch (error) {
            showStatus('Error loading content', 'error');
        }
    }

    async deleteContent(filename) {
        if (!confirm('Are you sure you want to delete this content?')) return;

        try {
            await PublisherAPI.deleteContent(this.currentTab, filename);
            showStatus('Content deleted successfully', 'success');
            this.loadSavedContent();
        } catch (error) {
            showStatus('Error deleting content', 'error');
        }
    }

    switchTab(type) {
        this.currentTab = type;
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${type}Tab`);
        });
        this.loadSavedContent();
    }

    getFormData() {
        return {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            content: this.currentTab === 'presentation' 
                ? document.getElementById('slideContent').value
                : document.getElementById('markdownContent').value,
            category: document.getElementById('category').value,
            tags: document.getElementById('tags').value
        };
    }

    setFormData(data) {
        document.getElementById('title').value = data.title || '';
        document.getElementById('description').value = data.description || '';
        if (this.currentTab === 'presentation') {
            document.getElementById('slideContent').value = data.content || '';
        } else {
            document.getElementById('markdownContent').value = data.content || '';
        }
        document.getElementById('category').value = data.category || '';
        document.getElementById('tags').value = data.tags ? data.tags.join(', ') : '';
    }

    validateForm(data) {
        return data.title && data.content;
    }

    clearForm() {
        document.getElementById('publishForm').reset();
        if (this.currentTab === 'presentation') {
            document.getElementById('slideContent').value = '';
        } else {
            document.getElementById('markdownContent').value = '';
        }
    }

    saveDraft() {
        const formData = this.getFormData();
        const drafts = JSON.parse(localStorage.getItem('drafts') || '{}');
        
        if (!drafts[this.currentTab]) drafts[this.currentTab] = [];
        
        drafts[this.currentTab].unshift({
            ...formData,
            lastSaved: new Date().toISOString()
        });

        localStorage.setItem('drafts', JSON.stringify(drafts));
        showStatus('Draft saved successfully', 'success');
    }
}

// Status message helper
function showStatus(message, type) {
    const statusDiv = document.getElementById('publishStatus');
    statusDiv.textContent = message;
    statusDiv.className = `publish-status status-${type}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// Initialize publisher
const publisher = new Publisher();