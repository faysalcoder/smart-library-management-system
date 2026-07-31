// ---------------------------------------------------------------------------
// API envelope — every response from the Laravel API uses this shape.
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  ok: boolean;
  data: T;
  message: string | null;
  errors: Record<string, string[]>;
  meta?: PaginationMeta & { summary?: Record<string, number> };
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------

export type RoleName = 'student' | 'librarian' | 'admin' | 'management';

export type CopyStatus =
  | 'available'
  | 'issued'
  | 'reserved'
  | 'lost'
  | 'damaged'
  | 'withdrawn';

export type CirculationStatus = 'issued' | 'returned' | 'overdue' | 'lost';
export type FineStatus = 'pending' | 'partial' | 'paid' | 'waived';
export type MembershipStatus = 'active' | 'suspended' | 'expired';
export type UserStatus = 'active' | 'inactive' | 'locked';

export interface Role {
  role_id: number;
  name: RoleName;
  description: string | null;
}

export interface User {
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  status: UserStatus;
  avatar_url: string | null;
  must_change_password: boolean;
  last_login_at: string | null;
  role?: Role;
  permissions?: string[];
  student?: {
    student_id: number;
    student_no: string;
    department: string;
    batch: string | null;
    membership_status: MembershipStatus;
    borrow_status: 'eligible' | 'blocked';
    outstanding_fine: number;
  } | null;
  created_at?: string;
}

export interface Category {
  category_id: number;
  name: string;
  code: string;
  description: string | null;
  books_count?: number;
}

/** DFD L-0 "Author Management" · DFD L-1 data store "List of Authors". */
export interface Author {
  author_id: number;
  name: string;
  nationality: string | null;
  biography: string | null;
  photo: string | null;
  books_count: number;
}

/** DFD L-0 "Publisher Management". */
export interface Publisher {
  publisher_id: number;
  name: string;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  logo: string | null;
  books_count: number;
}

export interface Book {
  book_id: number;
  isbn: string;
  title: string;
  /** Flattened author name; null when the relation was not loaded. */
  author: string | null;
  author_id: number;
  publisher: string | null;
  publisher_id: number | null;
  publication_year: number | null;
  edition: string | null;
  shelf_no: string | null;
  language: string;
  description: string | null;
  cover_image: string | null;
  total_copies: number;
  available_copies: number;
  on_loan: number;
  is_available: boolean;
  borrow_count: number;
  category_id: number;
  category?: { category_id: number; name: string; code: string };
  copies?: BookCopy[];
  created_at?: string;
}

export interface BookCopy {
  copy_id: number;
  book_id: number;
  accession_no: string;
  barcode: string;
  status: CopyStatus;
  condition: string;
  acquired_on: string | null;
  book?: {
    book_id: number;
    title: string;
    author: string;
    isbn: string;
    shelf_no: string | null;
    cover_image: string | null;
    category: string | null;
  };
}

export interface Student {
  student_id: number;
  student_no: string;
  full_name: string;
  department: string;
  batch: string | null;
  email: string | null;
  phone: string | null;
  card_uid: string | null;
  has_card: boolean;
  membership_status: MembershipStatus;
  borrow_status: 'eligible' | 'blocked';
  active_loans: number;
  outstanding_fine: number;
  enrolled_on: string | null;
  photo_url: string | null;
  user_id: number | null;
}

export interface Circulation {
  circulation_id: number;
  issue_date: string | null;
  due_date: string | null;
  return_date: string | null;
  renewal_count: number;
  status: CirculationStatus;
  overdue_days: number;
  is_overdue: boolean;
  remarks: string | null;
  student?: {
    student_id: number;
    student_no: string;
    full_name: string;
    department: string;
    batch: string | null;
    phone: string | null;
    email: string | null;
    photo_url: string | null;
    outstanding_fine: number;
  };
  copy?: {
    copy_id: number;
    accession_no: string;
    barcode: string;
    status: CopyStatus;
    title: string;
    author: string;
    isbn: string;
    shelf_no: string | null;
    cover_image: string | null;
    category: string | null;
  };
  issued_by?: string;
  returned_to?: string;
  fine?: Fine | null;
}

export interface Fine {
  fine_id: number;
  circulation_id: number;
  student_id: number;
  overdue_days: number;
  rate_per_day: number;
  amount: number;
  paid_amount: number;
  balance: number;
  status: FineStatus;
  waive_reason: string | null;
  settled_at: string | null;
  created_at: string | null;
  student?: {
    student_id: number;
    student_no: string;
    full_name: string;
    department: string;
  };
  book_title?: string;
  collected_by?: string;
  waived_by?: string;
}

