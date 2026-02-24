import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { Model } from 'survey-core';
import type { ITheme } from 'survey-core';
import { Survey } from 'survey-react-ui';
import { useTheme } from '@/contexts/ThemeContext';
import {
  usePublicAssessment,
  useStartAssessment,
  useSubmitAssessment,
  useSaveProgress,
} from '../../hooks/usePublic';
import type { AssessmentSubmitResult, SurveyJson } from '../../types/api';
import { ApiError } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StudentInfoStep } from './take-assessment/StudentInfoStep';
import { AssessmentResults } from './take-assessment/AssessmentResults';

type FlowStep = 'info' | 'taking' | 'results';

// Module-level constants — defined outside component to avoid re-creation on each render
const glassPurpleTheme: ITheme = {
  colorPalette: 'dark',
  cssVariables: {
    '--sjs-primary-backcolor': '#8b5cf6',
    '--sjs-primary-backcolor-light': 'rgba(139, 92, 246, 0.1)',
    '--sjs-primary-backcolor-dark': '#7c3aed',
    '--sjs-primary-forecolor': '#ffffff',
    '--sjs-general-backcolor': '#0d0a1e',
    '--sjs-general-backcolor-dim': '#080614',
    '--sjs-general-backcolor-dim-light': '#110820',
    '--sjs-general-forecolor': 'rgba(255, 255, 255, 0.91)',
    '--sjs-general-forecolor-light': 'rgba(255, 255, 255, 0.55)',
  },
};

const daylightTheme: ITheme = {
  cssVariables: {
    '--sjs-primary-backcolor': '#1b5fd0',
    '--sjs-primary-backcolor-light': 'rgba(27, 95, 208, 0.1)',
    '--sjs-primary-backcolor-dark': '#1550b5',
    '--sjs-primary-forecolor': '#ffffff',
  },
};

function asSurveyJson(value: unknown): SurveyJson | null {
  if (value && typeof value === 'object') return value as SurveyJson;
  return null;
}

