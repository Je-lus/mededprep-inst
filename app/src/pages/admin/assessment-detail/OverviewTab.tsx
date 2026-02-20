import { Copy, ExternalLink, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ToggleSwitch } from '@/components/ToggleSwitch';
import type { AssessmentDetail } from '@/types/api';
import { getQuestionCount, getPublicUrl } from './utils';

export function OverviewTab({
  assessment,
  timeLimitEnabled,
  timeLimitInput,
  isUpdating,
  onEdit,
  onTimeLimitToggle,
  onTimeLimitInputChange,
  onTimeLimitCommit,
  onOneQuestionPerPageToggle,
}: {
  assessment: AssessmentDetail;
  timeLimitEnabled: boolean;
  timeLimitInput: string;
  isUpdating: boolean;
  onEdit: () => void;
  onTimeLimitToggle: (enabled: boolean) => void;
  onTimeLimitInputChange: (value: string) => void;
  onTimeLimitCommit: () => void;
  onOneQuestionPerPageToggle: (enabled: boolean) => void;
}) {
  const shareUrl = getPublicUrl(assessment.publicHash);

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Unable to copy link');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Assessment Overview</CardTitle>
              <CardDescription>Review settings, metadata, and sharing info.</CardDescription>
            </div>
            {assessment.status === 'draft' && (
              <Button variant="outline" onClick={onEdit}>
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
              <ToggleSwitch
                label="Enable Timer"
                checked={timeLimitEnabled}
                disabled={assessment.status !== 'draft' || isUpdating}
                onChange={onTimeLimitToggle}
              />

              {timeLimitEnabled ? (
                <div className="max-w-[180px] space-y-1">
                  <Input
                    type="number"
                    min={1}
                    value={timeLimitInput}
                    disabled={assessment.status !== 'draft' || isUpdating}
                    onChange={(event) => onTimeLimitInputChange(event.target.value)}
                    onBlur={onTimeLimitCommit}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      onTimeLimitCommit();
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
          <div>
            <p className="text-sm font-medium text-muted-foreground">One Question Per Page</p>
            <div className="mt-2">
              <ToggleSwitch
                label="Enable"
                checked={assessment.oneQuestionPerPage ?? false}
                disabled={assessment.status !== 'draft' || isUpdating}
                onChange={onOneQuestionPerPageToggle}
              />
            </div>
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
    </div>
  );
}
