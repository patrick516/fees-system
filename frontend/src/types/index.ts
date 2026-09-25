// ==================== SCHOOL ====================
export interface School {
  id: string;
  name: string;
  address: string;
  city?: string;
  phone: string;
  email?: string | null;
  logo: string | null;
  motto?: string | null;
  primaryColor?: string | null;
  isActive: boolean;
}

// ==================== STAFF ====================
export interface Staff {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "SUPER_ADMIN" | "SCHOOL_ADMIN" | "BURSAR";
  avatar: string | null;
  school: School;
}

// ==================== CLASS ====================
export interface Class {
  id: string;
  name: string;
  level?: number;
}

// ==================== STUDENT ====================
export interface Student {
  id: string;
  studentCode: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
  photo: string | null;
  isActive: boolean;
  parentName: string;
  parentPhone: string;
  parentPhone2?: string | null;
  parentEmail?: string | null;
  academicYear: string;
  class: Class;
  totalPaid?: number;
  isDebtor?: boolean;
  outstandingBalance?: number;
}

// ==================== FEE STRUCTURE ====================
export interface FeeStructure {
  id: string;
  classId: string;
  academicYear: string;
  term: Term;
  totalAmount: number;
  tuitionFee?: number | null;
  examFee?: number | null;
  buildingLevy?: number | null;
  uniformFee?: number | null;
  bookFee?: number | null;
  otherFees?: number | null;
  isActive: boolean;
  class?: { name: string };
}

// ==================== PAYMENT ====================
export type PaymentMethod =
  | "CASH"
  | "AIRTEL_MONEY"
  | "TNM_MPAMBA"
  | "NATIONAL_BANK"
  | "STANDARD_BANK"
  | "FDH_BANK"
  | "NBS_BANK"
  | "OTHER_BANK";

export type PaymentStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type Term = "TERM_1" | "TERM_2" | "TERM_3";

export interface Payment {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  term: Term;
  academicYear: string;
  receiptNumber: string;
  receiptImage: string | null;
  status: PaymentStatus;
  submittedBy: "BURSAR" | "PARENT";
  bankReference: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
  verifiedAt: string | null;
  student?: {
    fullName: string;
    studentCode: string;
    class: { name: string };
    parentName?: string;
    parentPhone?: string;
  };
  recordedBy?: { fullName: string };
  verifiedBy?: { fullName: string } | null;
}

// ==================== PAYMENT SUMMARY ====================
// One canonical shape — used by the Dashboard's /payments/summary endpoint.
export interface PaymentSummary {
  // ===== Accounting =====
  totalRequired: number; // sum of every student's fee for the term
  totalCollected: number; // per-student MIN(paid, required), summed
  outstandingBalance: number; // required − collected
  totalCredit: number; // overpayments held for next term
  totalCashReceived: number; // raw sum of verified payments (audit)
  todayCollected: number;

  // ===== Counts =====
  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
  totalStudents: number;
  paidStudents: number; // students who've fully paid
  unpaidStudents: number; // same as debtorCount (kept for compat)
  debtorCount: number; // students with a balance owing
  noFeeCount: number; // students whose class has no fee set

  // ===== Meta =====
  academicYear?: string;
  term?: string | null;
}

// ==================== PAGINATION ====================
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==================== API RESPONSE ====================
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: Pagination;
}
