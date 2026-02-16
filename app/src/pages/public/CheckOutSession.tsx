import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSessionInfo, useCheckOutSelf } from '../../hooks/usePublicAttendance';
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

export default function CheckOutSession() {
  const { hash } = useParams<{ hash: string }>();
  const { data: session, isLoading, error } = useSessionInfo(hash!);
  const checkOut = useCheckOutSelf(hash!);

  const [email, setEmail] = useState('');
  const [result, setResult] = useState<{
    studentName: string;
    checkedOutAt: string;
    alreadyCheckedOut: boolean;
  } | null>(null);

  const handleCheckOut = (e: React.FormEvent) => {
    e.preventDefault();
    checkOut.mutate(email, {
      onSuccess: (data) => {
        setResult(data);
        if (data.alreadyCheckedOut) {
          toast.info('You were already checked out.');
        } else {
          toast.success('Successfully checked out!');
        }
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

  const windowClosed = session.checkOutWindow && !session.checkOutWindow.allowed;

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
          </CardContent>
        </Card>

        {windowClosed ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-amber-600 text-4xl mb-4">&#9201;</div>
              <h2 className="text-lg font-bold mb-2">Check-Out Not Available</h2>
              <p className="text-gray-500">{session.checkOutWindow?.reason}</p>
            </CardContent>
          </Card>
        ) : !result ? (
          <Card>
            <form onSubmit={handleCheckOut}>
              <CardHeader>
                <CardTitle className="text-lg">Check Out</CardTitle>
                <CardDescription>Enter your email to check out of this session.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={checkOut.isPending} className="w-full">
                  {checkOut.isPending ? 'Checking out...' : 'Check Out'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-blue-600 text-4xl mb-4">&#10003;</div>
              <h2 className="text-xl font-bold mb-2">
                {result.alreadyCheckedOut ? 'Already Checked Out' : "You're Checked Out!"}
              </h2>
              <p className="text-gray-600 mb-2">{result.studentName}</p>
              <p className="text-sm text-muted-foreground">
                Checked out at{' '}
                {new Date(result.checkedOutAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Thank you for attending! Your attendance has been recorded.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
