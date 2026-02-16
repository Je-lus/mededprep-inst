import { toast } from 'sonner';
import { Users } from 'lucide-react';
import {
  useUpdateAttendee,
  useCheckInAttendee,
  useCheckOutAttendee,
} from '../../../hooks/useAttendance';
import { ATTENDEE_STATUS_LABELS } from '../../../lib/constants';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import EmptyState from '../../../components/EmptyState';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import type { SessionDetail, SessionAttendee } from '../../../types/api';

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(inAt: string, outAt: string) {
  const ms = new Date(outAt).getTime() - new Date(inAt).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

interface AttendeeSectionProps {
  session: SessionDetail;
}

export default function AttendeeSection({ session }: AttendeeSectionProps) {
  const updateAttendee = useUpdateAttendee();
  const checkInAttendee = useCheckInAttendee();
  const checkOutAttendee = useCheckOutAttendee();

  const attendees = session.attendees || [];
  const total = attendees.length;
  const checkedIn = attendees.filter(
    (a: SessionAttendee) => a.status === 'checked_in' || a.status === 'attended'
  ).length;
  const checkedOut = attendees.filter((a: SessionAttendee) => a.checkedOutAt).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendees ({total})</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Attendance Stats Banner */}
        {total > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{total}</div>
              <div className="text-xs text-muted-foreground">Registered</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{checkedIn}</div>
              <div className="text-xs text-muted-foreground">Checked In</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{checkedOut}</div>
              <div className="text-xs text-muted-foreground">Checked Out</div>
            </div>
          </div>
        )}

        {total === 0 ? (
          <EmptyState
            icon={Users}
            title="No attendees yet"
            description="Students will appear here once they check in to this session."
            compact
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Check-In / Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendees.map((a: SessionAttendee) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {a.student.firstName} {a.student.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.student.email}</TableCell>
                  <TableCell>
                    <div className="text-xs space-y-0.5">
                      {a.checkedInAt ? (
                        <div className="text-green-700">In: {formatTime(a.checkedInAt)}</div>
                      ) : (
                        <div className="text-muted-foreground">{'\u2013'}</div>
                      )}
                      {a.checkedOutAt && (
                        <div className="text-blue-700">Out: {formatTime(a.checkedOutAt)}</div>
                      )}
                      {a.checkedInAt && a.checkedOutAt && (
                        <div className="text-muted-foreground">
                          ({formatDuration(a.checkedInAt, a.checkedOutAt)})
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <select
                      value={a.status}
                      onChange={(e) => {
                        updateAttendee.mutate(
                          { sessionId: session.id, attendeeId: a.id, status: e.target.value },
                          {
                            onSuccess: () => toast.success('Status updated'),
                          }
                        );
                      }}
                      className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm"
                    >
                      {Object.entries(ATTENDEE_STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {a.status === 'registered' && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                        onClick={() =>
                          checkInAttendee.mutate(
                            { sessionId: session.id, attendeeId: a.id },
                            {
                              onSuccess: () => toast.success('Checked in'),
                            }
                          )
                        }
                      >
                        Check In
                      </Button>
                    )}
                    {a.status === 'checked_in' && !a.checkedOutAt && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() =>
                          checkOutAttendee.mutate(
                            { sessionId: session.id, attendeeId: a.id },
                            {
                              onSuccess: () => toast.success('Checked out'),
                            }
                          )
                        }
                      >
                        Check Out
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
