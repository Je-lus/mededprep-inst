import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useResetPassword } from '../../hooks/useStudentAuth';
import { ApiError, getFieldErrors } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetPassword = useResetPassword();

  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  if (!token) {
    return (
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto w-full max-w-md">
          <Card>
            <CardHeader className="space-y-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                MedEdPrep
              </p>
              <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No reset token provided</AlertTitle>
                <AlertDescription>
                  This link is invalid or has expired. Please request a new password reset.
                </AlertDescription>
              </Alert>
              <p className="text-center text-sm text-gray-600">
                <Link to="/student/forgot-password" className="font-medium text-primary underline">
                  Request a new reset link
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError('');

    if (newPassword.length < 6) {
      setFieldErrors({ newPassword: 'Password must be at least 6 characters' });
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      toast.error('Passwords do not match');
      return;
    }

    try {
      await resetPassword.mutateAsync({ token, newPassword });
      toast.success('Password has been reset successfully. Please sign in.');
      navigate('/student/login');
    } catch (error) {
      if (error instanceof ApiError) {
        const errors = getFieldErrors(error);
        if (Object.keys(errors).length > 0) setFieldErrors(errors);
        const message = error.message || 'Unable to reset password.';
        setFormError(message);
        toast.error(message);
      } else {
        setFormError('Unable to reset password.');
        toast.error('Unable to reset password.');
      }
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">MedEdPrep</p>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>Enter your new password below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formError && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Reset failed</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={6}
                  required
                  aria-required="true"
                  aria-invalid={!!fieldErrors.newPassword}
                  aria-describedby={fieldErrors.newPassword ? 'newPassword-error' : undefined}
                />
                {fieldErrors.newPassword && (
                  <p id="newPassword-error" className="text-sm text-rose-600" role="alert">
                    {fieldErrors.newPassword}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={6}
                  required
                  aria-required="true"
                  aria-invalid={!!fieldErrors.confirmPassword}
                  aria-describedby={
                    fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined
                  }
                />
                {fieldErrors.confirmPassword && (
                  <p id="confirmPassword-error" className="text-sm text-rose-600" role="alert">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
                {resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-600">
              Remember your password?{' '}
              <Link to="/student/login" className="font-medium text-primary underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
