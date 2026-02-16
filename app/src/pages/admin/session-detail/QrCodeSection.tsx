import { useSessionQrCodes } from '../../../hooks/useAttendance';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QrCodeSectionProps {
  sessionId: string;
  sessionName: string;
}

export default function QrCodeSection({ sessionId, sessionName }: QrCodeSectionProps) {
  const { data: qrCodes, isLoading } = useSessionQrCodes(sessionId);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !qrCodes) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Codes - ${sessionName}</title>
        <style>
          body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; }
          .qr-section { page-break-after: always; padding: 60px 0; }
          .qr-section:last-child { page-break-after: avoid; }
          h1 { font-size: 28px; margin-bottom: 8px; }
          h2 { font-size: 22px; color: #555; margin-bottom: 40px; }
          img { width: 300px; height: 300px; }
          .url { font-size: 12px; color: #999; margin-top: 20px; word-break: break-all; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="qr-section">
          <h1>${sessionName}</h1>
          <h2>Scan to Check In</h2>
          <img src="${qrCodes.checkIn.qrCode}" alt="Check-In QR Code" />
          <div class="url">${qrCodes.checkIn.url}</div>
        </div>
        <div class="qr-section">
          <h1>${sessionName}</h1>
          <h2>Scan to Check Out</h2>
          <img src="${qrCodes.checkOut.qrCode}" alt="Check-Out QR Code" />
          <div class="url">${qrCodes.checkOut.url}</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Generating QR codes...
        </CardContent>
      </Card>
    );
  }

  if (!qrCodes) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Failed to generate QR codes.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Attendance QR Codes</CardTitle>
            <CardDescription className="mt-1">
              Display or print these QR codes for students to scan at the session.
            </CardDescription>
          </div>
          <Button size="sm" onClick={handlePrint}>
            Print QR Codes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-6 text-center">
            <h3 className="font-semibold text-lg mb-1">Check In</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Students scan this at the start of the session
            </p>
            <img
              src={qrCodes.checkIn.qrCode}
              alt="Check-In QR Code"
              className="mx-auto w-48 h-48"
            />
            <p className="text-xs text-muted-foreground mt-3 break-all">{qrCodes.checkIn.url}</p>
          </div>
          <div className="border rounded-lg p-6 text-center">
            <h3 className="font-semibold text-lg mb-1">Check Out</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Students scan this at the end of the session
            </p>
            <img
              src={qrCodes.checkOut.qrCode}
              alt="Check-Out QR Code"
              className="mx-auto w-48 h-48"
            />
            <p className="text-xs text-muted-foreground mt-3 break-all">{qrCodes.checkOut.url}</p>
          </div>
        </div>
        <div className="mt-6 bg-muted rounded-lg p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">How it works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Display the <strong>Check In</strong> QR at the start of the session (opens 15 min
              before start time)
            </li>
            <li>Students scan, enter their email, and get checked in automatically</li>
            <li>
              Display the <strong>Check Out</strong> QR at the end of the session (opens 30 min
              before end time)
            </li>
            <li>
              Students scan, enter their email, and get checked out — recording their attendance
              duration
            </li>
            <li>Returning students get their info pre-filled for faster check-in</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
