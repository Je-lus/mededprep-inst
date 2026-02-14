import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
  Printer,
  QrCode,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useAssessment,
  useAssessmentQrCode,
  useAssessmentResponses,
  useCloseAssessment,
  useDeleteAssessment,
  useItemAnalysis,
  usePublishAssessment,
  useReleaseResults,
  useUpdateAssessment,
} from '@/hooks/useAssessments';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type {
  Assessment,
  AssessmentDetail,
  AssessmentResponse,
  QuestionAnalysis,
  SurveyElement,
} from '@/types/api';

function getStatusBadge(status: Assessment['status']) {
  if (status === 'active') {
    return <Badge className="bg-[#1b5fd0] text-white hover:bg-[#1b5fd0]">Active</Badge>;
  }
  if (status === 'closed') {
    return <Badge variant="secondary">Closed</Badge>;
  }
  return <Badge variant="outline">Draft</Badge>;
}

function getQuestionCount(surveyJson: AssessmentDetail['surveyJson']) {
  if (!surveyJson?.pages) return 0;
  return surveyJson.pages.reduce((total, page) => {
    if (!Array.isArray(page?.elements)) return total;
    return total + page.elements.filter((element: SurveyElement | undefined) => !!element?.name).length;
  }, 0);
}

function normalizePercent(value: number) {
  return value <= 1 ? value * 100 : value;
}

function getPublicUrl(publicHash: string) {
  return `${window.location.origin}/take/${publicHash}`;
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function formatTimeTaken(timeTaken?: number) {
  if (typeof timeTaken !== 'number') return '-';
  if (timeTaken < 60) return `${timeTaken}s`;
  const minutes = Math.floor(timeTaken / 60);
  const seconds = timeTaken % 60;
  return `${minutes}m ${seconds}s`;
}

function pbsClass(value: number) {
  if (value > 0.3) return 'bg-emerald-50 text-emerald-700';
  if (value >= 0.2) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

function ResultToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm">
      <span>Release Results</span>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="relative h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-[#1b5fd0] peer-disabled:opacity-50 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:after:translate-x-4" />
    </label>
  );
}

function ScoreFeedbackToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm">
      <span>Show Score on Submit</span>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="relative h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-[#1b5fd0] peer-disabled:opacity-50 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:after:translate-x-4" />
    </label>
  );
}

