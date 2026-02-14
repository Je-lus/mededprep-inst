/**
 * Tenant Resolver Middleware
 *
 * Extracts organization from subdomain or dev header.
 * Sets req.orgId and req.org on every request.
 */

import type { Request, Response, NextFunction } from 'express';
import type { Organization } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

interface CacheEntry {
  org: Organization;
  expiresAt: number;
}

const orgCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getOrgBySlug(slug: string): Promise<Organization | null> {
  const cached = orgCache.get(slug);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.org;
  }

  const org = await prisma.organization.findUnique({ where: { slug } });

  if (org) {
    orgCache.set(slug, {
      org,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  return org;
}

export function clearOrgCache(slug?: string): void {
  if (slug) {
    orgCache.delete(slug);
    return;
  }

  orgCache.clear();
}

export async function tenantResolver(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let slug: string | null = null;

  // Development: accept X-Org-Slug header or DEV_ORG_SLUG env
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  if (isDev) {
    slug = (req.headers['x-org-slug'] as string) || process.env.DEV_ORG_SLUG || null;
  }

  // Production: extract from subdomain
  if (!slug) {
    const hostname = req.hostname;
    // e.g., "demo.mededprep.app" -> "demo"
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      slug = parts[0];
    }
  }

  if (!slug) {
    res.status(400).json({
      success: false,
      error: {
        code: 'TENANT_REQUIRED',
        message: 'Organization could not be determined from request',
      },
    });
    return;
  }

  const org = await getOrgBySlug(slug);

  if (!org || !org.isActive) {
    res.status(404).json({
      success: false,
      error: { code: 'TENANT_NOT_FOUND', message: 'Organization not found' },
    });
    return;
  }

  req.orgId = org.id;
  req.org = org;
  req.log?.debug({ slug, orgId: org.id }, 'Tenant resolved');

  next();
}
