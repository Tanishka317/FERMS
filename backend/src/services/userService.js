import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';

export async function getUsers(filters = {}) {
  const where = {};

  if (filters.role) where.role = filters.role;
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { id: { contains: q } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      phone: true,
      station: true,
      assignedUnit: true,
      lastActive: true,
      avatar: true,
      createdAt: true,
    },
  });

  return users;
}

export async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      phone: true,
      station: true,
      assignedUnit: true,
      lastActive: true,
      avatar: true,
      createdAt: true,
    },
  });

  if (!user) {
    const error = new Error(`User with ID ${id} not found.`);
    error.statusCode = 404;
    throw error;
  }

  return user;
}

const VALID_ROLES = ['Administrator', 'Dispatcher', 'Field Officer', 'Citizen', 'Analyst'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createUser(data) {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    const error = new Error('Full name must be at least 2 characters long.');
    error.statusCode = 400;
    throw error;
  }

  if (!data.email || typeof data.email !== 'string') {
    const error = new Error('A valid email address is required.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = data.email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    const error = new Error('Invalid email format. Please provide a valid email address.');
    error.statusCode = 400;
    throw error;
  }

  if (!data.role || !VALID_ROLES.includes(data.role)) {
    const error = new Error(`Invalid role. Role must be one of: ${VALID_ROLES.join(', ')}.`);
    error.statusCode = 400;
    throw error;
  }

  if (data.phone && typeof data.phone === 'string' && data.phone.trim()) {
    const cleanPhone = data.phone.trim();
    if (!/^[\d\s\-+()]{7,20}$/.test(cleanPhone)) {
      const error = new Error('Invalid phone number format.');
      error.statusCode = 400;
      throw error;
    }
  }

  if (data.password && (typeof data.password !== 'string' || data.password.length < 8)) {
    const error = new Error('Password must be at least 8 characters long.');
    error.statusCode = 400;
    throw error;
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    const error = new Error(`A user with email ${normalizedEmail} already exists.`);
    error.statusCode = 409;
    throw error;
  }

  let id = data.id;
  if (!id) {
    const allUsers = await prisma.user.findMany({ select: { id: true } });
    const existingIds = new Set(allUsers.map((u) => u.id));
    let maxNum = 0;
    for (const u of allUsers) {
      const match = u.id.match(/^USR-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    let candidateNum = maxNum + 1;
    while (existingIds.has(`USR-${String(candidateNum).padStart(3, '0')}`)) {
      candidateNum++;
    }
    id = `USR-${String(candidateNum).padStart(3, '0')}`;
  }

  const rawPassword = data.password && data.password.trim() ? data.password : 'ferms123';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  let attempts = 0;
  while (attempts < 5) {
    try {
      const newUser = await prisma.user.create({
        data: {
          id,
          name: data.name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: data.role,
          phone: data.phone ? data.phone.trim() : null,
          status: data.status || 'Active',
          station: data.station ? data.station.trim() : null,
          assignedUnit: data.assignedUnit ? data.assignedUnit.trim() : null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          phone: true,
          station: true,
          assignedUnit: true,
          lastActive: true,
          avatar: true,
          createdAt: true,
        },
      });

      return newUser;
    } catch (err) {
      if (err.code === 'P2002' && err.meta?.target?.includes('id') && attempts < 4) {
        attempts++;
        const nextUsers = await prisma.user.findMany({ select: { id: true } });
        let max = 0;
        for (const u of nextUsers) {
          const m = u.id.match(/^USR-(\d+)$/);
          if (m) {
            const n = parseInt(m[1], 10);
            if (n > max) max = n;
          }
        }
        id = `USR-${String(max + 1).padStart(3, '0')}`;
        continue;
      }
      throw err;
    }
  }
}

export async function updateUser(id, data) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error(`User with ID ${id} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const updatePayload = { ...data };
  if (updatePayload.email) updatePayload.email = updatePayload.email.toLowerCase();
  if (updatePayload.password) {
    updatePayload.passwordHash = await bcrypt.hash(updatePayload.password, 10);
    delete updatePayload.password;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updatePayload,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      phone: true,
      station: true,
      assignedUnit: true,
      lastActive: true,
      avatar: true,
      createdAt: true,
    },
  });

  return updated;
}

export async function deactivateUser(id) {
  return updateUser(id, { status: 'Inactive' });
}
