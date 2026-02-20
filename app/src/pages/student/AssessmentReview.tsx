import { useRef, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, CircleX, ArrowLeft, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  useAssessmentReview,
  usePeerStatsByResponse,
  type PeerStats,
} from '../../hooks/useStudentAuth';
import { ApiError } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

type QuestionFilter = 'all' | 'incorrect' | 'correct';

function splitAnswer(answer: string): string[] {
  if (!answer.trim()) return [];
  return answer
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function answerLabel(value: string, choices: Array<{ value: string; text: string }>): string {
  const found = choices.find((choice) => choice.value === value);
  return found ? found.text : value;
}

export default function AssessmentReview() {
  const { responseId } = useParams<{ responseId: string }>();
  const safeResponseId = responseId ?? '';
  const reviewQuery = useAssessmentReview(safeResponseId);

  if (!responseId) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Alert variant="destructive">
            <AlertTitle>Invalid review link</AlertTitle>
            <AlertDescription>The requested assessment response was not found.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (reviewQuery.isPending) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  const reviewNotAllowed =
    reviewQuery.error instanceof ApiError && reviewQuery.error.code === 'REVIEW_NOT_ALLOWED';

  if (reviewQuery.isError || !reviewQuery.data) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-4">
          <Alert variant="destructive">
            <AlertTitle>Unable to load review</AlertTitle>
            <AlertDescription>
              {reviewNotAllowed
                ? 'Review is not available for this assessment.'
                : reviewQuery.error instanceof ApiError
                  ? reviewQuery.error.message
                  : 'Please return to your dashboard and try again.'}
            </AlertDescription>
          </Alert>
          <Button asChild variant="outline">
            <Link to="/student">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const review = reviewQuery.data;

  return <AssessmentReviewContent review={review} responseId={safeResponseId} />;
}

// ============================================
// Class Performance Card
// ============================================

function ClassPerformanceCard({
  peerStats,
  studentScore,
}: {
  peerStats: PeerStats;
  studentScore: number;
}) {
  if (peerStats.insufficientData || !peerStats.classAverage || !peerStats.scoreDistribution) {
    return null;
  }

  const scoreDiff = studentScore - peerStats.classAverage;
  const isAboveAvg = scoreDiff > 0;
  const isAtAvg = scoreDiff === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Class Performance</CardTitle>
        </div>
        <CardDescription>
          How your score compares to {peerStats.totalResponses} total responses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Score comparison bars */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Your Score</span>
              <span className="font-semibold">{studentScore.toFixed(1)}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#1b5fd0] transition-all"
                style={{ width: `${Math.min(studentScore, 100)}%` }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Class Average</span>
              <span className="font-semibold">{peerStats.classAverage.toFixed(1)}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-400 transition-all"
                style={{ width: `${Math.min(peerStats.classAverage, 100)}%` }}
              />
            </div>
          </div>
          {peerStats.classMedian !== null && (
            <p className="text-xs text-muted-foreground">
              Class median: {peerStats.classMedian.toFixed(1)}%
            </p>
          )}
        </div>

        {/* Percentile text */}
        {peerStats.percentile !== null && (
          <div
            className={[
              'rounded-md border p-3 text-sm',
              isAboveAvg
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : isAtAvg
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800',
            ].join(' ')}
          >
            <p className="font-medium">
              {peerStats.percentile === 0
                ? 'Your score is at the bottom of the class distribution.'
                : peerStats.percentile === 100
                  ? 'You scored higher than all other students!'
                  : `You scored better than ${peerStats.percentile}% of students.`}
            </p>
          </div>
        )}

        {/* Score distribution histogram */}
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">Score Distribution</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={peerStats.scoreDistribution}
              margin={{ top: 5, right: 5, bottom: 5, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 10 }}
                tickLine={false}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={45}
              />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} allowDecimals={false} />
              <Tooltip
                formatter={(value) => [value, 'Students']}
                labelFormatter={(label) => `Score: ${label}%`}
              />
              <Bar dataKey="count" fill="#1b5fd0" radius={[2, 2, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function AssessmentReviewContent({
  review,
  responseId,
}: {
  review: NonNullable<ReturnType<typeof useAssessmentReview>['data']>;
  responseId: string;
}) {
  const peerStatsQuery = usePeerStatsByResponse(responseId);
  const [filter, setFilter] = useState<QuestionFilter>('all');
  const resultsRef = useRef<HTMLDivElement>(null);

  const correctCount = useMemo(
    () => review.questions.filter((q) => q.isCorrect).length,
    [review.questions],
  );
  const incorrectCount = review.questions.length - correctCount;

  const filteredQuestions = useMemo(() => {
    return review.questions
      .map((question, index) => ({ question, originalIndex: index }))
      .filter(({ question }) => {
        if (filter === 'correct') return question.isCorrect;
        if (filter === 'incorrect') return !question.isCorrect;
        return true;
      });
  }, [review.questions, filter]);

  const filterButtons: { value: QuestionFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All Questions', count: review.questions.length },
    { value: 'incorrect', label: 'Incorrect', count: incorrectCount },
    { value: 'correct', label: 'Correct', count: correctCount },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline">
            <Link to="/student">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to My Assessments
            </Link>
          </Button>
          <Badge className="bg-primary text-primary-foreground">{review.scorePercentage}%</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{review.assessment.title}</CardTitle>
            {review.assessment.description && (
              <CardDescription>{review.assessment.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-base font-medium">
              {review.totalCorrect} correct out of {review.totalQuestions} ({review.scorePercentage}
              %)
            </p>
          </CardContent>
        </Card>

        {/* Class Performance */}
        {peerStatsQuery.isPending && <Skeleton className="h-64 w-full" />}
        {peerStatsQuery.data && !peerStatsQuery.data.insufficientData && (
          <ClassPerformanceCard
            peerStats={peerStatsQuery.data}
            studentScore={Number(review.scorePercentage)}
          />
        )}

        {/* Filter bar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1"
            role="group"
            aria-label="Filter questions"
          >
            {filterButtons.map((btn) => (
              <button
                key={btn.value}
                type="button"
                onClick={() => {
                  setFilter(btn.value);
                  resultsRef.current?.focus();
                }}
                aria-pressed={filter === btn.value}
                className={[
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  filter === btn.value
                    ? 'bg-background text-foreground shadow'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {btn.label}
                <Badge
                  variant="secondary"
                  className={[
                    'ml-0.5 px-1.5 py-0 text-xs',
                    filter === btn.value ? 'bg-primary/10 text-primary' : '',
                  ].join(' ')}
                >
                  {btn.count}
                </Badge>
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-600" aria-live="polite">
            {filter !== 'all'
              ? `Showing ${filteredQuestions.length} of ${review.questions.length} questions`
              : `${review.questions.length} questions`}
          </p>
        </div>

        <div ref={resultsRef} tabIndex={-1} className="outline-none">
          {filteredQuestions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {filter === 'incorrect'
                  ? 'No incorrect answers -- great job!'
                  : 'No correct answers to display.'}
              </CardContent>
            </Card>
          ) : (
            filteredQuestions.map(({ question, originalIndex }) => {
              const studentValues = splitAnswer(String(question.studentAnswer ?? ''));
              const correctValues = splitAnswer(String(question.correctAnswer ?? ''));

              const studentAnswerText =
                studentValues.length > 0
                  ? studentValues.map((value) => answerLabel(value, question.choices)).join(', ')
                  : 'No answer provided';
              const correctAnswerText =
                correctValues.length > 0
                  ? correctValues.map((value) => answerLabel(value, question.choices)).join(', ')
                  : 'N/A';

              return (
                <Card key={question.questionName}>
                  <CardHeader className="space-y-2">
                    <CardDescription>
                      Question {originalIndex + 1} of {review.questions.length}
                    </CardDescription>
                    <CardTitle className="text-lg leading-snug">{question.questionTitle}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {question.choices.map((choice) => {
                        const isCorrect = correctValues.includes(choice.value);
                        const studentSelected = studentValues.includes(choice.value);
                        const studentWrong = studentSelected && !isCorrect;

                        return (
                          <li
                            key={choice.value}
                            className={[
                              'flex items-center gap-3 rounded-md border p-3 text-sm',
                              isCorrect && 'border-emerald-300 bg-emerald-50 text-emerald-900',
                              studentWrong && 'border-rose-300 bg-rose-50 text-rose-900',
                              !isCorrect &&
                                !studentWrong &&
                                'border-slate-200 bg-white text-slate-700',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {isCorrect ? (
                              <CheckCircle2
                                className="h-4 w-4 text-emerald-700"
                                aria-label="Correct answer"
                              />
                            ) : studentWrong ? (
                              <CircleX
                                className="h-4 w-4 text-rose-700"
                                aria-label="Your incorrect answer"
                              />
                            ) : (
                              <Circle className="h-4 w-4 text-slate-400" aria-hidden="true" />
                            )}
                            <span>{choice.text}</span>
                          </li>
                        );
                      })}
                    </ul>

                    <Separator />

                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-semibold">Your answer:</span> {studentAnswerText}
                      </p>
                      <p>
                        <span className="font-semibold">Correct answer:</span> {correctAnswerText}
                      </p>
                    </div>

                    {question.explanation && (
                      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                        <p className="font-semibold">Explanation</p>
                        <p className="mt-1">{question.explanation}</p>
                        {question.pageNumber && (
                          <p className="mt-2 text-xs">Reference: {question.pageNumber}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
