class PostCreator {
    constructor() {
        this.frontMatterTemplate = `---
title: "{title}"
description: "{description}"
date: "{date}"
category: "{category}"
tags: [{tags}]
type: "{type}"
featuredImage: "{featuredImage}"
---

`;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Image upload handling
        const imageUpload = document.getElementById('featured-image');
        if (imageUpload) {
            imageUpload.addEventListener('change', async (e) => {
                try {
                    const file = e.target.files[0];
                    if (!file) return;

                    const preview = document.getElementById('image-preview');
                    const imageUrl = await this.handleImageUpload(file);
                    
                    if (preview) {
                        preview.src = imageUrl;
                        preview.style.display = 'block';
                    }

                    // Store the image URL in a hidden input
                    const imageUrlInput = document.getElementById('featured-image-url');
                    if (imageUrlInput) {
                        imageUrlInput.value = imageUrl;
                    }
                } catch (error) {
                    console.error('Image upload failed:', error);
                    alert('Failed to upload image. Please try again.');
                }
            });
        }
    }

    async handleImageUpload(file) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('type', 'featured');

        const response = await fetch('/api/upload/image', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Image upload failed');
        }

        const data = await response.json();
        return data.imageUrl;
    }

    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    generateFrontMatter(postData) {
        const date = new Date().toISOString();
        const tags = postData.tags
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag)
            .map(tag => `"${tag}"`)
            .join(', ');

        return this.frontMatterTemplate
            .replace('{title}', postData.title)
            .replace('{description}', postData.description)
            .replace('{date}', date)
            .replace('{category}', postData.category)
            .replace('{tags}', tags)
            .replace('{type}', postData.type || 'post')
            .replace('{featuredImage}', postData.featuredImage || '');
    }

    validatePostData(postData) {
        const requiredFields = ['title', 'content'];
        const missingFields = requiredFields.filter(field => !postData[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        return true;
    }

    async createPost(postData) {
        try {
            this.validatePostData(postData);

            // Generate slug if not provided
            if (!postData.slug) {
                postData.slug = this.generateSlug(postData.title);
            }

            // Create the content with front matter
            const content = this.createMarkdownFile(postData);

            // Submit to API
            const response = await PublisherAPI.createPost(
                postData.type || 'post',
                content,
                {
                    title: postData.title,
                    description: postData.description,
                    category: postData.category,
                    tags: postData.tags,
                    slug: postData.slug,
                    featuredImage: postData.featuredImage,
                    deployHook: postData.deployHook
                }
            );

            return response;
        } catch (error) {
            console.error('Failed to create post:', error);
            throw error;
        }
    }

    createMarkdownFile(postData) {
        const frontMatter = this.generateFrontMatter(postData);
        return `${frontMatter}\n${postData.content}`;
    }
}

// Export for use in the main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PostCreator;
}