import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useResponseDetail } from '@/hooks/useAssessments';
import type { ReviewQuestion } from '@/types/api';

function formatAnswer(answer: unknown): string {
  if (answer === null || answer === undefined) return '-';
  if (Array.isArray(answer)) return answer.join(', ');
  return String(answer);
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function QuestionCard({ question, timeSpent }: { question: ReviewQuestion; timeSpent?: number }) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm">{question.questionTitle}</h4>
        {timeSpent !== undefined && timeSpent !== null && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Time: {formatTime(timeSpent)}
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Student Answer: </span>
          <span
            className={cn('font-medium', question.isCorrect ? 'text-emerald-700' : 'text-red-700')}
          >
            {formatAnswer(question.studentAnswer)}
          </span>
        </div>

        <div>
          <span className="text-muted-foreground">Correct Answer: </span>
          <span className="font-medium text-emerald-700">
            {formatAnswer(question.correctAnswer)}
          </span>
        </div>

        {question.explanation && (
          <div className="pt-2 border-t">
            <span className="text-muted-foreground">Explanation: </span>
            <span>{question.explanation}</span>
          </div>
        )}

        {question.pageNumber && (
          <div>
            <span className="text-muted-foreground">Page: </span>
            <span>{question.pageNumber}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ResponseDetailDialog({
  open,
  onOpenChange,
  assessmentId,
  responseId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId: string;
  responseId: string;
}) {
  const { data, isLoading, isError, error } = useResponseDetail(assessmentId, responseId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Student Response Detail</DialogTitle>
          {data && (
            <DialogDescription>
              <div className="space-y-2 pt-2">
                <div>
                  <span className="font-medium">{data.response.studentName}</span>
                  <span className="text-muted-foreground"> ({data.response.studentEmail})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>
                    Score: {data.response.totalCorrect ?? 0}/{data.response.totalQuestions ?? 0}{' '}
                    correct
                    {data.response.scorePercentage && ` (${data.response.scorePercentage}%)`}
                  </span>
                  {typeof data.response.passed === 'boolean' && (
                    <Badge
                      className={cn(
                        data.response.passed
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-red-100 text-red-700 hover:bg-red-100',
                      )}
                    >
                      {data.response.passed ? 'Pass' : 'Fail'}
                    </Badge>
                  )}
                </div>
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unable to load response details</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : 'Try again later.'}
              </AlertDescription>
            </Alert>
          )}

          {data && (
            <div className="space-y-3">
              {data.questions.map((question) => (
                <QuestionCard
                  key={question.questionName}
                  question={question}
                  timeSpent={data.response.questionTimings?.[question.questionName]}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
