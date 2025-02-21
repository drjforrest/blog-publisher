class PostCreator {
    constructor() {
        this.frontMatterTemplate = `---
title: "{title}"
description: "{description}"
date: "{date}"
category: "{category}"
tags: [{tags}]
---

`;
    }

    generateFrontMatter(postData) {
        const date = new Date().toISOString().split('T')[0];
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
            .replace('{tags}', tags);
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