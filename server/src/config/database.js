const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
require('dotenv').config();

let activeDialect = 'postgres';
let rebindCallback = null;

// Ensure data directory exists for SQLite fallback
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function createPostgresSequelize() {
  // Hosted Postgres (Neon, Render, Supabase, Railway) provides a single connection string.
  if (process.env.DATABASE_URL) {
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: process.env.DB_SSL === 'false' ? {} : { ssl: { require: true, rejectUnauthorized: false } },
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
    });
  }

  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_NAME || 'scripturelive';
  const username = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '';

  return new Sequelize(database, username, password, {
    host,
    port,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? false : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
}

function createSqliteSequelize() {
  const sqliteStoragePath = path.resolve(dataDir, 'church.db');
  return new Sequelize({
    dialect: 'sqlite',
    storage: sqliteStoragePath,
    logging: false
  });
}

// Initial instance defaults to PostgreSQL
let currentSequelize = createPostgresSequelize();

// Proxy sequelize so any module requiring sequelize gets dynamic dispatch
const sequelize = new Proxy({}, {
  get(target, prop) {
    if (prop === 'Sequelize') return Sequelize;
    if (prop === 'constructor') return Sequelize;
    const value = currentSequelize[prop];
    return typeof value === 'function' ? value.bind(currentSequelize) : value;
  },
  set(target, prop, value) {
    currentSequelize[prop] = value;
    return true;
  }
});

function registerRebind(callback) {
  rebindCallback = callback;
}

/**
 * Initializes database connection with graceful fallback to SQLite
 * and auto-syncs models on startup.
 */
async function initDatabase() {
  // If explicitly configured to use sqlite in env
  if (process.env.DB_DIALECT === 'sqlite') {
    console.info('[Database] Configured for SQLite database.');
    currentSequelize = createSqliteSequelize();
    activeDialect = 'sqlite';
    await currentSequelize.authenticate();
  } else {
    try {
      console.info(`[Database] Connecting to PostgreSQL at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}...`);
      // Short connection timeout for fast local fallback; hosted DBs may need time to wake up
      const timeoutMs = process.env.DATABASE_URL ? 15000 : 3000;
      const testTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`PostgreSQL connection timeout (${timeoutMs / 1000}s)`)), timeoutMs)
      );
      await Promise.race([currentSequelize.authenticate(), testTimeout]);
      activeDialect = 'postgres';
      console.log('✓ [Database] Connected to PostgreSQL successfully.');
    } catch (pgError) {
      console.warn(`! [Database] PostgreSQL unavailable (${pgError.message}).`);
      console.info('ℹ [Database] Falling back to SQLite for local development...');
      currentSequelize = createSqliteSequelize();
      await currentSequelize.authenticate();
      activeDialect = 'sqlite';
      console.log('✓ [Database] Connected to SQLite successfully (file: church.db).');
    }
  }

  // Rebind models to the active sequelize instance
  if (typeof rebindCallback === 'function') {
    rebindCallback(currentSequelize);
  }

  // Auto-sync models on startup
  try {
    await currentSequelize.sync({ alter: false });
    console.log('✓ [Database] All models synchronized successfully.');
  } catch (syncError) {
    console.error('! [Database] Error during model synchronization:', syncError.message);
    throw syncError;
  }

  return currentSequelize;
}

function getActiveDialect() {
  return activeDialect;
}

module.exports = {
  sequelize,
  initDatabase,
  getActiveDialect,
  registerRebind
};
