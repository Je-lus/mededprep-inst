# External Integrations

**Analysis Date:** 2026-02-23

## APIs & External Services

**Image Storage & CDN:**

- ImageKit.io - Bug report screenshot hosting
  - SDK/Client: `@imagekit/nodejs` 7.3.0
  - Integration: `lib/imagekit.ts`
  - Usage: Uploads bug report screenshots to CDN, provides public URLs for display
  - Auth env vars:
    - `IMAGEKIT_PRIVATE_KEY` - API authentication key
    - `IMAGEKIT_URL_ENDPOINT` - CDN endpoint identifier
    - `IMAGEKIT_BASE_URL` - Optional base URL override
  - Graceful degradation: If not configured, screenshot uploads are skipped with warning logs

## Data Storage

**Databases:**

- PostgreSQL 16
  - Connection: Via `DATABASE_URL` environment variable
  - Client: Prisma 5.22.0 ORM
  - Multi-tenant: All queries scoped via `WHERE orgId = req.orgId`
  - Database name default: `mededprep_inst`
  - User default: `mededprep` / password: `mededprep_dev`
  - Port: `5432`
  - Deployment: Docker Compose (`docker-compose.yml`) for development

**File Storage:**

- Local filesystem only for development
- ImageKit.io for production bug report screenshots
- Static frontend assets served via Express static middleware from `app/dist`

**Caching:**

- TanStack Query (client-side cache):
  - Caches API responses in browser
  - Automatic cache invalidation on mutations
  - Configuration in frontend request hooks

**Session Storage:**

- Cookies (secure, HttpOnly)
  - JWT tokens stored in httpOnly cookies
  - Secure flag enabled in production
  - Set via `lib/auth.ts` → `setAuthCookie()` and `setStudentAuthCookie()`

## Authentication & Identity

**Auth Provider:**

- Custom JWT-based authentication
  - Implementation: `lib/auth.ts`
  - Token signing: jsonwebtoken 9.0.3
  - Secret: `JWT_SECRET` env var (minimum 32 characters)
  - Cookie-based transport (HttpOnly, Secure in production)

**Admin Users (Instructors):**

- Email + password authentication
  - Password hashing: bcrypt 6.0.0
  - Routes: `routes/auth.ts`
  - Login endpoint: `POST /api/auth/login`
  - Token claims: `{ userId, orgId, email, role, type: 'admin' }`
  - Multi-tenant scoping: Via `orgId` in JWT payload

**Student Users:**

- Email + password authentication (optional before assessment)
  - Routes: `routes/student-auth.ts`
  - Verification token: Sent to student email (currently stubbed - TODO in codebase)
  - Password reset: Reset token mechanism exists but email delivery not implemented
  - Token claims: `{ studentId, orgId, email, type: 'student', emailVerified }`

## Monitoring & Observability

**Logging:**

- Pino 10.3.1 JSON structured logging
  - Development: Human-readable output
  - Production: JSON format (structured for log aggregation)
  - Level: Configurable via `LOG_LEVEL` env var (debug in dev, info in prod)
  - Request logging: pino-http middleware logs all HTTP requests with custom levels

**Error Tracking:**

- Not currently integrated
- Application logs errors to Pino logger via `lib/logger.ts`
- Bug reports captured via UI form and stored in database
  - Route: `routes/bug-reports.ts`
  - Data: Error message, stack trace, screenshot, URL, viewport, user agent
  - Storage: Database (`BugReport` model) + optional ImageKit screenshots

**Metrics:**

- Not detected - no metrics collection service integrated

## CI/CD & Deployment

**Hosting:**

- Not specified in codebase (deployed to inst.mededprep.app per project context)
- Likely: AWS Lightsail or similar (based on credential files in .notes/)
- Vite static build output: `app/dist/` bundled with Express backend

**CI Pipeline:**

- Not detected - no GitHub Actions, GitLab CI, or other CI config files

**Build Output:**

- Backend: TypeScript compiled to JavaScript via tsx/tsc
- Frontend: Vite build creates `app/dist/` with optimized bundles
- Production start: `npm start` or direct Node.js execution of `server.ts`

## Environment Configuration

**Required env vars (must be set):**

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (32+ characters)

**Strongly recommended:**

- `NODE_ENV` - Set to 'production' in production
- `APP_BASE_URL` - Frontend URL for share links (used in QR code generation)

**Optional but useful:**

- `IMAGEKIT_PRIVATE_KEY` - Enable screenshot uploads
- `IMAGEKIT_URL_ENDPOINT` - ImageKit CDN endpoint
- `IMAGEKIT_BASE_URL` - ImageKit custom domain
- `CORS_ORIGINS` - Additional allowed origins (comma-separated)
- `LOG_LEVEL` - Control logging verbosity
- `DEV_ORG_SLUG` - Development org for X-Org-Slug header testing

**Secrets location:**

- Environment variables via:
  - `.env` file (local development, not committed)
  - CI/CD secrets (GitHub, GitLab, etc. if used)
  - Container/systemd environment (production)
  - Reverse proxy env passing (Nginx, etc.)

**Never committed:**

- `.env*` files
- `.env.local`
- `*.pem` key files
- Password strings in code

## Webhooks & Callbacks

**Incoming Webhooks:**

- ImageKit webhooks: Not implemented
- External services: None detected

**Outgoing Webhooks:**

- None currently implemented
- Email verification: Placeholder in `routes/student-auth.ts` (TODO comment)
- Password reset email: Placeholder in `routes/student-auth.ts` (TODO comment)

## QR Code & Assessment Delivery

**QR Code Generation:**

- qrcode 1.5.4 package
- Purpose: Generate QR codes linking to public assessment URLs
- Route: `routes/sessions.ts` → QR generation on session creation
- Output: Data URL embedded in response or used for display
- Format: Links to `/api/public/assessment/:hash/` endpoints

**Public Assessment Links:**

- Hash-based access to prevent ID enumeration
- Routes: `routes/public.ts`
- No authentication required for public assessments
- Rate limiting: `submitLimiter` on submission endpoints

## Multi-Tenancy Architecture

**Tenant Resolution:**

- Subdomain-based routing (production)
- Header-based routing for development:
  - `X-Org-Slug` header
  - `DEV_ORG_SLUG` environment variable
- Resolver middleware: `middleware/tenantResolver.ts`
- Sets `req.orgId` on all API requests

**Data Isolation:**

- All Prisma queries MUST include `WHERE orgId = req.orgId`
- Database-level enforcement via unique constraints (`Organization` model)
- Foreign key relationships ensure cascading deletes

## Rate Limiting

**Strategies (express-rate-limit):**

- `authLimiter` - Strict on login endpoints (prevents brute force)
- `studentAuthLimiter` - For student authentication routes
- `submitLimiter` - Strict on assessment submission (prevents spam)
- `generalLimiter` - Applied to most API routes

**Configuration:** `middleware/rate-limiter.ts`

## Security Headers

**Helmet.js Configuration:**

- Content-Security-Policy: `default-src 'self'`, restricted scripts/styles
- X-Frame-Options: `DENY` (frame ancestors)
- X-Content-Type-Options: `nosniff`
- CORS: Allowed origins configured via `CORS_ORIGINS` env var
- Trust proxy: Express configured to trust first proxy for real client IP

## Data Export/Import

**CSV Processing:**

- csv-parse 6.1.0 package
- Purpose: Question bank imports from CSV
- Route: `routes/question-banks.ts`
- Not exposed as public API (admin only)

---

_Integration audit: 2026-02-23_
