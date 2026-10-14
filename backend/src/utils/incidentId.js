import { prisma } from '../config/database.js';

/**
 * Generate next sequential incident ID matching standard format INC-2026-XXXX.
 */
export async function generateIncidentId() {
  const currentYear = new Date().getFullYear();
  // Find highest current incident ID
  const latest = await prisma.incident.findFirst({
    where: {
      id: {
        startsWith: `INC-${currentYear}-`,
      },
    },
    orderBy: {
      id: 'desc',
    },
    select: {
      id: true,
    },
  });

  let nextNum = 53;
  if (latest && latest.id) {
    const parts = latest.id.split('-');
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  // Ensure collision safety against race conditions or gap IDs
  let candidate = `INC-${currentYear}-${String(nextNum).padStart(4, '0')}`;
  while (await prisma.incident.findUnique({ where: { id: candidate }, select: { id: true } })) {
    nextNum++;
    candidate = `INC-${currentYear}-${String(nextNum).padStart(4, '0')}`;
  }

  return candidate;
}
