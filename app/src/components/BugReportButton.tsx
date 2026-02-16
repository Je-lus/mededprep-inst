import { useState } from 'react';
import { Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BugReportDialog from './BugReportDialog';

export default function BugReportButton() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        style={{ backgroundColor: '#1b5fd0' }}
        aria-label="Report a bug"
      >
        <Bug className="h-6 w-6" />
      </Button>

      <BugReportDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
