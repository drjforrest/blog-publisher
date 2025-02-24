class MarpPreview {
    constructor(editorElement, previewElement) {
        this.editor = editorElement;
        this.preview = previewElement;
        this.marp = new Marp({
            container: this.preview,
            options: {
                markdown: {
                    breaks: true,
                },
                html: true
            }
        });
        
        this.defaultTheme = `/* Default theme */
:root {
    --color-background: #ffffff;
    --color-foreground: #333333;
    --color-highlight: #2a9d8f;
    --color-dimmed: #264653;
}

section {
    background: var(--color-background);
    color: var(--color-foreground);
    font-family: system-ui, -apple-system, sans-serif;
    padding: 40px;
}

h1 {
    color: var(--color-highlight);
    font-size: 2.5em;
}

h2 {
    color: var(--color-dimmed);
    font-size: 2em;
}

code {
    background: #f5f5f5;
    padding: 0.2em 0.4em;
    border-radius: 3px;
}

pre {
    background: #f5f5f5;
    padding: 1em;
    overflow-x: auto;
}

img {
    max-width: 100%;
    height: auto;
}`;

        this.setupEditor();
        this.setupPreview();
        this.setupEventListeners();
    }

    setupEditor() {
        if (!this.editor) return;
        
        // Add CodeMirror for better editing experience
        this.codeMirror = CodeMirror.fromTextArea(this.editor, {
            mode: 'markdown',
            theme: 'default',
            lineNumbers: true,
            lineWrapping: true,
            autofocus: true,
            extraKeys: {
                'Cmd-S': () => this.save(),
                'Ctrl-S': () => this.save(),
                'Tab': 'indentMore',
                'Shift-Tab': 'indentLess'
            }
        });

        // Set default Marp frontmatter if empty
        if (!this.codeMirror.getValue()) {
            this.codeMirror.setValue(`---
marp: true
theme: default
paginate: true
---

# My Presentation

Your first slide here

---

## Second Slide

Content for the second slide`);
        }
    }

    setupPreview() {
        if (!this.preview) return;
        
        // Set up preview container
        this.preview.style.cssText = `
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            overflow-y: auto;
            height: 100%;
        `;

        // Create slide navigation controls
        const controls = document.createElement('div');
        controls.className = 'marp-controls';
        controls.innerHTML = `
            <button class="prev-slide">Previous</button>
            <span class="slide-counter">Slide 1 / 1</span>
            <button class="next-slide">Next</button>
            <select class="zoom-level">
                <option value="0.5">50%</option>
                <option value="0.75">75%</option>
                <option value="1" selected>100%</option>
                <option value="1.25">125%</option>
                <option value="1.5">150%</option>
            </select>
        `;
        this.preview.parentElement.insertBefore(controls, this.preview);

        // Add custom styles
        const style = document.createElement('style');
        style.textContent = this.defaultTheme;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Live preview
        let updateTimeout;
        this.codeMirror.on('change', () => {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => this.updatePreview(), 300);
        });

        // Slide navigation
        const prevButton = document.querySelector('.prev-slide');
        const nextButton = document.querySelector('.next-slide');
        const zoomSelect = document.querySelector('.zoom-level');

        if (prevButton) {
            prevButton.addEventListener('click', () => this.previousSlide());
        }
        if (nextButton) {
            nextButton.addEventListener('click', () => this.nextSlide());
        }
        if (zoomSelect) {
            zoomSelect.addEventListener('change', (e) => this.setZoom(e.target.value));
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'ArrowLeft') this.previousSlide();
            if (e.key === 'ArrowRight') this.nextSlide();
        });
    }

    updatePreview() {
        const content = this.codeMirror.getValue();
        try {
            const { html, css } = this.marp.render(content);
            this.preview.innerHTML = html;
            this.updateSlideCounter();
        } catch (error) {
            console.error('Marp rendering error:', error);
            this.preview.innerHTML = `<div class="error">Error rendering preview: ${error.message}</div>`;
        }
    }

    updateSlideCounter() {
        const counter = document.querySelector('.slide-counter');
        if (!counter) return;

        const currentSlide = this.getCurrentSlideIndex() + 1;
        const totalSlides = this.getTotalSlides();
        counter.textContent = `Slide ${currentSlide} / ${totalSlides}`;
    }

    getCurrentSlideIndex() {
        const slides = this.preview.querySelectorAll('section');
        for (let i = 0; i < slides.length; i++) {
            if (this.isElementInViewport(slides[i])) return i;
        }
        return 0;
    }

    getTotalSlides() {
        return this.preview.querySelectorAll('section').length;
    }

    previousSlide() {
        const currentIndex = this.getCurrentSlideIndex();
        const slides = this.preview.querySelectorAll('section');
        if (currentIndex > 0) {
            slides[currentIndex - 1].scrollIntoView({ behavior: 'smooth' });
        }
    }

    nextSlide() {
        const currentIndex = this.getCurrentSlideIndex();
        const slides = this.preview.querySelectorAll('section');
        if (currentIndex < slides.length - 1) {
            slides[currentIndex + 1].scrollIntoView({ behavior: 'smooth' });
        }
    }

    setZoom(value) {
        this.preview.style.transform = `scale(${value})`;
        this.preview.style.transformOrigin = 'top center';
    }

    isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        const previewRect = this.preview.getBoundingClientRect();
        return (
            rect.top >= previewRect.top &&
            rect.bottom <= previewRect.bottom
        );
    }

    async save() {
        try {
            const content = this.codeMirror.getValue();
            await PublisherAPI.createPost('marp', content, {
                type: 'presentation',
                title: this.extractTitle(content)
            });
            alert('Presentation saved successfully!');
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save presentation: ' + error.message);
        }
    }

    extractTitle(content) {
        const titleMatch = content.match(/# (.*?)($|\n)/);
        return titleMatch ? titleMatch[1] : 'Untitled Presentation';
    }
}

export default MarpPreview;