export default function TakeAssessment() {
  const { hash } = useParams<{ hash: string }>();
  const safeHash = hash ?? '';
  const { theme } = useTheme();

  const [step, setStep] = useState<FlowStep>('info');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [submitResult, setSubmitResult] = useState<AssessmentSubmitResult | null>(null);
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const submittingRef = useRef(false);
  const submitFnRef = useRef<(() => void) | null>(null);
  const timerExpiredRef = useRef(false);
  const confirmBypassRef = useRef(false);
  const timerWarningsRef = useRef<Set<number>>(new Set());
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  // Focus management: move focus to step heading on transitions
  useEffect(() => {
    if (step !== 'info') {
      stepHeadingRef.current?.focus();
    }
  }, [step]);

  // Auto-save refs
  const modelRef = useRef<Model | null>(null);
  const responseIdRef = useRef<string | null>(null);
  const lastSavedDataRef = useRef<string>('{}');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const assessmentQuery = usePublicAssessment(safeHash);
  const startAssessment = useStartAssessment(safeHash);
  const submitAssessment = useSubmitAssessment(safeHash);
  const saveProgress = useSaveProgress(safeHash);

  // Cleanup SurveyJS model event listeners and dispose on unmount or model change
  useEffect(() => {
    if (!surveyModel) return;

    return () => {
      surveyModel.onComplete.clear();
      surveyModel.onTimerTick.clear();
      surveyModel.onCompleting.clear();
      surveyModel.dispose();
    };
  }, [surveyModel]);

  // beforeunload: warn and send best-effort save via sendBeacon
  useEffect(() => {
    if (step !== 'taking') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();

      // Best-effort save via sendBeacon
      const model = modelRef.current;
      const respId = responseIdRef.current;
      if (model && respId) {
        const currentData = JSON.stringify(model.data);
        if (currentData !== lastSavedDataRef.current) {
          const payload = JSON.stringify({ responseId: respId, responseData: model.data });
          navigator.sendBeacon(
            `/api/public/assessment/${safeHash}/save-progress`,
            new Blob([payload], { type: 'application/json' }),
          );
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [step, safeHash]);

  // Auto-save every 30 seconds while taking the assessment
  useEffect(() => {
    if (step !== 'taking') return;

    const intervalId = setInterval(() => {
      const model = modelRef.current;
      const respId = responseIdRef.current;
      if (!model || !respId || submittingRef.current) return;

      const currentData = JSON.stringify(model.data);
      if (currentData === lastSavedDataRef.current) return;

      setSaveStatus('saving');
      saveProgress
        .mutateAsync({ responseId: respId, responseData: model.data })
        .then(() => {
          lastSavedDataRef.current = currentData;
          setSaveStatus('saved');
        })
        .catch(() => {
          setSaveStatus('error');
        });
    }, 30_000);

    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, safeHash]);

  const retrySubmit = useCallback(() => {
    if (!submitFnRef.current) return;
    setSubmitError(null);
    submitFnRef.current();
  }, []);

  const handleConfirmSubmit = useCallback(() => {
    setShowConfirmDialog(false);
    confirmBypassRef.current = true;
    if (surveyModel) {
      surveyModel.doComplete();
    }
  }, [surveyModel]);

  const handleCancelSubmit = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  const handleStart = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !studentEmail.trim()) {
      toast.error('Please provide your first name, last name, and email to continue');
      return;
    }

    try {
      const result = await startAssessment.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        studentEmail: studentEmail.trim(),
      });

      const parsedSurvey = asSurveyJson(result.surveyJson);
      if (!parsedSurvey) {
        toast.error('Assessment data is invalid');
        return;
      }

      // Create SurveyJS model from the sanitized survey JSON.
      // The backend already reorders elements according to questionOrder
      // for resumed sessions, so no additional reordering is needed here.
      const model = new Model(parsedSurvey);

      // Restore previous answers when resuming an in-progress assessment
      if (
        result.responseData &&
        typeof result.responseData === 'object' &&
        Object.keys(result.responseData).length > 0
      ) {
        model.data = result.responseData;
      }

      // Progress indicator
      model.showProgressBar = 'bottom';
      model.progressBarType = 'questions';

      // Apply theme-aware SurveyJS styles — Glass Purple gets dark palette + purple primary;
      // Daylight gets brand primary only (preserves current behavior)
      model.applyTheme(theme === 'glass-purple' ? glassPurpleTheme : daylightTheme);

      const capturedResponseId = result.responseId;
      // On resume, use the original startedAt so timeTaken accounts for
      // time already spent. For new sessions, fall back to Date.now().
      const capturedStartedAt = result.startedAt
        ? new Date(result.startedAt).getTime()
        : Date.now();

      // Reset refs for this new session
      timerExpiredRef.current = false;
      confirmBypassRef.current = false;
      timerWarningsRef.current = new Set();

      // Extract submit logic so it can be called from both onComplete and retry.
      // Calling surveyModel.doComplete() on retry would not re-fire onComplete
      // on an already-completed model, so we call the submit function directly.
      const doSubmit = () => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setSubmitError(null);

        const responseData = model.data;
        const timeTaken = Math.max(0, Math.round((Date.now() - capturedStartedAt) / 1000));

        // Collect per-question timing (available in one-question-per-page mode)
        const questionTimings: Record<string, number> = {};
        for (const page of model.pages) {
          if (page.timeSpent > 0 && page.elements.length > 0) {
            const element = page.elements[0];
            if (element?.name) {
              questionTimings[element.name] = page.timeSpent;
            }
          }
        }

        submitAssessment
          .mutateAsync({
            responseId: capturedResponseId,
            responseData,
            timeTaken,
            questionTimings: Object.keys(questionTimings).length > 0 ? questionTimings : undefined,
          })
          .then((submitRes) => {
            setSubmitResult(submitRes);
            setStep('results');
            toast.success('Assessment submitted');
          })
          .catch((error) => {
            submittingRef.current = false;
            const message =
              error instanceof ApiError
                ? error.message || 'Unable to submit assessment'
                : 'Unable to submit assessment';
            toast.error(message);
            setSubmitError(message);
          });
      };

      // Store submit function in ref so retry button can call it directly
      submitFnRef.current = doSubmit;

      // Timer auto-submit and timer warnings
      if (model.timeLimit > 0) {
        model.onTimerTick.add((sender) => {
          const remaining = sender.timeLimit - sender.timeSpent;

          // Timer warnings at 5 minutes and 1 minute remaining
          if (remaining <= 300 && remaining > 240 && !timerWarningsRef.current.has(300)) {
            timerWarningsRef.current.add(300);
            toast.warning('5 minutes remaining!');
          }
          if (remaining <= 60 && remaining > 0 && !timerWarningsRef.current.has(60)) {
            timerWarningsRef.current.add(60);
            toast.warning('1 minute remaining!');
          }

          if (sender.timeSpent >= sender.timeLimit && !submittingRef.current) {
            timerExpiredRef.current = true;
            toast.info('Time is up! Submitting your assessment...');
            sender.doComplete();
          }
        });
      }

      // Submit confirmation dialog - intercept completion
      model.onCompleting.add((_sender, options) => {
        // If timer expired or user already confirmed, skip dialog
        if (timerExpiredRef.current || confirmBypassRef.current) return;

        // Show confirmation dialog and prevent completion
        options.allow = false;
        setShowConfirmDialog(true);
      });

      // Handle survey completion
      model.onComplete.add(() => {
        doSubmit();
      });

      setSurveyModel(model);
      modelRef.current = model;
      responseIdRef.current = capturedResponseId;
      lastSavedDataRef.current = JSON.stringify(model.data || {});
      setSaveStatus('idle');
      setSubmitResult(null);
      setSubmitError(null);
      submittingRef.current = false;
      setStep('taking');
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message || 'Unable to start assessment');
      } else {
        toast.error('Unable to start assessment');
      }
    }
  };

  if (!hash) {
    return (
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-2xl" role="alert">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Invalid Assessment Link</AlertTitle>
            <AlertDescription>The assessment URL is missing a valid hash.</AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  if (assessmentQuery.isPending) {
    return (
      <main
        className="min-h-screen bg-background px-4 py-10"
        aria-busy="true"
        aria-label="Loading assessment"
      >
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  if (assessmentQuery.isError || !assessmentQuery.data) {
    const message =
      assessmentQuery.error instanceof ApiError
        ? assessmentQuery.error.message
        : 'Unable to load assessment details';

    return (
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-2xl space-y-4" role="alert">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Could Not Load Assessment</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          <Button type="button" onClick={() => assessmentQuery.refetch()}>
            Try Again
          </Button>
        </div>
      </main>
    );
  }

  const assessment = assessmentQuery.data;

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">MedEdPrep</p>
          <h1 className="text-3xl font-bold text-foreground" ref={stepHeadingRef} tabIndex={-1}>
            {assessment.title}
          </h1>
          {assessment.description && (
            <p className="text-sm text-muted-foreground">{assessment.description}</p>
          )}
        </div>

        {step === 'info' && (
          <StudentInfoStep
            title={assessment.title}
            description={assessment.description}
            questionCount={assessment.questionCount}
            timeLimitMinutes={assessment.timeLimitMinutes}
            firstName={firstName}
            lastName={lastName}
            studentEmail={studentEmail}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            onEmailChange={setStudentEmail}
            onSubmit={handleStart}
            isPending={startAssessment.isPending}
            isError={startAssessment.isError}
            error={startAssessment.error}
          />
        )}

        {step === 'taking' && surveyModel && (
          <>
            <div
              aria-live="polite"
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  <span>Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle2 className="h-3 w-3 text-green-600" aria-hidden="true" />
                  <span className="text-green-600">Progress saved</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertTriangle className="h-3 w-3 text-amber-500" aria-hidden="true" />
                  <span className="text-amber-500">Save failed -- will retry</span>
                </>
              )}
            </div>
            <Survey model={surveyModel} />
            {submitError && (
              <Alert variant="destructive" className="mt-4" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Submission Failed</AlertTitle>
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span>{submitError}</span>
                  <Button type="button" variant="outline" size="sm" onClick={retrySubmit}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {step === 'results' && submitResult && (
          <AssessmentResults
            result={submitResult}
            firstName={firstName}
            lastName={lastName}
            studentEmail={studentEmail}
            allowStudentReview={Boolean(assessment.allowStudentReview)}
          />
        )}
      </div>

      {/* Submit confirmation dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit? You won&apos;t be able to change your answers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSubmit}>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
