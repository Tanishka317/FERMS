import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { signToken } from '../utils/jwt.js';

export async function registerCitizen({ name, email, password }) {
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    const error = new Error('Full name must be at least 2 characters long.');
    error.statusCode = 400;
    throw error;
  }

  if (!email || typeof email !== 'string') {
    const error = new Error('A valid email address is required.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    const error = new Error('Invalid email format. Please provide a valid email address.');
    error.statusCode = 400;
    throw error;
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    const error = new Error('Password must be at least 8 characters long.');
    error.statusCode = 400;
    throw error;
  }

  // Check uniqueness of email
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    const error = new Error('An account with this email address already exists.');
    error.statusCode = 409;
    throw error;
  }

  // Calculate unique sequential User ID
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  let maxNum = 0;
  for (const u of allUsers) {
    const match = u.id.match(/^USR-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const id = `USR-${String(maxNum + 1).padStart(3, '0')}`;

  const passwordHash = await bcrypt.hash(password, 10);

  // Always force Citizen role for public self-registration
  const newUser = await prisma.user.create({
    data: {
      id,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'Citizen',
      status: 'Active',
      lastActive: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  const token = signToken({ userId: newUser.id, role: newUser.role });

  return { user: newUser, token };
}

export async function loginWithCredentials(email, password) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) {
    const error = new Error('Invalid credentials. Please check your email and password.');
    error.statusCode = 401;
    throw error;
  }

  if (user.status !== 'Active') {
    const error = new Error('Account is inactive. Please contact your administrator.');
    error.statusCode = 403;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid credentials. Please check your email and password.');
    error.statusCode = 401;
    throw error;
  }

  // Update last active timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastActive: new Date() },
  });

  const token = signToken({ userId: user.id, role: user.role });

  const { passwordHash, ...userResponse } = user;
  return { user: userResponse, token };
}

export async function loginWithDemoRole(role) {
  const user = await prisma.user.findFirst({
    where: {
      role,
      status: 'Active',
    },
  });

  if (!user) {
    const error = new Error(`No active demo user found for role: ${role}`);
    error.statusCode = 404;
    throw error;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastActive: new Date() },
  });

  const token = signToken({ userId: user.id, role: user.role });

  const { passwordHash, ...userResponse } = user;
  return { user: userResponse, token };
}

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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
      createdAt: true,
    },
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return user;
}
