import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Plus, Calendar } from 'lucide-react';
import { useSessions, useCreateSession } from '@/hooks/useAttendance';
import type { Session } from '@/types/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

export default function SessionList() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useSessions();
  const createSession = useCreateSession();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    startDateTime: '',
    endDateTime: '',
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createSession.mutate(
      {
        name: form.name,
        description: form.description || undefined,
        startDateTime: form.startDateTime ? new Date(form.startDateTime).toISOString() : undefined,
        endDateTime: form.endDateTime ? new Date(form.endDateTime).toISOString() : undefined,
      },
      {
        onSuccess: (session) => {
          toast.success('Session created');
          setShowCreateDialog(false);
          setForm({ name: '', description: '', startDateTime: '', endDateTime: '' });
          navigate(`/sessions/${session.id}`);
        },
        onError: (err) => {
          toast.error(err.message);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Attendance Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Manage sessions with QR-based check-in and check-out tracking.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-primary-500 hover:bg-primary-500/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Session
        </Button>
      </div>

      {isLoading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-56" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load sessions</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Try again.'}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState
          icon={Calendar}
          title="No sessions yet"
          description="Create your first attendance session to begin tracking student attendance."
          action={
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-primary-500 hover:bg-primary-500/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Session
            </Button>
          }
        />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px] text-right">Attendees</TableHead>
                  <TableHead className="w-[140px]">Date</TableHead>
                  <TableHead className="w-[110px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((session: Session) => (
                  <TableRow
                    key={session.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/sessions/${session.id}`)}
                  >
                    <TableCell>
                      <p className="font-medium">{session.name}</p>
                      {session.description && (
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {session.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          session.isPublished
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {session.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{session._count?.attendees ?? 0}</TableCell>
                    <TableCell>
                      {session.startDateTime ? formatDate(session.startDateTime) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/sessions/${session.id}`);
                        }}
                      >
                        Open
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Session Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create New Session</DialogTitle>
              <DialogDescription>
                Set up a new attendance session with optional start and end times.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Session Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., EMT Refresher - Spring 2024"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional session description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="startDateTime">Start Date & Time</Label>
                  <Input
                    id="startDateTime"
                    type="datetime-local"
                    value={form.startDateTime}
                    onChange={(e) => setForm({ ...form, startDateTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDateTime">End Date & Time</Label>
                  <Input
                    id="endDateTime"
                    type="datetime-local"
                    value={form.endDateTime}
                    onChange={(e) => setForm({ ...form, endDateTime: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSession.isPending}>
                {createSession.isPending ? 'Creating...' : 'Create Session'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
