import { http, request, requestWithMeta } from '@/lib/api';
import type {
  AuditLogEntry,
  Author,
  BackupFile,
  Book,
  Publisher,
  BookCopy,
  Category,
  Circulation,
  Dashboard,
  Fine,
  NotificationFeed,
  ReportDefinition,
  ReturnLookup,
  ReturnLookupByStudent,
  ReturnResult,
  Role,
  SettingItem,
  Student,
  User,
  VerifiedStudent,
} from '@/types';

// ---------------------------------------------------------------------------
// Image uploads (book covers, author photos, publisher logos)
// ---------------------------------------------------------------------------

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

function toImageForm(file: File): FormData {
  const form = new FormData();
  form.append('image', file);
  return form;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const dashboardApi = {
  get: () => request<Dashboard>(http.get('/dashboard')),

  /** §3.3 — fine and due-date notifications, derived from live state. */
  notifications: () => request<NotificationFeed>(http.get('/notifications')),
};

// ---------------------------------------------------------------------------
// Catalog (FR-02 / FR-06)
// ---------------------------------------------------------------------------

export interface BookQuery {
  q?: string;
  category_id?: number | string;
  author_id?: number | string;
  publisher_id?: number | string;
  available_only?: boolean;
  author?: string;
  language?: string;
  year_from?: number;
  year_to?: number;
  sort?: 'relevance' | 'title' | 'newest' | 'popular';
  page?: number;
  per_page?: number;
}

export const bookApi = {
  list: (params: BookQuery) => requestWithMeta<Book[]>(http.get('/books', { params })),

  /** Returns the book plus §3.5.1 "alternative available books" suggestions. */
  get: (id: number | string) =>
    request<{ book: Book; related: Book[] }>(http.get(`/books/${id}`)),
  suggest: (q: string) =>
    request<Array<{ book_id: number; title: string; author: string; available: boolean }>>(
      http.get('/books/suggest', { params: { q } }),
    ),
  create: (payload: Partial<Book> & { initial_copies?: number }) =>
    request<Book>(http.post('/books', payload)),
  update: (id: number, payload: Partial<Book>) =>
    request<Book>(http.put(`/books/${id}`, payload)),
  remove: (id: number) => request<null>(http.delete(`/books/${id}`)),

  copies: (bookId: number) => request<BookCopy[]>(http.get(`/books/${bookId}/copies`)),
  addCopies: (bookId: number, quantity: number) =>
    request<BookCopy[]>(http.post(`/books/${bookId}/copies`, { quantity })),
  updateCopy: (copyId: number, payload: { status?: string; condition?: string }) =>
    request<BookCopy>(http.put(`/copies/${copyId}`, payload)),
  removeCopy: (copyId: number) => request<null>(http.delete(`/copies/${copyId}`)),
  lookupBarcode: (barcode: string) =>
    request<BookCopy>(http.get(`/copies/lookup/${encodeURIComponent(barcode)}`)),

  uploadCover: (bookId: number, file: File) =>
    request<Book>(http.post(`/books/${bookId}/cover`, toImageForm(file), MULTIPART)),
};

/**
 * DFD Level-0 "Author Management" · Level-1 data store "List of Authors".
 * `all: true` returns the unpaginated list used to populate form selects.
 */
export const authorApi = {
  list: (params: { q?: string; page?: number; per_page?: number } = {}) =>
    requestWithMeta<Author[]>(http.get('/authors', { params })),
  all: () => request<Author[]>(http.get('/authors', { params: { all: true } })),
  get: (id: number | string) =>
    request<{
      author: Author;
      books: Array<{
        book_id: number;
        title: string;
        isbn: string;
        category: string | null;
        available_copies: number;
        total_copies: number;
      }>;
    }>(http.get(`/authors/${id}`)),
  create: (payload: Partial<Author>) => request<Author>(http.post('/authors', payload)),
  update: (id: number, payload: Partial<Author>) =>
    request<Author>(http.put(`/authors/${id}`, payload)),
  remove: (id: number) => request<null>(http.delete(`/authors/${id}`)),
  uploadPhoto: (id: number, file: File) =>
    request<Author>(http.post(`/authors/${id}/photo`, toImageForm(file), MULTIPART)),
};

/** DFD Level-0 "Publisher Management". */
export const publisherApi = {
  list: (params: { q?: string; page?: number; per_page?: number } = {}) =>
    requestWithMeta<Publisher[]>(http.get('/publishers', { params })),
  all: () => request<Publisher[]>(http.get('/publishers', { params: { all: true } })),
  get: (id: number | string) =>
    request<{
      publisher: Publisher;
      books: Array<{
        book_id: number;
        title: string;
        isbn: string;
        author: string | null;
        category: string | null;
        available_copies: number;
        total_copies: number;
      }>;
    }>(http.get(`/publishers/${id}`)),
  create: (payload: Partial<Publisher>) => request<Publisher>(http.post('/publishers', payload)),
  update: (id: number, payload: Partial<Publisher>) =>
    request<Publisher>(http.put(`/publishers/${id}`, payload)),
  remove: (id: number) => request<null>(http.delete(`/publishers/${id}`)),
  uploadLogo: (id: number, file: File) =>
    request<Publisher>(http.post(`/publishers/${id}/logo`, toImageForm(file), MULTIPART)),
};

export const categoryApi = {
  list: () => request<Category[]>(http.get('/categories')),
  create: (payload: Pick<Category, 'name' | 'code' | 'description'>) =>
    request<Category>(http.post('/categories', payload)),
  update: (id: number, payload: Partial<Category>) =>
    request<Category>(http.put(`/categories/${id}`, payload)),
  remove: (id: number) => request<null>(http.delete(`/categories/${id}`)),
};

// ---------------------------------------------------------------------------
// Members (FR-07 / FR-10)
// ---------------------------------------------------------------------------

export interface StudentQuery {
  q?: string;
  department?: string;
  membership_status?: string;
  with_fines?: boolean;
  page?: number;
  per_page?: number;
}

export const studentApi = {
  list: (params: StudentQuery) =>
    requestWithMeta<Student[]>(http.get('/students', { params })),
  get: (id: number | string) =>
    request<{
      student: Student;
      loans: Circulation[];
      fines: Fine[];
      summary: { total_loans: number; active_loans: number; outstanding_fine: number };
    }>(http.get(`/students/${id}`)),
  create: (payload: Partial<Student>) => request<Student>(http.post('/students', payload)),
  update: (id: number, payload: Partial<Student>) =>
    request<Student>(http.put(`/students/${id}`, payload)),
  remove: (id: number) => request<null>(http.delete(`/students/${id}`)),
  bindCard: (id: number, cardUid: string) =>
    request<Student>(http.post(`/students/${id}/bind-card`, { card_uid: cardUid })),
  setMembership: (id: number, status: string) =>
    request<Student>(http.patch(`/students/${id}/membership`, { membership_status: status })),
  departments: () => request<string[]>(http.get('/students/departments')),
};

// ---------------------------------------------------------------------------
// Circulation (FR-03 / FR-04)
// ---------------------------------------------------------------------------

export const circulationApi = {
  verifyCard: (cardUid: string) =>
    request<VerifiedStudent>(http.post('/circulation/verify-card', { card_uid: cardUid })),

  issue: (cardUid: string, barcode: string) =>
    request<Circulation>(http.post('/circulation/issue', { card_uid: cardUid, barcode })),

  returnLookup: (barcode: string) =>
    request<ReturnLookup>(http.post('/circulation/return/lookup', { barcode })),

  /** DFD L-2 fallback: identify the student, then pick from their open loans. */
  returnLookupByStudent: (identifier: string, title?: string) =>
    request<ReturnLookupByStudent>(
      http.post('/circulation/return/lookup-by-student', { identifier, title }),
    ),

  return: (barcode: string) => request<ReturnResult>(http.post('/circulation/return', { barcode })),

  renew: (id: number) => request<Circulation>(http.post(`/circulation/${id}/renew`)),

  list: (params: Record<string, unknown>) =>
    requestWithMeta<Circulation[]>(http.get('/circulation', { params })),

  overdue: (params: Record<string, unknown>) =>
    requestWithMeta<Circulation[]>(http.get('/circulation/overdue', { params })),

  get: (id: number | string) => request<Circulation>(http.get(`/circulation/${id}`)),

  myLoans: () =>
    request<{ current: Circulation[]; history: Circulation[] }>(http.get('/my/loans')),
};

// ---------------------------------------------------------------------------
// Fines (FR-05)
// ---------------------------------------------------------------------------

export const fineApi = {
  list: (params: Record<string, unknown>) =>
    requestWithMeta<Fine[]>(http.get('/fines', { params })),
  get: (id: number) => request<Fine>(http.get(`/fines/${id}`)),
  collect: (id: number, amount: number) =>
    request<Fine>(http.post(`/fines/${id}/collect`, { amount })),
  waive: (id: number, reason: string) =>
    request<Fine>(http.post(`/fines/${id}/waive`, { reason })),
  myFines: () =>
    request<{ fines: Fine[]; summary: { outstanding: number; paid: number; count: number } }>(
      http.get('/my/fines'),
    ),
};

// ---------------------------------------------------------------------------
// Self-service profile (student account maintenance)
// ---------------------------------------------------------------------------

export interface ProfileUpdatePayload {
  full_name: string;
  email: string;
  phone?: string;
  department: string;
}

export const profileApi = {
  get: () => request<Student>(http.get('/my/profile')),
  update: (payload: ProfileUpdatePayload) =>
    request<Student>(http.put('/my/profile', payload)),
};

// ---------------------------------------------------------------------------
// Reports (FR-08)
// ---------------------------------------------------------------------------

export const reportApi = {
  catalogue: () => request<ReportDefinition[]>(http.get('/reports')),
  run: (key: string, params: Record<string, unknown>) =>
    request<{
      summary?: Record<string, number | string>;
      rows: Array<Record<string, unknown>>;
      as_of?: string;
      date?: string;
      student?: Record<string, unknown>;
    }>(http.get(`/reports/${key}`, { params })),
  exportUrl: (key: string, params: Record<string, unknown>) => {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k, String(v)]),
    );

    return `${import.meta.env.VITE_API_URL ?? '/api'}/reports/${key}/export?${query}`;
  },
};

