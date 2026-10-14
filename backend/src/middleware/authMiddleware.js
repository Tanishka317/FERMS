import { verifyToken } from '../utils/jwt.js';
import { prisma } from '../config/database.js';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required. No token provided.' },
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded || !decoded.userId) {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired authentication token.' },
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        station: true,
        assignedUnit: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User account not found.' },
      });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({
        success: false,
        error: { message: 'Account is deactivated. Please contact an administrator.' },
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return next(err);
  }
}

export async function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) {
    return next();
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        station: true,
        assignedUnit: true,
      },
    });

    if (user && user.status === 'Active') {
      req.user = user;
    }
  } catch {
    // Continue as unauthenticated request
  }

  next();
}
