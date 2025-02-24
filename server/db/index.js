import knex from 'knex';
import config from './knexfile.js';

const environment = process.env.NODE_ENV || 'development';
const db = knex(config[environment]);

export async function createPost(postData) {
  const { tags = [], ...post } = postData;
  
  return db.transaction(async (trx) => {
    // Insert post
    const [postId] = await trx('posts').insert(post).returning('id');
    
    // Handle tags
    if (tags.length > 0) {
      // Insert tags that don't exist
      const existingTags = await trx('tags')
        .whereIn('name', tags)
        .select('id', 'name');
      
      const existingTagNames = existingTags.map(t => t.name);
      const newTags = tags.filter(t => !existingTagNames.includes(t));
      
      if (newTags.length > 0) {
        await trx('tags').insert(
          newTags.map(name => ({ name }))
        );
      }
      
      // Get all tag IDs
      const tagIds = await trx('tags')
        .whereIn('name', tags)
        .select('id');
      
      // Create post-tag relationships
      await trx('post_tags').insert(
        tagIds.map(({ id }) => ({
          post_id: postId,
          tag_id: id
        }))
      );
    }
    
    return postId;
  });
}

export async function getPost(slug) {
  const post = await db('posts')
    .where({ slug })
    .first();
    
  if (!post) return null;
  
  const tags = await db('tags')
    .join('post_tags', 'tags.id', 'post_tags.tag_id')
    .where('post_tags.post_id', post.id)
    .select('tags.name');
    
  return {
    ...post,
    tags: tags.map(t => t.name)
  };
}

export async function updatePost(slug, postData) {
  const { tags = [], ...post } = postData;
  
  return db.transaction(async (trx) => {
    // Update post
    const [postId] = await trx('posts')
      .where({ slug })
      .update({
        ...post,
        updated_at: db.fn.now()
      })
      .returning('id');
      
    // Handle tags
    await trx('post_tags')
      .where({ post_id: postId })
      .delete();
      
    if (tags.length > 0) {
      // Insert new tags
      const existingTags = await trx('tags')
        .whereIn('name', tags)
        .select('id', 'name');
        
      const existingTagNames = existingTags.map(t => t.name);
      const newTags = tags.filter(t => !existingTagNames.includes(t));
      
      if (newTags.length > 0) {
        await trx('tags').insert(
          newTags.map(name => ({ name }))
        );
      }
      
      // Get all tag IDs
      const tagIds = await trx('tags')
        .whereIn('name', tags)
        .select('id');
        
      // Create new post-tag relationships
      await trx('post_tags').insert(
        tagIds.map(({ id }) => ({
          post_id: postId,
          tag_id: id
        }))
      );
    }
    
    return postId;
  });
}

export async function deletePost(slug) {
  return db('posts').where({ slug }).delete();
}

export async function listPosts({ type, tag, limit, offset } = {}) {
  let query = db('posts')
    .select(
      'posts.*',
      db.raw('GROUP_CONCAT(tags.name) as tags')
    )
    .leftJoin('post_tags', 'posts.id', 'post_tags.post_id')
    .leftJoin('tags', 'post_tags.tag_id', 'tags.id')
    .groupBy('posts.id')
    .orderBy('posts.published_at', 'desc');
    
  if (type) {
    query = query.where('posts.type', type);
  }
  
  if (tag) {
    query = query.whereExists(function() {
      this.select('*')
        .from('post_tags as pt')
        .join('tags as t', 'pt.tag_id', 't.id')
        .whereRaw('pt.post_id = posts.id')
        .where('t.name', tag);
    });
  }
  
  if (limit) {
    query = query.limit(limit);
  }
  
  if (offset) {
    query = query.offset(offset);
  }
  
  const posts = await query;
  
  return posts.map(post => ({
    ...post,
    tags: post.tags ? post.tags.split(',') : []
  }));
}

export async function addImage(imageData) {
  return db('images').insert(imageData).returning('*');
}

export async function getPostImages(postId) {
  return db('images').where({ post_id: postId });
}

export async function deleteImage(id) {
  return db('images').where({ id }).delete();
}

export default db;