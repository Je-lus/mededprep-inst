import { useAuthStore } from '../lib/auth';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssessments } from '@/hooks/useAssessments';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const org = useAuthStore((s) => s.org);
  const assessmentsQuery = useAssessments();

  const assessments = assessmentsQuery.data ?? [];
  const activeCount = assessments.filter((assessment) => assessment.status === 'active').length;
  const draftCount = assessments.filter((assessment) => assessment.status === 'draft').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Instructor Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Welcome back. Jump into assessment management and track response activity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>User Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="font-medium">Name:</span> {user?.name}
            </p>
            <p>
              <span className="font-medium">Email:</span> {user?.email}
            </p>
            <p>
              <span className="font-medium">Role:</span> {user?.role}
            </p>
          </CardContent>
        </Card>

        {org && (
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Name:</span> {org.name}
              </p>
              <p>
                <span className="font-medium">Slug:</span> {org.slug}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-[#1b5fd0]" />
                Assessments
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Create, publish, and monitor assessment performance.
              </p>
            </div>
            <Button asChild className="bg-[#1b5fd0] hover:bg-[#1b5fd0]/90">
              <Link to="/assessments">
                Open
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {assessmentsQuery.isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            )}

            {assessmentsQuery.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Unable to load assessment summary</AlertTitle>
                <AlertDescription>
                  {assessmentsQuery.error instanceof Error
                    ? assessmentsQuery.error.message
                    : 'Try again.'}
                </AlertDescription>
              </Alert>
            )}

            {!assessmentsQuery.isLoading && !assessmentsQuery.isError && (
              <>
                <p>
                  <span className="font-medium">Total:</span> {assessments.length}
                </p>
                <p>
                  <span className="font-medium">Active:</span> {activeCount}
                </p>
                <p>
                  <span className="font-medium">Draft:</span> {draftCount}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
