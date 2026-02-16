import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle, Clock3 } from 'lucide-react';
import { usePublicAssessment, useStartAssessment, useSubmitAssessment } from '../../hooks/usePublic';
import type { AssessmentSubmitResult, SurveyElement, SurveyJson } from '../../types/api';
import { ApiError } from '../../lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StudentInfoStep } from './take-assessment/StudentInfoStep';
import { QuestionCard } from './take-assessment/QuestionCard';
import { AssessmentResults } from './take-assessment/AssessmentResults';

type FlowStep = 'info' | 'taking' | 'results';

function asSurveyJson(value: unknown): SurveyJson | null {
  if (value && typeof value === 'object') return value as SurveyJson;
  return null;
}

function flattenSurveyElements(surveyJson: SurveyJson, questionOrder?: string[]): SurveyElement[] {
  const rawElements =
    surveyJson.pages?.flatMap((page) =>
      (page.elements ?? []).filter(
        (element): element is SurveyElement =>
          !!element && typeof element === 'object' && typeof element.name === 'string',
      ),
    ) ?? [];

  if (!Array.isArray(questionOrder) || questionOrder.length === 0) return rawElements;

  const elementByName = new Map(rawElements.map((element) => [element.name, element]));
  const ordered = questionOrder.map((name) => elementByName.get(name)).filter(Boolean) as SurveyElement[];
  const orderedNames = new Set(ordered.map((element) => element.name));
  const remainder = rawElements.filter((element) => !orderedNames.has(element.name));
  return [...ordered, ...remainder];
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function TakeAssessment() {
  const { hash } = useParams<{ hash: string }>();
  const safeHash = hash ?? '';

  const [step, setStep] = useState<FlowStep>('info');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [responseId, setResponseId] = useState('');
  const [surveyJson, setSurveyJson] = useState<SurveyJson | null>(null);
  const [questions, setQuestions] = useState<SurveyElement[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [submitResult, setSubmitResult] = useState<AssessmentSubmitResult | null>(null);

  const autoSubmittedRef = useRef(false);

  const assessmentQuery = usePublicAssessment(safeHash);
  const startAssessment = useStartAssessment(safeHash);
  const submitAssessment = useSubmitAssessment(safeHash);

  const onSubmitAssessment = useCallback(
    async (autoSubmitted = false) => {
      if (!responseId || submitAssessment.isPending) return;
      if (autoSubmitted) toast.info('Time is up. Submitting your assessment...');

      const timeTaken = startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : undefined;

      try {
        const result = await submitAssessment.mutateAsync({
          responseId,
          responseData: answers,
          ...(timeTaken !== undefined ? { timeTaken } : {}),
        });
        setSubmitResult(result);
        setStep('results');
        toast.success('Assessment submitted');
      } catch (error) {
        if (error instanceof ApiError) {
          toast.error(error.message || 'Unable to submit assessment');
        } else {
          toast.error('Unable to submit assessment');
        }
      }
    },
    [answers, responseId, startedAt, submitAssessment],
  );

  useEffect(() => {
    if (step !== 'taking' || remainingSeconds === null || remainingSeconds <= 0) return undefined;

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current === null) return null;
        return Math.max(current - 1, 0);
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [remainingSeconds, step]);

  useEffect(() => {
    if (step !== 'taking' || remainingSeconds === null || remainingSeconds > 0) return;
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    void onSubmitAssessment(true);
  }, [onSubmitAssessment, remainingSeconds, step]);

  const handleStart = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!studentName.trim() || !studentEmail.trim()) {
      toast.error('Please provide your name and email to continue');
      return;
    }

    try {
      const result = await startAssessment.mutateAsync({
        studentName: studentName.trim(),
        studentEmail: studentEmail.trim(),
      });

      const parsedSurvey = asSurveyJson(result.surveyJson);
      if (!parsedSurvey) {
        toast.error('Assessment data is invalid');
        return;
      }

      const parsedQuestions = flattenSurveyElements(parsedSurvey, result.questionOrder);
      if (parsedQuestions.length === 0) {
        toast.error('This assessment has no questions to answer');
        return;
      }

      setResponseId(result.responseId);
      setSurveyJson(parsedSurvey);
      setQuestions(parsedQuestions);
      setAnswers({});
      setStartedAt(Date.now());
      setSubmitResult(null);
      setStep('taking');

      autoSubmittedRef.current = false;

      if (typeof parsedSurvey.timeLimit === 'number' && parsedSurvey.timeLimit > 0) {
        setRemainingSeconds(Math.floor(parsedSurvey.timeLimit));
      } else {
        setRemainingSeconds(null);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message || 'Unable to start assessment');
      } else {
        toast.error('Unable to start assessment');
      }
    }
  };

  const updateCheckboxAnswer = (questionName: string, value: string, checked: boolean) => {
    setAnswers((current) => {
      const existing = Array.isArray(current[questionName])
        ? (current[questionName] as string[]).filter((item): item is string => typeof item === 'string')
        : [];

      const next = checked ? [...new Set([...existing, value])] : existing.filter((item) => item !== value);
      return { ...current, [questionName]: next };
    });
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
  const isTimed = typeof surveyJson?.timeLimit === 'number' && surveyJson.timeLimit > 0;

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">MedEdPrep</p>
          <h1 className="text-3xl font-bold text-slate-900">{assessment.title}</h1>
          {assessment.description && <p className="text-sm text-slate-600">{assessment.description}</p>}
        </div>

        {step === 'info' && (
          <StudentInfoStep
            questionCount={assessment.questionCount}
            timeLimitMinutes={assessment.timeLimitMinutes}
            studentName={studentName}
            studentEmail={studentEmail}
            onNameChange={setStudentName}
            onEmailChange={setStudentEmail}
            onSubmit={handleStart}
            isPending={startAssessment.isPending}
            isError={startAssessment.isError}
            error={startAssessment.error}
          />
        )}

        {step === 'taking' && (
          <div className="space-y-4">
            {isTimed && remainingSeconds !== null && (
              <Card className="border-primary/30">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Clock3 className="h-4 w-4" />
                    Time Remaining
                  </div>
                  <Badge
                    variant={remainingSeconds <= 60 ? 'destructive' : 'secondary'}
                    className="font-mono text-sm"
                  >
                    {formatTime(remainingSeconds)}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {questions.map((question, index) => (
              <QuestionCard
                key={question.name}
                question={question}
                index={index}
                totalQuestions={questions.length}
                answerValue={answers[question.name]}
                onRadioChange={(name, value) =>
                  setAnswers((current) => ({ ...current, [name]: value }))
                }
                onCheckboxChange={updateCheckboxAnswer}
                onTextChange={(name, value) =>
                  setAnswers((current) => ({ ...current, [name]: value }))
                }
              />
            ))}

            <Button
              type="button"
              className="w-full"
              disabled={submitAssessment.isPending}
              onClick={() => void onSubmitAssessment(false)}
            >
              {submitAssessment.isPending ? 'Submitting...' : 'Submit Assessment'}
            </Button>

            {submitAssessment.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Submission Error</AlertTitle>
                <AlertDescription>
                  {submitAssessment.error instanceof ApiError
                    ? submitAssessment.error.message
                    : 'Please try submitting again.'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'results' && submitResult && (
          <AssessmentResults
            result={submitResult}
            studentName={studentName}
            studentEmail={studentEmail}
            allowStudentReview={Boolean(assessment.allowStudentReview)}
          />
        )}
      </div>
    </div>
  );
}
