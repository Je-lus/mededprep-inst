import { Fragment, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
import type { AssessmentResponse, QuestionAnalysis } from '@/types/api';
import {
  computeResponseStats,
  computeScoreDistribution,
  normalizePercent,
  pbsClass,
} from './utils';

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
        {question.avgTimeSeconds !== null && question.avgTimeSeconds !== undefined && (
          <Badge variant="outline">
            Avg Time:{' '}
            {question.avgTimeSeconds < 60
              ? `${Math.round(question.avgTimeSeconds)}s`
              : `${Math.floor(question.avgTimeSeconds / 60)}m ${Math.round(question.avgTimeSeconds % 60)}s`}
          </Badge>
        )}
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
                isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white',
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
  isLive,
  allResponses,
  passingScore,
}: {
  questions: QuestionAnalysis[];
  totalResponses: number;
  averageScore: number;
  totalQuestions: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isLive?: boolean;
  allResponses?: AssessmentResponse[];
  passingScore?: number;
}) {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const effectivePassingScore = passingScore ?? 70;
  const normalizedAverage = averageScore ? normalizePercent(averageScore) : 0;

  const distribution = useMemo(
    () => computeScoreDistribution(allResponses ?? [], effectivePassingScore),
    [allResponses, effectivePassingScore],
  );

  const stats = useMemo(
    () => computeResponseStats(allResponses ?? [], effectivePassingScore),
    [allResponses, effectivePassingScore],
  );

  const hasAllResponses = (allResponses?.length ?? 0) > 0;
  const passRate = hasAllResponses
    ? (stats.passCount / (stats.passCount + stats.failCount)) * 100
    : 0;

  return (
    <div className="space-y-4">
      {isLive && (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live &mdash; updating every 10s
          </span>
        </div>
      )}

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Responses</CardDescription>
            <CardTitle>{totalResponses}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Score</CardDescription>
            <CardTitle
              className={cn(
                normalizedAverage > 0 && normalizedAverage >= effectivePassingScore
                  ? 'text-emerald-700'
                  : normalizedAverage > 0
                    ? 'text-red-600'
                    : '',
              )}
            >
              {normalizedAverage > 0 ? `${normalizedAverage.toFixed(1)}%` : '-'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pass Rate</CardDescription>
            <CardTitle>{hasAllResponses ? `${passRate.toFixed(1)}%` : '-'}</CardTitle>
            {hasAllResponses && (
              <div className="mt-1 h-2 rounded bg-muted">
                <div
                  className="h-2 rounded bg-emerald-600"
                  style={{ width: `${Math.min(passRate, 100)}%` }}
                />
              </div>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Score Range</CardDescription>
            <CardTitle>
              {hasAllResponses ? `${stats.min.toFixed(0)}% - ${stats.max.toFixed(0)}%` : '-'}
            </CardTitle>
            {hasAllResponses && (
              <p className="text-xs text-muted-foreground">Median: {stats.median.toFixed(1)}%</p>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Questions</CardDescription>
            <CardTitle>{totalQuestions || '-'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {hasAllResponses && (
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
            <CardDescription>
              {stats.passCount} passed, {stats.failCount} failed (passing: {effectivePassingScore}%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={distribution} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [value, 'Students']}
                  labelFormatter={(label) => `Score: ${label}`}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distribution.map((bucket) => (
                    <Cell key={bucket.range} fill={bucket.passing ? '#059669' : '#dc2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Question Analysis</CardTitle>
          <CardDescription>
            Click a row to inspect choice distribution and metadata.
          </CardDescription>
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
                  <TableHead className="w-[100px] text-right">Avg Time</TableHead>
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
                        <TableCell className="text-right text-muted-foreground">
                          {question.avgTimeSeconds !== null && question.avgTimeSeconds !== undefined
                            ? question.avgTimeSeconds < 60
                              ? `${Math.round(question.avgTimeSeconds)}s`
                              : `${Math.floor(question.avgTimeSeconds / 60)}m ${Math.round(question.avgTimeSeconds % 60)}s`
                            : '-'}
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
                          <TableCell colSpan={5} className="bg-muted/20 p-4">
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
