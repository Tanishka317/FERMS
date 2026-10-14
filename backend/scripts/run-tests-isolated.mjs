// backend/scripts/run-tests-isolated.mjs
// Runs backend test suite against an isolated temporary SQLite database

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const devDbPath = path.resolve('prisma/dev.db');
const testDbPath = path.resolve('prisma/test.db');

async function run() {
  console.log('🧪 Preparing isolated test database (prisma/test.db)...');

  // Copy dev.db to test.db for test isolation
  if (!fs.existsSync(devDbPath)) {
    throw new Error(`Source database ${devDbPath} does not exist!`);
  }
  fs.copyFileSync(devDbPath, testDbPath);

  const env = {
    ...process.env,
    DATABASE_URL: 'file:./test.db',
    NODE_ENV: 'test',
  };

  console.log('🚀 Running tests against isolated test database...');
  const child = spawn('node', ['--test', 'tests/**/*.test.js'], {
    env,
    stdio: 'inherit',
    shell: true,
  });

  child.on('close', (code) => {
    // Clean up temporary test database
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch {
      // Ignore cleanup error if file locked
    }

    console.log(`\n🏁 Isolated test run complete (exit code: ${code}). dev.db preserved.`);
    process.exit(code || 0);
  });
}

run().catch((err) => {
  console.error('Failed to run isolated tests:', err);
  process.exit(1);
});
