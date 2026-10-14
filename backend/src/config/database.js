import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export async function connectDB() {
  try {
    await prisma.$connect();
    console.log('📦 Connected to SQLite/PostgreSQL Database via Prisma');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
}
