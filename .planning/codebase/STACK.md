# Technology Stack

**Analysis Date:** 2026-02-23

## Languages

**Primary:**

- TypeScript 5.9.3 - All source code (backend and frontend)

**Secondary:**

- JavaScript (ESM) - Configuration files and build setup
- SQL - PostgreSQL database queries via Prisma

## Runtime

**Environment:**

- Node.js 20.x (specified in `.nvmrc`)

**Package Manager:**

- npm with lockfile present (`package-lock.json`)

## Frameworks

**Core:**

- Express 5.2.1 - REST API backend
- React 19.1.0 - Frontend UI framework
- Vite 7.2.4 - Frontend build tool and dev server

**Form & Survey:**

- SurveyJS Core 2.5.10 - Assessment/survey creation and rendering
- SurveyJS Creator 2.5.10 - Assessment editor interface
- SurveyJS React UI 2.5.10 - React integration for surveys

**UI Components:**

- shadcn/ui via Radix UI primitives (multiple packages):
  - @radix-ui/react-alert-dialog
  - @radix-ui/react-dialog
  - @radix-ui/react-dropdown-menu
  - @radix-ui/react-label
  - @radix-ui/react-select
  - @radix-ui/react-separator
  - @radix-ui/react-slot
  - @radix-ui/react-tabs

**State Management:**

- Zustand 5.0.9 - Frontend client state
- TanStack Query 5.80.7 - Server state and API caching

**Styling:**

- Tailwind CSS 3.4.17 - Utility-first CSS framework
- PostCSS 8.5.3 - CSS transformation

**Testing:**

- Vitest 4.0.18 - Unit/component test runner
- jsdom 28.1.0 - DOM simulation for frontend tests
- @testing-library/react 16.3.2 - React component testing utilities
- @testing-library/user-event 14.6.1 - User interaction simulation

**Utilities:**

- Lucide React 0.513.0 - Icon library
- Recharts 3.7.0 - Charting/visualization
- DOMPurify 3.3.1 - HTML sanitization
- html2canvas 1.4.1 - DOM to image conversion
- sonner 2.0.3 - Toast notifications
- React Router DOM 7.6.1 - Frontend routing
- Zod 3.24.2 - Schema validation (backend)

## Build & Development

**Backend:**

- tsx 4.21.0 - TypeScript execution and watch mode
- TSC 5.9.3 - TypeScript compilation (type checking)
- Prisma 5.22.0 - ORM and migrations

**Frontend:**

- @vitejs/plugin-react 5.1.1 - Vite React plugin
- TypeScript for type checking
- Tailwind CSS for styles

## Code Quality

**Linting:**

- ESLint 10.0.0 with:
  - @eslint/js (recommended rules)
  - typescript-eslint 8.55.0 (TypeScript rules)
  - eslint-config-prettier 10.1.8 (Prettier compatibility)

**Formatting:**

- Prettier 3.8.1
  - Single quotes
  - Trailing commas
  - Print width: 100
  - Tab width: 2
  - Semicolons: enabled

**Git Hooks:**

- Husky 9.1.7 - Git hook framework
- lint-staged 16.2.7 - Pre-commit linting and formatting

## Security & Middleware

**Core:**

- Helmet 8.1.0 - HTTP security headers
- CORS 2.8.6 - Cross-origin request handling
- bcrypt 6.0.0 - Password hashing
- jsonwebtoken 9.0.3 - JWT signing/verification

**Rate Limiting:**

- express-rate-limit 8.2.1 - Request rate limiting

**Logging:**

- Pino 10.3.1 - Structured JSON logger
- pino-http 11.0.0 - HTTP request logging middleware

## Database

**Provider:**

- PostgreSQL 16 (via Docker Compose)

**ORM:**

- Prisma 5.22.0
  - Connection: via `DATABASE_URL` env var
  - Migrations: `prisma/migrations/`
  - Schema: `prisma/schema.prisma`

## Key Dependencies

**Critical:**

- @prisma/client 5.22.0 - Database ORM client (required for all data operations)
- express 5.2.1 - Web framework backbone
- jsonwebtoken 9.0.3 - Authentication tokens (production security critical)
- helmet 8.1.0 - Security headers (prevents common exploits)

**Content & Media:**

- @imagekit/nodejs 7.3.0 - Image hosting and CDN (for bug report screenshots)
- qrcode 1.5.4 - QR code generation (assessment delivery)

**Data Processing:**

- csv-parse 6.1.0 - CSV parsing (for data imports)
- cookie-parser 1.4.7 - Cookie parsing middleware
- concurrently 9.2.1 - Run multiple processes (dev only)

## Configuration

**Environment:**

- `DATABASE_URL` - PostgreSQL connection string (required)
- `JWT_SECRET` - Signing key for JWTs (required, minimum 32 chars)
- `NODE_ENV` - Environment mode (development/production/test)
- `PORT` - Server port (default 8179 for API, 9001 in dev)
- `CORS_ORIGINS` - Allowed CORS origins (default: http://localhost:9000)
- `APP_BASE_URL` - Frontend URL for QR code/share links (default: http://localhost:9000)
- `LOG_LEVEL` - Pino logging level (default: debug in dev, info in prod)
- `IMAGEKIT_PRIVATE_KEY` - ImageKit API key (optional, disables image uploads if missing)
- `IMAGEKIT_URL_ENDPOINT` - ImageKit CDN endpoint (optional)
- `IMAGEKIT_BASE_URL` - ImageKit base URL override (optional)
- `DEV_ORG_SLUG` - Development organization slug for testing
- `POSTGRES_USER` - Database user (default: mededprep)
- `POSTGRES_PASSWORD` - Database password (default: mededprep_dev)
- `POSTGRES_DB` - Database name (default: mededprep_inst)

**Build:**

- `tsconfig.json` - Backend TypeScript config (ES2022, strict mode)
- `app/tsconfig.json` - Frontend TypeScript config (ES2020, JSX support)
- `.prettierrc` - Prettier formatting rules
- `eslint.config.js` - ESLint rules for backend
- `app/vite.config.ts` - Vite build and dev server config

**Docker:**

- `docker-compose.yml` - PostgreSQL 16-alpine service definition

## Platform Requirements

**Development:**

- Node.js 20.x
- npm
- Docker/Docker Compose (for PostgreSQL)
- Bash shell

**Production:**

- Node.js 20.x runtime
- PostgreSQL 16 database
- CDN or file storage for static assets
- Reverse proxy (Nginx recommended) for trust proxy configuration

**Ports:**

- Backend API: `9001` (development), `8179` (default)
- Frontend dev: `9000`
- PostgreSQL: `5432` (via Docker Compose)

---

_Stack analysis: 2026-02-23_
