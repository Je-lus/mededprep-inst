import { Link } from 'react-router-dom';
import { GraduationCap, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Welcome() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 flex flex-col items-center justify-center">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-foreground">MedEdPrep</h1>
        <p className="mt-2 text-muted-foreground">Select how you'd like to sign in.</p>
      </div>

      <div
        className="grid gap-6 sm:grid-cols-2 w-full max-w-2xl"
        role="group"
        aria-label="Sign-in options"
      >
        <Link to="/student/login" className="group" aria-label="Sign in as Student">
          <Card className="h-full transition-shadow hover:shadow-lg hover:border-primary/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                <GraduationCap className="h-7 w-7" aria-hidden="true" />
              </div>
              <CardTitle className="text-xl">Student</CardTitle>
              <CardDescription>View your assessments and review results.</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <span className="text-sm font-medium text-primary group-hover:underline">
                Sign in as Student
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link to="/login" className="group" aria-label="Sign in as Instructor">
          <Card className="h-full transition-shadow hover:shadow-lg hover:border-primary/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-muted/80 transition-colors">
                <ShieldCheck className="h-7 w-7" aria-hidden="true" />
              </div>
              <CardTitle className="text-xl">Instructor</CardTitle>
              <CardDescription>Manage assessments, students, and attendance.</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <span className="text-sm font-medium text-primary group-hover:underline">
                Sign in as Instructor
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </main>
  );
}
