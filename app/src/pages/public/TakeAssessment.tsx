import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react';
import { usePublicAssessment, useStartAssessment, useSubmitAssessment } from '../../hooks/usePublic';
import { useStudentRegister } from '../../hooks/useStudentAuth';
import type { AssessmentSubmitResult, SurveyChoice, SurveyElement, SurveyJson } from '../../types/api';
import { ApiError } from '../../lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type FlowStep = 'info' | 'taking' | 'results';

type NormalizedChoice = { value: string; text: string };

function asSurveyJson(value: unknown): SurveyJson | null {
  if (value && typeof value === 'object') return value as SurveyJson;
  return null;
}

function normalizeChoice(choice: SurveyChoice): NormalizedChoice {
  if (typeof choice === 'string') return { value: choice, text: choice };
  return { value: String(choice.value), text: choice.text || String(choice.value) };
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

function splitName(studentName: string): { firstName: string; lastName: string } {
  const trimmed = studentName.trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return { firstName, lastName: rest.join(' ') };
}

function formatScore(result: AssessmentSubmitResult): { totalCorrect: number; totalQuestions: number; percent: string } {
  const totalCorrect = result.totalCorrect ?? 0;
  const totalQuestions = result.totalQuestions ?? 0;

  if (result.scorePercentage) {
    return { totalCorrect, totalQuestions, percent: result.scorePercentage };
  }

  if (!totalQuestions) {
    return { totalCorrect, totalQuestions, percent: '0.00' };
  }

  const percentage = ((totalCorrect / totalQuestions) * 100).toFixed(2);
  return { totalCorrect, totalQuestions, percent: percentage };
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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountCreated, setAccountCreated] = useState(false);
  const [accountSkipped, setAccountSkipped] = useState(false);

  const autoSubmittedRef = useRef(false);

  const assessmentQuery = usePublicAssessment(safeHash);
  const startAssessment = useStartAssessment(safeHash);
  const submitAssessment = useSubmitAssessment(safeHash);
  const registerStudent = useStudentRegister();

  const score = useMemo(
    () => (submitResult ? formatScore(submitResult) : { totalCorrect: 0, totalQuestions: 0, percent: '0.00' }),
    [submitResult],
  );
  const hasScoreFeedback = typeof submitResult?.totalQuestions === 'number';

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
      setAccountCreated(false);
      setAccountSkipped(false);
      setPassword('');
      setConfirmPassword('');
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

  const handleCreateAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPassword = password.trim();

    if (trimmedPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (trimmedPassword !== confirmPassword.trim()) {
      toast.error('Passwords do not match');
      return;
    }

    const nameParts = splitName(studentName);

    try {
      await registerStudent.mutateAsync({
        email: studentEmail.trim(),
        password: trimmedPassword,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
      });
      setAccountCreated(true);
      setAccountSkipped(false);
      toast.success('Account created');
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message || 'Unable to create account');
      } else {
        toast.error('Unable to create account');
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
          <>
            <Card>
              <CardHeader>
                <CardTitle>Assessment Info</CardTitle>
                <CardDescription>Confirm your details to begin the assessment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-white p-3">
                    <p className="text-xs uppercase text-muted-foreground">Questions</p>
                    <p className="text-xl font-semibold">{assessment.questionCount}</p>
                  </div>
                  <div className="rounded-lg border bg-white p-3">
                    <p className="text-xs uppercase text-muted-foreground">Time Limit</p>
                    <p className="text-xl font-semibold">
                      {assessment.timeLimitMinutes ? `${assessment.timeLimitMinutes} min` : 'No time limit'}
                    </p>
                  </div>
                </div>

                <Separator />

                <form onSubmit={handleStart} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentName">Student Name</Label>
                    <Input
                      id="studentName"
                      value={studentName}
                      onChange={(event) => setStudentName(event.target.value)}
                      placeholder="Jane Doe"
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentEmail">Student Email</Label>
                    <Input
                      id="studentEmail"
                      type="email"
                      value={studentEmail}
                      onChange={(event) => setStudentEmail(event.target.value)}
                      placeholder="jane@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={startAssessment.isPending} className="w-full">
                    {startAssessment.isPending ? 'Starting...' : 'Start Assessment'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {startAssessment.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Unable to Start</AlertTitle>
                <AlertDescription>
                  {startAssessment.error instanceof ApiError
                    ? startAssessment.error.message
                    : 'Please try again.'}
                </AlertDescription>
              </Alert>
            )}
          </>
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

            {questions.map((question, index) => {
              const choices = (question.choices ?? []).map(normalizeChoice);
              const questionLabel = question.title || question.name;
              const answerValue = answers[question.name];
              const checkedValues = Array.isArray(answerValue)
                ? answerValue.filter((item): item is string => typeof item === 'string')
                : [];

              return (
                <Card key={question.name}>
                  <CardHeader>
                    <CardDescription>
                      Question {index + 1} of {questions.length}
                    </CardDescription>
                    <CardTitle className="text-lg leading-snug">{questionLabel}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {question.type === 'radiogroup' && choices.length > 0 && (
                      <div className="space-y-2">
                        {choices.map((choice) => (
                          <label
                            key={choice.value}
                            className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition hover:bg-slate-50"
                          >
                            <input
                              type="radio"
                              name={question.name}
                              checked={answerValue === choice.value}
                              onChange={() =>
                                setAnswers((current) => ({ ...current, [question.name]: choice.value }))
                              }
                              className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-slate-800">{choice.text}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {question.type === 'checkbox' && choices.length > 0 && (
                      <div className="space-y-2">
                        {choices.map((choice) => (
                          <label
                            key={choice.value}
                            className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={checkedValues.includes(choice.value)}
                              onChange={(event) =>
                                updateCheckboxAnswer(question.name, choice.value, event.target.checked)
                              }
                              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-slate-800">{choice.text}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {(question.type !== 'radiogroup' && question.type !== 'checkbox') || choices.length === 0 ? (
                      <div className="space-y-2">
                        <Label htmlFor={`question-${question.name}`}>Your answer</Label>
                        <Input
                          id={`question-${question.name}`}
                          value={typeof answerValue === 'string' ? answerValue : ''}
                          onChange={(event) =>
                            setAnswers((current) => ({ ...current, [question.name]: event.target.value }))
                          }
                          placeholder="Type your answer"
                        />
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}

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
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Assessment Complete</CardTitle>
                <CardDescription>
                  {hasScoreFeedback ? 'Your score is available now.' : 'Assessment submitted successfully.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasScoreFeedback ? (
                  <>
                    <p className="text-base">
                      You scored{' '}
                      <span className="font-semibold">
                        {score.totalCorrect} out of {score.totalQuestions}
                      </span>{' '}
                      ({score.percent}%)
                    </p>
                    <Badge
                      className={submitResult.passed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}
                    >
                      {submitResult.passed ? 'Passed' : 'Failed'}
                    </Badge>
                  </>
                ) : (
                  <p className="text-base">Assessment submitted successfully.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-xl">Create an account to save your results and review later</CardTitle>
                <CardDescription>Use your assessment email to link this attempt to your account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {accountCreated ? (
                  <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    <AlertTitle>Account Created</AlertTitle>
                    <AlertDescription>
                      Your account is ready. Continue to your dashboard to review this result.
                    </AlertDescription>
                  </Alert>
                ) : accountSkipped ? (
                  <p className="text-sm text-muted-foreground">
                    You can create an account later at{' '}
                    <Link to="/student/login" className="font-medium text-primary underline">
                      student login
                    </Link>
                    .
                  </p>
                ) : (
                  <form onSubmit={handleCreateAccount} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Minimum 6 characters"
                        minLength={6}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmNewPassword">Confirm Password</Label>
                      <Input
                        id="confirmNewPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        minLength={6}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="submit" disabled={registerStudent.isPending} className="sm:w-auto">
                        {registerStudent.isPending ? 'Creating Account...' : 'Create Account'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="sm:w-auto"
                        onClick={() => setAccountSkipped(true)}
                      >
                        Skip
                      </Button>
                    </div>
                  </form>
                )}

                {accountCreated && (
                  <Button asChild>
                    <Link to="/student">Go to Student Dashboard</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
