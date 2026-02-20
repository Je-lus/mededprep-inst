import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock the hooks before importing the component
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

vi.mock('@/hooks/useQuestionBanks', () => ({
  useQuestionBanks: () => ({ data: [] }),
  useQuestionBank: () => ({ data: null }),
  useIncrementItemUsage: () => ({ mutate: vi.fn() }),
}));

// Mock SurveyEditor to avoid loading the full SurveyJS Creator in tests
vi.mock('@/components/SurveyEditor', () => ({
  default: () => <div data-testid="survey-editor-mock">Survey Editor</div>,
}));

import AssessmentCreate from '../pages/admin/AssessmentCreate';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe('AssessmentCreate', () => {
  it('renders the create form with title and description fields', () => {
    render(<AssessmentCreate />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: 'Create Assessment' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title *')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Passing Score (%)')).toBeInTheDocument();
    expect(screen.getByLabelText('Time Limit (minutes)')).toBeInTheDocument();
  });

  it('has the Create Assessment button disabled when title is empty', () => {
    render(<AssessmentCreate />, { wrapper: createWrapper() });

    const createButton = screen.getByRole('button', { name: /Create Assessment/i });
    expect(createButton).toBeDisabled();
  });

  it('enables the Create Assessment button when title is provided', async () => {
    const user = userEvent.setup();
    render(<AssessmentCreate />, { wrapper: createWrapper() });

    const titleInput = screen.getByLabelText('Title *');
    await user.type(titleInput, 'Exam 1');

    const createButton = screen.getByRole('button', { name: /Create Assessment/i });
    expect(createButton).toBeEnabled();
  });

  it('switches between Survey Builder, CSV Import, and From Bank tabs', async () => {
    const user = userEvent.setup();
    render(<AssessmentCreate />, { wrapper: createWrapper() });

    // Survey Builder tab should be active by default
    expect(screen.getByTestId('survey-editor-mock')).toBeInTheDocument();

    // Click CSV Import tab
    await user.click(screen.getByRole('tab', { name: /CSV Import/i }));
    expect(screen.getByText(/Upload or paste tab-delimited CSV content/i)).toBeInTheDocument();

    // Click From Bank tab
    await user.click(screen.getByRole('tab', { name: /From Bank/i }));
    expect(screen.getByText('Select from Question Bank')).toBeInTheDocument();

    // Switch back to Survey Builder tab
    await user.click(screen.getByRole('tab', { name: /Survey Builder/i }));
    expect(screen.getByTestId('survey-editor-mock')).toBeInTheDocument();
  });

  it('renders checkboxes for randomize and review options', () => {
    render(<AssessmentCreate />, { wrapper: createWrapper() });

    expect(screen.getByLabelText('Randomize Questions')).toBeInTheDocument();
    expect(screen.getByLabelText('Randomize Choices')).toBeInTheDocument();
    expect(screen.getByLabelText('Allow Student Review')).toBeInTheDocument();
  });

  it('shows the default passing score of 70', () => {
    render(<AssessmentCreate />, { wrapper: createWrapper() });

    const passingScoreInput = screen.getByLabelText('Passing Score (%)') as HTMLInputElement;
    expect(passingScoreInput.value).toBe('70');
  });
});
