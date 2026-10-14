const { PrismaClient } = require('@prisma/client');
const path = require('path');
const backupPath = path.resolve('backend/prisma/backups/dev_backup_20261010_pre_investigation.db');
const prismaBackup = new PrismaClient({
  datasources: { db: { url: 'file:' + backupPath } }
});
async function verify() {
  const result = await prismaBackup.$queryRawUnsafe('PRAGMA integrity_check;');
  console.log('Backup PRAGMA integrity_check result:', result);
  await prismaBackup.$disconnect();
}
verify().catch(e => { console.error(e); process.exit(1); });
