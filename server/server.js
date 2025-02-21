import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import frontMatter from 'front-matter';
import fetch from 'node-fetch';

// ES Module fixes
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure environment variables
dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Storage configuration
const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '../content');
const PRESENTATIONS_DIR = path.join(CONTENT_DIR, 'presentations');
const POSTS_DIR = path.join(CONTENT_DIR, 'posts');

// Ensure directories exist
async function ensureDirectories() {
    const dirs = [CONTENT_DIR, PRESENTATIONS_DIR, POSTS_DIR];
    for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
    }
}

ensureDirectories();

// Routes
app.post('/api/publish', async (req, res) => {
    try {
        const { type, content, metadata } = req.body;
        
        // Generate filename based on title and date
        const date = new Date().toISOString().split('T')[0];
        const slug = metadata.slug || metadata.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const filename = `${date}-${slug}.md`;
        
        // Add front matter
        const frontMatterContent = `---
title: ${metadata.title}
date: ${date}
description: ${metadata.description || ''}
category: ${metadata.category || ''}
tags: [${metadata.tags || ''}]
type: ${type}
---

${content}`;

        // Save file
        const filepath = path.join(
            type === 'presentation' ? PRESENTATIONS_DIR : POSTS_DIR,
            filename
        );
        await fs.writeFile(filepath, frontMatterContent, 'utf8');

        // Trigger Vercel deployment if hook is provided
        if (metadata.deployHook) {
            const hookResponse = await fetch(metadata.deployHook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, filename })
            });

            if (!hookResponse.ok) {
                throw new Error('Deploy hook failed');
            }
        }

        res.json({ success: true, filepath });
    } catch (error) {
        console.error('Publish error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const content = await fs.readFile(file.path, 'utf8');
        
        // Parse front matter
        const { attributes, body } = frontMatter(content);
        
        // Clean up uploaded file
        await fs.unlink(file.path);
        
        res.json({
            content: body,
            metadata: attributes
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/content/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const dir = type === 'presentations' ? PRESENTATIONS_DIR : POSTS_DIR;
        const files = await fs.readdir(dir);
        
        const contents = await Promise.all(
            files.map(async (file) => {
                const content = await fs.readFile(path.join(dir, file), 'utf8');
                const { attributes, body } = frontMatter(content);
                return {
                    filename: file,
                    ...attributes,
                    excerpt: body.slice(0, 200) + '...'
                };
            })
        );
        
        res.json(contents);
    } catch (error) {
        console.error('List error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/content/:type/:filename', async (req, res) => {
    try {
        const { type, filename } = req.params;
        const dir = type === 'presentations' ? PRESENTATIONS_DIR : POSTS_DIR;
        await fs.unlink(path.join(dir, filename));
        res.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});