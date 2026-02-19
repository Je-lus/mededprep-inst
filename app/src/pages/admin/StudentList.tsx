import { useState } from 'react';
import { AlertCircle, GraduationCap, KeyRound } from 'lucide-react';
import { useStudents, useUpdateStudent, useResetStudentPassword } from '@/hooks/useStudents';
import type { Student } from '@/types/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

export default function StudentList() {
  const { data, isLoading, isError, error } = useStudents();
  const updateStudent = useUpdateStudent();
  const resetPassword = useResetStudentPassword();

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    isActive: true,
  });

  const [resetStudent, setResetStudent] = useState<Student | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [searchQuery, setSearchQuery] = useState('');

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setEditForm({
      firstName: student.firstName,
      lastName: student.lastName,
      isActive: student.isActive,
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    updateStudent.mutate(
      {
        id: editingStudent.id,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        isActive: editForm.isActive,
      },
      {
        onSuccess: () => {
          toast.success('Student updated');
          setEditingStudent(null);
        },
        onError: (err) => {
          toast.error(err.message);
        },
      },
    );
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetStudent) return;
    resetPassword.mutate(
      { id: resetStudent.id, password: newPassword },
      {
        onSuccess: () => {
          toast.success(`Password reset for ${resetStudent.firstName} ${resetStudent.lastName}`);
          setResetStudent(null);
          setNewPassword('');
        },
        onError: (err) => {
          toast.error(err.message);
        },
      },
    );
  };

  const filteredData = data?.filter((student) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      student.firstName.toLowerCase().includes(q) ||
      student.lastName.toLowerCase().includes(q) ||
      student.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Students</h1>
          <p className="text-sm text-muted-foreground">
            Manage student accounts and reset passwords.
          </p>
        </div>
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
          <AlertTitle>Unable to load students</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Try again.'}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title="No students yet"
          description="Students will appear here once they register or take an assessment."
        />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assessments</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData?.map((student: Student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.firstName} {student.lastName}
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <Badge variant={student.isActive ? 'default' : 'destructive'}>
                        {student.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{student.responseCount}</TableCell>
                    <TableCell>{formatDate(student.createdAt)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setResetStudent(student);
                          setNewPassword('');
                        }}
                      >
                        <KeyRound className="mr-1 h-3 w-3" />
                        Reset Password
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(student)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredData?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No students match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Student Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
              <DialogDescription>Update student details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name *</Label>
                <Input
                  id="edit-firstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name *</Label>
                <Input
                  id="edit-lastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-active">Status</Label>
                <Select
                  value={editForm.isActive ? 'active' : 'inactive'}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, isActive: value === 'active' })
                  }
                >
                  <SelectTrigger id="edit-active">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingStudent(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateStudent.isPending}>
                {updateStudent.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetStudent} onOpenChange={(open) => !open && setResetStudent(null)}>
        <DialogContent>
          <form onSubmit={handleResetPassword}>
            <DialogHeader>
              <DialogTitle>Reset Student Password</DialogTitle>
              <DialogDescription>
                Set a new password for{' '}
                <strong>
                  {resetStudent?.firstName} {resetStudent?.lastName}
                </strong>{' '}
                ({resetStudent?.email}).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password *</Label>
                <Input
                  id="new-password"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  The password is shown in plain text so you can share it with the student.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetStudent(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={resetPassword.isPending}>
                {resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
