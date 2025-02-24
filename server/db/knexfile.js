export default {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: './db/blog.sqlite3'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './db/migrations'
    }
  },
  production: {
    client: 'better-sqlite3',
    connection: {
      filename: './db/blog.sqlite3'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './db/migrations'
    }
  }
};