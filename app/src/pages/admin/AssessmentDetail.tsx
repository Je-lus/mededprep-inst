import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Loader2, QrCode, Trash2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { ToggleSwitch } from '@/components/ToggleSwitch';
import { OverviewTab } from './assessment-detail/OverviewTab';
import { QrCodeTab } from './assessment-detail/QrCodeTab';
import { ResponsesTab } from './assessment-detail/ResponsesTab';
import { ItemAnalysisTab } from './assessment-detail/ItemAnalysisTab';
import { EditAssessmentDialog } from './assessment-detail/EditAssessmentDialog';

export default function AssessmentDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
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

  const publishAssessment = usePublishAssessment();
  const closeAssessment = useCloseAssessment();
  const deleteAssessment = useDeleteAssessment();
  const releaseResults = useReleaseResults();
  const updateAssessment = useUpdateAssessment();

  const assessment = assessmentQuery.data;

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
              <StatusBadge status={assessment.status} />
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
            <ToggleSwitch
              label="Show Score on Submit"
              checked={assessment.showScoreFeedback}
              disabled={updateAssessment.isPending}
              onChange={handleScoreFeedbackToggle}
            />
            {hasResponses && (
              <ToggleSwitch
                label="Release Results"
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

          <TabsContent value="overview">
            <OverviewTab
              assessment={assessment}
              timeLimitEnabled={timeLimitEnabled}
              timeLimitInput={timeLimitInput}
              isUpdating={updateAssessment.isPending}
              onEdit={() => setIsEditOpen(true)}
              onTimeLimitToggle={(enabled) => void handleTimeLimitToggle(enabled)}
              onTimeLimitInputChange={setTimeLimitInput}
              onTimeLimitCommit={() => void handleTimeLimitCommit()}
            />
          </TabsContent>

          {assessment.status === 'active' && (
            <TabsContent value="qr">
              <QrCodeTab
                assessmentId={id}
                assessment={assessment}
                qrData={qrQuery.data}
                isLoading={qrQuery.isLoading}
                isError={qrQuery.isError}
                error={qrQuery.error}
              />
            </TabsContent>
          )}

          <TabsContent value="responses">
            <ResponsesTab
              responses={responses}
              total={totalResponses}
              page={responsePage}
              limit={responseLimit}
              isLoading={responsesQuery.isLoading}
              isError={responsesQuery.isError}
              error={responsesQuery.error}
              onPrevious={() => setResponsesPage((current) => Math.max(current - 1, 1))}
              onNext={() => setResponsesPage((current) => current + 1)}
            />
          </TabsContent>

          {hasResponses && (
            <TabsContent value="analysis">
              <ItemAnalysisTab
                questions={analysisQuery.data?.questions ?? []}
                totalResponses={analysisQuery.data?.totalResponses ?? totalResponses}
                averageScore={analysisQuery.data?.averageScore ?? 0}
                totalQuestions={analysisQuery.data?.totalQuestions ?? 0}
                isLoading={analysisQuery.isLoading}
                isError={analysisQuery.isError}
                error={analysisQuery.error}
              />
            </TabsContent>
          )}
        </Tabs>
      </main>

      <EditAssessmentDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title={editTitle}
        description={editDescription}
        onTitleChange={setEditTitle}
        onDescriptionChange={setEditDescription}
        onSave={handleSaveDraftEdits}
        isSaving={updateAssessment.isPending}
      />
    </div>
  );
}
