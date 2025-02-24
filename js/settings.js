class Settings {
    constructor() {
        this.defaultSettings = {
            watchDirectories: [],
            watchInterval: 5000,
            autoPublish: false,
            defaultCategory: '',
            defaultTags: [],
            imageOptimization: {
                enabled: true,
                maxWidth: 1200,
                quality: 80
            }
        };
        this.settings = this.loadSettings();
        this.setupUI();
    }

    loadSettings() {
        try {
            const stored = localStorage.getItem('blogPublisherSettings');
            return stored ? { ...this.defaultSettings, ...JSON.parse(stored) } : this.defaultSettings;
        } catch (error) {
            console.error('Failed to load settings:', error);
            return this.defaultSettings;
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('blogPublisherSettings', JSON.stringify(this.settings));
            this.updateUI();
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    setupUI() {
        const container = document.getElementById('settings-container');
        if (!container) return;

        container.innerHTML = `
            <div class="settings-section">
                <h3>Watch Directories</h3>
                <div id="watch-directories">
                    ${this.settings.watchDirectories.map(dir => this.createWatchDirElement(dir)).join('')}
                </div>
                <button id="add-watch-dir" class="btn">Add Watch Directory</button>
            </div>

            <div class="settings-section">
                <h3>Publishing Settings</h3>
                <label>
                    <input type="checkbox" id="auto-publish" ${this.settings.autoPublish ? 'checked' : ''}>
                    Auto-publish when files change
                </label>
                <div class="setting-group">
                    <label>Watch Interval (seconds)</label>
                    <input type="number" id="watch-interval" value="${this.settings.watchInterval / 1000}" min="1">
                </div>
                <div class="setting-group">
                    <label>Default Category</label>
                    <input type="text" id="default-category" value="${this.settings.defaultCategory}">
                </div>
                <div class="setting-group">
                    <label>Default Tags (comma-separated)</label>
                    <input type="text" id="default-tags" value="${this.settings.defaultTags.join(', ')}">
                </div>
            </div>

            <div class="settings-section">
                <h3>Image Settings</h3>
                <label>
                    <input type="checkbox" id="image-optimization" ${this.settings.imageOptimization.enabled ? 'checked' : ''}>
                    Enable image optimization
                </label>
                <div class="setting-group">
                    <label>Max Image Width (pixels)</label>
                    <input type="number" id="max-image-width" value="${this.settings.imageOptimization.maxWidth}" min="100">
                </div>
                <div class="setting-group">
                    <label>Image Quality (1-100)</label>
                    <input type="number" id="image-quality" value="${this.settings.imageOptimization.quality}" min="1" max="100">
                </div>
            </div>

            <div class="settings-actions">
                <button id="save-settings" class="btn btn-primary">Save Settings</button>
            </div>
        `;

        this.attachEventListeners();
    }

    createWatchDirElement(dir) {
        return `
            <div class="watch-dir-entry">
                <input type="text" value="${dir}" readonly>
                <button class="btn btn-small btn-delete">Remove</button>
            </div>
        `;
    }

    attachEventListeners() {
        const container = document.getElementById('settings-container');
        if (!container) return;

        // Add watch directory
        document.getElementById('add-watch-dir').addEventListener('click', () => {
            this.addWatchDirectory();
        });

        // Save settings
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveCurrentSettings();
        });

        // Watch directory removal
        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const entry = e.target.closest('.watch-dir-entry');
                const dir = entry.querySelector('input').value;
                this.removeWatchDirectory(dir);
            });
        });

        // Other settings changes
        ['auto-publish', 'watch-interval', 'default-category', 'default-tags',
         'image-optimization', 'max-image-width', 'image-quality'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updateSettingFromUI(id));
            }
        });
    }

    async addWatchDirectory() {
        try {
            const result = await window.showDirectoryPicker();
            const dir = result.name;
            if (!this.settings.watchDirectories.includes(dir)) {
                this.settings.watchDirectories.push(dir);
                this.saveSettings();
                const watchDirs = document.getElementById('watch-directories');
                if (watchDirs) {
                    watchDirs.insertAdjacentHTML('beforeend', this.createWatchDirElement(dir));
                }
            }
        } catch (error) {
            console.error('Failed to add watch directory:', error);
        }
    }

    removeWatchDirectory(dir) {
        this.settings.watchDirectories = this.settings.watchDirectories.filter(d => d !== dir);
        this.saveSettings();
        this.updateUI();
    }

    updateSettingFromUI(id) {
        const element = document.getElementById(id);
        if (!element) return;

        switch (id) {
            case 'auto-publish':
                this.settings.autoPublish = element.checked;
                break;
            case 'watch-interval':
                this.settings.watchInterval = element.value * 1000;
                break;
            case 'default-category':
                this.settings.defaultCategory = element.value;
                break;
            case 'default-tags':
                this.settings.defaultTags = element.value.split(',').map(t => t.trim()).filter(t => t);
                break;
            case 'image-optimization':
                this.settings.imageOptimization.enabled = element.checked;
                break;
            case 'max-image-width':
                this.settings.imageOptimization.maxWidth = parseInt(element.value);
                break;
            case 'image-quality':
                this.settings.imageOptimization.quality = parseInt(element.value);
                break;
        }

        this.saveSettings();
    }

    updateUI() {
        this.setupUI();
    }

    async saveCurrentSettings() {
        // Collect all current values from UI
        const settings = {
            watchDirectories: this.settings.watchDirectories,
            watchInterval: parseInt(document.getElementById('watch-interval').value) * 1000,
            autoPublish: document.getElementById('auto-publish').checked,
            defaultCategory: document.getElementById('default-category').value,
            defaultTags: document.getElementById('default-tags').value.split(',').map(t => t.trim()).filter(t => t),
            imageOptimization: {
                enabled: document.getElementById('image-optimization').checked,
                maxWidth: parseInt(document.getElementById('max-image-width').value),
                quality: parseInt(document.getElementById('image-quality').value)
            }
        };

        this.settings = settings;
        this.saveSettings();
    }

    getSettings() {
        return this.settings;
    }
}

export default Settings;