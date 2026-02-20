import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Trophy, BookOpen, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useStudentRegister } from '@/hooks/useStudentAuth';
import { ApiError } from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AssessmentSubmitResult } from '@/types/api';

function formatScore(result: AssessmentSubmitResult) {
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

function scoreColor(percent: number, passed: boolean): string {
  if (passed) return 'text-emerald-600';
  if (percent >= 60) return 'text-amber-600';
  return 'text-rose-600';
}

function scoreBorderColor(percent: number, passed: boolean): string {
  if (passed) return 'border-emerald-400';
  if (percent >= 60) return 'border-amber-400';
  return 'border-rose-400';
}

function scoreBgColor(percent: number, passed: boolean): string {
  if (passed) return 'bg-emerald-50';
  if (percent >= 60) return 'bg-amber-50';
  return 'bg-rose-50';
}

export function AssessmentResults({
  result,
  firstName,
  lastName,
  studentEmail,
  allowStudentReview = false,
}: {
  result: AssessmentSubmitResult;
  firstName: string;
  lastName: string;
  studentEmail: string;
  allowStudentReview?: boolean;
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountCreated, setAccountCreated] = useState(false);
  const [accountSkipped, setAccountSkipped] = useState(false);

  const registerStudent = useStudentRegister();
  const score = formatScore(result);
  const hasScoreFeedback = typeof result.totalQuestions === 'number';
  const percentNum = Number(score.percent);
  const passed = result.passed ?? false;
  const isExcellent = passed && percentNum >= 90;

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

    try {
      await registerStudent.mutateAsync({
        email: studentEmail.trim(),
        password: trimmedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
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

  return (
    <section aria-label="Assessment results" className="space-y-4">
      {hasScoreFeedback ? (
        <Card
          className={`border-2 ${scoreBorderColor(percentNum, passed)} ${scoreBgColor(percentNum, passed)}`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              {passed ? (
                isExcellent ? (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Star className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Trophy className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                  </div>
                )
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100">
                  <BookOpen className="h-6 w-6 text-rose-600" aria-hidden="true" />
                </div>
              )}
              <div>
                <CardTitle className="text-2xl">
                  {isExcellent
                    ? 'Excellent Work!'
                    : passed
                      ? 'Congratulations! You passed!'
                      : 'Assessment Complete'}
                </CardTitle>
                <CardDescription className="mt-1">
                  {isExcellent
                    ? 'Outstanding performance -- keep it up!'
                    : passed
                      ? 'Great job on completing this assessment.'
                      : "Keep studying -- you'll get there!"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-2 sm:flex-row sm:gap-6">
              <div
                className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 bg-white ${scoreBorderColor(percentNum, passed)}`}
                aria-label={`Score: ${Math.round(percentNum)} percent`}
              >
                <span
                  className={`text-3xl font-bold ${scoreColor(percentNum, passed)}`}
                  aria-hidden="true"
                >
                  {Math.round(percentNum)}%
                </span>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-base text-slate-700">
                  You scored{' '}
                  <span className="font-semibold">
                    {score.totalCorrect} out of {score.totalQuestions}
                  </span>{' '}
                  questions correctly
                </p>
                <div className="mt-2">
                  <Badge
                    className={
                      passed
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-rose-600 text-white hover:bg-rose-700'
                    }
                  >
                    {passed ? 'Passed' : 'Did Not Pass'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-2xl">Assessment Complete</CardTitle>
                <CardDescription>Assessment submitted successfully.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-base text-gray-600">
              Your response has been recorded. Thank you for completing this assessment.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl">
            {allowStudentReview
              ? 'Create your account to review your answers, explanations, and track your progress'
              : 'Create your account to track your progress and view your scores'}
          </CardTitle>
          <CardDescription>Set a password to secure your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accountCreated ? (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900" role="status">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <AlertTitle>Account Created</AlertTitle>
              <AlertDescription>
                Your account is ready. Continue to your dashboard to review this result.
              </AlertDescription>
            </Alert>
          ) : accountSkipped ? (
            <p className="text-sm text-gray-600">
              You can create an account later at{' '}
              <Link to="/student/login" className="font-medium text-primary underline">
                student login
              </Link>
              .
            </p>
          ) : (
            <form onSubmit={handleCreateAccount} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="accountFirstName">First Name</Label>
                  <Input
                    id="accountFirstName"
                    value={firstName}
                    readOnly
                    className="bg-muted"
                    aria-readonly="true"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountLastName">Last Name</Label>
                  <Input
                    id="accountLastName"
                    value={lastName}
                    readOnly
                    className="bg-muted"
                    aria-readonly="true"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountEmail">Email</Label>
                <Input
                  id="accountEmail"
                  type="email"
                  value={studentEmail}
                  readOnly
                  className="bg-muted"
                  aria-readonly="true"
                />
              </div>
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
                  aria-required="true"
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
                  aria-required="true"
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
    </section>
  );
}
