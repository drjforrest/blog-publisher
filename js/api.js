// api.js
class PublisherAPI {
    // Posts
    static async createPost(type, content, metadata) {
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

    static async getPosts({ type, tag, limit, offset } = {}) {
        try {
            const params = new URLSearchParams();
            if (type) params.append('type', type);
            if (tag) params.append('tag', tag);
            if (limit) params.append('limit', limit);
            if (offset) params.append('offset', offset);

            const response = await fetch(`${CONFIG.getApiUrl('posts')}?${params}`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch posts');
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch posts error:', error);
            throw error;
        }
    }

    static async getPost(slug) {
        try {
            const response = await fetch(CONFIG.getApiUrl(`posts/${slug}`));
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch post');
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch post error:', error);
            throw error;
        }
    }

    static async updatePost(slug, content, metadata) {
        try {
            const response = await fetch(CONFIG.getApiUrl(`posts/${slug}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content, metadata })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update post');
            }
            return await response.json();
        } catch (error) {
            console.error('Update post error:', error);
            throw error;
        }
    }

    static async deletePost(slug) {
        try {
            const response = await fetch(CONFIG.getApiUrl(`posts/${slug}`), {
                method: 'DELETE'
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete post');
            }
            return await response.json();
        } catch (error) {
            console.error('Delete post error:', error);
            throw error;
        }
    }

    // Images
    static async uploadImage(slug, imageFile, type = 'content') {
        try {
            const formData = new FormData();
            formData.append('image', imageFile);
            formData.append('type', type);

            const response = await fetch(CONFIG.getApiUrl(`posts/${slug}/images`), {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to upload image');
            }
            return await response.json();
        } catch (error) {
            console.error('Image upload error:', error);
            throw error;
        }
    }

    static async getPostImages(slug) {
        try {
            const response = await fetch(CONFIG.getApiUrl(`posts/${slug}/images`));
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch images');
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch images error:', error);
            throw error;
        }
    }

    static async deleteImage(imageId) {
        try {
            const response = await fetch(CONFIG.getApiUrl(`images/${imageId}`), {
                method: 'DELETE'
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete image');
            }
            return await response.json();
        } catch (error) {
            console.error('Delete image error:', error);
            throw error;
        }
    }

    // File Upload (for importing content)
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

    // Legacy methods for backward compatibility
    static async getContent(type) {
        return this.getPosts({ type });
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