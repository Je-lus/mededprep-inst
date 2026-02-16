import { Fragment, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { QuestionAnalysis } from '@/types/api';
import { normalizePercent, pbsClass } from './utils';

function QuestionDetail({ question }: { question: QuestionAnalysis }) {
  return (
    <div className="space-y-4 py-2">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Question</p>
        <p className="mt-1">{question.questionTitle}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {question.chapter && <Badge variant="outline">Chapter: {question.chapter}</Badge>}
        {typeof question.difficulty === 'number' && (
          <Badge variant="outline">Difficulty: {question.difficulty}</Badge>
        )}
        <Badge variant="outline">Responses: {question.totalResponses}</Badge>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Choice Distribution</p>
        {question.choiceDistribution.length === 0 && (
          <p className="text-sm text-muted-foreground">No choice distribution available.</p>
        )}
        {question.choiceDistribution.map((choice) => {
          const percent = normalizePercent(choice.percent);
          const isCorrect = String(choice.value) === String(question.correctAnswer);

          return (
            <div
              key={`${question.questionName}-${choice.value}`}
              className={cn(
                'rounded border p-2',
                isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="truncate">
                  {choice.text || choice.value}
                  {isCorrect && (
                    <span className="ml-1 inline-flex items-center text-emerald-700">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Correct
                    </span>
                  )}
                </span>
                <span>
                  {percent.toFixed(1)}% ({choice.count})
                </span>
              </div>
              <div className="h-2 rounded bg-muted">
                <div
                  className={cn('h-2 rounded bg-gray-300', isCorrect && 'bg-emerald-600')}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ItemAnalysisTab({
  questions,
  totalResponses,
  averageScore,
  totalQuestions,
  isLoading,
  isError,
  error,
}: {
  questions: QuestionAnalysis[];
  totalResponses: number;
  averageScore: number;
  totalQuestions: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}) {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Responses</CardDescription>
            <CardTitle>{totalResponses}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Score</CardDescription>
            <CardTitle>
              {averageScore ? `${normalizePercent(averageScore).toFixed(1)}%` : '-'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Questions</CardDescription>
            <CardTitle>{totalQuestions || '-'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Question Analysis</CardTitle>
          <CardDescription>Click a row to inspect choice distribution and metadata.</CardDescription>
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
              <AlertTitle>Unable to load item analysis</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : 'Try again later.'}
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && questions.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Question Code</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead className="w-[130px] text-right">% Correct</TableHead>
                  <TableHead className="w-[140px] text-right">Point-Biserial</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((question) => {
                  const isExpanded = expandedQuestion === question.questionName;
                  const percentCorrect = normalizePercent(question.percentCorrect);

                  return (
                    <Fragment key={question.questionName}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() =>
                          setExpandedQuestion(isExpanded ? null : question.questionName)
                        }
                      >
                        <TableCell>{question.questionCode || question.questionName}</TableCell>
                        <TableCell className="max-w-[460px] truncate">
                          {question.questionTitle}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-medium',
                            percentCorrect >= 70
                              ? 'text-emerald-700'
                              : percentCorrect >= 50
                              ? 'text-amber-600'
                              : 'text-red-600',
                          )}
                        >
                          {percentCorrect.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              'inline-flex rounded px-2 py-0.5 text-xs font-semibold',
                              pbsClass(question.pointBiserial),
                            )}
                          >
                            {question.pointBiserial.toFixed(3)}
                          </span>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={4} className="bg-muted/20 p-4">
                            <Card className="bg-white shadow-sm">
                              <CardContent className="pt-6">
                                <QuestionDetail question={question} />
                              </CardContent>
                            </Card>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
