const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { initDatabase, sequelize } = require('../models');

async function runSetup() {
  console.log('====================================================');
  console.log('       ScriptureLive AI - Database Setup            ');
  console.log('====================================================');

  try {
    // 1. Ensure upload and data directories exist
    const uploadsDir = path.resolve(__dirname, '../../uploads/logos');
    const dataDir = path.resolve(__dirname, '../../data');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`✓ Created uploads directory: ${uploadsDir}`);
    }

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`✓ Created data directory: ${dataDir}`);
    }

    // 2. Initialize database connection (PG with SQLite fallback)
    console.log('• Connecting to database...');
    await initDatabase();

    // 3. Create or update tables
    console.log('• Creating tables if they do not exist...');
    await sequelize.sync({ alter: true });

    console.log('✓ Database setup completed successfully!');
    console.log('====================================================');
    process.exit(0);
  } catch (error) {
    console.error('! Database setup failed:', error.message);
    console.error(error);
    console.log('====================================================');
    process.exit(1);
  }
}

if (require.main === module) {
  runSetup();
}

module.exports = { runSetup };
