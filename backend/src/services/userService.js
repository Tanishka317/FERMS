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

export async function createUser(data) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (existing) {
    const error = new Error(`A user with email ${data.email} already exists.`);
    error.statusCode = 409;
    throw error;
  }

  let id = data.id;
  if (!id) {
    const allUsers = await prisma.user.findMany({ select: { id: true } });
    let maxNum = 0;
    for (const u of allUsers) {
      const match = u.id.match(/^USR-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    id = `USR-${String(maxNum + 1).padStart(3, '0')}`;
  }

  const defaultPassword = data.password || 'ferms123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const newUser = await prisma.user.create({
    data: {
      id,
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      phone: data.phone || null,
      status: data.status || 'Active',
      station: data.station || null,
      assignedUnit: data.assignedUnit || null,
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
