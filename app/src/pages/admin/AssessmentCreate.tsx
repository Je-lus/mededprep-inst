import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, X, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import SurveyEditor, { type SurveyEditorRef } from '@/components/SurveyEditor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getFieldErrors } from '@/lib/api';
import { useCreateAssessment, useImportCsv } from '@/hooks/useAssessments';
import { useQuestionBanks, useQuestionBank, useIncrementItemUsage } from '@/hooks/useQuestionBanks';

type FormState = {
  title: string;
  description: string;
  passingScore: string;
  timeLimitMinutes: string;
  randomizeQuestions: boolean;
  randomizeChoices: boolean;
  allowStudentReview: boolean;
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
  const { data: banks } = useQuestionBanks();
  const incrementUsage = useIncrementItemUsage();

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    passingScore: '70',
    timeLimitMinutes: '',
    randomizeQuestions: true,
    randomizeChoices: true,
    allowStudentReview: false,
  });
  const [activeTab, setActiveTab] = useState<'builder' | 'csv' | 'bank'>('builder');
  const [surveyJson, setSurveyJson] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [showConfirmReplace, setShowConfirmReplace] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: bankResult } = useQuestionBank(selectedBankId, 1, 200);
  const bankDetail = bankResult?.data;

  const isCreating = createAssessment.isPending || (activeTab === 'csv' && importCsv.isPending);

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedQuestions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedQuestions(newSet);
  };

  const handleSelectAll = () => {
    if (!bankDetail) return;
    const allIds = bankDetail.items.map((i) => i.id);
    setSelectedQuestions(new Set(allIds));
  };

  const handleDeselectAll = () => {
    setSelectedQuestions(new Set());
  };

  const handleAddSelectedQuestions = (confirmed = false) => {
    if (!bankDetail || selectedQuestions.size === 0) {
      toast.error('Select at least one question');
      return;
    }

    if (!confirmed) {
      const existingJson = surveyJson ?? surveyEditorRef.current?.getJson();
      if (existingJson) {
        try {
          const parsed = typeof existingJson === 'string' ? JSON.parse(existingJson) : existingJson;
          const hasQuestions = parsed.pages?.some((p: any) => p.elements?.length > 0);
          if (hasQuestions) {
            setShowConfirmReplace(true);
            return;
          }
        } catch (e) {
          // fallback to no warning if parse fails
        }
      }
    }

    const items = bankDetail.items.filter((item) => selectedQuestions.has(item.id));
    const elements = items.map((item) => item.questionData);

    const surveyJsonObj = {
      pages: [
        {
          name: 'questions',
          title: 'Questions',
          elements,
        },
      ],
    };

    setSurveyJson(JSON.stringify(surveyJsonObj));
    setActiveTab('builder');
    toast.success(`Added ${elements.length} questions to assessment`);

    // Increment usage count for each question (fire-and-forget)
    items.forEach((item) => {
      incrementUsage.mutate({ bankId: selectedBankId, itemId: item.id });
    });
  };

  const createPayload = () => ({
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    surveyJson: surveyJson ?? surveyEditorRef.current?.getJson() ?? undefined,
    passingScore: toOptionalNumber(form.passingScore),
    timeLimitMinutes: toOptionalNumber(form.timeLimitMinutes),
    randomizeQuestions: form.randomizeQuestions,
    randomizeChoices: form.randomizeChoices,
    allowStudentReview: form.allowStudentReview,
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
          <CardDescription>
            These settings apply to all students taking the assessment.
          </CardDescription>
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

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.allowStudentReview}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, allowStudentReview: event.target.checked }))
              }
              className="h-4 w-4 rounded border"
            />
            Allow Student Review
          </label>
        </CardContent>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'builder' | 'csv' | 'bank')}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="builder">Survey Builder</TabsTrigger>
          <TabsTrigger value="csv">CSV Import</TabsTrigger>
          <TabsTrigger value="bank">From Bank</TabsTrigger>
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
                    Chapter{'\t'}Question Code{'\t'}Question{'\t'}Question Choice{'\t'}Answer 1
                    {'\t'}Answer 2{'\t'}Answer 3{'\t'}Answer 4{'\t'}Correct Answer
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
                  className="bg-primary-500 hover:bg-primary-500/90"
                >
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create &amp; Import
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select from Question Bank</CardTitle>
              <CardDescription>
                Choose a question bank and select questions to add to this assessment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="bankSelect">Question Bank</Label>
                <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                  <SelectTrigger id="bankSelect">
                    <SelectValue placeholder="Select a question bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks?.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.title} ({bank._count?.items || 0} questions)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBankId && bankDetail && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Available Questions ({bankDetail.items.length})</Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAll}
                          className="h-8 text-xs"
                        >
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDeselectAll}
                          disabled={selectedQuestions.size === 0}
                          className="h-8 text-xs"
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-2 border rounded-md p-1">
                      {bankDetail.items.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground text-center">
                          This bank has no questions yet.
                        </p>
                      ) : (
                        bankDetail.items.map((item) => {
                          const q = item.questionData;
                          const choicesCount = Array.isArray(q.choices) ? q.choices.length : 0;
                          const difficulty = q.metadata?.difficulty;
                          const isExpanded = expandedQuestions.has(item.id);

                          return (
                            <div
                              key={item.id}
                              className="border rounded-md overflow-hidden bg-card"
                            >
                              <div className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={selectedQuestions.has(item.id)}
                                  onChange={(e) => {
                                    const newSet = new Set(selectedQuestions);
                                    if (e.target.checked) {
                                      newSet.add(item.id);
                                    } else {
                                      newSet.delete(item.id);
                                    }
                                    setSelectedQuestions(newSet);
                                  }}
                                  className="mt-1 h-4 w-4 rounded border shrink-0"
                                />
                                <div
                                  className="flex-1 min-w-0 cursor-pointer"
                                  onClick={() => toggleExpand(item.id)}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-medium text-sm leading-tight">
                                          {q.title || q.name}
                                        </p>
                                        <Badge variant="outline" className="text-[10px] h-4">
                                          {q.type}
                                        </Badge>
                                        {difficulty && (
                                          <Badge variant="secondary" className="text-[10px] h-4">
                                            Level {difficulty}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-muted-foreground">
                                        {choicesCount} choices{' '}
                                        {q.metadata?.chapter && `• ${q.metadata.chapter}`}
                                      </p>
                                    </div>
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    )}
                                  </div>
                                </div>
                              </div>
                              {isExpanded && (
                                <div className="px-10 pb-4 text-sm space-y-4 bg-muted/10 border-t">
                                  <div className="pt-3">
                                    {q.description && (
                                      <p className="text-muted-foreground mb-3">{q.description}</p>
                                    )}

                                    <div className="space-y-2">
                                      <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                                        Choices
                                      </p>
                                      <ul className="space-y-1.5">
                                        {Array.isArray(q.choices) &&
                                          q.choices.map((choice, idx) => {
                                            const choiceValue =
                                              typeof choice === 'string' ? choice : choice.value;
                                            const choiceText =
                                              typeof choice === 'string' ? choice : choice.text;
                                            const isCorrect = q.correctAnswer === choiceValue;

                                            return (
                                              <li
                                                key={idx}
                                                className={`flex items-start gap-2 p-2 rounded text-xs ${
                                                  isCorrect
                                                    ? 'bg-green-50 text-green-700 border border-green-100'
                                                    : 'bg-muted/20'
                                                }`}
                                              >
                                                {isCorrect && (
                                                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                                )}
                                                <span>{choiceText}</span>
                                              </li>
                                            );
                                          })}
                                      </ul>
                                    </div>

                                    {(q.metadata?.explanation || q.metadata?.category) && (
                                      <div className="grid grid-cols-2 gap-4 pt-3 border-t mt-4">
                                        {q.metadata?.category && (
                                          <div>
                                            <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                                              Category
                                            </p>
                                            <p className="text-xs">{q.metadata.category}</p>
                                          </div>
                                        )}
                                        {q.metadata?.explanation && (
                                          <div className="col-span-2">
                                            <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                                              Explanation
                                            </p>
                                            <p className="text-xs italic">
                                              {q.metadata.explanation}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {selectedQuestions.size > 0 && (
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">
                          Selected Questions ({selectedQuestions.size})
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                        {bankDetail.items
                          .filter((i) => selectedQuestions.has(i.id))
                          .map((item) => (
                            <Badge
                              key={item.id}
                              variant="secondary"
                              className="pl-2 pr-1 py-1 flex items-center gap-1 max-w-[300px]"
                            >
                              <span className="truncate text-[11px]">
                                {item.questionData.title || item.questionData.name}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 rounded-full p-0 hover:bg-muted"
                                onClick={() => {
                                  const newSet = new Set(selectedQuestions);
                                  newSet.delete(item.id);
                                  setSelectedQuestions(newSet);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <p className="text-sm text-muted-foreground">
                      {selectedQuestions.size} question
                      {selectedQuestions.size !== 1 ? 's' : ''} ready to add
                    </p>
                    <Button
                      onClick={() => handleAddSelectedQuestions()}
                      disabled={selectedQuestions.size === 0}
                      className="bg-primary-500 hover:bg-primary-500/90"
                    >
                      Add {selectedQuestions.size} Question
                      {selectedQuestions.size !== 1 ? 's' : ''} to Assessment
                    </Button>
                  </div>
                </>
              )}
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
          className="bg-primary-500 hover:bg-primary-500/90"
        >
          {createAssessment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Assessment
        </Button>
      </div>

      <AlertDialog open={showConfirmReplace} onOpenChange={setShowConfirmReplace}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing questions?</AlertDialogTitle>
            <AlertDialogDescription>
              The builder already contains questions. Adding questions from the bank will replace
              your current questions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAddSelectedQuestions(true)}
              className="bg-primary-500 hover:bg-primary-500/90"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
