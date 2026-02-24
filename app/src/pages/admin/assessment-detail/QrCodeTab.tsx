import { Link } from 'react-router-dom';
import { AlertCircle, Copy, Printer, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { AssessmentDetail } from '@/types/api';

export function QrCodeTab({
  assessmentId,
  assessment,
  qrData,
  isLoading,
  isError,
  error,
}: {
  assessmentId: string;
  assessment: AssessmentDetail;
  qrData?: { url: string; qrCode: string };
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}) {
  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Unable to copy link');
    }
  };

  const handlePrint = () => {
    if (!qrData) return;

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
          <img src="${qrData.qrCode}" alt="Assessment QR Code" style="width: 420px; height: 420px;" />
          <p style="margin-top: 16px; font-size: 16px;">${qrData.url}</p>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student QR Code</CardTitle>
        <CardDescription>Students can scan this QR code to open the assessment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="mx-auto h-[320px] w-[320px]" />}
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load QR code</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Try again later.'}
            </AlertDescription>
          </Alert>
        )}
        {qrData && (
          <>
            <img
              src={qrData.qrCode}
              alt="Assessment QR code"
              className="mx-auto h-[300px] w-[300px] rounded border bg-white p-2"
            />
            <p className="text-center text-sm text-muted-foreground">{qrData.url}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild className="bg-primary hover:bg-primary/90">
                <Link to={`/assessments/${assessmentId}/present`}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Present Full Screen
                </Link>
              </Button>
              <Button variant="outline" onClick={() => copyText(qrData.url)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
