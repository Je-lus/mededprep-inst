import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Assessment Complete</CardTitle>
          <CardDescription>
            {hasScoreFeedback
              ? 'Your score is available now.'
              : 'Assessment submitted successfully.'}
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
                className={result.passed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}
              >
                {result.passed ? 'Passed' : 'Failed'}
              </Badge>
            </>
          ) : (
            <p className="text-base">Assessment submitted successfully.</p>
          )}
        </CardContent>
      </Card>

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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="accountFirstName">First Name</Label>
                  <Input id="accountFirstName" value={firstName} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountLastName">Last Name</Label>
                  <Input id="accountLastName" value={lastName} readOnly className="bg-muted" />
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
  );
}
