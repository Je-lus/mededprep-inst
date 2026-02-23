# Coding Conventions

**Analysis Date:** 2026-02-23

## Naming Patterns

**Files:**

- Backend service files: kebab-case (e.g., `csv-import.ts`, `quiz-scoring.ts`, `item-analysis.ts`)
- React components: PascalCase (e.g., `AdminLayout.tsx`, `BugReportDialog.tsx`, `TakeAssessment.tsx`)
- Utility/hook files: camelCase (e.g., `useAssessments.ts`, `useAttendance.ts`)
- UI components: PascalCase within `components/ui/` (e.g., `button.tsx`, `dialog.tsx`, `input.tsx`)

**Functions:**

- Regular functions: camelCase (e.g., `parseCsvToSurveyJson`, `computeItemAnalysis`, `buildReviewQuestions`)
- React hooks: useCamelCase (e.g., `useAssessments()`, `useCreateAssessment()`, `useQuestionBanks()`)
- Middleware functions: camelCase (e.g., `validate()`, `validateQuery()`, `validateParams()`)
- Exported custom hooks: camelCase with `use` prefix (e.g., `useSubmitBugReport()`)

**Variables & Constants:**

- Local variables: camelCase (e.g., `category`, `severity`, `description`, `capturingScreenshot`)
- Constants: UPPER_SNAKE_CASE (e.g., `JWT_SECRET`, `JWT_EXPIRY`, `COOKIE_OPTIONS`)
- State variables: camelCase (e.g., `isPending`, `isError`, `data`, `error`)
- Object keys: camelCase (e.g., `queryKey`, `mutationFn`, `onSuccess`)

**Types & Interfaces:**

- TypeScript interfaces: PascalCase (e.g., `AdminTokenPayload`, `StudentTokenPayload`, `BugReportDialogProps`)
- Type aliases: PascalCase (e.g., `SurveyJson`, `SurveyElement`, `ApiError`)
- Enum values: UPPER_SNAKE_CASE when string values, PascalCase for enum names

## Code Style

**Formatting:**

- Tool: Prettier
- Configuration: `.prettierrc` at root
- Settings:
  - `singleQuote: true` - Use single quotes
  - `trailingComma: 'all'` - Trailing commas in all syntax elements
  - `printWidth: 100` - Line length limit
  - `tabWidth: 2` - 2-space indentation
  - `semi: true` - Semicolons required

**Linting:**

- Tool: ESLint with TypeScript support
- Backend config: `eslint.config.js`
- Frontend config: `app/eslint.config.js`
- Key rules enforced:
  - `prefer-const: error` - Must use const when variable not reassigned
  - `eqeqeq: ['error', 'always']` - Strict equality (=== and !==)
  - `no-var: error` - No var keyword, use const/let
  - `@typescript-eslint/no-unused-vars: warn` - Warn on unused variables (except those starting with \_)
  - Backend: `no-console: ['warn', { allow: ['warn', 'error', 'info', 'debug'] }]`
  - Frontend: `no-console: ['warn', { allow: ['warn', 'error'] }]`
  - React: `react-hooks/rules-of-hooks: error` and `react-hooks/exhaustive-deps: warn`

## Import Organization

**Order (Frontend):**

1. External React/vendor libraries (`react`, `react-dom`, `@tanstack/react-query`, `zustand`)
2. Radix UI & shadcn/ui components (`@radix-ui/*`, local `@/components/ui/*`)
3. Local hooks from `@/hooks/*`
4. Local utilities from `@/lib/*`
5. Local types from `@/types/*`
6. Local components from `@/components/*`

**Order (Backend):**

1. Built-in Node modules (e.g., `jwt`, `fs`, `path`)
2. External npm packages (e.g., `express`, `zod`, `bcrypt`)
3. Prisma client (`.prisma/client`)
4. Local utils from `./lib/*.js` or `../lib/*.js`
5. Local types from `../types/*.js`

**Path Aliases:**

- Frontend: `@` → `./src/` (configured in `app/vite.config.ts`)
- Imports use absolute paths via aliases (e.g., `@/hooks/useAssessments`, `@/lib/api`)

