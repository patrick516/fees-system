export interface School {
  id: string;
  name: string;
  address: string;
  phone: string;
  logo: string | null;
  isActive: boolean;
}

export interface Staff {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "SUPER_ADMIN" | "SCHOOL_ADMIN" | "BURSAR";
  avatar: string | null;
  school: School;
}

export interface Class {
  id: string;
  name: string;
  level?: number;
}

export interface Student {
  id: string;
  studentCode: string;
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
  isDebtor?: boolean; // NEW
  outstandingBalance?: number; // NEW
}

// Add new type for fee structure
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

// Add to PaymentSummary interface
export interface PaymentSummary {
  totalCollected: number;
  todayCollected: number;
  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  debtorCount: number; // NEW
  outstandingBalance: number; // NEW
}
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

export interface PaymentSummary {
  totalCollected: number;
  todayCollected: number;
  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: Pagination;
}
