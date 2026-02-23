# Testing Patterns

**Analysis Date:** 2026-02-23

## Test Framework

**Runner:**

- Frontend: Vitest 4.0.18
- Backend: Vitest 4.0.18 (command: `npm run test`)
- Config: `app/vite.config.ts` (frontend only; backend uses default Vitest)

**Frontend Vitest Config (`app/vite.config.ts`):**

```typescript
test: {
  globals: true,              // globals like describe, it, expect available without import
  environment: 'jsdom',       // DOM environment for React testing
  setupFiles: ['./src/test-setup.ts'],
  css: false,
  include: ['src/**/*.test.{ts,tsx}'],
}
```

**Assertion Library:**

- Frontend: Jest DOM matchers via `@testing-library/jest-dom`
- Backend: Vitest built-in `expect()`

**Run Commands:**

```bash
npm run test              # Run all tests (backend only by default)
npm run test:all         # Run backend tests + cd app && vitest run
npm run test:watch       # Watch mode for backend
cd app && npm run test       # Frontend tests only
cd app && npm run test:watch # Frontend watch mode
```

## Test File Organization

**Location:**

- Frontend: Co-located in `app/src/__tests__/` directory
- Backend: Not yet established (no test files found)
- Example structure: `app/src/__tests__/TakeAssessment.test.tsx`, `app/src/__tests__/AssessmentCreate.test.tsx`

**Naming:**

- Pattern: `[ComponentName].test.tsx` for React components
- Files placed in `__tests__` directory at `src/` level

**Vitest Configuration:**

- Glob pattern in config: `src/**/*.test.{ts,tsx}`
- Setup file: `src/test-setup.ts` initializes `@testing-library/jest-dom`

## Test Structure

**Suite Organization:**

```typescript
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

describe('TakeAssessment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStartAssessment.mockReturnValue(setupDefaultMutationMock());
    mockUseSubmitAssessment.mockReturnValue(setupDefaultMutationMock());
  });

  it('shows loading skeletons while assessment data is loading', () => {
    mockUsePublicAssessment.mockReturnValue({
      isPending: true,
      isError: false,
      data: null,
      error: null,
    });

    render(<TakeAssessment />, { wrapper: createWrapper() });

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it('renders the student info step when assessment is loaded', () => {
    mockUsePublicAssessment.mockReturnValue({
      isPending: false,
      isError: false,
      data: { /* ... */ },
      error: null,
    });

    render(<TakeAssessment />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { level: 1, name: 'Cardiology Exam' })).toBeInTheDocument();
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
  });
});
```

**Patterns Observed:**

- `describe('ComponentName', ...)` - Semantic test suite
- `beforeEach(...)` - Reset mocks and state before each test
- `it('should do X', ...)` - Readable test descriptions
- `render(<Component />, { wrapper: createWrapper() })` - Render with providers
- `expect(...).toBeInTheDocument()` - Jest DOM matcher

## Mocking

**Framework:** Vitest's built-in `vi` object

- Mock functions via `vi.fn()`
- Mock modules via `vi.mock()`
- Clear all mocks via `vi.clearAllMocks()`

**Patterns (Frontend):**

```typescript
// Mock hooks before importing component
vi.mock('@/hooks/useAssessments', () => ({
  useCreateAssessment: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useParseCsv: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// Mock SurveyJS components to avoid loading in tests
vi.mock('survey-core', () => ({
  Model: vi.fn(),
}));

vi.mock('survey-react-ui', () => ({
  Survey: () => <div data-testid="survey-mock">Survey Component</div>,
}));

// Test data factory
function setupDefaultMutationMock() {
  return {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };
}
```

**What to Mock:**

- Custom hooks (useAssessments, usePublicAssessment, etc.)
- Third-party components with side effects (SurveyJS Editor, heavy libraries)
- Expensive operations (file capture, complex rendering)

**What NOT to Mock:**

