class WatchManager {
    constructor(settings) {
        this.settings = settings;
        this.watchers = new Map();
        this.setupUI();
        this.loadActiveWatchers();
    }

    async setupUI() {
        const container = document.getElementById('watch-manager');
        if (!container) return;

        container.innerHTML = `
            <div class="watch-manager">
                <div class="watch-status">
                    <h3>Active Watchers</h3>
                    <div id="active-watchers" class="watcher-list"></div>
                </div>
                <div class="watch-controls">
                    <button id="add-watcher" class="btn">Add Watch Directory</button>
                    <button id="refresh-watchers" class="btn">Refresh Status</button>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    attachEventListeners() {
        const addButton = document.getElementById('add-watcher');
        const refreshButton = document.getElementById('refresh-watchers');

        if (addButton) {
            addButton.addEventListener('click', () => this.addWatcher());
        }

        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.refreshWatchers());
        }
    }

    async loadActiveWatchers() {
        try {
            const response = await fetch('/api/files/watch/status');
            if (!response.ok) throw new Error('Failed to fetch watcher status');
            
            const watchers = await response.json();
            this.updateWatcherList(watchers);
        } catch (error) {
            console.error('Failed to load watchers:', error);
        }
    }

    updateWatcherList(watchers) {
        const container = document.getElementById('active-watchers');
        if (!container) return;

        container.innerHTML = watchers.map(watcher => `
            <div class="watcher-item">
                <div class="watcher-info">
                    <span class="watcher-path">${watcher.path}</span>
                    <span class="watcher-interval">${watcher.interval / 1000}s</span>
                </div>
                <div class="watcher-actions">
                    <button class="btn btn-small" onclick="watchManager.stopWatcher('${watcher.path}')">Stop</button>
                </div>
            </div>
        `).join('') || '<p>No active watchers</p>';
    }

    async addWatcher() {
        try {
            const directory = await window.showDirectoryPicker();
            const path = directory.name;
            
            // Get interval from settings
            const interval = this.settings.getSettings().watchInterval;

            const response = await fetch('/api/files/watch/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path,
                    interval
                })
            });

            if (!response.ok) throw new Error('Failed to start watcher');

            await this.loadActiveWatchers();
        } catch (error) {
            console.error('Failed to add watcher:', error);
            alert('Failed to add watch directory: ' + error.message);
        }
    }

    async stopWatcher(path) {
        try {
            const response = await fetch('/api/files/watch/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ path })
            });

            if (!response.ok) throw new Error('Failed to stop watcher');

            await this.loadActiveWatchers();
        } catch (error) {
            console.error('Failed to stop watcher:', error);
            alert('Failed to stop watcher: ' + error.message);
        }
    }

    async refreshWatchers() {
        await this.loadActiveWatchers();
    }
}

export default WatchManager;