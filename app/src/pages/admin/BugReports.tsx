import { useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useBugReports, useUpdateBugReport } from '@/hooks/useBugReports';
import type { BugReport } from '@/types/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function CategoryBadge({ category }: { category: BugReport['category'] }) {
  const variants = {
    bug: 'bg-red-100 text-red-800 hover:bg-red-100',
    feedback: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    feature_request: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  };

  const labels = {
    bug: 'Bug',
    feedback: 'Feedback',
    feature_request: 'Feature Request',
  };

  return <Badge className={variants[category]}>{labels[category]}</Badge>;
}

function SeverityBadge({ severity }: { severity: BugReport['severity'] }) {
  const variants = {
    critical: 'bg-red-600 text-white hover:bg-red-600',
    high: 'bg-orange-500 text-white hover:bg-orange-500',
    medium: 'bg-yellow-500 text-white hover:bg-yellow-500',
    low: 'bg-gray-400 text-white hover:bg-gray-400',
  };

  const labels = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };

  return <Badge className={variants[severity]}>{labels[severity]}</Badge>;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export default function BugReports() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<
    'pending' | 'acknowledged' | 'resolved' | 'closed' | undefined
  >(undefined);
  const limit = 20;

  const { data, isLoading, isError, error } = useBugReports(page, limit, status);
  const updateBugReport = useUpdateBugReport();

  const reports = data?.data.reports || [];
  const pagination = data?.data
    ? {
        page: data.data.page,
        limit: data.data.limit,
        total: data.data.total,
        totalPages: data.data.totalPages,
      }
    : undefined;

  const handleStatusChange = async (
    reportId: string,
    newStatus: 'pending' | 'acknowledged' | 'resolved' | 'closed',
  ) => {
    try {
      await updateBugReport.mutateAsync({ id: reportId, status: newStatus });
      toast.success('Bug report status updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Bug Reports</h1>
            <p className="text-sm text-muted-foreground">
              View and manage user-submitted bug reports, feedback, and feature requests.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filter by status:</span>
            <Select
              value={status || 'all'}
              onValueChange={(v) => {
                setStatus(v === 'all' ? undefined : (v as typeof status));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
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
            <AlertTitle>Unable to load bug reports</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Try again.'}
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !isError && reports.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No bug reports found.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && reports.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Category</TableHead>
                    <TableHead className="w-[100px]">Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[150px]">Reporter</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[180px]">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <CategoryBadge category={report.category} />
                      </TableCell>
                      <TableCell>
                        <SeverityBadge severity={report.severity} />
                      </TableCell>
                      <TableCell>
                        <p className="line-clamp-2 text-sm">{truncate(report.description, 150)}</p>
                      </TableCell>
                      <TableCell>
                        {report.reporterName ? (
                          <div>
                            <p className="text-sm font-medium">{report.reporterName}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {report.reporterType}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground capitalize">
                            {report.reporterType}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={report.status}
                          onValueChange={(value) =>
                            handleStatusChange(
                              report.id,
                              value as 'pending' | 'acknowledged' | 'resolved' | 'closed',
                            )
                          }
                        >
                          <SelectTrigger className="w-[140px] capitalize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="acknowledged">Acknowledged</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(report.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)}{' '}
                    of {pagination.total} reports
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
