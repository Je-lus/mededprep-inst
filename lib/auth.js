/**
 * JWT Authentication with Multi-Tenant Scoping
 */

import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '4h';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 4 * 60 * 60 * 1000,
};

export function setAuthCookie(res, name, token) {
  res.cookie(name, token, COOKIE_OPTIONS);
}

export function clearAuthCookie(res, name) {
  res.clearCookie(name, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

/**
 * Generate a JWT token for an admin user
 */
export function generateToken(user) {
  return jwt.sign(
    { userId: user.id, orgId: user.orgId, email: user.email, role: user.role, type: 'admin' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY },
  );
}

/**
 * Generate a JWT token for a student
 */
export function generateStudentToken(student) {
  return jwt.sign(
    { studentId: student.id, orgId: student.orgId, email: student.email, type: 'student' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY },
  );
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Middleware: require authenticated admin user scoped to current org
 */
export async function requireAuth(req, res, next) {
  const cookieToken = req.cookies?.['admin-token'];
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const token = cookieToken || headerToken;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'admin') {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
  }

  // Verify token orgId matches current tenant
  if (decoded.orgId !== req.orgId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token does not match organization' },
    });
  }

  const user = await prisma.orgUser.findUnique({ where: { id: decoded.userId } });
  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'User not found or deactivated' },
    });
  }

  req.user = {
    id: user.id,
    orgId: user.orgId,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  next();
}

/**
 * Middleware: require authenticated student scoped to current org
 */
export async function requireStudentAuth(req, res, next) {
  const cookieToken = req.cookies?.['student-token'];
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const token = cookieToken || headerToken;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'student') {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
  }

  if (decoded.orgId !== req.orgId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token does not match organization' },
    });
  }

  const student = await prisma.student.findUnique({ where: { id: decoded.studentId } });
  if (!student || !student.isActive) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Student not found or deactivated' },
    });
  }

  req.student = {
    id: student.id,
    orgId: student.orgId,
    email: student.email,
    firstName: student.firstName,
    lastName: student.lastName,
  };
  next();
}

/**
 * Middleware: require admin role (owner or admin)
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
        });
    }
    next();
  };
}
