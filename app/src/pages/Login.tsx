import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getFieldErrors } from '../lib/api';
import { useAuthStore, type User, type OrgInfo } from '../lib/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await api.post<{ user: User; org?: OrgInfo }>('/api/auth/login', {
        email,
        password,
      });

      if (!res.success) {
        const errors = getFieldErrors(res.error);
        if (Object.keys(errors).length > 0) setFieldErrors(errors);
        toast.error(res.error?.message || 'Login failed');
        return;
      }

      login(res.data!.user, res.data!.org);
      toast.success('Welcome back!');
      navigate('/');
    } catch {
      toast.error('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">MedEdPrep</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {fieldErrors.email && <p className="text-sm text-red-500">{fieldErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {fieldErrors.password && (
                <p className="text-sm text-red-500">{fieldErrors.password}</p>
              )}
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground pt-2">
            Are you a student?{' '}
            <Link to="/student/login" className="font-medium text-primary underline">
              Sign in here
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
