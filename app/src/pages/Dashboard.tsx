import { useAuthStore } from '../lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const org = useAuthStore((s) => s.org);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">MedEdPrep</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>User Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Name:</span> {user?.name}
              </p>
              <p>
                <span className="font-medium">Email:</span> {user?.email}
              </p>
              <p>
                <span className="font-medium">Role:</span> {user?.role}
              </p>
            </CardContent>
          </Card>

          {org && (
            <Card>
              <CardHeader>
                <CardTitle>Organization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Name:</span> {org.name}
                </p>
                <p>
                  <span className="font-medium">Slug:</span> {org.slug}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
