/**
 * Optional Auth Middleware
 *
 * Attempts to identify the user (admin or student) without requiring authentication.
 * Sets req.user or req.student if a valid token is present.
 * If no token or token is invalid, the request passes through without error.
 * This allows endpoints to detect identity but not require it.
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Try admin token first
  const adminToken = req.cookies?.['admin-token'] as string | undefined;
  if (adminToken) {
    const decoded = verifyToken(adminToken);
    if (decoded && decoded.type === 'admin' && decoded.orgId === req.orgId) {
      try {
        const user = await prisma.orgUser.findUnique({ where: { id: decoded.userId } });
        if (user && user.isActive) {
          req.user = {
            id: user.id,
            orgId: user.orgId,
            email: user.email,
            name: user.name,
            role: user.role,
          };
          next();
          return;
        }
      } catch {
        // Silently continue if user lookup fails
      }
    }
  }

  // Try student token if admin token didn't work
  const studentToken = req.cookies?.['student-token'] as string | undefined;
  if (studentToken) {
    const decoded = verifyToken(studentToken);
    if (decoded && decoded.type === 'student' && decoded.orgId === req.orgId) {
      try {
        const student = await prisma.student.findUnique({ where: { id: decoded.studentId } });
        if (student && student.isActive) {
          req.student = {
            id: student.id,
            orgId: student.orgId,
            email: student.email,
            firstName: student.firstName,
            lastName: student.lastName,
          };
          next();
          return;
        }
      } catch {
        // Silently continue if student lookup fails
      }
    }
  }

  // No valid authentication found, but that's okay - continue anyway
  next();
}
