// frontend/src/types/platform.ts
export interface PlatformAdmin {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "OWNER" | "SUPPORT";
  avatar: string | null;
}

export interface PlatformSchool {
  id: string;
  name: string;
  logo: string | null;
  slug: string | null;
  email: string | null;
  isActive: boolean;
  setupCompleted: boolean;
  subscriptionStatus:
    | "TRIAL"
    | "ACTIVE"
    | "GRACE"
    | "READONLY"
    | "LOCKED"
    | "SUSPENDED";
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  onekhusaMerchantAccount: string | null;
  onekhusaConfigured: boolean;
  createdAt: string;
  studentCount: number;
  staffCount: number;
  admin: {
    email: string;
    fullName: string;
    lastLogin: string | null;
    invitePending: boolean;
  } | null;
}
