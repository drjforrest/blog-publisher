// settings.js
class Settings {
    constructor() {
        this.loadSavedSettings();
    }

    loadSavedSettings() {
        // Load API URL
        const apiBase = document.getElementById('apiBase');
        if (apiBase) {
            apiBase.value = CONFIG.API_BASE;
        }

        // Load deploy hook
        const deployHook = document.getElementById('deployHook');
        if (deployHook) {
            deployHook.value = localStorage.getItem('vercelHook') || '';
        }
    }

    saveSettings() {
        const apiBase = document.getElementById('apiBase').value.trim();
        const deployHook = document.getElementById('deployHook').value.trim();

        if (apiBase) {
            CONFIG.setApiBase(apiBase);
        }

        if (deployHook) {
            localStorage.setItem('vercelHook', deployHook);
        }

        this.showSettingsSaved();
    }

    showSettingsSaved() {
        const status = document.getElementById('settingsStatus');
        status.textContent = 'Settings saved successfully!';
        status.style.display = 'block';
        
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }

    toggleSettingsPanel() {
        const panel = document.getElementById('settingsPanel');
        panel.classList.toggle('show');
    }
}

// Initialize settings
const settings = new Settings();