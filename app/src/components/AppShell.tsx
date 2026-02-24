import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AdminSidebar from '@/components/AdminSidebar';

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar — fixed, hidden on mobile */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 md:flex md:flex-col">
        <div className="sidebar-glass flex h-full flex-col bg-card">
          <AdminSidebar />
        </div>
      </aside>

      {/* Mobile sidebar — Sheet drawer from left */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <div className="sidebar-glass flex h-full flex-col bg-card">
            <AdminSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content area with sidebar offset */}
      <div className="flex flex-1 flex-col md:pl-64">
        {/* Mobile header with hamburger — hidden on desktop */}
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background px-4 py-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
          <span className="font-semibold text-foreground">MedEdPrep</span>
        </header>

        {/* Page content */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
