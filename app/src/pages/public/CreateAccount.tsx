import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useStudentRegister } from '../../hooks/useStudentAuth';
import { ApiError, getFieldErrors } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CreateAccount() {
  const navigate = useNavigate();
  const registerStudent = useStudentRegister();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});

    if (password.length < 6) {
      setFieldErrors((current) => ({ ...current, password: 'Password must be at least 6 characters' }));
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setFieldErrors((current) => ({
        ...current,
        confirmPassword: 'Passwords do not match',
      }));
      toast.error('Passwords do not match');
      return;
    }

    try {
      await registerStudent.mutateAsync({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
      });
      toast.success('Account created');
      navigate('/student');
    } catch (error) {
      if (error instanceof ApiError) {
        const errors = getFieldErrors(error);
        if (Object.keys(errors).length > 0) setFieldErrors(errors);
        toast.error(error.message || 'Unable to create account');
      } else {
        toast.error('Unable to create account');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1b5fd0]">MedEdPrep</p>
            <CardTitle className="text-2xl">Create Student Account</CardTitle>
            <CardDescription>Save results and review your completed assessments.</CardDescription>
          </CardHeader>
          <CardContent>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                  />
                  {fieldErrors.firstName && <p className="text-sm text-rose-600">{fieldErrors.firstName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    required
                  />
                  {fieldErrors.lastName && <p className="text-sm text-rose-600">{fieldErrors.lastName}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                />
                {fieldErrors.password && <p className="text-sm text-rose-600">{fieldErrors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={6}
                  required
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-sm text-rose-600">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={registerStudent.isPending}>
                {registerStudent.isPending ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/student/login" className="font-medium text-[#1b5fd0] underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
