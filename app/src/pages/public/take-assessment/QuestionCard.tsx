import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SurveyChoice, SurveyElement } from '@/types/api';

type NormalizedChoice = { value: string; text: string };

function normalizeChoice(choice: SurveyChoice): NormalizedChoice {
  if (typeof choice === 'string') return { value: choice, text: choice };
  return { value: String(choice.value), text: choice.text || String(choice.value) };
}

export function QuestionCard({
  question,
  index,
  totalQuestions,
  answerValue,
  onRadioChange,
  onCheckboxChange,
  onTextChange,
}: {
  question: SurveyElement;
  index: number;
  totalQuestions: number;
  answerValue: unknown;
  onRadioChange: (questionName: string, value: string) => void;
  onCheckboxChange: (questionName: string, value: string, checked: boolean) => void;
  onTextChange: (questionName: string, value: string) => void;
}) {
  const choices = (question.choices ?? []).map(normalizeChoice);
  const questionLabel = question.title || question.name;
  const checkedValues = Array.isArray(answerValue)
    ? answerValue.filter((item): item is string => typeof item === 'string')
    : [];

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          Question {index + 1} of {totalQuestions}
        </CardDescription>
        <CardTitle className="text-lg leading-snug">{questionLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        {question.type === 'radiogroup' && choices.length > 0 && (
          <div className="space-y-2">
            {choices.map((choice) => (
              <label
                key={choice.value}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition hover:bg-slate-50"
              >
                <input
                  type="radio"
                  name={question.name}
                  checked={answerValue === choice.value}
                  onChange={() => onRadioChange(question.name, choice.value)}
                  className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-slate-800">{choice.text}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === 'checkbox' && choices.length > 0 && (
          <div className="space-y-2">
            {choices.map((choice) => (
              <label
                key={choice.value}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={checkedValues.includes(choice.value)}
                  onChange={(event) =>
                    onCheckboxChange(question.name, choice.value, event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-slate-800">{choice.text}</span>
              </label>
            ))}
          </div>
        )}

        {(question.type !== 'radiogroup' && question.type !== 'checkbox') || choices.length === 0 ? (
          <div className="space-y-2">
            <Label htmlFor={`question-${question.name}`}>Your answer</Label>
            <Input
              id={`question-${question.name}`}
              value={typeof answerValue === 'string' ? answerValue : ''}
              onChange={(event) => onTextChange(question.name, event.target.value)}
              placeholder="Type your answer"
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
