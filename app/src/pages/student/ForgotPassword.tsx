import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useForgotPassword } from '../../hooks/useStudentAuth';
import { ApiError } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const forgotPassword = useForgotPassword();

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  // DEV ONLY: store the reset token for testing
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setDevToken(null);

    try {
      const result = await forgotPassword.mutateAsync({
        email: email.trim(),
      });
      setSubmitted(true);
      // DEV ONLY: capture the reset token for testing
      if (result.resetToken) {
        setDevToken(result.resetToken);
      }
      toast.success('If an account exists, a reset link has been sent.');
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message || 'Unable to process request.');
        toast.error(error.message || 'Unable to process request.');
      } else {
        setFormError('Unable to process request.');
        toast.error('Unable to process request.');
      }
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">MedEdPrep</p>
            <CardTitle className="text-2xl">Forgot Password</CardTitle>
            <CardDescription>
              Enter your email address and we will send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formError && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            {submitted ? (
              <div className="space-y-4" role="status">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>Check your email</AlertTitle>
                  <AlertDescription>
                    If an account exists for <strong>{email}</strong>, you will receive a password
                    reset link shortly.
                  </AlertDescription>
                </Alert>

                {/* DEV ONLY: Show reset token for testing */}
                {devToken && (
                  <Alert className="border-amber-300 bg-amber-50">
                    <AlertTitle className="text-amber-800">Dev Mode: Reset Token</AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p className="text-xs text-amber-700">
                        This token is only shown in development. In production, it would be sent via
                        email.
                      </p>
                      <code className="block break-all rounded bg-amber-100 p-2 text-xs text-amber-900">
                        {devToken}
                      </code>
                      <Button asChild size="sm" variant="outline" className="mt-2">
                        <Link to={`/student/reset-password?token=${devToken}`}>
                          Use this token to reset password
                        </Link>
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    aria-required="true"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
                  {forgotPassword.isPending ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            )}

            <p className="text-center text-sm text-muted-foreground">
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
