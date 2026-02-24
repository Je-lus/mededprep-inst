import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Plus } from 'lucide-react';
import { useQuestionBanks } from '@/hooks/useQuestionBanks';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

export default function QuestionBankList() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useQuestionBanks();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Question Banks</h1>
          <p className="text-sm text-muted-foreground">
            Manage reusable question banks for assessments.
          </p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link to="/question-banks/new">
            <Plus className="mr-2 h-4 w-4" />
            New Bank
          </Link>
        </Button>
      </div>

      {isLoading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-56" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load question banks</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Try again.'}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState
          title="No question banks yet"
          description="Create your first question bank to store reusable questions."
          action={
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/question-banks/new">
                <Plus className="mr-2 h-4 w-4" />
                New Bank
              </Link>
            </Button>
          }
        />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="w-[120px] text-right">Questions</TableHead>
                  <TableHead className="w-[140px]">Created</TableHead>
                  <TableHead className="w-[110px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((bank) => (
                  <TableRow
                    key={bank.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/question-banks/${bank.id}`)}
                  >
                    <TableCell>
                      <p className="font-medium">{bank.title}</p>
                      {bank.description && (
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {bank.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{bank.subject || '-'}</TableCell>
                    <TableCell className="text-right">{bank._count?.items ?? 0}</TableCell>
                    <TableCell>{formatDate(bank.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/question-banks/${bank.id}`);
                        }}
                      >
                        Open
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
