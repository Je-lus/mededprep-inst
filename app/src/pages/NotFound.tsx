import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <p className="text-6xl font-bold text-gray-500" aria-hidden="true">
            404
          </p>
          <CardTitle className="mt-4 text-2xl">Page not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Button asChild>
            <Link to="/welcome">Go Home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
