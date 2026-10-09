export type Resource =
  | "dashboard"
  | "students"
  | "payments"
  | "classes"
  | "reports"
  | "sms"
  | "results"
  | "staff"
  | "settings"
  | "audit";

export type PermissionAction = "read" | "write" | "verify" | "delete";

export type Permissions = Partial<Record<Resource, PermissionAction[]>>;

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  permissions: Permissions;
  isSystem: boolean;
  _count?: { staff: number };
}

export interface Department {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  _count?: { staff: number };
}

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

export interface Staff {
  id: string;
  title?: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  avatar: string | null;
  school: School;
  department?: Department | null;
  mustChangePassword?: boolean;
  emailVerified?: boolean;
  isActive?: boolean;
  lastLogin?: string | null;
  invitedAt?: string | null;
  invitationExpires?: string | null;
  createdAt?: string;
}

export interface Class {
  id: string;
  name: string;
  level?: number;
}

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
  totalRequired: number;
  totalCollected: number;
  outstandingBalance: number;
  totalCredit: number;
  totalCashReceived: number;
  todayCollected: number;

  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  debtorCount: number;
  noFeeCount: number;

  academicYear?: string;
  term?: string | null;
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

export type NotificationChannel = "SMS" | "EMAIL" | "BOTH";

export interface NotificationLog {
  id: string;
  channel: "SMS" | "EMAIL";
  phone?: string | null;
  email?: string | null;
  recipientName?: string | null;
  message: string;
  subject?: string | null;
  type: string;
  template?: string | null;
  status: "SENT" | "FAILED";
  messageId?: string | null;
  cost?: string | null;
  errorMessage?: string | null;
  sentBy?: { fullName: string } | null;
  createdAt: string;
}

export interface NotificationDefaults {
  defaultChannel: NotificationChannel;
}

//  AUDIT
export interface AuditLog {
  id: string;
  schoolId?: string | null;
  staffId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  actorEmail?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  targetName?: string | null;
  changes?: Record<string, any> | null;
  status: "SUCCESS" | "FAILED";
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}
