import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useStudentLogin } from '../../hooks/useStudentAuth';
import { ApiError, getFieldErrors } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function StudentLogin() {
  const navigate = useNavigate();
  const loginStudent = useStudentLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError('');

    try {
      await loginStudent.mutateAsync({
        email: email.trim(),
        password,
      });
      toast.success('Welcome back');
      navigate('/student');
    } catch (error) {
      if (error instanceof ApiError) {
        const errors = getFieldErrors(error);
        if (Object.keys(errors).length > 0) setFieldErrors(errors);
        const message = error.message || 'Invalid credentials';
        setFormError(message);
        toast.error(message);
      } else {
        setFormError('Unable to sign in');
        toast.error('Unable to sign in');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">MedEdPrep</p>
            <CardTitle className="text-2xl">Student Login</CardTitle>
            <CardDescription>Sign in to view your assessments and review results.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sign-in failed</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                {fieldErrors.email && <p className="text-sm text-rose-600">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                {fieldErrors.password && (
                  <p className="text-sm text-rose-600">{fieldErrors.password}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loginStudent.isPending}>
                {loginStudent.isPending ? 'Signing In...' : 'Login'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Need an account?{' '}
              <Link to="/create-account" className="font-medium text-primary underline">
                Create one
              </Link>
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Are you an instructor?{' '}
              <Link to="/login" className="font-medium text-primary underline">
                Sign in here
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
