import { Link } from 'react-router-dom';
import { GraduationCap, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Welcome() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 flex flex-col items-center justify-center">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900">MedEdPrep</h1>
        <p className="mt-2 text-gray-600">Select how you'd like to sign in.</p>
      </div>

      <div
        className="grid gap-6 sm:grid-cols-2 w-full max-w-2xl"
        role="group"
        aria-label="Sign-in options"
      >
        <Link to="/student/login" className="group" aria-label="Sign in as Student">
          <Card className="h-full transition-shadow hover:shadow-lg hover:border-primary-500/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-primary-500 group-hover:bg-blue-200 transition-colors">
                <GraduationCap className="h-7 w-7" aria-hidden="true" />
              </div>
              <CardTitle className="text-xl">Student</CardTitle>
              <CardDescription>View your assessments and review results.</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <span className="text-sm font-medium text-primary-500 group-hover:underline">
                Sign in as Student
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link to="/login" className="group" aria-label="Sign in as Instructor">
          <Card className="h-full transition-shadow hover:shadow-lg hover:border-primary-500/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-600 group-hover:bg-gray-200 transition-colors">
                <ShieldCheck className="h-7 w-7" aria-hidden="true" />
              </div>
              <CardTitle className="text-xl">Instructor</CardTitle>
              <CardDescription>Manage assessments, students, and attendance.</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <span className="text-sm font-medium text-primary-500 group-hover:underline">
                Sign in as Instructor
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </main>
  );
}
