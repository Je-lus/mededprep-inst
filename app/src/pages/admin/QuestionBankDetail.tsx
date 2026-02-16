import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ChevronDown, ChevronUp, Edit, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useQuestionBank,
  useUpdateQuestionBank,
  useDeleteQuestionBank,
  useAddBankItem,
  useUpdateBankItem,
  useDeleteBankItem,
  useImportCsvToBank,
} from '@/hooks/useQuestionBanks';
import type { QuestionBankItem, SurveyElement } from '@/types/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

function QuestionRow({
  item,
  onEdit,
  onDelete,
}: {
  item: QuestionBankItem;
  onEdit: (item: QuestionBankItem) => void;
  onDelete: (itemId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const question = item.questionData;

  const choicesCount = Array.isArray(question.choices) ? question.choices.length : 0;
  const difficulty = question.metadata?.difficulty;

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{question.title || question.name}</p>
            <Badge variant="outline" className="text-xs">
              {question.type}
            </Badge>
            {difficulty && (
              <Badge variant="secondary" className="text-xs">
                Difficulty {difficulty}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {choicesCount} choices · Used {item.usageCount} times
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="pt-2 border-t space-y-2">
          <p className="text-sm">{question.title}</p>
          {Array.isArray(question.choices) && (
            <ul className="text-sm space-y-1">
              {question.choices.map((choice, idx) => {
                const choiceText = typeof choice === 'string' ? choice : choice.text;
                const choiceValue = typeof choice === 'string' ? choice : choice.value;
                const isCorrect =
                  question.correctAnswer === choiceValue ||
                  (Array.isArray(question.correctAnswer) &&
                    question.correctAnswer.includes(choiceValue));
                return (
                  <li key={idx} className={isCorrect ? 'font-medium text-green-700' : ''}>
                    {choiceValue}: {choiceText}
                  </li>
                );
              })}
            </ul>
          )}
          {question.metadata?.explanation && (
            <p className="text-sm text-muted-foreground">
              <strong>Explanation:</strong> {question.metadata.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuestionBankDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useQuestionBank(id!, 1, 100);
  const updateBank = useUpdateQuestionBank();
  const deleteBank = useDeleteQuestionBank();
  const addItem = useAddBankItem();
  const updateItem = useUpdateBankItem();
  const deleteItem = useDeleteBankItem();
  const importCsv = useImportCsvToBank();

  const [editMode, setEditMode] = useState(false);
  const [bankForm, setBankForm] = useState({ title: '', description: '', subject: '' });
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<QuestionBankItem | null>(null);
  const [questionForm, setQuestionForm] = useState({
    title: '',
    type: 'radiogroup' as 'radiogroup' | 'checkbox',
    choices: ['', '', '', ''],
    correctAnswer: '',
    difficulty: '',
    explanation: '',
  });
  const [csvContent, setCsvContent] = useState('');

  const handleUpdateBank = async () => {
    if (!id) return;
    try {
      await updateBank.mutateAsync({
        id,
        title: bankForm.title.trim(),
        description: bankForm.description.trim() || undefined,
        subject: bankForm.subject.trim() || undefined,
      });
      toast.success('Bank updated');
      setEditMode(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update bank');
    }
  };

  const handleDeleteBank = async () => {
    if (!id || !confirm('Delete this question bank? All questions will be removed.')) return;
    try {
      await deleteBank.mutateAsync(id);
      toast.success('Bank deleted');
      navigate('/question-banks');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete bank');
    }
  };

  const handleAddQuestion = async () => {
    if (!id) return;
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const choices = questionForm.choices
      .map((text, idx) => (text.trim() ? { value: letters[idx], text: text.trim() } : null))
      .filter((c): c is { value: string; text: string } => c !== null);

    if (choices.length < 2) {
      toast.error('At least 2 choices required');
      return;
    }

    const questionData: SurveyElement = {
      type: questionForm.type,
      name: `q_${Date.now()}`,
      title: questionForm.title.trim(),
      isRequired: true,
      choices,
      correctAnswer:
        questionForm.type === 'checkbox'
          ? questionForm.correctAnswer.split(',').map((a) => a.trim())
          : questionForm.correctAnswer.trim(),
      metadata: {
        difficulty: questionForm.difficulty ? parseInt(questionForm.difficulty) : undefined,
        explanation: questionForm.explanation.trim() || undefined,
      },
    };

    try {
      await addItem.mutateAsync({ bankId: id, questionData });
      toast.success('Question added');
      setAddDialogOpen(false);
      setQuestionForm({
        title: '',
        type: 'radiogroup',
        choices: ['', '', '', ''],
        correctAnswer: '',
        difficulty: '',
        explanation: '',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to add question');
    }
  };

  const handleEditQuestion = async () => {
    if (!id || !currentItem) return;
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const choices = questionForm.choices
      .map((text, idx) => (text.trim() ? { value: letters[idx], text: text.trim() } : null))
      .filter((c): c is { value: string; text: string } => c !== null);

    if (choices.length < 2) {
      toast.error('At least 2 choices required');
      return;
    }

    const questionData: SurveyElement = {
      ...currentItem.questionData,
      title: questionForm.title.trim(),
      choices,
      correctAnswer:
        questionForm.type === 'checkbox'
          ? questionForm.correctAnswer.split(',').map((a) => a.trim())
          : questionForm.correctAnswer.trim(),
      metadata: {
        ...currentItem.questionData.metadata,
        difficulty: questionForm.difficulty ? parseInt(questionForm.difficulty) : undefined,
        explanation: questionForm.explanation.trim() || undefined,
      },
    };

    try {
      await updateItem.mutateAsync({ bankId: id, itemId: currentItem.id, questionData });
      toast.success('Question updated');
      setEditDialogOpen(false);
      setCurrentItem(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update question');
    }
  };

  const handleDeleteQuestion = async (itemId: string) => {
    if (!id || !confirm('Delete this question?')) return;
    try {
      await deleteItem.mutateAsync({ bankId: id, itemId });
      toast.success('Question deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete question');
    }
  };

  const handleImportCsv = async () => {
    if (!id || !csvContent.trim()) {
      toast.error('Paste CSV content before importing');
      return;
    }
    try {
      const result = await importCsv.mutateAsync({ id, csvContent });
      toast.success(`Imported ${result.questionCount} questions`);
      setCsvContent('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to import CSV');
    }
  };

  const openEditDialog = (item: QuestionBankItem) => {
    setCurrentItem(item);
    const q = item.questionData;
    const choices = Array.isArray(q.choices)
      ? q.choices.map((c) => (typeof c === 'string' ? c : c.text))
      : [];
    const correctAnswer = Array.isArray(q.correctAnswer)
      ? q.correctAnswer.join(', ')
      : q.correctAnswer || '';

    setQuestionForm({
      title: q.title || '',
      type: q.type as 'radiogroup' | 'checkbox',
      choices: [...choices, '', '', '', ''].slice(0, 4),
      correctAnswer,
      difficulty: q.metadata?.difficulty?.toString() || '',
      explanation: q.metadata?.explanation || '',
    });
    setEditDialogOpen(true);
  };

  if (!id) {
    return <div>Invalid bank ID</div>;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Unable to load question bank</AlertTitle>
        <AlertDescription>{error instanceof Error ? error.message : 'Try again.'}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return <div>No data</div>;
  }

  if (!editMode) {
    setBankForm({
      title: data.title,
      description: data.description || '',
      subject: data.subject || '',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{data.title}</h1>
          {data.subject && <p className="text-sm text-muted-foreground">{data.subject}</p>}
        </div>
        <Button variant="outline" asChild>
          <Link to="/question-banks">Back to Question Banks</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bank Details</CardTitle>
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUpdateBank}
                    disabled={updateBank.isPending}
                    className="bg-primary-500 hover:bg-primary-500/90"
                  >
                    {updateBank.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeleteBank}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
          <CardDescription>Metadata about this question bank.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editMode ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={bankForm.title}
                  onChange={(e) => setBankForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={bankForm.subject}
                  onChange={(e) => setBankForm((p) => ({ ...p, subject: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={bankForm.description}
                  onChange={(e) => setBankForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium">Title</p>
                <p className="text-sm text-muted-foreground">{data.title}</p>
              </div>
              {data.subject && (
                <div>
                  <p className="text-sm font-medium">Subject</p>
                  <p className="text-sm text-muted-foreground">{data.subject}</p>
                </div>
              )}
              {data.description && (
                <div>
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-muted-foreground">{data.description}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="questions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="questions">Questions ({data.items.length})</TabsTrigger>
          <TabsTrigger value="import">CSV Import</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="bg-primary-500 hover:bg-primary-500/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </div>

          {data.items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No questions yet. Add questions manually or import from CSV.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data.items.map((item) => (
                <QuestionRow
                  key={item.id}
                  item={item}
                  onEdit={openEditDialog}
                  onDelete={handleDeleteQuestion}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CSV Import</CardTitle>
              <CardDescription>
                Paste CSV content to import questions into this bank.
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
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="Paste CSV rows here..."
                  rows={14}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleImportCsv}
                  disabled={importCsv.isPending || !csvContent.trim()}
                  className="bg-primary-500 hover:bg-primary-500/90"
                >
                  {importCsv.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Import
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Question Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Question</DialogTitle>
            <DialogDescription>Create a new question for this bank.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="q-title">Question Text *</Label>
              <Textarea
                id="q-title"
                value={questionForm.title}
                onChange={(e) => setQuestionForm((p) => ({ ...p, title: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-type">Type *</Label>
              <Select
                value={questionForm.type}
                onValueChange={(v) =>
                  setQuestionForm((p) => ({ ...p, type: v as 'radiogroup' | 'checkbox' }))
                }
              >
                <SelectTrigger id="q-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="radiogroup">Single Choice</SelectItem>
                  <SelectItem value="checkbox">Multiple Choice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Choices (at least 2) *</Label>
              {questionForm.choices.map((choice, idx) => (
                <Input
                  key={idx}
                  value={choice}
                  onChange={(e) => {
                    const newChoices = [...questionForm.choices];
                    newChoices[idx] = e.target.value;
                    setQuestionForm((p) => ({ ...p, choices: newChoices }));
                  }}
                  placeholder={`Choice ${String.fromCharCode(65 + idx)}`}
                />
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-correct">
                Correct Answer * (e.g., A or A, B for multiple)
              </Label>
              <Input
                id="q-correct"
                value={questionForm.correctAnswer}
                onChange={(e) => setQuestionForm((p) => ({ ...p, correctAnswer: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-difficulty">Difficulty (1-5)</Label>
              <Input
                id="q-difficulty"
                type="number"
                min={1}
                max={5}
                value={questionForm.difficulty}
                onChange={(e) => setQuestionForm((p) => ({ ...p, difficulty: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-explanation">Explanation</Label>
              <Textarea
                id="q-explanation"
                value={questionForm.explanation}
                onChange={(e) => setQuestionForm((p) => ({ ...p, explanation: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddQuestion}
              disabled={addItem.isPending}
              className="bg-primary-500 hover:bg-primary-500/90"
            >
              {addItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>Update question details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eq-title">Question Text *</Label>
              <Textarea
                id="eq-title"
                value={questionForm.title}
                onChange={(e) => setQuestionForm((p) => ({ ...p, title: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Choices (at least 2) *</Label>
              {questionForm.choices.map((choice, idx) => (
                <Input
                  key={idx}
                  value={choice}
                  onChange={(e) => {
                    const newChoices = [...questionForm.choices];
                    newChoices[idx] = e.target.value;
                    setQuestionForm((p) => ({ ...p, choices: newChoices }));
                  }}
                  placeholder={`Choice ${String.fromCharCode(65 + idx)}`}
                />
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="eq-correct">
                Correct Answer * (e.g., A or A, B for multiple)
              </Label>
              <Input
                id="eq-correct"
                value={questionForm.correctAnswer}
                onChange={(e) => setQuestionForm((p) => ({ ...p, correctAnswer: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eq-difficulty">Difficulty (1-5)</Label>
              <Input
                id="eq-difficulty"
                type="number"
                min={1}
                max={5}
                value={questionForm.difficulty}
                onChange={(e) => setQuestionForm((p) => ({ ...p, difficulty: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eq-explanation">Explanation</Label>
              <Textarea
                id="eq-explanation"
                value={questionForm.explanation}
                onChange={(e) => setQuestionForm((p) => ({ ...p, explanation: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditQuestion}
              disabled={updateItem.isPending}
              className="bg-primary-500 hover:bg-primary-500/90"
            >
              {updateItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
