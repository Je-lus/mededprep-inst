import { Badge } from '@/components/ui/badge';
import type { Assessment } from '@/types/api';

export function StatusBadge({ status }: { status: Assessment['status'] }) {
  if (status === 'active') {
    return <Badge className="bg-primary text-white hover:bg-primary">Active</Badge>;
  }
  if (status === 'closed') {
    return <Badge variant="secondary">Closed</Badge>;
  }
  return <Badge variant="outline">Draft</Badge>;
}
