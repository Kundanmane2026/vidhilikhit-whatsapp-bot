/**
 * Database Configuration — Flexible PostgreSQL / SQLite support
 * 
 * Priority:
 * 1. If USE_SQLITE=true → SQLite (good for local dev, small deployments)
 * 2. If DATABASE_URL exists → PostgreSQL (recommended for Render production)
 * 3. Fallback → SQLite in ./data/vidhilikhit.db
 */

const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

let sequelize;

function createConnection() {
  const useSqlite = process.env.USE_SQLITE === 'true';
  const hasPostgres = !!process.env.DATABASE_URL;

  if (useSqlite || !hasPostgres) {
    // --- SQLite Mode ---
    const sqlitePath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'vidhilikhit.db');
    const dir = path.dirname(sqlitePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    console.log(`📦 Using SQLite: ${sqlitePath}`);
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: sqlitePath,
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      define: {
        timestamps: true,
        underscored: true
      }
    });
  } else {
    // --- PostgreSQL Mode ---
    console.log('🐘 Using PostgreSQL');
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      },
      pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000
      },
      define: {
        timestamps: true,
        underscored: true
      }
    });
  }

  return sequelize;
}

async function testConnection() {
  try {
    if (!sequelize) createConnection();
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

function getSequelize() {
  if (!sequelize) createConnection();
  return sequelize;
}

module.exports = { getSequelize, testConnection, createConnection };
