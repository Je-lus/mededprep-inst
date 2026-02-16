import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, CircleX, ArrowLeft } from 'lucide-react';
import { useAssessmentReview } from '../../hooks/useStudentAuth';
import { ApiError } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

function splitAnswer(answer: string): string[] {
  if (!answer.trim()) return [];
  return answer
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function answerLabel(value: string, choices: Array<{ value: string; text: string }>): string {
  const found = choices.find((choice) => choice.value === value);
  return found ? found.text : value;
}

export default function AssessmentReview() {
  const { responseId } = useParams<{ responseId: string }>();
  const safeResponseId = responseId ?? '';
  const reviewQuery = useAssessmentReview(safeResponseId);

  if (!responseId) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Alert variant="destructive">
            <AlertTitle>Invalid review link</AlertTitle>
            <AlertDescription>The requested assessment response was not found.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (reviewQuery.isPending) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  const reviewNotAllowed =
    reviewQuery.error instanceof ApiError && reviewQuery.error.code === 'REVIEW_NOT_ALLOWED';

  if (reviewQuery.isError || !reviewQuery.data) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-4">
          <Alert variant="destructive">
            <AlertTitle>Unable to load review</AlertTitle>
            <AlertDescription>
              {reviewNotAllowed
                ? 'Review is not available for this assessment.'
                : reviewQuery.error instanceof ApiError
                ? reviewQuery.error.message
                : 'Please return to your dashboard and try again.'}
            </AlertDescription>
          </Alert>
          <Button asChild variant="outline">
            <Link to="/student">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const review = reviewQuery.data;

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline">
            <Link to="/student">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to My Assessments
            </Link>
          </Button>
          <Badge className="bg-primary text-primary-foreground">{review.scorePercentage}%</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{review.assessment.title}</CardTitle>
            {review.assessment.description && (
              <CardDescription>{review.assessment.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-base font-medium">
              {review.totalCorrect} correct out of {review.totalQuestions} ({review.scorePercentage}%)
            </p>
          </CardContent>
        </Card>

        {review.questions.map((question, index) => {
          const studentValues = splitAnswer(question.studentAnswer);
          const correctValues = splitAnswer(question.correctAnswer);

          const studentAnswerText =
            studentValues.length > 0
              ? studentValues.map((value) => answerLabel(value, question.choices)).join(', ')
              : 'No answer provided';
          const correctAnswerText =
            correctValues.length > 0
              ? correctValues.map((value) => answerLabel(value, question.choices)).join(', ')
              : 'N/A';

          return (
            <Card key={question.questionName}>
              <CardHeader className="space-y-2">
                <CardDescription>
                  Question {index + 1} of {review.questions.length}
                </CardDescription>
                <CardTitle className="text-lg leading-snug">{question.questionTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {question.choices.map((choice) => {
                    const isCorrect = correctValues.includes(choice.value);
                    const studentSelected = studentValues.includes(choice.value);
                    const studentWrong = studentSelected && !isCorrect;

                    return (
                      <li
                        key={choice.value}
                        className={[
                          'flex items-center gap-3 rounded-md border p-3 text-sm',
                          isCorrect && 'border-emerald-300 bg-emerald-50 text-emerald-900',
                          studentWrong && 'border-rose-300 bg-rose-50 text-rose-900',
                          !isCorrect && !studentWrong && 'border-slate-200 bg-white text-slate-700',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        ) : studentWrong ? (
                          <CircleX className="h-4 w-4 text-rose-700" />
                        ) : (
                          <Circle className="h-4 w-4 text-slate-400" />
                        )}
                        <span>{choice.text}</span>
                      </li>
                    );
                  })}
                </ul>

                <Separator />

                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-semibold">Your answer:</span> {studentAnswerText}
                  </p>
                  <p>
                    <span className="font-semibold">Correct answer:</span> {correctAnswerText}
                  </p>
                </div>

                {question.explanation && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                    <p className="font-semibold">Explanation</p>
                    <p className="mt-1">{question.explanation}</p>
                    {question.pageNumber && <p className="mt-2 text-xs">Reference: {question.pageNumber}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
