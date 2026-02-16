import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useSessionInfo,
  useRegisterAttendee,
  useLookupStudent,
} from '../../hooks/usePublicAttendance';
import { formatDate } from '../../lib/utils';
import { toast } from 'sonner';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { AttendeeRegistrationResult } from '../../types/api';

export default function AttendSession() {
  const { hash } = useParams<{ hash: string }>();
  const { data: session, isLoading, error } = useSessionInfo(hash!);
  const register = useRegisterAttendee(hash!);
  const lookupStudent = useLookupStudent(hash!);

  const [step, setStep] = useState<'info' | 'lookup' | 'register' | 'done'>('info');
  const [lookupEmail, setLookupEmail] = useState('');
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
  });
  const [, setResult] = useState<AttendeeRegistrationResult | null>(null);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    lookupStudent.mutate(lookupEmail, {
      onSuccess: (data) => {
        if (data.found && data.student) {
          setForm({
            email: data.student.email,
            firstName: data.student.firstName,
            lastName: data.student.lastName,
          });
          toast.success(`Welcome back, ${data.student.firstName}!`);
        } else {
          setForm((f) => ({ ...f, email: lookupEmail }));
        }
        setStep('register');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate(form, {
      onSuccess: (data) => {
        setResult(data);
        setStep('done');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="text-red-500 text-xl font-bold mb-2">Session Not Found</div>
            <p className="text-gray-500">This session is not available or the link is invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{session.name}</CardTitle>
            {session.org?.name && <CardDescription>Hosted by {session.org.name}</CardDescription>}
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 space-y-1">
              {session.startDateTime && <div>Date: {formatDate(session.startDateTime)}</div>}
              {session.startDateTime && (
                <div>
                  Time:{' '}
                  {new Date(session.startDateTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {session.endDateTime &&
                    ` - ${new Date(session.endDateTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`}
                </div>
              )}
            </div>
            {session.description && (
              <p className="text-gray-600 mt-3 text-sm">{session.description}</p>
            )}
          </CardContent>
        </Card>

        {step === 'info' &&
          (session.checkInWindow && !session.checkInWindow.allowed ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-amber-600 text-4xl mb-4">&#9201;</div>
                <h2 className="text-lg font-bold mb-2">Check-In Not Available</h2>
                <p className="text-gray-500">{session.checkInWindow.reason}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <Button size="lg" className="w-full" onClick={() => setStep('lookup')}>
                Register &amp; Check In
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Attended a session before? We'll look you up by email to speed things up.
              </p>
            </div>
          ))}

        {step === 'lookup' && (
          <Card>
            <form onSubmit={handleLookup}>
              <CardHeader>
                <CardTitle className="text-lg">Quick Check-In</CardTitle>
                <CardDescription>
                  Enter your email to see if we already have your info on file.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="lookupEmail">Email Address *</Label>
                  <Input
                    id="lookupEmail"
                    type="email"
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>
              </CardContent>
              <CardFooter className="space-x-3">
                <Button type="submit" disabled={lookupStudent.isPending}>
                  {lookupStudent.isPending ? 'Looking up...' : 'Continue'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setStep('info')}>
                  Back
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {step === 'register' && (
          <Card>
            <form onSubmit={handleRegister}>
              <CardHeader>
                <CardTitle className="text-lg">Registration</CardTitle>
                {form.firstName && (
                  <CardDescription>
                    Welcome back, {form.firstName}! Confirm your details below.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={form.firstName}
                      onChange={set('firstName')}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={form.lastName}
                      onChange={set('lastName')}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="space-x-3">
                <Button type="submit" disabled={register.isPending}>
                  {register.isPending ? 'Registering...' : 'Submit & Check In'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setStep('lookup')}>
                  Back
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {step === 'done' && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-green-600 text-4xl mb-4">&#10003;</div>
              <h2 className="text-xl font-bold mb-2">You're Checked In!</h2>
              <p className="text-gray-500 mb-4">
                You have been registered and checked in for this session.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
