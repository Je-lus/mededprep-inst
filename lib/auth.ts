/**
 * JWT Authentication with Multi-Tenant Scoping
 */

import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from './prisma.js';

interface AdminTokenPayload {
  userId: string;
  orgId: string;
  email: string;
  role: string;
  type: 'admin';
}

interface StudentTokenPayload {
  studentId: string;
  orgId: string;
  email: string;
  type: 'student';
}

type TokenPayload = AdminTokenPayload | StudentTokenPayload;

interface TokenUser {
  id: string;
  orgId: string;
  email: string;
  role: string;
}

interface TokenStudent {
  id: string;
  orgId: string;
  email: string;
}

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRY = '4h';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 4 * 60 * 60 * 1000,
};

export function setAuthCookie(res: Response, name: string, token: string): void {
  res.cookie(name, token, COOKIE_OPTIONS);
}

export function clearAuthCookie(res: Response, name: string): void {
  res.clearCookie(name, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  });
}

/**
 * Generate a JWT token for an admin user
 */
export function generateToken(user: TokenUser): string {
  return jwt.sign(
    { userId: user.id, orgId: user.orgId, email: user.email, role: user.role, type: 'admin' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY },
  );
}

/**
 * Generate a JWT token for a student
 */
export function generateStudentToken(student: TokenStudent): string {
  return jwt.sign(
    { studentId: student.id, orgId: student.orgId, email: student.email, type: 'student' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY },
  );
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Middleware: require authenticated admin user scoped to current org
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const cookieToken = req.cookies?.['admin-token'] as string | undefined;
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const token = cookieToken || headerToken;

  if (!token) {
    res
      .status(401)
      .json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'admin') {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
    return;
  }

  // Verify token orgId matches current tenant
  if (decoded.orgId !== req.orgId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token does not match organization' },
    });
    return;
  }

  const user = await prisma.orgUser.findUnique({ where: { id: decoded.userId } });
  if (!user || !user.isActive) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'User not found or deactivated' },
    });
    return;
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
export async function requireStudentAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const cookieToken = req.cookies?.['student-token'] as string | undefined;
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const token = cookieToken || headerToken;

  if (!token) {
    res
      .status(401)
      .json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'student') {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
    return;
  }

  if (decoded.orgId !== req.orgId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token does not match organization' },
    });
    return;
  }

  const student = await prisma.student.findUnique({ where: { id: decoded.studentId } });
  if (!student || !student.isActive) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Student not found or deactivated' },
    });
    return;
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
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
      return;
    }
    next();
  };
}
