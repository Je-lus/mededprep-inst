import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import { LogOut } from 'lucide-react';
import { useStudentAssessments } from '../../hooks/useStudentAuth';
import { useStudentAuthStore } from '../../lib/student-auth';
import { ApiError } from '../../lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PaginationControls } from '@/components/PaginationControls';
import { EmptyState } from '@/components/EmptyState';

function formatCompletedDate(value?: string): string {
  if (!value) return 'Not completed';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function scoreLabel(value?: string): string {
  if (!value) return 'N/A';
  return `${value}%`;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const student = useStudentAuthStore((state) => state.student);
  const logout = useStudentAuthStore((state) => state.logout);
  const [page, setPage] = useState(1);
  const limit = 10;
  const assessmentsQuery = useStudentAssessments(page, limit);
  const assessments = assessmentsQuery.data?.data ?? [];
  const total = assessmentsQuery.data?.pagination?.total ?? 0;
  const currentPage = assessmentsQuery.data?.pagination?.page ?? page;
  const currentLimit = assessmentsQuery.data?.pagination?.limit ?? limit;
  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/student/login');
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Student Portal
              </p>
              <CardTitle className="text-2xl">My Assessments</CardTitle>
              <CardDescription>
                Signed in as {student?.firstName} {student?.lastName}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="w-full sm:w-auto"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </CardHeader>
        </Card>

        {assessmentsQuery.isPending && (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {assessmentsQuery.isError && (
          <Alert variant="destructive">
            <AlertTitle>Unable to load assessments</AlertTitle>
            <AlertDescription>
              {assessmentsQuery.error instanceof ApiError
                ? assessmentsQuery.error.message
                : 'Please refresh and try again.'}
            </AlertDescription>
          </Alert>
        )}

        {!assessmentsQuery.isPending && !assessmentsQuery.isError && total === 0 && (
          <EmptyState
            title="No assessments yet"
            description="Complete an assessment from a QR code link and your results will appear here."
          />
        )}

        {!assessmentsQuery.isPending && !assessmentsQuery.isError && total > 0 && (
          <>
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assessment</TableHead>
                      <TableHead>Attempt</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessments.map((assessment) => (
                      <TableRow key={assessment.id}>
                        <TableCell className="font-medium">{assessment.assessmentTitle}</TableCell>
                        <TableCell>{assessment.attempt ?? '-'}</TableCell>
                        <TableCell>{scoreLabel(assessment.scorePercentage)}</TableCell>
                        <TableCell>
                          {assessment.passed === undefined ? (
                            <Badge variant="secondary">Pending</Badge>
                          ) : (
                            <Badge
                              className={
                                assessment.passed
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-rose-600 text-white'
                              }
                            >
                              {assessment.passed ? 'Passed' : 'Failed'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatCompletedDate(assessment.completedAt)}</TableCell>
                        <TableCell className="text-right">
                          {assessment.resultsReleased ? (
                            <Button asChild size="sm">
                              <Link to={`/student/review/${assessment.id}`}>Review</Link>
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">Results pending</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:hidden">
              {assessments.map((assessment) => (
                <Card key={assessment.id}>
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-base">{assessment.assessmentTitle}</CardTitle>
                    <CardDescription>{formatCompletedDate(assessment.completedAt)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Attempt</span>
                      <span className="font-medium">{assessment.attempt ?? '-'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-medium">{scoreLabel(assessment.scorePercentage)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      {assessment.passed === undefined ? (
                        <Badge variant="secondary">Pending</Badge>
                      ) : (
                        <Badge
                          className={
                            assessment.passed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                          }
                        >
                          {assessment.passed ? 'Passed' : 'Failed'}
                        </Badge>
                      )}
                    </div>
                    {assessment.resultsReleased ? (
                      <Button asChild className="w-full">
                        <Link to={`/student/review/${assessment.id}`}>Review</Link>
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">Results pending</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <PaginationControls
              total={total}
              page={currentPage}
              limit={currentLimit}
              onPrevious={() => setPage((current) => Math.max(current - 1, 1))}
              onNext={() => setPage((current) => current + 1)}
            />
          </>
        )}
      </div>
    </div>
  );
}
