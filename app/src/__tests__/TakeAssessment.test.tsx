import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ApiError } from '@/lib/api';

// Default mock implementations - overridden per test as needed
const mockUsePublicAssessment = vi.fn();
const mockUseStartAssessment = vi.fn();
const mockUseSubmitAssessment = vi.fn();

vi.mock('@/hooks/usePublic', () => ({
  usePublicAssessment: (...args: unknown[]) => mockUsePublicAssessment(...args),
  useStartAssessment: (...args: unknown[]) => mockUseStartAssessment(...args),
  useSubmitAssessment: (...args: unknown[]) => mockUseSubmitAssessment(...args),
}));

// Mock SurveyJS to avoid loading it in tests
vi.mock('survey-core', () => ({
  Model: vi.fn(),
}));

vi.mock('survey-react-ui', () => ({
  Survey: () => <div data-testid="survey-mock">Survey Component</div>,
}));

import TakeAssessment from '../pages/public/TakeAssessment';

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
            {/* Route with no hash param for the invalid link test */}
            <Route path="/no-hash" element={children} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

function setupDefaultMutationMock() {
  return {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };
}

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

    // The Skeleton component renders div elements with the animate-pulse class.
    // There are three skeletons in the loading state.
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it('renders the student info step when assessment is loaded', () => {
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

    render(<TakeAssessment />, { wrapper: createWrapper() });

    // The assessment title is rendered in the page header h1 and in the card
    expect(screen.getByRole('heading', { level: 1, name: 'Cardiology Exam' })).toBeInTheDocument();

    // Student info form fields should be visible
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Student Email')).toBeInTheDocument();

    // Begin Assessment button should be present
    expect(screen.getByRole('button', { name: /Begin Assessment/i })).toBeInTheDocument();
  });

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

  it('shows generic error message when error is not an ApiError', () => {
    mockUsePublicAssessment.mockReturnValue({
      isPending: false,
      isError: true,
      data: null,
      error: new Error('network failure'),
      refetch: vi.fn(),
    });

    render(<TakeAssessment />, { wrapper: createWrapper() });

    expect(screen.getByText('Could Not Load Assessment')).toBeInTheDocument();
    expect(screen.getByText('Unable to load assessment details')).toBeInTheDocument();
  });

  it('shows invalid link message when hash param is missing', () => {
    mockUsePublicAssessment.mockReturnValue({
      isPending: false,
      isError: false,
      data: null,
      error: null,
    });

    render(<TakeAssessment />, { wrapper: createWrapper('/no-hash') });

    expect(screen.getByText('Invalid Assessment Link')).toBeInTheDocument();
    expect(screen.getByText('The assessment URL is missing a valid hash.')).toBeInTheDocument();
  });

  it('displays question count and time limit on the info step', () => {
    mockUsePublicAssessment.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        id: 'assess-1',
        title: 'Trauma Exit Exam',
        description: null,
        questionCount: 50,
        timeLimitMinutes: 90,
        allowStudentReview: false,
      },
      error: null,
    });

    render(<TakeAssessment />, { wrapper: createWrapper() });

    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('90 min')).toBeInTheDocument();
  });
});