// ---------------------------------------------------------------------------
// Circulation workflow payloads
// ---------------------------------------------------------------------------

export interface Eligibility {
  eligible: boolean;
  reasons: string[];
  limit: number;
  open_loans: number;
}

export interface VerifiedStudent {
  student: {
    student_id: number;
    student_no: string;
    full_name: string;
    department: string;
    batch: string | null;
    photo_url: string | null;
    membership_status: MembershipStatus;
    borrow_status: 'eligible' | 'blocked';
    outstanding_fine: number;
    enrolled_on: string | null;
  };
  eligibility: Eligibility;
}

export interface FinePreview {
  overdue_days: number;
  chargeable_days: number;
  rate: number;
  amount: number;
  capped: boolean;
}

export interface ReturnLookup {
  circulation: Circulation;
  fine_preview: FinePreview;
}

/**
 * DFD Level-2 fallback into process 5.0 Return Books: "Student Id + book
 * title" — used when the barcode label is torn or unreadable.
 */
export interface ReturnLookupByStudent {
  student: {
    student_id: number;
    student_no: string;
    full_name: string;
    department: string;
  };
  loans: Array<{
    circulation: Circulation;
    fine_preview: FinePreview;
  }>;
}

export interface ReturnResult {
  circulation: Circulation;
  fine: Fine | null;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface StaffDashboard {
  type: 'staff';
  stats: {
    issued_today: number;
    returned_today: number;
    overdue: number;
    pending_fines: number;
    total_titles: number;
    total_students: number;
    active_loans: number;
  };
  recent_activity: Array<{
    log_id: number;
    action: string;
    detail: string | null;
    actor: string | null;
    at: string | null;
  }>;
  due_today: Array<{
    circulation_id: number;
    student_name: string;
    student_no: string;
    title: string;
  }>;
  most_overdue: Array<{
    circulation_id: number;
    student_name: string;
    student_no: string;
    title: string;
    overdue_days: number;
  }>;
  alert: string | null;
}

export interface StudentDashboard {
  type: 'student';
  profile: {
    student_no: string;
    full_name: string;
    department: string;
    batch: string | null;
    membership_status: MembershipStatus;
    borrow_status: string;
  } | null;
  stats: {
    on_loan: number;
    due_soon: number;
    overdue?: number;
    outstanding_fine: number;
  };
  current_loans: Array<{
    circulation_id: number;
    title: string;
    author: string;
    category: string | null;
    accession_no: string;
    issue_date: string | null;
    due_date: string | null;
    overdue_days: number;
    is_overdue: boolean;
    renewal_count: number;
  }>;
  recently_returned: Array<{
    circulation_id: number;
    title: string;
    author: string;
    return_date: string | null;
  }>;
}

export type Dashboard = StaffDashboard | StudentDashboard;

// ---------------------------------------------------------------------------
// Settings & admin
// ---------------------------------------------------------------------------

export interface PublicSettings {
  loan_period_days: number;
  max_books_per_student: number;
  fine_rate_per_day: number;
  fine_grace_days: number;
  fine_max_cap: number;
  fine_block_threshold: number;
  max_renewals: number;
  currency_symbol: string;
  currency_code: string;
}

export interface SettingItem {
  key: string;
  value: string | number | boolean;
  raw: string;
  type: 'int' | 'decimal' | 'string' | 'bool';
  label: string | null;
  description: string | null;
  default: string | number | null;
}

export interface AuditLogEntry {
  log_id: number;
  action: string;
  actor: string;
  user_id: number | null;
  entity_type: string | null;
  entity_id: number | null;
  detail: string | null;
  ip_address: string | null;
  created_at: string | null;
}

/** §3.3 — derived notifications (fines, due dates, overdue loans). */
export interface NotificationItem {
  id: string;
  tone: 'danger' | 'warning' | 'info';
  icon: string;
  title: string;
  message: string;
  link: string;
}

export interface NotificationFeed {
  items: NotificationItem[];
  count: number;
  urgent: number;
}

/** §1.4 — database backup and recovery. */
export interface BackupFile {
  name: string;
  size: number;
  size_label: string;
  created_at: string;
}

export interface ReportDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
  params: string[];
}
