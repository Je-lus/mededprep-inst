import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Plus } from 'lucide-react';
import { useAssessments } from '@/hooks/useAssessments';
import type { Assessment, SurveyElement, SurveyJson } from '@/types/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function getQuestionCount(assessment: Assessment) {
  const survey = (assessment as Assessment & { surveyJson?: SurveyJson }).surveyJson;
  if (!survey || typeof survey !== 'object' || !Array.isArray(survey.pages)) return 0;

  return survey.pages.reduce((total, page) => {
    if (!Array.isArray(page?.elements)) return total;
    return total + page.elements.filter((el: SurveyElement | undefined) => !!el?.name).length;
  }, 0);
}

function statusBadge(status: Assessment['status']) {
  if (status === 'active') {
    return <Badge className="bg-[#1b5fd0] text-white hover:bg-[#1b5fd0]">Active</Badge>;
  }
  if (status === 'closed') {
    return <Badge variant="secondary">Closed</Badge>;
  }
  return <Badge variant="outline">Draft</Badge>;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

export default function AssessmentList() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useAssessments();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Assessments</h1>
            <p className="text-sm text-muted-foreground">
              Manage draft, active, and closed assessments.
            </p>
          </div>
          <Button asChild className="bg-[#1b5fd0] hover:bg-[#1b5fd0]/90">
            <Link to="/assessments/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Assessment
            </Link>
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
            <AlertTitle>Unable to load assessments</AlertTitle>
            <AlertDescription>{error instanceof Error ? error.message : 'Try again.'}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !isError && data && data.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No assessments yet</CardTitle>
              <CardDescription>Create your first assessment to begin collecting responses.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="bg-[#1b5fd0] hover:bg-[#1b5fd0]/90">
                <Link to="/assessments/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Assessment
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && data && data.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px] text-right">Questions</TableHead>
                    <TableHead className="w-[120px] text-right">Responses</TableHead>
                    <TableHead className="w-[140px]">Created</TableHead>
                    <TableHead className="w-[110px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((assessment) => (
                    <TableRow
                      key={assessment.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/assessments/${assessment.id}`)}
                    >
                      <TableCell>
                        <p className="font-medium">{assessment.title}</p>
                        {assessment.description && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {assessment.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(assessment.status)}</TableCell>
                      <TableCell className="text-right">{getQuestionCount(assessment)}</TableCell>
                      <TableCell className="text-right">{assessment._count?.responses ?? 0}</TableCell>
                      <TableCell>{formatDate(assessment.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/assessments/${assessment.id}`);
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
      </main>
    </div>
  );
}
