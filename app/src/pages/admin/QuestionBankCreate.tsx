import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getFieldErrors } from '@/lib/api';
import { useCreateQuestionBank } from '@/hooks/useQuestionBanks';

type FormState = {
  title: string;
  description: string;
  subject: string;
};

export default function QuestionBankCreate() {
  const navigate = useNavigate();
  const createBank = useCreateQuestionBank();

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    subject: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleCreate = async () => {
    setFieldErrors({});
    try {
      const bank = await createBank.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        subject: form.subject.trim() || undefined,
      });
      toast.success('Question bank created');
      navigate(`/question-banks/${bank.id}`);
    } catch (error) {
      setFieldErrors(getFieldErrors(error));
      toast.error(error instanceof Error ? error.message : 'Unable to create question bank');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Create Question Bank</h1>
          <p className="text-sm text-muted-foreground">
            Set up a new bank to store reusable questions.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/question-banks">Back to Question Banks</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bank Details</CardTitle>
          <CardDescription>Basic information about this question bank.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="EMS Cardiology Questions"
              required
            />
            {fieldErrors.title && <p className="text-sm text-red-600">{fieldErrors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={form.subject}
              onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
              placeholder="Cardiology"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Optional notes about this question bank."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link to="/question-banks">Cancel</Link>
        </Button>
        <Button
          onClick={handleCreate}
          disabled={createBank.isPending || !form.title.trim()}
          className="bg-[#1b5fd0] hover:bg-[#1b5fd0]/90"
        >
          {createBank.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Bank
        </Button>
      </div>
    </div>
  );
}