- Built-in React hooks (useState, useEffect)
- React Router (use MemoryRouter instead)
- TanStack Query QueryClient (instantiate real client in test)
- DOM queries (use real queries via React Testing Library)

## Fixtures and Factories

**Test Data:**

```typescript
// Mock return object factory
function setupDefaultMutationMock() {
  return {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };
}

// Assessment mock data
mockUsePublicAssessment.mockReturnValue({
  isPending: false,
  isError: false,
  data: {
    id: 'assess-1',
    title: 'Cardiology Exam',
    description: 'Test your cardiac knowledge',
    questionCount: 25,
    timeLimitMinutes: 60,
    allowStudentReview: true,
  },
  error: null,
});
```

**Location:**

- Fixtures defined inline within test files
- No separate fixtures directory
- Factory functions defined at module scope in test file

## Coverage

**Requirements:** Not enforced (no coverage config in vitest)

**Observation:**

- Tests focus on component behavior rather than line coverage
- Tests verify UI rendering, user interactions, error handling
- No minimum coverage thresholds configured

## Test Types

**Unit Tests:**

- Test individual React components in isolation
- Mock all external dependencies (hooks, API calls)
- Verify props handling, state changes, conditional rendering
- Example: `TakeAssessment.test.tsx` tests each step of the assessment flow
- Example: `AssessmentCreate.test.tsx` tests form rendering and tab switching

**Integration Tests:**

- Not yet established
- Could test multiple components with real routing (MemoryRouter)
- Could test real API responses in test environment

**E2E Tests:**

- Not detected
- Could use Playwright or Cypress for full user flows
- Not part of current test infrastructure

## Common Patterns

**Async Testing:**

```typescript
it('enables the Create Assessment button when title is provided', async () => {
  const user = userEvent.setup();
  render(<AssessmentCreate />, { wrapper: createWrapper() });

  const titleInput = screen.getByLabelText('Title *');
  await user.type(titleInput, 'Exam 1');

  const createButton = screen.getByRole('button', { name: /Create Assessment/i });
  expect(createButton).toBeEnabled();
});
```

**Error Testing:**

```typescript
it('shows error state when assessment fails to load', () => {
  const apiError = new ApiError({
    code: 'NOT_FOUND',
    message: 'Assessment not found or no longer available',
  });

  mockUsePublicAssessment.mockReturnValue({
    isPending: false,
    isError: true,
    data: null,
    error: apiError,
    refetch: vi.fn(),
  });

  render(<TakeAssessment />, { wrapper: createWrapper() });

  expect(screen.getByText('Could Not Load Assessment')).toBeInTheDocument();
  expect(screen.getByText('Assessment not found or no longer available')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
});
```

**Wrapper Pattern (Providers):**

```typescript
function createWrapper(initialRoute = '/assess/test-hash-123') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/assess/:hash" element={children} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

// Usage:
render(<TakeAssessment />, { wrapper: createWrapper() });
```

**User Interaction Testing:**

```typescript
import userEvent from '@testing-library/user-event';

it('switches between Survey Builder, CSV Import, and From Bank tabs', async () => {
  const user = userEvent.setup();
  render(<AssessmentCreate />, { wrapper: createWrapper() });

  // Survey Builder tab should be active by default
  expect(screen.getByTestId('survey-editor-mock')).toBeInTheDocument();

  // Click CSV Import tab
  await user.click(screen.getByRole('tab', { name: /CSV Import/i }));
  expect(screen.getByText(/Upload or paste tab-delimited CSV content/i)).toBeInTheDocument();
});
```

**Test Data Verification:**

```typescript
it('shows the default passing score of 70', () => {
  render(<AssessmentCreate />, { wrapper: createWrapper() });

  const passingScoreInput = screen.getByLabelText('Passing Score (%)') as HTMLInputElement;
  expect(passingScoreInput.value).toBe('70');
});
```

---

_Testing analysis: 2026-02-23_
