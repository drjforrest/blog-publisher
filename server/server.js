import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import frontMatter from 'front-matter';
import fetch from 'node-fetch';

// Track active file watchers
const activeWatchers = new Map();

// ES Module fixes
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure environment variables
dotenv.config();

const app = express();
// Configure multer for different upload types
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.params.type || 'posts';
        const uploadPath = path.join(CONTENT_DIR, type === 'images' ? 'images' : 'uploads');
        fs.mkdir(uploadPath, { recursive: true })
            .then(() => cb(null, uploadPath))
            .catch(err => cb(err));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Storage configuration
const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '../content');
const IMAGES_DIR = path.join(CONTENT_DIR, 'images');
const PRESENTATIONS_DIR = path.join(CONTENT_DIR, 'presentations');
const POSTS_DIR = path.join(CONTENT_DIR, 'posts');

// Ensure directories exist
async function ensureDirectories() {
    const dirs = [CONTENT_DIR, PRESENTATIONS_DIR, POSTS_DIR, IMAGES_DIR];
    for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
    }
}

ensureDirectories();

// Routes
app.post('/api/publish', async (req, res) => {
    try {
        const { type, content, metadata } = req.body;
        
        // Generate slug if not provided
        const slug = metadata.slug || metadata.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        // Prepare post data
        const postData = {
            slug,
            title: metadata.title,
            content,
            type: type === 'presentation' ? 'marp' : 'post',
            featured_image: metadata.featuredImage,
            metadata: JSON.stringify({
                description: metadata.description,
                category: metadata.category,
                deployHook: metadata.deployHook
            }),
            tags: metadata.tags ? metadata.tags.split(',').map(t => t.trim()) : []
        };
        
        // Save to database
        const postId = await createPost(postData);
        
        // Add front matter
        const frontMatterContent = `---
title: ${metadata.title}
date: ${date}
description: ${metadata.description || ''}
category: ${metadata.category || ''}
tags: [${metadata.tags || ''}]
featuredImage: ${metadata.featuredImage || ''}
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

// Image upload endpoint
app.post('/api/upload/image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('No image file uploaded');
        }

        // Generate public URL for the image
        const imageUrl = `/images/${req.file.filename}`;

        res.json({
            success: true,
            imageUrl,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Original file upload endpoint
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

// Get all posts with optional filtering
app.get('/api/posts', async (req, res) => {
    try {
        const { type, tag, limit, offset } = req.query;
        const posts = await listPosts({ type, tag, limit: parseInt(limit), offset: parseInt(offset) });
        res.json(posts);
    } catch (error) {
        console.error('List posts error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get a single post by slug
app.get('/api/posts/:slug', async (req, res) => {
    try {
        const post = await getPost(req.params.slug);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json(post);
    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update a post
app.put('/api/posts/:slug', async (req, res) => {
    try {
        const { content, metadata } = req.body;
        const postData = {
            title: metadata.title,
            content,
            featured_image: metadata.featuredImage,
            metadata: JSON.stringify({
                description: metadata.description,
                category: metadata.category,
                deployHook: metadata.deployHook
            }),
            tags: metadata.tags ? metadata.tags.split(',').map(t => t.trim()) : []
        };
        
        const postId = await updatePost(req.params.slug, postData);
        
        // Update file system
        const post = await getPost(req.params.slug);
        if (post.file_path) {
            const frontMatterContent = `---
title: ${metadata.title}
date: ${new Date(post.published_at).toISOString()}
description: ${metadata.description || ''}
category: ${metadata.category || ''}
tags: [${metadata.tags || ''}]
type: ${post.type}
featuredImage: ${metadata.featuredImage || ''}
---

${content}`;
            
            await fs.writeFile(post.file_path, frontMatterContent, 'utf8');
        }
        
        res.json({ success: true, postId });
    } catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete a post
app.delete('/api/posts/:slug', async (req, res) => {
    try {
        const post = await getPost(req.params.slug);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        // Delete from database
        await deletePost(req.params.slug);
        
        // Delete file if it exists
        if (post.file_path) {
            await fs.unlink(post.file_path);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Legacy endpoint for backward compatibility
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

// Get images for a post
app.get('/api/posts/:slug/images', async (req, res) => {
    try {
        const post = await getPost(req.params.slug);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        const images = await getPostImages(post.id);
        res.json(images);
    } catch (error) {
        console.error('Get images error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add an image to a post
app.post('/api/posts/:slug/images', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('No image file uploaded');
        }

        const post = await getPost(req.params.slug);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const imageData = {
            post_id: post.id,
            filename: req.file.filename,
            path: `/images/${req.file.filename}`,
            type: req.body.type || 'content'
        };

        const [image] = await addImage(imageData);
        res.json(image);
    } catch (error) {
        console.error('Add image error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete an image
app.delete('/api/images/:id', async (req, res) => {
    try {
        const images = await getPostImages(null);
        const image = images.find(img => img.id === parseInt(req.params.id));
        
        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }
        
        // Delete from database
        await deleteImage(image.id);
        
        // Delete file
        const filePath = path.join(IMAGES_DIR, image.filename);
        await fs.unlink(filePath);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete image error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Legacy endpoint for backward compatibility
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

// File watching endpoints
app.post('/api/files/list', async (req, res) => {
    try {
        const { path: dirPath } = req.body;
        const files = await fs.readdir(dirPath);
        
        const fileData = await Promise.all(
            files.map(async (file) => {
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);
                return {
                    path: filePath,
                    name: file,
                    mtime: stats.mtime,
                    size: stats.size,
                    isDirectory: stats.isDirectory()
                };
            })
        );
        
        res.json(fileData);
    } catch (error) {
        console.error('File list error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/files/read', async (req, res) => {
    try {
        const { path: filePath } = req.body;
        const content = await fs.readFile(filePath, 'utf8');
        res.send(content);
    } catch (error) {
        console.error('File read error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/files/watch/start', async (req, res) => {
    try {
        const { path: watchPath, interval } = req.body;
        
        // Validate the path exists
        await fs.access(watchPath);
        
        // Store watch configuration
        activeWatchers.set(watchPath, {
            path: watchPath,
            interval: interval || 5000,
            lastCheck: new Date()
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Watch start error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/files/watch/stop', async (req, res) => {
    try {
        const { path: watchPath } = req.body;
        
        // Remove watch configuration
        activeWatchers.delete(watchPath);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Watch stop error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/files/watch/status', async (req, res) => {
    try {
        const watchers = Array.from(activeWatchers.entries()).map(([path, config]) => ({
            path,
            interval: config.interval,
            lastCheck: config.lastCheck
        }));
        
        res.json(watchers);
    } catch (error) {
        console.error('Watch status error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Image processing endpoints
app.post('/api/images/optimize', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('No image file uploaded');
        }

        const { maxWidth, quality } = req.body;
        const sharp = (await import('sharp')).default;
        
        const image = sharp(req.file.path);
        const metadata = await image.metadata();
        
        // Resize if needed
        if (maxWidth && metadata.width > maxWidth) {
            image.resize(parseInt(maxWidth), null, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }
        
        // Optimize
        if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
            image.jpeg({ quality: parseInt(quality) || 80 });
        } else if (metadata.format === 'png') {
            image.png({ quality: parseInt(quality) || 80 });
        }
        
        const outputPath = path.join(
            path.dirname(req.file.path),
            `optimized-${req.file.filename}`
        );
        
        await image.toFile(outputPath);
        
        // Clean up original
        await fs.unlink(req.file.path);
        
        res.json({
            success: true,
            path: outputPath.replace(/.*\/public/, ''),
            metadata: await sharp(outputPath).metadata()
        });
    } catch (error) {
        console.error('Image optimization error:', error);
        if (req.file) {
            // Clean up uploaded file on error
            try {
                await fs.unlink(req.file.path);
            } catch (e) {
                console.error('Failed to cleanup file:', e);
            }
        }
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});