/**
 * Tenant Resolver Middleware
 *
 * Extracts organization from subdomain or dev header.
 * Sets req.orgId and req.org on every request.
 */

import { prisma } from '../lib/prisma.js';

const orgCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getOrgBySlug(slug) {
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

export function clearOrgCache(slug) {
  if (slug) {
    orgCache.delete(slug);
    return;
  }

  orgCache.clear();
}

export async function tenantResolver(req, res, next) {
  let slug = null;

  // Development: accept X-Org-Slug header or DEV_ORG_SLUG env
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  if (isDev) {
    slug = req.headers['x-org-slug'] || process.env.DEV_ORG_SLUG;
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
    return res.status(400).json({
      success: false,
      error: {
        code: 'TENANT_REQUIRED',
        message: 'Organization could not be determined from request',
      },
    });
  }

  const org = await getOrgBySlug(slug);

  if (!org || !org.isActive) {
    return res.status(404).json({
      success: false,
      error: { code: 'TENANT_NOT_FOUND', message: 'Organization not found' },
    });
  }

  req.orgId = org.id;
  req.org = org;
  req.log?.debug({ slug, orgId: org.id }, 'Tenant resolved');

  next();
}
