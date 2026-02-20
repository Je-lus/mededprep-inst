import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import {
  usePublicAssessment,
  useStartAssessment,
  useSubmitAssessment,
} from '../../hooks/usePublic';
import type { AssessmentSubmitResult, SurveyJson } from '../../types/api';
import { ApiError } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StudentInfoStep } from './take-assessment/StudentInfoStep';
import { AssessmentResults } from './take-assessment/AssessmentResults';

type FlowStep = 'info' | 'taking' | 'results';

function asSurveyJson(value: unknown): SurveyJson | null {
  if (value && typeof value === 'object') return value as SurveyJson;
  return null;
}

export default function TakeAssessment() {
  const { hash } = useParams<{ hash: string }>();
  const safeHash = hash ?? '';

  const [step, setStep] = useState<FlowStep>('info');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [submitResult, setSubmitResult] = useState<AssessmentSubmitResult | null>(null);
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submittingRef = useRef(false);
  const submitFnRef = useRef<(() => void) | null>(null);

  const assessmentQuery = usePublicAssessment(safeHash);
  const startAssessment = useStartAssessment(safeHash);
  const submitAssessment = useSubmitAssessment(safeHash);

  // Cleanup SurveyJS model event listeners and dispose on unmount or model change
  useEffect(() => {
    if (!surveyModel) return;

    return () => {
      surveyModel.onComplete.clear();
      surveyModel.onTimerTick.clear();
      surveyModel.dispose();
    };
  }, [surveyModel]);

  const retrySubmit = useCallback(() => {
    if (!submitFnRef.current) return;
    setSubmitError(null);
    submitFnRef.current();
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

      // Apply brand theme
      model.applyTheme({
        cssVariables: {
          '--sjs-primary-backcolor': '#1b5fd0',
          '--sjs-primary-backcolor-light': 'rgba(27, 95, 208, 0.1)',
          '--sjs-primary-backcolor-dark': '#1550b5',
          '--sjs-primary-forecolor': '#ffffff',
        },
      });

      const capturedResponseId = result.responseId;
      // On resume, use the original startedAt so timeTaken accounts for
      // time already spent. For new sessions, fall back to Date.now().
      const capturedStartedAt = result.startedAt
        ? new Date(result.startedAt).getTime()
        : Date.now();

      // Extract submit logic so it can be called from both onComplete and retry.
      // Calling surveyModel.doComplete() on retry would not re-fire onComplete
      // on an already-completed model, so we call the submit function directly.
      const doSubmit = () => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setSubmitError(null);

        const responseData = model.data;
        const timeTaken = Math.max(0, Math.round((Date.now() - capturedStartedAt) / 1000));

        submitAssessment
          .mutateAsync({
            responseId: capturedResponseId,
            responseData,
            timeTaken,
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

      // Timer auto-submit
      if (model.timeLimit > 0) {
        model.onTimerTick.add((sender) => {
          if (sender.timeSpent >= sender.timeLimit && !submittingRef.current) {
            toast.info('Time is up! Submitting your assessment...');
            sender.doComplete();
          }
        });
      }

      // Handle survey completion
      model.onComplete.add(() => {
        doSubmit();
      });

      setSurveyModel(model);
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
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Invalid Assessment Link</AlertTitle>
            <AlertDescription>The assessment URL is missing a valid hash.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (assessmentQuery.isPending) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (assessmentQuery.isError || !assessmentQuery.data) {
    const message =
      assessmentQuery.error instanceof ApiError
        ? assessmentQuery.error.message
        : 'Unable to load assessment details';

    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-2xl space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Could Not Load Assessment</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          <Button type="button" onClick={() => assessmentQuery.refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const assessment = assessmentQuery.data;

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">MedEdPrep</p>
          <h1 className="text-3xl font-bold text-slate-900">{assessment.title}</h1>
          {assessment.description && (
            <p className="text-sm text-slate-600">{assessment.description}</p>
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
            <Survey model={surveyModel} />
            {submitError && (
              <Alert variant="destructive" className="mt-4">
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
    </div>
  );
}
