import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import SurveyEditor, { type SurveyEditorRef } from '@/components/SurveyEditor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { getFieldErrors } from '@/lib/api';
import { useCreateAssessment, useImportCsv } from '@/hooks/useAssessments';

type FormState = {
  title: string;
  description: string;
  passingScore: string;
  timeLimitMinutes: string;
  randomizeQuestions: boolean;
  randomizeChoices: boolean;
};

function toOptionalNumber(value: string) {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function AssessmentCreate() {
  const navigate = useNavigate();
  const surveyEditorRef = useRef<SurveyEditorRef>(null);
  const createAssessment = useCreateAssessment();
  const importCsv = useImportCsv();

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    passingScore: '70',
    timeLimitMinutes: '',
    randomizeQuestions: true,
    randomizeChoices: true,
  });
  const [activeTab, setActiveTab] = useState<'builder' | 'csv'>('builder');
  const [surveyJson, setSurveyJson] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isCreating =
    createAssessment.isPending || (activeTab === 'csv' && importCsv.isPending);

  const createPayload = () => ({
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    surveyJson: surveyJson ?? surveyEditorRef.current?.getJson() ?? undefined,
    passingScore: toOptionalNumber(form.passingScore),
    timeLimitMinutes: toOptionalNumber(form.timeLimitMinutes),
    randomizeQuestions: form.randomizeQuestions,
    randomizeChoices: form.randomizeChoices,
  });

  const handleCreateAssessment = async () => {
    setFieldErrors({});
    try {
      const assessment = await createAssessment.mutateAsync(createPayload());
      toast.success('Assessment created');
      navigate(`/assessments/${assessment.id}`);
    } catch (error) {
      setFieldErrors(getFieldErrors(error));
      toast.error(error instanceof Error ? error.message : 'Unable to create assessment');
    }
  };

  const handleCreateAndImport = async () => {
    if (!csvContent.trim()) {
      toast.error('Paste CSV content before importing');
      return;
    }

    setFieldErrors({});
    let createdAssessmentId: string | null = null;

    try {
      const assessment = await createAssessment.mutateAsync({
        ...createPayload(),
        surveyJson: undefined,
      });
      createdAssessmentId = assessment.id;

      const result = await importCsv.mutateAsync({
        id: assessment.id,
        csvContent,
      });

      toast.success(`Imported ${result.questionCount} questions`);
      navigate(`/assessments/${assessment.id}`);
    } catch (error) {
      setFieldErrors(getFieldErrors(error));
      toast.error(error instanceof Error ? error.message : 'Unable to import CSV');
      if (createdAssessmentId) {
        navigate(`/assessments/${createdAssessmentId}`);
      }
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Create Assessment</h1>
            <p className="text-sm text-muted-foreground">
              Configure settings and build questions with SurveyJS or CSV import.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/assessments">Back to Assessments</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assessment Settings</CardTitle>
            <CardDescription>These settings apply to all students taking the assessment.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Exam 1 - Cardiology"
                required
              />
              {fieldErrors.title && <p className="text-sm text-red-600">{fieldErrors.title}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Optional notes for instructors and students."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passingScore">Passing Score (%)</Label>
              <Input
                id="passingScore"
                type="number"
                min={0}
                max={100}
                value={form.passingScore}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, passingScore: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeLimitMinutes">Time Limit (minutes)</Label>
              <Input
                id="timeLimitMinutes"
                type="number"
                min={1}
                value={form.timeLimitMinutes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, timeLimitMinutes: event.target.value }))
                }
                placeholder="Optional"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.randomizeQuestions}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, randomizeQuestions: event.target.checked }))
                }
                className="h-4 w-4 rounded border"
              />
              Randomize Questions
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.randomizeChoices}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, randomizeChoices: event.target.checked }))
                }
                className="h-4 w-4 rounded border"
              />
              Randomize Choices
            </label>
          </CardContent>
        </Card>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'builder' | 'csv')}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="builder">Survey Builder</TabsTrigger>
            <TabsTrigger value="csv">CSV Import</TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Survey Builder</CardTitle>
                <CardDescription>
                  Build questions visually with SurveyJS Creator. Changes autosave as you edit.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SurveyEditor ref={surveyEditorRef} onSave={setSurveyJson} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>CSV Import</CardTitle>
                <CardDescription>
                  Paste tab-delimited CSV content. The assessment will be created first, then
                  questions will be imported.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Sample format</AlertTitle>
                  <AlertDescription>
                    <code className="block overflow-x-auto rounded bg-muted p-2 text-xs">
                      Chapter{'\t'}Question Code{'\t'}Question{'\t'}Question Choice{'\t'}Answer
                      1{'\t'}Answer 2{'\t'}Answer 3{'\t'}Answer 4{'\t'}Correct Answer
                    </code>
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="csvContent">CSV Content</Label>
                  <Textarea
                    id="csvContent"
                    value={csvContent}
                    onChange={(event) => setCsvContent(event.target.value)}
                    placeholder="Paste CSV rows here..."
                    rows={14}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleCreateAndImport}
                    disabled={isCreating || !form.title.trim() || !csvContent.trim()}
                    className="bg-[#1b5fd0] hover:bg-[#1b5fd0]/90"
                  >
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create &amp; Import
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link to="/assessments">Cancel</Link>
          </Button>
          <Button
            onClick={handleCreateAssessment}
            disabled={isCreating || !form.title.trim()}
            className="bg-[#1b5fd0] hover:bg-[#1b5fd0]/90"
          >
            {createAssessment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Assessment
          </Button>
        </div>
    </div>
  );
}
