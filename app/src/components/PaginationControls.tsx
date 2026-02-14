import { Button } from '@/components/ui/button';

export function PaginationControls({
  total,
  page,
  limit,
  onPrevious,
  onNext,
}: {
  total: number;
  page: number;
  limit: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = total === 0 ? 0 : Math.min(page * limit, total);
  const canPrevious = page > 1;
  const canNext = page * limit < total;

  if (total <= limit) return null;

  return (
    <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">
        Showing {start}-{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrevious} disabled={!canPrevious}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={!canNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