function ResponsesTable({
  responses,
  total,
  page,
  limit,
  onPrevious,
  onNext,
  canPrevious,
  canNext,
}: {
  responses: AssessmentResponse[];
  total: number;
  page: number;
  limit: number;
  onPrevious: () => void;
  onNext: () => void;
  canPrevious: boolean;
  canNext: boolean;
}) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = total === 0 ? 0 : Math.min(page * limit, total);

  return (
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
            <TableRow key={response.id}>
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

      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          Showing {start}-{end} of {total} responses
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrevious} disabled={!canPrevious}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={onNext} disabled={!canNext}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AssessmentDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [responsesPage, setResponsesPage] = useState(1);
  const responsesLimit = 10;
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(false);
  const [timeLimitInput, setTimeLimitInput] = useState('');

  const assessmentQuery = useAssessment(id);
  const responsesQuery = useAssessmentResponses(id, responsesPage, responsesLimit);
  const responses = responsesQuery.data?.responses ?? [];
  const totalResponses = responsesQuery.data?.total ?? 0;
  const responsePage = responsesQuery.data?.page ?? responsesPage;
  const responseLimit = responsesQuery.data?.limit ?? responsesLimit;
  const hasResponses = totalResponses > 0;
  const qrQuery = useAssessmentQrCode(assessmentQuery.data?.status === 'active' ? id : '');
  const analysisQuery = useItemAnalysis(hasResponses ? id : '');
  const canPreviousPage = responsePage > 1;
  const canNextPage = responsePage * responseLimit < totalResponses;

  const publishAssessment = usePublishAssessment();
  const closeAssessment = useCloseAssessment();
  const deleteAssessment = useDeleteAssessment();
  const releaseResults = useReleaseResults();
  const updateAssessment = useUpdateAssessment();

  const assessment = assessmentQuery.data;
  const shareUrl = useMemo(
    () => (assessment ? getPublicUrl(assessment.publicHash) : ''),
    [assessment],
  );

  useEffect(() => {
    if (!assessment) return;
    setEditTitle(assessment.title);
    setEditDescription(assessment.description || '');
    setTimeLimitEnabled(typeof assessment.timeLimitMinutes === 'number' && assessment.timeLimitMinutes > 0);
    setTimeLimitInput(assessment.timeLimitMinutes ? String(assessment.timeLimitMinutes) : '');
  }, [assessment]);

  useEffect(() => {
    setResponsesPage(1);
  }, [id]);

  const copyText = async (value: string, message = 'Copied to clipboard') => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error('Unable to copy link');
    }
  };

  const handlePublish = async () => {
    try {
      await publishAssessment.mutateAsync(id);
      toast.success('Assessment published');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to publish');
    }
  };

  const handleClose = async () => {
    try {
      await closeAssessment.mutateAsync(id);
      toast.success('Assessment closed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to close');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this assessment? This action cannot be undone.')) return;
    try {
      await deleteAssessment.mutateAsync(id);
      toast.success('Assessment deleted');
      navigate('/assessments');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete');
    }
  };

  const handleReleaseToggle = async (released: boolean) => {
    try {
      await releaseResults.mutateAsync({ id, released });
      toast.success(released ? 'Results released to students' : 'Results locked');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update results release');
    }
  };

  const handleScoreFeedbackToggle = async (showScoreFeedback: boolean) => {
    try {
      await updateAssessment.mutateAsync({ id, showScoreFeedback });
      toast.success(showScoreFeedback ? 'Score feedback enabled' : 'Score feedback hidden');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update score feedback setting');
    }
  };

  const handleTimeLimitToggle = async (enabled: boolean) => {
    if (!assessment || assessment.status !== 'draft') return;

    const currentMinutes = Number(timeLimitInput);
    const minutes = enabled ? (currentMinutes > 0 ? currentMinutes : 60) : null;

    try {
      await updateAssessment.mutateAsync({
        id,
        timeLimitMinutes: minutes || null,
      });
      setTimeLimitEnabled(enabled);
      setTimeLimitInput(enabled ? String(minutes) : '');
      toast.success(enabled ? 'Time limit enabled' : 'Time limit disabled');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update time limit');
    }
  };

  const handleTimeLimitCommit = async () => {
    if (!assessment || assessment.status !== 'draft' || !timeLimitEnabled) return;

    const parsedMinutes = Number(timeLimitInput);
    if (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
      setTimeLimitInput(assessment.timeLimitMinutes ? String(assessment.timeLimitMinutes) : '');
      toast.error('Enter a valid number of minutes');
      return;
    }

    if (assessment.timeLimitMinutes === parsedMinutes) return;

    try {
      await updateAssessment.mutateAsync({
        id,
        timeLimitMinutes: parsedMinutes || null,
      });
      toast.success('Time limit updated');
    } catch (error) {
      setTimeLimitInput(assessment.timeLimitMinutes ? String(assessment.timeLimitMinutes) : '');
      toast.error(error instanceof Error ? error.message : 'Unable to update time limit');
    }
  };

  const handleSaveDraftEdits = async () => {
    if (!editTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      await updateAssessment.mutateAsync({
        id,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      toast.success('Assessment updated');
      setIsEditOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update assessment');
    }
  };

  const handlePrintQr = () => {
    const qr = qrQuery.data;
    if (!qr || !assessment) return;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=800,height=900');
    if (!printWindow) {
      toast.error('Unable to open print window');
      return;
    }

    const html = `
      <html>
        <head><title>${assessment.title} QR Code</title></head>
        <body style="font-family: Arial, sans-serif; text-align:center; margin: 30px;">
          <h2>${assessment.title}</h2>
          <img src="${qr.qrCode}" alt="Assessment QR Code" style="width: 420px; height: 420px;" />
          <p style="margin-top: 16px; font-size: 16px;">${qr.url}</p>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (!id) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Invalid assessment URL</AlertTitle>
          <AlertDescription>The assessment ID is missing.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (assessmentQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-[420px] w-full" />
        </main>
      </div>
    );
  }

  if (assessmentQuery.isError || !assessment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load assessment</AlertTitle>
            <AlertDescription>
              {assessmentQuery.error instanceof Error
                ? assessmentQuery.error.message
                : 'Try again later.'}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-semibold">{assessment.title}</h1>
              {getStatusBadge(assessment.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              Created {new Date(assessment.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {assessment.status === 'draft' && (
              <>
                <Button
                  onClick={handlePublish}
                  disabled={publishAssessment.isPending}
                  className="bg-[#1b5fd0] hover:bg-[#1b5fd0]/90"
                >
                  {publishAssessment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Publish
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteAssessment.isPending}
                >
                  {deleteAssessment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </>
            )}

            {assessment.status === 'active' && (
              <>
                <Button asChild variant="outline">
                  <Link to={`/assessments/${id}/present`}>
                    <QrCode className="mr-2 h-4 w-4" />
                    Present QR
                  </Link>
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  disabled={closeAssessment.isPending}
                >
                  {closeAssessment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Close
                </Button>
              </>
            )}

            {responsesQuery.isLoading && <Skeleton className="h-9 w-36" />}
            <ScoreFeedbackToggle
              checked={assessment.showScoreFeedback}
              disabled={updateAssessment.isPending}
              onChange={handleScoreFeedbackToggle}
            />
            {hasResponses && (
              <ResultToggle
                checked={assessment.resultsReleased}
                disabled={releaseResults.isPending}
                onChange={handleReleaseToggle}
              />
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {assessment.status === 'active' && <TabsTrigger value="qr">QR Code</TabsTrigger>}
            <TabsTrigger value="responses">Responses</TabsTrigger>
            {hasResponses && <TabsTrigger value="analysis">Item Analysis</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle>Assessment Overview</CardTitle>
                    <CardDescription>Review settings, metadata, and sharing info.</CardDescription>
                  </div>
                  {assessment.status === 'draft' && (
                    <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Title</p>
                  <p className="font-medium">{assessment.title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Questions</p>
                  <p className="font-medium">{getQuestionCount(assessment.surveyJson)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p>{assessment.description || 'No description provided.'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Passing Score</p>
                  <p>{assessment.passingScore ?? 70}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Time Limit</p>
                  <div className="mt-2 space-y-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm">
                      <span>Enable Timer</span>
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={timeLimitEnabled}
                        disabled={assessment.status !== 'draft' || updateAssessment.isPending}
                        onChange={(event) => {
                          void handleTimeLimitToggle(event.target.checked);
                        }}
                      />
                      <span className="relative h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-[#1b5fd0] peer-disabled:opacity-50 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:after:translate-x-4" />
                    </label>

                    {timeLimitEnabled ? (
                      <div className="max-w-[180px] space-y-1">
                        <Input
                          type="number"
                          min={1}
                          value={timeLimitInput}
                          disabled={assessment.status !== 'draft' || updateAssessment.isPending}
                          onChange={(event) => setTimeLimitInput(event.target.value)}
                          onBlur={() => {
                            void handleTimeLimitCommit();
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter') return;
                            event.preventDefault();
                            void handleTimeLimitCommit();
                          }}
                        />
                        <p className="text-xs text-muted-foreground">Minutes</p>
                      </div>
                    ) : (
                      <p>None</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Randomize Questions</p>
                  <p>{assessment.randomizeQuestions ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Randomize Choices</p>
                  <p>{assessment.randomizeChoices ? 'Enabled' : 'Disabled'}</p>
                </div>
              </CardContent>
            </Card>

            {assessment.status === 'active' && (
              <Card>
                <CardHeader>
                  <CardTitle>Public Link</CardTitle>
                  <CardDescription>Share this URL with students to start the assessment.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  <code className="max-w-full overflow-x-auto rounded bg-muted px-2 py-1 text-sm">
                    {shareUrl}
                  </code>
                  <Button variant="outline" size="sm" onClick={() => copyText(shareUrl)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={shareUrl} target="_blank" rel="noreferrer">
                      Open
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {assessment.status === 'active' && (
            <TabsContent value="qr" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Student QR Code</CardTitle>
                  <CardDescription>
                    Students can scan this QR code to open the assessment.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {qrQuery.isLoading && <Skeleton className="mx-auto h-[320px] w-[320px]" />}
                  {qrQuery.isError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Unable to load QR code</AlertTitle>
                      <AlertDescription>
                        {qrQuery.error instanceof Error ? qrQuery.error.message : 'Try again later.'}
                      </AlertDescription>
                    </Alert>
                  )}
                  {qrQuery.data && (
                    <>
                      <img
                        src={qrQuery.data.qrCode}
                        alt="Assessment QR code"
                        className="mx-auto h-[300px] w-[300px] rounded border bg-white p-2"
                      />
                      <p className="text-center text-sm text-muted-foreground">{qrQuery.data.url}</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button asChild className="bg-[#1b5fd0] hover:bg-[#1b5fd0]/90">
                          <Link to={`/assessments/${id}/present`}>
                            <QrCode className="mr-2 h-4 w-4" />
                            Present Full Screen
                          </Link>
                        </Button>
                        <Button variant="outline" onClick={() => copyText(qrQuery.data.url)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Link
                        </Button>
                        <Button variant="outline" onClick={handlePrintQr}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="responses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Responses</CardTitle>
                <CardDescription>Submitted student assessments and outcomes.</CardDescription>
              </CardHeader>
              <CardContent>
                {responsesQuery.isLoading && (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                )}

                {responsesQuery.isError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Unable to load responses</AlertTitle>
                    <AlertDescription>
                      {responsesQuery.error instanceof Error
                        ? responsesQuery.error.message
                        : 'Try again later.'}
                    </AlertDescription>
                  </Alert>
                )}

                {!responsesQuery.isLoading && !responsesQuery.isError && totalResponses === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No responses yet. Student submissions will appear here once the assessment is
                    taken.
                  </div>
                )}

                {!responsesQuery.isLoading && !responsesQuery.isError && totalResponses > 0 && (
                  <ResponsesTable
                    responses={responses}
                    total={totalResponses}
                    page={responsePage}
                    limit={responseLimit}
                    onPrevious={() => setResponsesPage((current) => Math.max(current - 1, 1))}
                    onNext={() => setResponsesPage((current) => current + 1)}
                    canPrevious={canPreviousPage}
                    canNext={canNextPage}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {hasResponses && (
            <TabsContent value="analysis" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Responses</CardDescription>
                    <CardTitle>{analysisQuery.data?.totalResponses ?? totalResponses}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Average Score</CardDescription>
                    <CardTitle>
                      {analysisQuery.data ? `${normalizePercent(analysisQuery.data.averageScore).toFixed(1)}%` : '-'}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Questions</CardDescription>
                    <CardTitle>{analysisQuery.data?.totalQuestions ?? '-'}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Question Analysis</CardTitle>
                  <CardDescription>
                    Click a row to inspect choice distribution and metadata.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analysisQuery.isLoading && (
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  )}

                  {analysisQuery.isError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Unable to load item analysis</AlertTitle>
                      <AlertDescription>
                        {analysisQuery.error instanceof Error
                          ? analysisQuery.error.message
                          : 'Try again later.'}
                      </AlertDescription>
                    </Alert>
                  )}

                  {!analysisQuery.isLoading &&
                    !analysisQuery.isError &&
                    analysisQuery.data &&
                    analysisQuery.data.questions.length > 0 && (
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
                          {analysisQuery.data.questions.map((question) => {
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
                                  <TableCell className="text-right">{percentCorrect.toFixed(1)}%</TableCell>
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
                                    <TableCell colSpan={4} className="bg-muted/20">
                                      <QuestionDetail question={question} />
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
            </TabsContent>
          )}
        </Tabs>
      </main>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Draft Assessment</DialogTitle>
            <DialogDescription>Update the title and description for this draft.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveDraftEdits}
              disabled={updateAssessment.isPending}
              className="bg-[#1b5fd0] hover:bg-[#1b5fd0]/90"
            >
              {updateAssessment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
              className={cn('rounded border p-2', isCorrect && 'border-emerald-300 bg-emerald-50')}
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
                  className={cn('h-2 rounded bg-[#1b5fd0]', isCorrect && 'bg-emerald-600')}
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
