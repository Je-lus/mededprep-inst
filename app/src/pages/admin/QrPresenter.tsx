import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2, QrCode } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssessment, useAssessmentQrCode, useAssessmentResponses } from '@/hooks/useAssessments';

export default function QrPresenter() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const assessmentQuery = useAssessment(id);
  const qrQuery = useAssessmentQrCode(id);
  const responsesQuery = useAssessmentResponses(id, 1, 1);

  useEffect(() => {
    const interval = window.setInterval(() => {
      responsesQuery.refetch();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [responsesQuery]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        navigate(`/assessments/${id}`);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [id, navigate]);

  const studentCount = responsesQuery.data?.total ?? responsesQuery.data?.responses.length ?? 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
      <div className="absolute left-4 top-4">
        <Button variant="secondary" onClick={() => navigate(`/assessments/${id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Exit
        </Button>
      </div>

      <Card className="w-full max-w-4xl border-slate-300 bg-white text-slate-900 shadow-2xl">
        <CardContent className="space-y-6 p-8 text-center md:p-12">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-500">
              MedEdPrep Assessment
            </p>
            <h1 className="text-3xl font-bold md:text-4xl">
              {assessmentQuery.data?.title || 'Assessment QR'}
            </h1>
            <p className="text-base text-slate-600 md:text-lg">Scan to join</p>
          </div>

          {(assessmentQuery.isLoading || qrQuery.isLoading) && (
            <div className="space-y-4">
              <Skeleton className="mx-auto h-[460px] w-[460px]" />
              <Skeleton className="mx-auto h-6 w-80" />
            </div>
          )}

          {(assessmentQuery.isError || qrQuery.isError) && (
            <Alert variant="destructive" className="mx-auto max-w-xl text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unable to load QR presenter</AlertTitle>
              <AlertDescription>
                {assessmentQuery.error instanceof Error
                  ? assessmentQuery.error.message
                  : qrQuery.error instanceof Error
                    ? qrQuery.error.message
                    : 'Try again.'}
              </AlertDescription>
            </Alert>
          )}

          {qrQuery.data && (
            <>
              <div className="mx-auto w-fit rounded-2xl border-4 border-slate-100 bg-white p-4 shadow-md">
                <img
                  src={qrQuery.data.qrCode}
                  alt="Assessment QR code"
                  className="h-[420px] w-[420px] md:h-[500px] md:w-[500px]"
                />
              </div>
              <p className="mx-auto max-w-2xl break-all rounded-md bg-slate-100 px-4 py-2 font-mono text-sm text-slate-700">
                {qrQuery.data.url}
              </p>
            </>
          )}

          <div className="inline-flex items-center gap-2 rounded-full bg-primary-500/10 px-4 py-2 text-primary-500">
            {responsesQuery.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <QrCode className="h-4 w-4" />
            )}
            <span className="font-semibold">
              {studentCount} {studentCount === 1 ? 'student' : 'students'} joined
            </span>
          </div>

          <p className="text-xs text-slate-500">Press ESC to exit presenter mode.</p>
        </CardContent>
      </Card>
    </div>
  );
}
