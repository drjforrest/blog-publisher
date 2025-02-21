class MarpStyler {
    constructor() {
        this.themeTemplates = {
            default: `/* Default theme */
---
marp: true
theme: default
paginate: true
footer: 'Your Footer Here'
---`,
            
            gaia: `/* Gaia theme */
---
marp: true
theme: gaia
paginate: true
class: lead
footer: 'Your Footer Here'
---`,
            
            custom: `/* Custom theme */
---
marp: true
theme: default
paginate: true
style: |
    section {
        background: #ffffff;
        color: #333333;
    }
    h1 {
        color: #2a9d8f;
        font-size: 2.5em;
    }
    h2 {
        color: #264653;
    }
    strong {
        color: #e76f51;
    }
    code {
        background: #f4f4f4;
        padding: 0.2em 0.4em;
    }
footer: 'Your Footer Here'
---`
        };
    }

    getThemeTemplate(theme) {
        return this.themeTemplates[theme] || this.themeTemplates.default;
    }

    applyLayout(content, layout) {
        switch(layout) {
            case 'split':
                return this.applySplitLayout(content);
            case 'grid':
                return this.applyGridLayout(content);
            case 'comparison':
                return this.applyComparisonLayout(content);
            default:
                return content;
        }
    }

    applySplitLayout(content) {
        return `
<div class="split">
<div class="left">

${content.split('||')[0] || ''}

</div>
<div class="right">

${content.split('||')[1] || ''}

</div>
</div>`;
    }

    applyGridLayout(content) {
        const items = content.split('||');
        let gridContent = '<div class="grid">\n';
        items.forEach(item => {
            gridContent += `<div class="grid-item">\n\n${item.trim()}\n\n</div>\n`;
        });
        gridContent += '</div>';
        return gridContent;
    }

    applyComparisonLayout(content) {
        const [left, right] = content.split('||').map(s => s.trim());
        return `
<div class="comparison">
<div class="compare-left">

### Before
${left}

</div>
<div class="compare-right">

### After
${right}

</div>
</div>`;
    }

    getCommonStyles() {
        return `
/* Common Layouts */
.split {
    display: flex;
    justify-content: space-between;
}
.split .left, .split .right {
    width: 48%;
}
.grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin: 20px 0;
}
.comparison {
    display: flex;
    gap: 40px;
}
.compare-left, .compare-right {
    flex: 1;
}
/* Utilities */
.center {
    text-align: center;
}
.large {
    font-size: 1.5em;
}
.highlight {
    background: yellow;
    padding: 0.2em;
}
`;
    }

    generateSlideTemplates() {
        return {
            title: `# Title Slide
## Subtitle
### Author Name

---`,
            
            bulletPoints: `# Section Title

- First point
- Second point
- Third point
  - Sub-point A
  - Sub-point B

---`,
            
            splitContent: `# Split Layout

<div class="split">
<div class="left">

## Left Side
- Content here

</div>
<div class="right">

## Right Side
- More content

</div>
</div>

---`,
            
            imageGallery: `# Image Gallery

![width:300px](image1.jpg) ![width:300px](image2.jpg)
![width:300px](image3.jpg) ![width:300px](image4.jpg)

---`,
            
            quote: `# Quote Slide

> "Your quote here"
> 
> — Author Name

---`,
            
            code: `# Code Example

\`\`\`python
def example():
    print("Hello World!")
\`\`\`

---`,
            
            table: `# Data Table

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

---`
        };
    }
}

// Export for use in the main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarpStyler;
}