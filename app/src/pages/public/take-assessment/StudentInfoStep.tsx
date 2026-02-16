import { AlertCircle } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export function StudentInfoStep({
  title,
  description,
  questionCount,
  timeLimitMinutes,
  firstName,
  lastName,
  studentEmail,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onSubmit,
  isPending,
  isError,
  error,
}: {
  title: string;
  description?: string;
  questionCount: number;
  timeLimitMinutes?: number;
  firstName: string;
  lastName: string;
  studentEmail: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{title}</CardTitle>
          {description && <CardDescription className="text-base">{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-white p-3">
              <p className="text-xs uppercase text-muted-foreground">Questions</p>
              <p className="text-xl font-semibold">{questionCount}</p>
            </div>
            <div className="rounded-lg border bg-white p-3">
              <p className="text-xs uppercase text-muted-foreground">Time Limit</p>
              <p className="text-xl font-semibold">
                {timeLimitMinutes ? `${timeLimitMinutes} min` : 'No time limit'}
              </p>
            </div>
          </div>

          <Separator />

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(event) => onFirstNameChange(event.target.value)}
                  placeholder="Jane"
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(event) => onLastNameChange(event.target.value)}
                  placeholder="Doe"
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentEmail">Student Email</Label>
              <Input
                id="studentEmail"
                type="email"
                value={studentEmail}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="jane@example.com"
                autoComplete="email"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-primary-500 hover:bg-primary-500/90"
            >
              {isPending ? 'Starting...' : 'Begin Assessment'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to Start</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError ? error.message : 'Please try again.'}
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
