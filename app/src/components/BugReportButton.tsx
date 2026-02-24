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
        className="fixed bottom-20 right-3 md:bottom-6 md:right-6 z-50 h-10 w-10 md:h-14 md:w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-primary text-primary-foreground hover:bg-primary/90"
        aria-label="Report a bug"
      >
        <Bug className="h-4 w-4 md:h-6 md:w-6" />
      </Button>

      <BugReportDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
