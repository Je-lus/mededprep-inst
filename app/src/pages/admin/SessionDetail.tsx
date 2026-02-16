import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useSession,
  useUpdateSession,
  useDeleteSession,
  usePublishSession,
} from '@/hooks/useAttendance';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AttendeeSection from './session-detail/AttendeeSection';
import QrCodeSection from './session-detail/QrCodeSection';

export default function SessionDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    startDateTime: '',
    endDateTime: '',
  });

  const sessionQuery = useSession(id);
  const session = sessionQuery.data;
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();
  const publishSession = usePublishSession();

  useEffect(() => {
    if (!session) return;
    setForm({
      name: session.name,
      description: session.description || '',
      startDateTime: session.startDateTime
        ? new Date(session.startDateTime).toISOString().slice(0, 16)
        : '',
      endDateTime: session.endDateTime
        ? new Date(session.endDateTime).toISOString().slice(0, 16)
        : '',
    });
  }, [session]);

  const handleUpdate = () => {
    updateSession.mutate(
      {
        id,
        name: form.name,
        description: form.description || undefined,
        startDateTime: form.startDateTime || undefined,
        endDateTime: form.endDateTime || undefined,
      },
      {
        onSuccess: () => toast.success('Session updated'),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handlePublish = () => {
    publishSession.mutate(id, {
      onSuccess: () => toast.success('Session published - QR codes are now active'),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleDelete = () => {
    deleteSession.mutate(id, {
      onSuccess: () => {
        toast.success('Session deleted');
        navigate('/sessions');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  if (sessionQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionQuery.isError || !session) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Unable to load session</AlertTitle>
        <AlertDescription>
          {sessionQuery.error instanceof Error ? sessionQuery.error.message : 'Try again.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/sessions')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-semibold">{session.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  session.isPublished ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {session.isPublished ? 'Published' : 'Draft'}
              </span>
              <span className="text-sm text-muted-foreground">
                {session.attendees?.length || 0} attendees
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!session.isPublished && (
            <Button onClick={handlePublish} className="bg-[#1b5fd0] hover:bg-[#1b5fd0]/90">
              Publish Session
            </Button>
          )}
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="qr-codes">QR Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Session Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
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
              <Button onClick={handleUpdate} disabled={updateSession.isPending}>
                {updateSession.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <AttendeeSection session={session} />
        </TabsContent>

        <TabsContent value="qr-codes" className="space-y-6">
          {session.isPublished ? (
            <QrCodeSection sessionId={session.id} sessionName={session.name} />
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <p>Publish this session to generate QR codes for check-in and check-out.</p>
                <Button onClick={handlePublish} className="mt-4 bg-[#1b5fd0] hover:bg-[#1b5fd0]/90">
                  Publish Session
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{session.name}"? This will permanently delete the
              session and all attendance records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