**Example (Frontend):**

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAssessments } from '@/hooks/useAssessments';
import { api } from '@/lib/api';
import type { Assessment } from '@/types/api';
```

**Example (Backend):**

```typescript
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z, validate } from '../lib/validate.js';
import { NotFoundError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
```

## Error Handling

**Backend Patterns:**

- Custom error classes extending `AppError` in `lib/errors.ts`:
  - `ValidationError` (400)
  - `UnauthorizedError` (401)
  - `ForbiddenError` (403)
  - `NotFoundError` (404)
  - `ConflictError` (409)
  - `InternalError` (500)
- Errors thrown from synchronous code or async handlers; error middleware catches
- Zod validation failures throw `ValidationError` with details object mapping field names to messages
- Example from `routes/assessments.ts`:
  ```typescript
  async function findAssessmentOrThrow(
    id: string,
    orgId: string,
    include?: Record<string, unknown>,
  ) {
    const assessment = await prisma.assessment.findFirst({
      where: { id, orgId },
      include,
    });
    if (!assessment) throw new NotFoundError('Assessment not found');
    return assessment;
  }
  ```

**Frontend Patterns:**

- API errors wrapped in `ApiError` class from `@/lib/api`
- Hooks return objects with `isPending`, `isError`, `data`, `error` from TanStack Query
- Error boundaries at layout level (`ErrorBoundary.tsx`)
- Toast notifications for user-facing errors (via `sonner` library)
- Example from `BugReportDialog.tsx`:
  ```typescript
  try {
    await submitMutation.mutateAsync(data);
    toast.success('Bug report submitted successfully!');
    // Reset form
  } catch (error) {
    toast.error('Failed to submit bug report');
    console.error('Bug report submission error:', error);
  }
  ```

**Validation Pattern:**

- All route handlers validate input via Zod schemas passed to middleware
- Middleware applies validation to body, query params, or route params
- Failed validation throws `ValidationError` with field-level details
- Example from `routes/assessments.ts`:
  ```typescript
  const createAssessmentSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    surveyJson: z.string().optional(),
    passingScore: z.number().int().min(0).max(100).optional(),
  });
  ```

## Logging

**Framework:** Pino (structured logging)

- Configured in `lib/logger.ts`
- JSON output in production, human-readable in development
- Log level: `debug` in dev, `info` in production (controlled by `LOG_LEVEL` env var)
- Allowed console calls: `console.warn`, `console.error`, `console.info`, `console.debug`
- Frontend logs allowed: `console.warn`, `console.error`

**Pattern:**

```typescript
import { logger } from './logger';
logger.info('Message', { context: 'data' });
logger.error('Error message', error);
logger.debug('Debug info', { variable });
```

## Comments

**When to Comment:**

- Non-obvious logic or workarounds documented with line comments
- Complex algorithms documented at function level with JSDoc
- Tricky conditional logic explained inline

**JSDoc/TSDoc:**

- Function comments document parameters, return types, and purpose
- Example from `lib/auth.ts`:
  ```typescript
  /**
   * JWT Authentication with Multi-Tenant Scoping
   */
  ```
- React component comments document props via TypeScript interfaces
- Not required for obvious functions, but used for complex/public APIs

## Function Design

**Size:**

- Aim for single responsibility; functions typically 20-50 lines
- Larger functions extracted into service files (e.g., `lib/services/*.ts`)

**Parameters:**

- Prefer object parameters for functions with >3 params
- Example from hooks: Destructure mutation data in object
  ```typescript
  mutationFn: async ({
    id,
    ...data
  }: {
    id: string;
    title?: string;
  }) => ensureSuccess(await api.post(...))
  ```

**Return Values:**

- Backend route handlers return via `res.json()` or throw errors (error middleware handles)
- React hooks return TanStack Query objects (`{ data, isPending, isError, error, mutateAsync, ... }`)
- Pure functions return result or throw on invalid input
- Void functions used for side effects (state updates, API calls)

## Module Design

**Exports:**

- Named exports preferred for utilities, services, hooks
- Default export for React components (except UI primitives)
- All exports are function-based (no class exports in src code)

**Example (Named exports):**

```typescript
// hooks/useAssessments.ts
export function useAssessments() { ... }
export function useCreateAssessment() { ... }

// lib/errors.ts
export class ValidationError extends AppError { ... }
export class NotFoundError extends AppError { ... }
```

**Example (Default export):**

```typescript
// components/BugReportDialog.tsx
export default function BugReportDialog({ ... }) { ... }

// pages/admin/AssessmentCreate.tsx
export default function AssessmentCreate() { ... }
```

**Barrel Files:**

- Not commonly used; direct imports from source files preferred
- Some index exports for UI components (e.g., `components/ui/button.tsx` as standalone)

---

_Convention analysis: 2026-02-23_
