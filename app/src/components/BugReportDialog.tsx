import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { useSubmitBugReport } from '@/hooks/useBugReports';
import type { BugReportSubmission } from '@/types/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera, Loader2, X } from 'lucide-react';

interface BugReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BugReportDialog({ open, onOpenChange }: BugReportDialogProps) {
  const [category, setCategory] = useState<'bug' | 'feedback' | 'feature_request'>('bug');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturingScreenshot, setCapturingScreenshot] = useState(false);

  // Auto-captured data
  const [url, setUrl] = useState('');
  const [userAgent, setUserAgent] = useState('');
  const [viewport, setViewport] = useState('');

  const submitMutation = useSubmitBugReport();

  // Auto-capture data when dialog opens
  useEffect(() => {
    if (open) {
      setUrl(window.location.href);
      setUserAgent(navigator.userAgent);
      setViewport(`${window.innerWidth}x${window.innerHeight}`);
    }
  }, [open]);

  const handleCaptureScreenshot = async () => {
    setCapturingScreenshot(true);
    try {
      const canvas = await html2canvas(document.body, {
        logging: false,
        useCORS: true,
      });
      const base64 = canvas.toDataURL('image/png');
      setScreenshot(base64);
      toast.success('Screenshot captured!');
    } catch (error) {
      toast.error('Failed to capture screenshot');
      console.error('Screenshot capture error:', error);
    } finally {
      setCapturingScreenshot(false);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (description.length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }

    const data: BugReportSubmission = {
      category,
      severity,
      description,
      stepsToReproduce: stepsToReproduce || undefined,
      url,
      userAgent,
      viewport,
      screenshot: screenshot || undefined,
    };

    try {
      await submitMutation.mutateAsync(data);
      toast.success('Bug report submitted successfully!');
      // Reset form
      setCategory('bug');
      setSeverity('medium');
      setDescription('');
      setStepsToReproduce('');
      setScreenshot(null);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to submit bug report');
      console.error('Bug report submission error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>
            Help us improve by reporting bugs, giving feedback, or suggesting features.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="feature_request">Feature Request</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
                <SelectTrigger id="severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue, feedback, or feature request..."
              rows={4}
              required
              minLength={10}
              maxLength={5000}
            />
            <p className="text-sm text-muted-foreground">
              {description.length}/5000 characters (minimum 10)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="steps">Steps to Reproduce (optional)</Label>
            <Textarea
              id="steps"
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              placeholder="1. Go to...\n2. Click on...\n3. See error..."
              rows={3}
              maxLength={5000}
            />
          </div>

          <div className="space-y-2">
            <Label>Screenshot (optional)</Label>
            {screenshot ? (
              <div className="relative">
                <img
                  src={screenshot}
                  alt="Screenshot preview"
                  className="w-full h-48 object-cover rounded border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveScreenshot}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handleCaptureScreenshot}
                disabled={capturingScreenshot}
                className="w-full"
              >
                {capturingScreenshot ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Capturing...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Capture Screenshot
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending || description.length < 10}
              className="bg-primary hover:bg-primary/90"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
