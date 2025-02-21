// config.js
const CONFIG = {
    // Default to localhost for development
    API_BASE: localStorage.getItem('API_BASE') || 'http://localhost:3001/api',
    
    // Configuration functions
    setApiBase(url) {
        localStorage.setItem('API_BASE', url);
        this.API_BASE = url;
    },

    // Utility functions
    getApiUrl(endpoint) {
        return `${this.API_BASE}/${endpoint}`;
    }
};

// Prevent modification of the config object
Object.freeze(CONFIG);