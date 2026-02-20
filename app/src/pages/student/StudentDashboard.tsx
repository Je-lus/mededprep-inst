import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { ClipboardCheck, TrendingUp, Award, Trophy, ArrowUp } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  useStudentAssessments,
  useStudentStats,
  useClassAverages,
  type StudentAssessmentSummary,
  type ClassAveragesMap,
} from '../../hooks/useStudentAuth';
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

function formatShortDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function scoreLabel(value?: string): string {
  if (!value) return 'N/A';
  return `${value}%`;
}

function parseScore(value?: string): number {
  if (!value) return 0;
  const n = parseFloat(value);
  return Number.isNaN(n) ? 0 : n;
}

// ============================================
// Stats Cards Section
// ============================================

function StatsCards() {
  const statsQuery = useStudentStats();

  if (statsQuery.isPending) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (statsQuery.isError || !statsQuery.data) {
    return null;
  }

  const stats = statsQuery.data;
  const cards = [
    {
      label: 'Completed',
      value: String(stats.totalCompleted),
      icon: ClipboardCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Average Score',
      value: `${stats.averageScore.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Pass Rate',
      value: `${stats.passRate.toFixed(1)}%`,
      icon: Award,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Best Score',
      value: `${stats.bestScore.toFixed(1)}%`,
      icon: Trophy,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      aria-live="polite"
      aria-label="Performance statistics"
    >
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`rounded-lg p-2 ${card.bgColor}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-gray-600">{card.label}</p>
              <p className="text-xl font-bold">{card.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// Score Trend Chart
// ============================================

const PASSING_THRESHOLD = 70;

function ScoreTrendChart({ assessments }: { assessments: StudentAssessmentSummary[] }) {
  const chartData = useMemo(() => {
    // Sort chronologically (oldest first) for the trend line
    const sorted = [...assessments]
      .filter((a) => a.completedAt && a.scorePercentage)
      .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());

    return sorted.map((a, index) => ({
      index: index + 1,
      date: formatShortDate(a.completedAt),
      score: parseScore(a.scorePercentage),
      title: a.assessmentTitle,
    }));
  }, [assessments]);

  if (chartData.length < 2) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Score Trend</CardTitle>
        <CardDescription>Your assessment scores over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Score']}
              labelFormatter={(_label, payload) => {
                if (payload && payload.length > 0) {
                  return payload[0].payload.title;
                }
                return _label;
              }}
            />
            <ReferenceLine
              y={PASSING_THRESHOLD}
              stroke="#dc2626"
              strokeDasharray="6 4"
              label={{
                value: `${PASSING_THRESHOLD}% passing`,
                position: 'insideTopRight',
                fontSize: 11,
                fill: '#dc2626',
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#1b5fd0"
              strokeWidth={2}
              dot={{ fill: '#1b5fd0', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ============================================
// Attempt grouping helpers
// ============================================

interface GroupedAssessment {
  assessmentId: string;
  assessmentTitle: string;
  attempts: StudentAssessmentSummary[];
  bestAttemptId: string;
}

function groupByAssessment(assessments: StudentAssessmentSummary[]): GroupedAssessment[] {
  const groupMap = new Map<string, StudentAssessmentSummary[]>();
  const orderSeen: string[] = [];

  for (const a of assessments) {
    const key = a.assessmentId;
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
      orderSeen.push(key);
    }
    groupMap.get(key)!.push(a);
  }

  return orderSeen.map((key) => {
    const attempts = groupMap.get(key)!;
    // Sort attempts by attempt number ascending within the group
    const sorted = [...attempts].sort((a, b) => (a.attempt ?? 1) - (b.attempt ?? 1));
    // Find the best attempt (highest score)
    let bestId = sorted[0].id;
    let bestScore = parseScore(sorted[0].scorePercentage);
    for (const att of sorted) {
      const s = parseScore(att.scorePercentage);
      if (s > bestScore) {
        bestScore = s;
        bestId = att.id;
      }
    }
    return {
      assessmentId: key,
      assessmentTitle: attempts[0].assessmentTitle,
      attempts: sorted,
      bestAttemptId: bestId,
    };
  });
}

function getImprovementFromPrevious(
  group: GroupedAssessment,
  assessment: StudentAssessmentSummary,
): number | null {
  const idx = group.attempts.findIndex((a) => a.id === assessment.id);
  if (idx <= 0) return null;
  const prevScore = parseScore(group.attempts[idx - 1].scorePercentage);
  const curScore = parseScore(assessment.scorePercentage);
  const diff = curScore - prevScore;
  return diff > 0 ? Math.round(diff) : null;
}

// ============================================
// Assessment row rendering helpers
// ============================================

function ImprovementIndicator({ improvement }: { improvement: number | null }) {
  if (improvement === null || improvement <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
      <ArrowUp className="h-3 w-3" />+{improvement}%
    </span>
  );
}

function BestBadge() {
  return <Badge className="ml-1.5 bg-amber-100 text-amber-800 hover:bg-amber-100">Best</Badge>;
}

function ClassAvgLabel({
  assessmentId,
  classAverages,
}: {
  assessmentId: string;
  classAverages?: ClassAveragesMap;
}) {
  if (!classAverages) return null;
  const entry = classAverages[assessmentId];
  if (!entry) return null;
  return (
    <span className="ml-1.5 text-xs text-muted-foreground">
      (Class avg: {entry.classAverage.toFixed(1)}%)
    </span>
  );
}

// ============================================
// Main Dashboard
// ============================================

export default function StudentDashboard() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const assessmentsQuery = useStudentAssessments(page, limit);
  const assessments = assessmentsQuery.data?.data ?? [];
  const total = assessmentsQuery.data?.pagination?.total ?? 0;
  const currentPage = assessmentsQuery.data?.pagination?.page ?? page;
  const currentLimit = assessmentsQuery.data?.pagination?.limit ?? limit;

  // Fetch class averages for all unique assessmentIds on the current page
  const uniqueAssessmentIds = useMemo(
    () => [...new Set(assessments.map((a) => a.assessmentId))],
    [assessments],
  );
  const classAveragesQuery = useClassAverages(uniqueAssessmentIds);
  const classAverages = classAveragesQuery.data;

  const grouped = useMemo(() => groupByAssessment(assessments), [assessments]);

  // Build a lookup from assessment.id -> its group for quick access
  const groupLookup = useMemo(() => {
    const lookup = new Map<string, GroupedAssessment>();
    for (const g of grouped) {
      for (const a of g.attempts) {
        lookup.set(a.id, g);
      }
    }
    return lookup;
  }, [grouped]);

  return (
    <div className="px-4 py-8 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <h2 className="text-2xl font-semibold">My Assessments</h2>

        {/* Stats Cards */}
        <StatsCards />

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
            {/* Score Trend Chart */}
            <ScoreTrendChart assessments={assessments} />

            {/* Desktop Table */}
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
                    {assessments.map((assessment) => {
                      const group = groupLookup.get(assessment.id);
                      const isBest =
                        group && group.attempts.length > 1 && group.bestAttemptId === assessment.id;
                      const improvement = group
                        ? getImprovementFromPrevious(group, assessment)
                        : null;

                      return (
                        <TableRow key={assessment.id}>
                          <TableCell className="font-medium">
                            {assessment.assessmentTitle}
                            {isBest && <BestBadge />}
                          </TableCell>
                          <TableCell>{assessment.attempt ?? '-'}</TableCell>
                          <TableCell>
                            {scoreLabel(assessment.scorePercentage)}
                            <ImprovementIndicator improvement={improvement} />
                            <ClassAvgLabel
                              assessmentId={assessment.assessmentId}
                              classAverages={classAverages}
                            />
                          </TableCell>
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
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Mobile Cards */}
            <div className="grid gap-4 md:hidden">
              {assessments.map((assessment) => {
                const group = groupLookup.get(assessment.id);
                const isBest =
                  group && group.attempts.length > 1 && group.bestAttemptId === assessment.id;
                const improvement = group ? getImprovementFromPrevious(group, assessment) : null;

                return (
                  <Card key={assessment.id}>
                    <CardHeader className="space-y-2">
                      <CardTitle className="text-base">
                        {assessment.assessmentTitle}
                        {isBest && <BestBadge />}
                      </CardTitle>
                      <CardDescription>
                        {formatCompletedDate(assessment.completedAt)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Attempt</span>
                        <span className="font-medium">{assessment.attempt ?? '-'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Score</span>
                        <span className="font-medium">
                          {scoreLabel(assessment.scorePercentage)}
                          <ImprovementIndicator improvement={improvement} />
                        </span>
                      </div>
                      {classAverages?.[assessment.assessmentId] && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Class Avg</span>
                          <span className="text-muted-foreground">
                            {classAverages[assessment.assessmentId]!.classAverage.toFixed(1)}%
                          </span>
                        </div>
                      )}
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
                );
              })}
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
