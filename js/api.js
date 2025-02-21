// api.js
class PublisherAPI {
    static async publishContent(type, content, metadata) {
        try {
            const response = await fetch(CONFIG.getApiUrl('publish'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type, content, metadata })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to publish content');
            }
            return await response.json();
        } catch (error) {
            console.error('Publish error:', error);
            throw error;
        }
    }

    static async uploadFile(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(CONFIG.getApiUrl('upload'), {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to upload file');
            }
            return await response.json();
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }

    static async getContent(type) {
        try {
            const response = await fetch(CONFIG.getApiUrl(`content/${type}`));
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch content');
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    static async deleteContent(type, filename) {
        try {
            const response = await fetch(CONFIG.getApiUrl(`content/${type}/${filename}`), {
                method: 'DELETE'
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete content');
            }
            return await response.json();
        } catch (error) {
            console.error('Delete error:', error);
            throw error;
        }
    }
}