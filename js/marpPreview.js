class MarpProcessor {
    constructor() {
        this.marpTemplate = `---
marp: true
theme: default
paginate: true
---

`;
    }

    // Convert standard markdown to MARP format
    convertToMarp(content) {
        if (!content.startsWith('---')) {
            content = this.marpTemplate + content;
        }
        
        // Convert horizontal rules to slide separators
        content = content.replace(/^\s*[-*_]{3,}\s*$/gm, '---');
        
        return content;
    }

    // Generate preview HTML
    generatePreviewHtml(content) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <link rel="stylesheet" href="https://unpkg.com/@marp-team/marpit/lib/basic.css">
                <style>
                    section {
                        background-color: white;
                        font-family: system-ui, -apple-system, sans-serif;
                        padding: 40px;
                        margin: 20px auto;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        max-width: 1000px;
                    }
                    h1 { color: #2a9d8f; }
                    h2 { color: #264653; }
                    code { background: #f5f5f5; padding: 0.2em 0.4em; border-radius: 3px; }
                    pre { background: #f5f5f5; padding: 1em; overflow-x: auto; }
                </style>
            </head>
            <body>
                ${this.processSlides(content)}
            </body>
            </html>
        `;
    }

    // Process content into slides
    processSlides(content) {
        const slides = content.split('---').filter(slide => slide.trim());
        return slides.map(slide => `<section>${marked.parse(slide)}</section>`).join('\\n');
    }
}

// Export for use in the main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarpProcessor;
}