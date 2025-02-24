export function up(knex) {
  return knex.schema
    .createTable('posts', table => {
      table.increments('id').primary();
      table.string('slug').unique().notNullable();
      table.string('title').notNullable();
      table.text('content').notNullable();
      table.string('type').notNullable().defaultTo('post'); // 'post' or 'marp'
      table.string('featured_image');
      table.json('metadata');
      table.string('file_path').unique();
      table.timestamp('published_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('tags', table => {
      table.increments('id').primary();
      table.string('name').unique().notNullable();
    })
    .createTable('post_tags', table => {
      table.integer('post_id').references('id').inTable('posts').onDelete('CASCADE');
      table.integer('tag_id').references('id').inTable('tags').onDelete('CASCADE');
      table.primary(['post_id', 'tag_id']);
    })
    .createTable('images', table => {
      table.increments('id').primary();
      table.integer('post_id').references('id').inTable('posts').onDelete('CASCADE');
      table.string('filename').notNullable();
      table.string('path').notNullable();
      table.string('type').notNullable(); // 'featured', 'content', 'marp'
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('images')
    .dropTableIfExists('post_tags')
    .dropTableIfExists('tags')
    .dropTableIfExists('posts');
}