// ---------------------------------------------------------------------------
// Administration (FR-09)
// ---------------------------------------------------------------------------

export const adminApi = {
  users: (params: Record<string, unknown>) =>
    requestWithMeta<User[]>(http.get('/admin/users', { params })),
  user: (id: number) => request<User>(http.get(`/admin/users/${id}`)),
  createUser: (payload: Record<string, unknown>) =>
    request<User>(http.post('/admin/users', payload)),
  updateUser: (id: number, payload: Record<string, unknown>) =>
    request<User>(http.put(`/admin/users/${id}`, payload)),
  setUserStatus: (id: number, status: string) =>
    request<User>(http.patch(`/admin/users/${id}/status`, { status })),
  resetPassword: (id: number) =>
    request<{ temporary_password: string }>(http.post(`/admin/users/${id}/reset-password`)),
  removeUser: (id: number) => request<null>(http.delete(`/admin/users/${id}`)),

  roles: () =>
    request<Array<Role & { users_count: number; permissions: string[] }>>(
      http.get('/admin/roles'),
    ),

  settings: () => request<Record<string, SettingItem[]>>(http.get('/admin/settings')),
  updateSettings: (settings: Record<string, unknown>) =>
    request<null>(http.put('/admin/settings', { settings })),

  logs: (params: Record<string, unknown>) =>
    requestWithMeta<AuditLogEntry[]>(http.get('/admin/logs', { params })),
  logActions: () => request<string[]>(http.get('/admin/logs/actions')),

  // ---- Database backup & recovery (§1.4 Administrator Requirements) ------
  backups: () =>
    request<{
      backups: BackupFile[];
      summary: { count: number; latest: string | null; total_size: number };
    }>(http.get('/admin/backups')),

  createBackup: () =>
    request<BackupFile & { tables: number }>(http.post('/admin/backups')),

  restoreBackup: (filename: string) =>
    request<{ statements: number; file: string }>(
      http.post(`/admin/backups/${filename}/restore`, { confirm: 'RESTORE' }),
    ),

  deleteBackup: (filename: string) =>
    request<null>(http.delete(`/admin/backups/${filename}`)),

  backupDownloadUrl: (filename: string) =>
    `${import.meta.env.VITE_API_URL ?? '/api'}/admin/backups/${filename}/download`,
};
