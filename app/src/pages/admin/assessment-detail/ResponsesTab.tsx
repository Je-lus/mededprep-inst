import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import { PaginationControls } from '@/components/PaginationControls';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import type { AssessmentResponse } from '@/types/api';
import { formatDateTime, formatTimeTaken } from './utils';
import { ResponseDetailDialog } from './ResponseDetailDialog';

export function ResponsesTab({
  assessmentId,
  responses,
  total,
  page,
  limit,
  isLoading,
  isError,
  error,
  isLive,
  onPrevious,
  onNext,
}: {
  assessmentId: string;
  responses: AssessmentResponse[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isLive?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle>Responses</CardTitle>
          {isLive && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live &mdash; updating every 10s
            </span>
          )}
        </div>
        <CardDescription>Submitted student assessments and outcomes.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load responses</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Try again later.'}
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !isError && total === 0 && (
          <EmptyState
            compact
            title="No responses yet"
            description="Student submissions will appear here once the assessment is taken."
          />
        )}

        {!isLoading && !isError && total > 0 && (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[90px] text-right">Score</TableHead>
                  <TableHead className="w-[90px]">Passed</TableHead>
                  <TableHead className="w-[120px]">Time Taken</TableHead>
                  <TableHead className="w-[180px]">Completed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((response) => (
                  <TableRow
                    key={response.id}
                    onClick={() => setSelectedResponseId(response.id)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{response.studentName || '-'}</TableCell>
                    <TableCell>{response.studentEmail || '-'}</TableCell>
                    <TableCell className="text-right">{response.scorePercentage ?? '-'}</TableCell>
                    <TableCell>
                      {typeof response.passed === 'boolean' ? (
                        <Badge
                          className={cn(
                            response.passed
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-red-100 text-red-700 hover:bg-red-100',
                          )}
                        >
                          {response.passed ? 'Pass' : 'Fail'}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{formatTimeTaken(response.timeTaken)}</TableCell>
                    <TableCell>{formatDateTime(response.completedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <PaginationControls
              total={total}
              page={page}
              limit={limit}
              onPrevious={onPrevious}
              onNext={onNext}
            />
          </div>
        )}
      </CardContent>

      {selectedResponseId && (
        <ResponseDetailDialog
          open={!!selectedResponseId}
          onOpenChange={(open) => !open && setSelectedResponseId(null)}
          assessmentId={assessmentId}
          responseId={selectedResponseId}
        />
      )}
    </Card>
  );
}
