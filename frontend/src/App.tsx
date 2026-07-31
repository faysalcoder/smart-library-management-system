import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AppShell } from '@/components/layout/AppShell';
import { ToastViewport } from '@/components/layout/Toast';
import { Spinner, EmptyState, Button } from '@/components/ui';
import { useAuth } from '@/store/auth';

import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import SearchPage from '@/pages/student/SearchPage';
import BookDetailPage from '@/pages/student/BookDetailPage';
import MyLoansPage from '@/pages/student/MyLoansPage';
import MyFinesPage from '@/pages/student/MyFinesPage';
import IssueBookPage from '@/pages/librarian/IssueBookPage';
import ReturnBookPage from '@/pages/librarian/ReturnBookPage';
import ReceiptPage from '@/pages/librarian/ReceiptPage';
import OverduePage from '@/pages/librarian/OverduePage';
import FinesPage from '@/pages/librarian/FinesPage';
import BooksPage from '@/pages/librarian/BooksPage';
import BookFormPage from '@/pages/librarian/BookFormPage';
import StudentsPage from '@/pages/librarian/StudentsPage';
import StudentDetailPage from '@/pages/librarian/StudentDetailPage';
import CategoriesPage from '@/pages/librarian/CategoriesPage';
import AuthorsPage from '@/pages/librarian/AuthorsPage';
import PublishersPage from '@/pages/librarian/PublishersPage';
import ReportsPage from '@/pages/admin/ReportsPage';
import UsersPage from '@/pages/admin/UsersPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import AuditLogPage from '@/pages/admin/AuditLogPage';
import BackupPage from '@/pages/admin/BackupPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

/** Blocks a route until the session is known; redirects to /login if absent. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Restoring your session…" />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <>{children}</>;
}

/** Blocks a route unless the user holds the given permission. */
function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const can = useAuth((s) => s.can);

  if (!can(permission)) {
    return (
      <EmptyState
        icon="lock"
        title="You do not have access to this area"
        description="Your role does not include this permission. If you believe this is a mistake, contact the library administrator."
        action={
          <Button variant="secondary" icon="arrow_back" onClick={() => window.history.back()}>
            Go back
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  const restore = useAuth((s) => s.restore);

  useEffect(() => {
    void restore();
  }, [restore]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* The printable receipt renders outside the app shell. */}
      <Route
        path="/circulation/:id/receipt"
        element={
          <RequireAuth>
            <ReceiptPage />
          </RequireAuth>
        }
      />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />

        {/* Catalog — everyone who can search */}
        <Route
          path="search"
          element={
            <RequirePermission permission="book.search">
              <SearchPage />
            </RequirePermission>
          }
        />
        <Route
          path="books/:id"
          element={
            <RequirePermission permission="book.view">
              <BookDetailPage />
            </RequirePermission>
          }
        />

        {/* Student self-service */}
        <Route path="my/loans" element={<MyLoansPage />} />
        <Route path="my/fines" element={<MyFinesPage />} />

        {/* Circulation */}
        <Route
          path="circulation/issue"
          element={
            <RequirePermission permission="circulate">
              <IssueBookPage />
            </RequirePermission>
          }
        />
        <Route
          path="circulation/return"
          element={
            <RequirePermission permission="circulate">
              <ReturnBookPage />
            </RequirePermission>
          }
        />
        <Route
          path="circulation/overdue"
          element={
            <RequirePermission permission="loan.view">
              <OverduePage />
            </RequirePermission>
          }
        />
        <Route
          path="fines"
          element={
            <RequirePermission permission="fine.view">
              <FinesPage />
            </RequirePermission>
          }
        />

        {/* Catalog management */}
        <Route
          path="books"
          element={
            <RequirePermission permission="book.manage">
              <BooksPage />
            </RequirePermission>
          }
        />
        <Route
          path="books/new/edit"
          element={
            <RequirePermission permission="book.manage">
              <BookFormPage />
            </RequirePermission>
          }
        />
        <Route
          path="books/:id/edit"
          element={
            <RequirePermission permission="book.manage">
              <BookFormPage />
            </RequirePermission>
          }
        />

        <Route
          path="categories"
          element={
            <RequirePermission permission="category.manage">
              <CategoriesPage />
            </RequirePermission>
          }
        />
        {/* DFD L-0 modules: Author Management and Publisher Management */}
        <Route
          path="authors"
          element={
            <RequirePermission permission="author.manage">
              <AuthorsPage />
            </RequirePermission>
          }
        />
        <Route
          path="publishers"
          element={
            <RequirePermission permission="publisher.manage">
              <PublishersPage />
            </RequirePermission>
          }
        />

        {/* Members */}
        <Route
          path="students"
          element={
            <RequirePermission permission="student.view">
              <StudentsPage />
            </RequirePermission>
          }
        />
        <Route
          path="students/:id"
          element={
            <RequirePermission permission="student.view">
              <StudentDetailPage />
            </RequirePermission>
          }
        />

        {/* Reports */}
        <Route
          path="reports"
          element={
            <RequirePermission permission="report.view">
              <ReportsPage />
            </RequirePermission>
          }
        />

        {/* Administration */}
        <Route
          path="admin/users"
          element={
            <RequirePermission permission="user.manage">
              <UsersPage />
            </RequirePermission>
          }
        />
        <Route
          path="admin/settings"
          element={
            <RequirePermission permission="setting.manage">
              <SettingsPage />
            </RequirePermission>
          }
        />
        <Route
          path="admin/logs"
          element={
            <RequirePermission permission="log.view">
              <AuditLogPage />
            </RequirePermission>
          }
        />
        <Route
          path="admin/backups"
          element={
            <RequirePermission permission="backup.manage">
              <BackupPage />
            </RequirePermission>
          }
        />

        <Route
          path="*"
          element={
            <EmptyState
              icon="search_off"
              title="Page not found"
              description="The page you are looking for does not exist or has been moved."
            />
          }
        />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <ToastViewport />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
