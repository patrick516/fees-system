# SchoolPay — Complete System Explanation

**Audience:** School headteachers, bursars, and administrators (non-technical).
**Basis:** Every statement below was read directly from the source code. Where something is unclear or not implemented, it says so.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Login — Staff](#2-login--staff)
3. [Login — Parent](#3-login--parent)
4. [Dashboard](#4-dashboard)
5. [Students](#5-students)
6. [Payments](#6-payments)
7. [Online Payments (OneKhusa / "Malipo")](#7-online-payments-onekhusa--malipo)
8. [Classes & Fee Structures](#8-classes--fee-structures)
9. [Term Activation](#9-term-activation)
10. [Reports](#10-reports)
11. [Send SMS](#11-send-sms)
12. [Exam Results](#12-exam-results)
13. [Staff & Roles / Permissions](#13-staff--roles--permissions)
14. [Audit Trail](#14-audit-trail)
15. [Settings & Branding](#15-settings--branding)
16. [Parent Portal](#16-parent-portal)
17. [Notifications](#17-notifications)
18. [System Architecture](#18-system-architecture)
19. [Verification of Old Overview Claims](#19-verification-of-old-overview-claims)
20. [Three Summary Lists](#20-three-summary-lists)

---

## 1. System Overview

SchoolPay is a school fees management system for Malawian schools. It has **three parts**:

| Part | What it is | Who uses it |
|------|-----------|-------------|
| **Admin Dashboard** (`frontend/`) | A web app for school staff | Admin, Bursar, Finance, Registrar, Teacher |
| **Backend API** (`backend/`) | The server that stores data and talks to SMS/email/payment providers | — (invisible to users) |
| **Parent Portal** (`website/`) | A smaller web app for parents | Parents/guardians |

**Database:** PostgreSQL (a professional database server). All data is stored in tables — the main ones are:

| Table | What it stores |
|-------|---------------|
| `schools` | School name, logo, brand colour, bank accounts, active term |
| `staff` | Staff names, emails, passwords (hashed), roles, login attempts |
| `students` | Student names, codes, class, parent contact details, credit balance |
| `classes` | Class names (e.g. Form 1), level, grading system |
| `fee_structures` | How much each class pays per term |
| `fee_payments` | Every payment: amount, method, receipt number, status |
| `exam_periods` | Exam name, term, year, type (Mid-Term / End-Term / Mock) |
| `exam_results` | Per-student per-subject marks and grades |
| `grade_boundaries` | Mark ranges → grade points or letter grades |
| `sms_logs` | Every SMS or email sent, with status and cost |
| `audit_logs` | Every important action taken by staff |
| `otp_codes` | Parent login codes (temporary) |
| `roles` | Custom roles with permission sets |
| `departments` | Staff departments |

---

## 2. Login — Staff

**Source:** `backend/src/controllers/auth.controller.js`, `frontend/src/pages/Auth/Login.tsx`

### What the user sees
- An email field and a password field on the login page.
- A "Forgot your password?" link.
- If the school has a web address (slug), the login page can show the school's logo and brand colour.

### What happens behind the scenes
1. The frontend sends `POST /api/auth/staff/login` with email and password.
2. The backend checks (in this order):
   - Does the account exist? → 401 "Invalid email or password"
   - Is the account locked? → 423 "Account locked…" (see lockout rules below)
   - Is the account active? → 401 "Your account has been deactivated"
   - Is the school active? → 401 "School account is inactive"
   - Is the email verified? → 403 "Please verify your email before logging in"
   - Is the password correct? (bcrypt comparison)
3. On success, two tokens are issued:
   - **Access token** (JWT): lasts **30 minutes** (configurable). Contains staff ID, school ID, type "STAFF".
   - **Refresh token** (JWT): lasts **8 hours** (configurable). Stored hashed in the database.
4. The frontend stores both tokens in the browser's localStorage.
5. On every API call, the access token is sent. When it expires, the frontend automatically uses the refresh token to get a new pair.

### Lockout rules
- **3 failed attempts** (configurable via `LOGIN_MAX_ATTEMPTS`) → account locked for **2 hours** (configurable via `LOGIN_LOCKOUT_HOURS`).
- The staff member sees how many minutes remain.
- An admin can unlock the account early from the Staff page.
- Rate limiting: **10 login attempts per minute** per IP address (configurable).

### Password rules
- Minimum 8 characters, must include uppercase, lowercase, a number, and a symbol.
- A list of 15 common passwords is blocked.

### Who can use it
- Any active staff member with a verified email.
- Staff who were invited must first accept the invitation and set a password.

### Edge cases
- **Forgot password:** A reset link is emailed (valid **30 minutes**). The link contains a random 64-character token. After resetting, all existing sessions are invalidated.
- **Force password change:** If the admin sets `mustChangePassword` (e.g. after inviting staff), the staff member is redirected to a password-change page before they can do anything else.
- **Email verification:** New schools must verify the admin's email with a 6-digit OTP (valid **10 minutes**) before the first login.

### Why it matters
Staff accounts are protected against brute-force attacks, and every login (success or failure) is recorded in the audit trail.

---

## 3. Login — Parent

**Source:** `backend/src/controllers/auth.controller.js` (lines 724–999), `website/app/page.tsx`

There are **two ways** for a parent to log in:

### Method A: Student ID + Date of Birth
- The parent enters the child's **Student ID** (e.g. `SPP-F3-2026-001`) and the child's **date of birth**.
- The backend looks up the student by code and compares the date of birth.
- On success, a **parent token** (JWT) is issued, valid for **7 days** (configurable via `JWT_EXPIRES_IN`).
- No audit log entry is written for this login method.

### Method B: Phone Number + OTP
1. The parent enters a phone number (with +265 prefix).
2. The backend normalises the number and looks for any student whose `parentPhone` or `parentPhone2` matches.
3. If found, a **6-digit OTP** is sent via **TumaSend** (an SMS gateway).
4. The OTP expires after **10 minutes** (600 seconds, set by TumaSend).
5. The parent enters the 6-digit code.
6. The backend verifies the code with TumaSend, marks it as used, and issues a parent token (7 days).
7. The OTP code itself is **not** returned in the API response — it is only sent via SMS.

### Rate limiting
- **3 OTP requests per minute** per IP address (configurable).

### Who can use it
- Parents whose phone number is stored against a student record.
- The parent sees **only their own child** (one child per login).

### Edge cases
- **No student found:** "No student found with this phone number. Contact the school."
- **Expired or wrong OTP:** "Invalid or expired code. Please request a new one."
- **No attempt limiting:** There is no counter for wrong OTP entries — only the 3-per-minute rate limit applies. (This is a security gap.)
- **Parent token is long-lived:** 7 days with no refresh mechanism. The parent must log in again after it expires.

### Why it matters
Parents can check balances, pay fees, and view results without needing an email address — just a phone number.

---

## 4. Dashboard

**Source:** `frontend/src/pages/Dashboard/index.tsx`, `backend/src/controllers/payment.controller.js` (summary endpoint)

### What the user sees
- **6 summary cards:**
  - Total Required (fees expected this term)
  - Total Collected
  - Outstanding Balance
  - Credit Held (overpayments saved for next term)
  - Debtors (count of students who still owe)
  - Paid in Full (count)
- **Payment Status panel:** Verified / Pending Review / Rejected counts.
- **Student Fee Status panel:** Progress bar, Paid in Full / Debtors / No Fee Set tiles.
- **Quick Actions:** Record Cash Payment, Add New Student, View Pending, All Students.
- A bell icon with a badge showing how many payments are waiting for approval (polls every 30 seconds).

### What happens behind the scenes
- The frontend calls `GET /payments/summary?academicYear=…&term=…` to get the numbers.
- The backend sums up verified payments, counts debtors, and returns the totals.
- The active term is fetched from `GET /schools/active-term`.

### Who can use it
- Any authenticated staff member (no special permission required).

### Why it matters
The dashboard gives the headteacher an instant financial snapshot: how much is expected, how much has come in, and who still owes.

---

## 5. Students

**Source:** `backend/src/controllers/student.controller.js`, `frontend/src/pages/Students/`

### 5.1 Students List

**What the user sees:**
- A table of students: name, student ID, class, parent name/phone, total paid, status badge.
- **Filters:** By class (pill buttons), by payment status (Paid in Full / Debtors / No Payment / Has Credit).
- **Search box:** Searches by name, student ID, or parent phone number.
- **Buttons:** "End of Year Promotion", "Bulk Import", "Add Student" (permission-gated).
- Pagination at the bottom.

**Behind the scenes:**
- `GET /students?page=&limit=15&search=&classId=&isDebtor=true&…`
- The backend searches using case-insensitive `contains` on name, code, and parent name; case-sensitive on parent phone.
- Status filters (debtor, paid full, etc.) are applied **after** pagination, which means the page count can be wrong when filters are active. (Known bug.)

**Who can use it:** Staff with `students:read` permission.

### 5.2 Add Student

**What the user sees:**
- A form with two cards: Student Information (first name, middle name, last name, date of birth, gender, class, academic year) and Parent/Guardian (name, phone, second phone, email).
- Date of birth is selected via day/month/year dropdowns.

**Behind the scenes:**
- `POST /students` with all the form fields.
- A **student code** is auto-generated: format `XXX-F#-YYYY-NNN` where:
  - `XXX` = first letters of the school name (e.g. "St Peters Private School" → `SPP`)
  - `F#` = first letter of class name + level (e.g. "Form 1" → `F1`)
  - `YYYY` = the year part of the academic year
  - `NNN` = sequential number within that class (e.g. `001`)
- Example: `SPP-F1-2026-001`
- Duplicate check: same name + same parent phone → error "A student with this name and parent phone already exists".
- Audit log: `STUDENT_ADDED`.

**Edge cases:**
- No phone format validation on this form (unlike bulk import).
- No gender enum validation — invalid values cause a database error (500).
- No date of birth validation — invalid dates cause a 500 error.
- The duplicate check uses the raw phone number, so `0991…` and `+265991…` are treated as different.

### 5.3 Student Detail

**What the user sees:**
- Identity card: name, class, student code, status badge, gender, academic year, DOB, parent details.
- Quick stats: Total Paid, Balance Owed, Credit Balance, Pending count.
- Fee Structure panel: per-term breakdown with progress bars.
- Payment History: every payment with status, amount, method, receipt number, notes, rejection reason.
- "Record Payment" button (permission-gated).

**Behind the scenes:**
- `GET /students/:id` returns the student, all payments, fee structures, and a summary.
- The summary's `totalPaid` only counts the **active term**, but `pendingCount` and `verifiedCount` span **all terms**. (Inconsistency.)

### 5.4 Bulk Promotion (End of Year)

**What the user sees:**
- A preview showing which class promotes to which (e.g. "Form 1 → Form 2").
- All students are pre-checked. Unchecking a student means they repeat the class.
- A "Graduate (deactivate)" option for the highest class.
- After submission: a summary showing old code → new code for each promoted student.

**Behind the scenes:**
- `GET /students/promote/preview` returns the promotion map and student list.
- `POST /students/promote` with `{ promotions: [{studentId, toClassId}], graduations: [studentId] }`.
- Each promoted student gets a **new student code** (new class tag, new sequence number).
- The old code is saved in `formerStudentCodes`.
- Graduated students are set to `isActive: false` (soft delete).
- Audit log: `STUDENT_PROMOTION`.

**Edge cases:**
- Promotion is **not transactional** — if one student fails, others may still be promoted (partial completion).
- No validation that the target class is actually the next level.

### 5.5 Bulk Import

**What the user sees:**
- Step 1: Download a template (Excel file with headers and a sample row).
- Step 2: Upload the filled-in file, see a preview with per-row validation errors.
- Import button is disabled if any row has errors.

**Behind the scenes:**
- `POST /students/bulk/preview` parses the Excel file and validates each row.
- `POST /students/bulk/import` imports all valid rows.
- **All-or-nothing:** if any row has an error, **zero** students are imported.
- Expected columns: First Name, Middle Name, Last Name, Date of Birth, Gender, Class, Parent Name, Parent Phone, Parent Phone 2, Parent Email, Academic Year.
- Phones are normalised (10-digit starting with 0 → +265…).
- Duplicate detection: within the file and against the database.
- Audit log: `STUDENTS_BULK_IMPORTED`.

### Why it matters
The student list is the heart of the system — every payment, result, and report depends on accurate student records.

---

## 6. Payments

**Source:** `backend/src/controllers/payment.controller.js`, `frontend/src/pages/Payments/`

### 6.1 Payments List

**What the user sees:**
- A table: student name, receipt number, amount, payment method, term, status badge, date.
- Filter pills: All / Verified / Pending / Rejected.
- "Record Payment" button (permission-gated).
- Payment Insights panel showing breakdown by channel (cash, mobile money, bank, online).

**Behind the scenes:**
- `GET /payments?page=&limit=15&status=&term=&academicYear=&classId=`
- No search by receipt number or payment method filter. (Limitation.)

### 6.2 Record Payment (Bursar)

**What the user sees:**
- A student search box (type-ahead, minimum 2 characters).
- A fee status panel showing the term fee breakdown, already paid, balance due, and credit balance.
- Form: Amount, Term, Payment Method (Cash, Airtel Money, TNM Mpamba, National Bank, Standard Bank, FDH Bank, NBS Bank, Other Bank), Academic Year, Notes.
- Overpayment warning if the amount exceeds the balance.

**Behind the scenes:**
- `POST /payments/cash` with `{ studentId, amount, term, academicYear, notes }`.
- A **receipt number** is auto-generated: format `RCP-YYYY-NNNNN` (e.g. `RCP-2026-00001`). The sequence is school-wide across all terms.
- The payment is created with status **VERIFIED** (bursar payments are auto-verified).
- **Overpayment handling:** If the amount exceeds the balance, the excess is added to the student's `creditBalance` for next term.
- **Credit rollover:** The bursar payment endpoint does **not** automatically apply existing credit — it only accumulates it. (Credit is applied during term activation and payment verification.)
- Audit log: `PAYMENT_RECORDED`.
- A notification (SMS/email) is sent to the parent.

**Edge cases:**
- **No duplicate receipt prevention:** Two concurrent requests could generate the same receipt number (race condition). The database unique constraint would catch it, but the error message would be a generic 500.
- **No check that amount > 0.**
- Rejected payments still consume receipt numbers (gaps in the sequence).

### 6.3 Pending Payments

**What the user sees:**
- A list of payments submitted by parents (or bursar-recorded non-cash payments) that need approval.
- Each card shows: student, parent, amount, term, method, receipt number, bank reference, date.
- Buttons: "View Receipt" (opens image modal), "Reject", "Verify" (both permission-gated).
- Reject modal requires a reason.

**Behind the scenes:**
- `GET /payments/pending` returns all PENDING payments, oldest first.
- `PATCH /payments/:id/verify` — marks as VERIFIED, runs reconciliation (updates balances, applies credit, rolls up overpayment).
- `PATCH /payments/:id/reject` — marks as REJECTED with a reason. **No audit log entry for rejection.** (Inconsistency.)
- Both actions send a notification to the parent.

**Who can use it:** Staff with `payments:verify` permission (Bursar, School Admin, Finance).

### 6.4 Payment Methods Supported

| Method | How it works |
|--------|-------------|
| **Cash** | Bursar records it; auto-verified; no receipt upload needed. |
| **Airtel Money** | Parent submits with receipt upload, or bursar records. |
| **TNM Mpamba** | Same as Airtel Money. |
| **National Bank** | Same — receipt required. |
| **Standard Bank** | Same. |
| **FDH Bank** | Same. |
| **NBS Bank** | Same. |
| **Other Bank** | Same. |
| **Online (OneKhusa)** | Parent pays via a timed account number (TAN); auto-verified by webhook. |

### Why it matters
The payment workflow ensures that every kwacha is tracked, receipts are stored, and parents are notified at every step.

---

## 7. Online Payments (OneKhusa / "Malipo")

**Source:** `backend/src/controllers/onekhusa.controller.js`, `website/components/PayOnlineModal.tsx`

### What the user sees (Parent Portal)
- A "Pay Online" button on the pay page.
- A modal that explains the process in 5 steps.
- "Get Account Number" button → the parent receives a **timed account number (TAN)** and an expiry countdown.
- The parent sends money to that number from any bank or mobile money app.
- The system polls the payment status every 5 seconds (up to ~16 minutes).
- On success: receipt number displayed. On failure: reason shown.

### What happens behind the scenes
1. `POST /payments/onekhusa/initiate` with `{ studentId, amount, term, academicYear }`.
2. Minimum amount: **MWK 100**.
3. A PENDING payment is created with `paymentMethod: "AIRTEL_MONEY"` and `paymentChannel: "ONEKHUSA"`.
4. The backend calls OneKhusa's `requestToPay` API to get a TAN.
5. The TAN and expiry are returned to the parent.
6. When the parent sends money, OneKhusa sends a **webhook** to `POST /payments/onekhusa/webhook`.
7. The webhook handler marks the payment as VERIFIED (or REJECTED if reversed).
8. A notification is sent to the parent.

### Edge cases
- **Webhook signature verification is OFF by default** (only runs if `ONEKHUSA_WEBHOOK_VERIFY=true`).
- **Stale sweep:** A cron job runs every 5 minutes and marks PENDING online payments older than **16 minutes** as "Expired" (the error message says "15 minutes" — inconsistency).
- **Payment insights bug:** The admin dashboard's "Malipo Online" stats always show zero because the code queries for `paymentChannel === "MALIPO"` but the actual value stored is `"ONEKHUSA"`.
- **Failure handling:** If the OneKhusa API call fails, the payment is marked REJECTED with the error reason.

### Why it matters
Parents can pay fees from their phone without visiting the school, and the payment is automatically verified — no manual receipt checking.

---

## 8. Classes & Fee Structures

**Source:** `frontend/src/pages/Classes/index.tsx`, `backend/src/controllers/school.controller.js`

### What the user sees
- **Active Term card:** Shows the current term, academic year, and dates. A "Change" button opens the term activation form.
- **Term History card:** A table of past terms with collected/outstanding/debtor counts and a "View Report" link.
- **Add New Class:** Name + level inputs.
- **Classes list:** Expandable cards per class showing fee structures per term. Each fee structure can be edited. A "Set Fee Structure" button opens a form with: Term, Academic Year, Tuition Fee, Exam Fee, Building Levy, Uniform Fee, Book Fee, and a auto-calculating Total Amount.
- **Payment Details for Parents card:** Bank accounts, Airtel Money number, TNM Mpamba number, and payment instructions — all editable.

### Behind the scenes
- `GET /schools/classes` returns classes with student counts and fee structures.
- `POST /schools/classes` creates a class.
- `POST /schools/fee-structures` creates a fee structure for a class + term + year.
- `PUT /schools/fee-structures/:id` updates it.
- `PUT /schools/payment-details` saves bank accounts and mobile money numbers.
- The fee structure has a unique constraint: one per class + term + academic year.

### Who can use it
- View: any staff with `classes:read`.
- Edit fee structures: `payments:write` permission.
- Edit payment details: `settings:write` permission.

### Why it matters
Fee structures drive the entire system — balances, debtor status, reports, and the parent portal all depend on them.

---

## 9. Term Activation

**Source:** `backend/src/routes/school.routes.js` (lines 507–716), `frontend/src/pages/Classes/index.tsx`

### What the user sees
- A form: Term (Term 1/2/3), Academic Year, Start Date, End Date.
- A confirmation modal warning: "This will affect the whole system", showing the from→to comparison, and noting that the previous term is archived and credits auto-apply.

### What happens behind the scenes
1. `POST /schools/activate-term` with `{ term, academicYear, startDate, endDate }`.
2. The previous active term is archived in the `term_activations` table.
3. **Validation:** At least one active fee structure must exist for the new term/year — otherwise: "Please set fee structures for at least one class before activating this term."
4. **Credit rollover:** For each student with a credit balance, a VERIFIED payment is automatically created with `notes: "Credit carried over from previous term"`. The credit is applied to the new term's fee. No notification is sent for these auto-created payments.
5. The school's `activeTerm`, `activeAcademicYear`, `activeTermStartDate`, and `activeTermEndDate` are updated.
6. Audit log: `TERM_ACTIVATED`.

### Edge cases
- End date must be after start date.
- Only one active term at a time.
- Credit rollover payments have no `recordedById` or `verifiedById` (system-generated).

### Why it matters
Term activation is the "start of the school term" switch — it tells the system which term's fees to use everywhere.

---

## 10. Reports

**Source:** `backend/src/controllers/report.controller.js`, `frontend/src/pages/Reports/index.tsx`

### What the user sees
- **Filters:** Academic Year, Term (All/Term 1/2/3), Class (All + list).
- **Summary cards:** Total Students, Paid in Full, Debtors, No Payment.
- **Financial summary:** Total Collected, Total Outstanding, Total Required (with progress bar).
- **Summary by Class table:** per-class breakdown.
- **Student Details table:** per-student required/paid/balance/status.
- **Export Excel button:** Downloads a 3-sheet workbook (Summary, By Class, Student Details).
- **Export PDF button:** Opens a printable branded report in a new window.

### Behind the scenes
- `GET /api/reports/fees?academicYear=&term=&classId=`
- The backend returns JSON only. The Excel and PDF exports are built **entirely in the frontend** using the `xlsx` library and a printable HTML page.
- Students are filtered to `isActive: true`; payments to `status: "VERIFIED"`.

### Edge cases
- **No pagination** — the full student list is returned in one response.
- The "latest payment" date in the report relies on database insertion order, not a guaranteed sort. (Minor bug.)
- The PDF export uses the browser's print function — it requires a printer or "Save as PDF".

### Why it matters
Reports give the bursar and headteacher a clear picture of fee collection per class and per student, and the Excel export allows further analysis in spreadsheet software.

---

## 11. Send SMS

**Source:** `backend/src/controllers/sms.controller.js`, `frontend/src/pages/SMS/index.tsx`, `backend/src/lib/sms.js`

### What the user sees
- Three message type cards: **Fee Reminder**, **General Announcement**, **Unpaid Students Alert**.
- A channel selector: SMS / Email / Both.
- A term selector (for reminders and unpaid alerts).
- A custom message box (only for announcements).
- A "Send Now" button.
- A **Notification History** table showing every message sent, with status (Sent/Failed) and error details.

### What happens behind the scenes
- `POST /api/sms/bulk` with `{ type, message?, term, channel }`.
- **Fee Reminder:** Finds all active students with a balance > 0 in the active term. Sends one SMS per parent.
- **Unpaid Students Alert:** Finds all active students with zero payments in the active term.
- **General Announcement:** Sends a custom message to every active student's parent.
- The channel (SMS/Email/Both) can be set per-send, or defaults to the school's notification preference.

### SMS Provider
- **TumaSend** (`https://gateway.tumasend.com`).
- Cost per SMS is **not hardcoded** — it is taken from the TumaSend API response (`credits_used`) and stored in the notification log.
- The sender ID is configurable via `TUMASEND_SMS_SENDER_ID`.

### Grouping per parent
- **Yes, for Fee Reminder and Unpaid alerts:** If a parent has multiple children, the system groups them into **one SMS** listing all children's balances and a total.
- Grouping is by `email || phone` (email preferred as more unique).
- **Announcements** use a different deduplication key (`phone|email` pair), so a parent with multiple children but different emails could receive duplicate announcement SMS. (Inconsistency.)

### Email
- Sent via **Brevo** (`https://api.brevo.com/v3/smtp/email`).
- If `BREVO_API_KEY` is not set, emails are skipped and logged as failed.

### Why it matters
The school can reach all parents with fee reminders in seconds, and the notification history provides a full audit of what was sent, to whom, and at what cost.

---

## 12. Exam Results

**Source:** `backend/src/controllers/exam.controller.js`, `frontend/src/pages/Results/`

### 12.1 Grade Boundaries

**What the user sees:**
- A toggle between **Points** (1–9) and **Letter** (A–F) grading.
- Default point boundaries: 80–100→1, 70–79→2, 60–69→3, 50–59→4, 40–49→5, 30–39→6, 20–29→7, 10–19→8, 0–9→9.
- Default letter boundaries: 80–100→A, 70–79→B, 60–69→C, 50–59→D, 0–49→F.
- Editable rows with min/max percentage and grade label.

**Behind the scenes:**
- `PUT /api/exams/grade-boundaries` with `{ system, boundaries: [{ minPercent, maxPercent, gradePoint?, gradeLabel? }] }`.
- This **deletes all existing boundaries** for that system and recreates them. (Not transactional — a failure could leave no boundaries.)
- No validation of ranges (no 0–100 check, no overlap check, no min < max check).

### 12.2 Points vs Letter Grading

- Each **class** has a `gradingSystem` field (POINTS or LETTER).
- **POINTS system:** Lower total = better. The best 6 subjects are summed (lower total wins). Used for Form 3 & 4 in the demo data.
- **LETTER system:** Higher average = better. The average mark maps to a letter grade. Used for Form 1 & 2 in the demo data.
- Changing a class's grading system does **not** recompute existing results — stale grades remain.

### 12.3 Exam Periods

**What the user sees:**
- A create form: Name, Term, Academic Year.
- A table of periods with a visibility toggle ("Visible to parents" / "Hidden").

**Behind the scenes:**
- `POST /api/exams/periods` — unique per school + term + year + exam type.
- `PUT /api/exams/periods/:id/activate` — toggles `isActive`. When active, parents can see results for that period.

### 12.4 Upload Results

**What the user sees:**
- Select exam period, class, and upload an Excel file.
- A per-class grading system toggle (Points / Letter).
- "Upload Sheet" button.
- "View Class Rankings" button.

**Behind the scenes:**
- `POST /api/exams/results/upload` (multipart: file, classId, examPeriodId).
- The Excel file is parsed. The first sheet is used.
- **Header detection:** A column containing "id" (case-insensitive) is treated as Student ID; a column containing "name" as Student Name. Fallback: first column = ID.
- **Subject auto-creation:** Any column that is not ID or name becomes a subject. If the subject doesn't exist for that class, it is **silently created**.
- **Student matching:**
  1. By student ID (exact match).
  2. By name (case-insensitive exact match within the class).
  3. If multiple students match by name → the row is saved as a **Pending Exam Row** for manual resolution.
- **Pre-flight:** If no grade boundaries exist for the class's grading system → error "Please set letter grade|point boundaries before uploading results for this class".
- The source file is also uploaded to Cloudinary (folder `exam_results_sheets`).
- Audit log: `EXAM_RESULTS_UPLOADED`.

**Edge cases:**
- Non-numeric marks are **silently skipped** (no error).
- Marks outside 0–100 are not validated.
- Boundary lookup is unordered — with overlapping ranges, the first database row wins.

### 12.5 Pending Matches (Manual Resolution)

**What the user sees:**
- An amber card listing rows where a name matched multiple students.
- Each row shows the raw name, subject/mark chips, and candidate student buttons.
- "Resolve" and "Discard" actions.

**Behind the scenes:**
- `GET /api/exams/pending-rows?classId=&examPeriodId=`
- `POST /api/exams/pending-rows/:id/resolve` with `{ studentId }` — must be one of the matched candidates.
- `DELETE /api/exams/pending-rows/:id` — discards the row.
- **No audit log entries** for resolve or discard.

### 12.6 Rankings

- **Per-class only.** No school-wide ranking.
- **LETTER system:** Ranked by average mark (descending).
- **POINTS system:** Ranked by best 6 subjects' total points (ascending — lower is better).
- Ties are broken by array order (no secondary sort key).

### 12.7 Visibility to Parents

- Controlled per exam period by the `isActive` flag.
- When active, parents can see their child's results in the Parent Portal.
- There is **no global school-level results visibility setting**.

### Why it matters
Exam results can be uploaded once per class and immediately visible to parents, with automatic grade calculation and ranking.

---

## 13. Staff & Roles / Permissions

**Source:** `backend/src/controllers/staff.controller.js`, `role.controller.js`, `frontend/src/pages/Staff/`, `frontend/src/pages/Settings/`

### 13.1 Default Roles

When a school is registered, **6 default roles** are created:

| Role | What they can do |
|------|-----------------|
| **School Admin** | Everything (always passes permission checks) |
| **Bursar** | Dashboard, Students (read/write), Payments (read/write/verify), Classes (read), Reports (read) |
| **Finance** | Dashboard, Students (read), Payments (read/verify), Reports (read) |
| **Registrar** | Dashboard, Students (read/write/delete), Payments (read), Classes (read/write), Reports (read) |
| **Teacher** | Dashboard, Students (read), Classes (read), Results (read/write) |
| **Other** | Dashboard only |

### 13.2 Custom Roles

- Admins can create custom roles with any combination of permissions.
- Permissions are organised by **resource** (students, payments, classes, reports, sms, results, staff, settings) and **action** (read, write, verify, delete).
- The **School Admin** role is protected — it cannot be edited or deleted.
- System roles cannot be deleted.
- Roles assigned to staff cannot be deleted (must reassign first).

### 13.3 Staff Management

**What the user sees:**
- A table of staff: name, email, role, department, status (Active / Locked / Deactivated / Invite pending).
- "Invite Staff" button.
- Per-staff actions: Manage (edit role/department, unlock, deactivate), Resend Invitation.

**Behind the scenes:**
- `POST /staff/invite` — sends an invitation email with a temporary password and a 7-day invite link.
- `PUT /staff/:id` — update role, department, or active status.
- `DELETE /staff/:id` — soft deactivation (sets `isActive: false`).
- `POST /staff/:id/unlock` — clears lockout.
- **Cannot invite another School Admin.**
- **Cannot change your own role.**
- **Cannot deactivate your own account.**
- **Cannot remove yourself.**

### 13.4 Departments

- Simple list of departments (e.g. "Administration", "Teaching").
- Staff can be assigned to a department.
- **No audit logging** for department create/update/delete. (Gap.)

### Why it matters
Role-based permissions ensure that staff only see and do what their job requires — a teacher cannot record payments, and a bursar cannot edit exam results.

---

## 14. Audit Trail

**Source:** `backend/src/controllers/audit.controller.js`, `frontend/src/pages/Audit/`, `backend/src/lib/audit.js`

### What the user sees
- Two views: **By User** (grouped) and **Timeline** (chronological).
- Filters: Date range, user, action type, status (Success/Failed), search.
- A detail modal showing: who did what, when, from which IP, and what changed.
- **Export CSV** button.

### What is logged

| Action | When |
|--------|------|
| `LOGIN_SUCCESS` | Staff logs in |
| `LOGIN_FAILED` | Wrong password |
| `ACCOUNT_LOCKED` | Account locked after 3 failed attempts |
| `LOGOUT` | Staff logs out |
| `PASSWORD_CHANGED` | Staff changes password |
| `PASSWORD_RESET_REQUESTED` | Forgot password requested |
| `PASSWORD_RESET_COMPLETED` | Password reset completed |
| `STUDENT_ADDED` | New student added |
| `STUDENT_UPDATED` | Student details changed |
| `STUDENT_PROMOTION` | Bulk promotion |
| `STUDENTS_BULK_IMPORTED` | Bulk import |
| `PAYMENT_RECORDED` | Bursar records a payment |
| `PAYMENT_VERIFIED` | Payment verified |
| `EXAM_RESULTS_UPLOADED` | Exam results uploaded |
| `STAFF_INVITED` | Staff invited |
| `STAFF_UPDATED` | Staff role/department/status changed |
| `STAFF_DEACTIVATED` | Staff deactivated |
| `STAFF_UNLOCKED` | Staff account unlocked |
| `ROLE_CREATED` | Custom role created |
| `ROLE_UPDATED` | Role permissions changed |
| `ROLE_DELETED` | Role deleted |
| `SCHOOL_SETTINGS_UPDATED` | School settings changed |
| `SCHOOL_LOGO_UPDATED` | Logo uploaded |

### What is NOT logged
- Parent logins (OTP or student ID).
- Payment rejections.
- Department changes.
- Pending exam row resolution or discard.
- Email verification or invitation acceptance.

### Why it matters
The audit trail provides accountability — every important action is recorded with who did it, when, and from where.

---

## 15. Settings & Branding

**Source:** `frontend/src/pages/Settings/index.tsx`, `backend/src/controllers/school.controller.js`

### What the user sees
- **School Information card:** Logo, name, motto, phone, email, address, brand colour. "Edit" button opens a modal.
- **Edit School Modal:** Logo upload (PNG/JPG), school name, phone, email, address, city, motto, brand colour picker.
- **Departments card:** Add, edit, delete departments.
- **Roles card:** Expandable permission matrix per role. Toggle permissions with auto-save. "Add Role" button.
- **Notification Preferences card:** Three channel options (SMS Only / Email Only / SMS + Email).

### Behind the scenes
- `PUT /api/schools/settings` — updates school name, address, phone, email, motto, primary colour.
- `POST /api/schools/settings/logo` — uploads logo to Cloudinary (folder `school_logos`). **No file size limit or type restriction.** (Security gap.)
- `PUT /api/schools/notification-defaults` — saves the default notification channel.
- The brand colour is applied as a CSS variable across the entire admin dashboard.

### Why it matters
The school's branding (logo, colours) makes the system feel like their own, and notification preferences control how parents are reached.

---

## 16. Parent Portal

**Source:** `website/app/`, `website/components/`

### 16.1 Login
- Two methods: **Student ID + Date of Birth** or **Phone + OTP** (see Section 3).
- The portal shows the school's logo and brand colour.

### 16.2 Dashboard
- **Single child only** — the portal is scoped to one student.
- **Four tabs:**
  1. **Overview:** Fee summary cards (Required / Paid / Balance), notice banners, recent activity, school contact info.
  2. **Payment History:** Full list of payments with status badges.
  3. **Payment Info:** Bank accounts, mobile money numbers, payment instructions — all with copy buttons.
  4. **Results:** Exam results with ranking, top 3, and per-subject marks (only when the exam period is active).

### 16.3 Pay Fees
- **Two modes:**
  1. **Pay Online:** OneKhusa integration — get a TAN, send money, auto-verified (see Section 7).
  2. **Upload Receipt:** Choose a payment method (Airtel Money, TNM Mpamba, or any bank), enter a transaction reference, upload a receipt photo or PDF (max 5MB, jpg/png/pdf only).
- The payment is created as PENDING and appears in the admin's Pending Payments queue.

### 16.4 Payment History
- Summary cards: Total Verified, Total Transactions.
- Filter tabs: All / Verified / Pending / Rejected.
- Payment cards with full details.

### 16.5 Results
- Rank card: class position (e.g. "12 of 42"), percentile badge, average mark or total points.
- Class Top 3 list.
- Marks table: per-subject mark, grade label or grade point, "Counted" badge.

### 16.6 What does NOT exist
- No settings or profile page.
- No multi-child support (one child per login).
- No welcome email for parents.
- The `website/app/parent/` directory contains three empty placeholder files.
- The `website/app/verify-otp/page.tsx` is orphaned dead code.

### Why it matters
The parent portal reduces the school's administrative workload — parents can check balances, pay fees, and view results without calling the school.

---

## 17. Notifications

**Source:** `backend/src/lib/notifier.js`, `backend/src/lib/mailer.js`, `backend/src/lib/emailTemplates.js`

### When notifications are sent

| Event | Channel | Message |
|-------|---------|---------|
| Bursar records payment | SMS + Email | "Payment of MWK X received… Receipt: RCP-…" |
| Payment verified | SMS + Email | "Payment of MWK X has been confirmed…" |
| Payment rejected | SMS + Email | "Payment rejected. Reason: …" |
| Fee reminder (bulk) | SMS + Email | "…fees have a balance of MWK X…" |
| Unpaid alert (bulk) | SMS + Email | "…no payment on record…" |
| Announcement (bulk) | SMS + Email | Custom message |
| Online payment confirmed | SMS + Email | "Payment of MWK X received…" |

### Channel selection
- Controlled by the school's `notificationDefaults.defaultChannel` setting: SMS, EMAIL, or BOTH.
- Can be overridden per-send on the SMS page.
- If a parent has no email address, only SMS is sent (and vice versa).

### Email templates
- Built in code (`lib/emailTemplates.js`) — not the empty HTML files in `templates/`.
- Templates: `fee_reminder`, `unpaid`, `announcement`, `payment_received`, `payment_verified`, `payment_rejected`.
- Sent via Brevo. If `BREVO_API_KEY` is missing, emails are skipped and logged as failed.

### Edge cases
- **Email send failures are logged as "SENT"** — the notifier only checks if the email was skipped (no API key), not if the Brevo API call failed. (Bug.)
- **SMS failures are logged as "FAILED"** with the error message.
- All notification attempts are stored in the `sms_logs` table with status, message ID, and cost.

---

## 18. System Architecture

### 18.1 Apps

| App | Technology | Location |
|-----|-----------|----------|
| Admin Dashboard | React 19 + Vite + React Router + Tailwind | `frontend/` |
| Backend API | Node.js + Express 5 + Prisma | `backend/` |
| Parent Portal | Next.js 16 + React 19 + Tailwind | `website/` |
| Database | PostgreSQL | — |

### 18.2 API Routes (main ones)

| Route | Purpose |
|-------|---------|
| `POST /api/auth/staff/login` | Staff login |
| `POST /api/auth/parent/request-otp` | Send parent OTP |
| `POST /api/auth/parent/verify-otp` | Verify parent OTP |
| `POST /api/auth/parent/login-student-id` | Parent login by student ID |
| `POST /api/auth/register` | School registration |
| `POST /api/auth/forgot-password` | Forgot password |
| `POST /api/auth/reset-password` | Reset password |
| `POST /api/auth/accept-invitation` | Accept staff invitation |
| `GET /api/students` | List students |
| `POST /api/students` | Add student |
| `GET /api/students/:id` | Student detail |
| `PUT /api/students/:id` | Update student |
| `POST /api/students/promote` | Bulk promotion |
| `POST /api/students/bulk/preview` | Bulk import preview |
| `POST /api/students/bulk/import` | Bulk import |
| `GET /api/payments` | List payments |
| `POST /api/payments/cash` | Record cash payment |
| `GET /api/payments/pending` | Pending payments |
| `PATCH /api/payments/:id/verify` | Verify payment |
| `PATCH /api/payments/:id/reject` | Reject payment |
| `POST /api/payments/submit` | Parent submits payment |
| `POST /api/payments/onekhusa/initiate` | Start online payment |
| `POST /api/payments/onekhusa/webhook` | OneKhusa webhook |
| `GET /api/payments/insights` | Payment channel insights |
| `GET /api/payments/summary` | Dashboard summary |
| `GET /api/payments/my-child` | Parent's payment history |
| `GET /api/schools/classes` | List classes |
| `POST /api/schools/classes` | Create class |
| `POST /api/schools/fee-structures` | Create fee structure |
| `PUT /api/schools/fee-structures/:id` | Update fee structure |
| `POST /api/schools/activate-term` | Activate term |
| `GET /api/schools/active-term` | Get active term |
| `GET /api/schools/term-history` | Term history |
| `PUT /api/schools/settings` | Update school settings |
| `POST /api/schools/settings/logo` | Upload logo |
| `PUT /api/schools/payment-details` | Update payment details |
| `PUT /api/schools/notification-defaults` | Update notification defaults |
| `GET /api/schools/payment-info/:schoolId` | Public payment info |
| `POST /api/sms/bulk` | Send bulk SMS/email |
| `GET /api/sms/logs` | Notification history |
| `POST /api/exams/periods` | Create exam period |
| `PUT /api/exams/periods/:id/activate` | Toggle result visibility |
| `PUT /api/exams/grade-boundaries` | Save grade boundaries |
| `PUT /api/exams/classes/:classId/grading-system` | Set class grading system |
| `POST /api/exams/results/upload` | Upload exam results |
| `GET /api/exams/class-results` | Class results with rankings |
| `GET /api/exams/student-results/:studentId` | Parent's results |
| `GET /api/exams/pending-rows` | Pending name matches |
| `POST /api/exams/pending-rows/:id/resolve` | Resolve pending match |
| `DELETE /api/exams/pending-rows/:id` | Discard pending match |
| `GET /api/reports/fees` | Fees report |
| `GET /api/staff` | List staff |
| `POST /api/staff/invite` | Invite staff |
| `PUT /api/staff/:id` | Update staff |
| `DELETE /api/staff/:id` | Deactivate staff |
| `POST /api/staff/:id/unlock` | Unlock staff |
| `GET /api/roles` | List roles |
| `POST /api/roles` | Create role |
| `PUT /api/roles/:id` | Update role |
| `DELETE /api/roles/:id` | Delete role |
| `GET /api/audit` | Audit trail |
| `GET /api/audit/export` | Export audit CSV |

### 18.3 Third-Party Services

| Service | Purpose | Status |
|---------|---------|--------|
| **TumaSend** | SMS sending + OTP | **Active** — `backend/src/lib/sms.js` |
| **Brevo** | Transactional email | **Active** — `backend/src/lib/mailer.js` |
| **Cloudinary** | File storage (receipts, logos, exam sheets) | **Active** — `backend/src/lib/cloudinary.js` |
| **OneKhusa** | Online payments (TAN-based) | **Active** — `backend/src/lib/onekhusa.js` |
| **Africa's Talking** | SMS | **NOT used** — dependency declared but never imported |
| **Twilio** | SMS | **NOT used** — dependency declared but never imported |
| **PawaPay** | Payments | **NOT used** — dependency declared, only referenced in dead code |
| **@chiahq/sdk** | Payments | **NOT used** — only in dead code (`lib/payments.js`) |

### 18.4 Environment Variables

**Backend** (names only — no values):
```
DATABASE_URL, NODE_ENV, PORT
JWT_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_HOURS, JWT_EXPIRES_IN
LOGIN_MAX_ATTEMPTS, LOGIN_LOCKOUT_HOURS, LOGIN_RATE_LIMIT_PER_MIN
TUMASEND_API_KEY, TUMASEND_SMS_KEY, TUMASEND_SMS_SENDER_ID
BREVO_API_KEY, BREVO_SENDER_NAME, BREVO_SENDER_EMAIL, CLIENT_URL
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_FOLDER, CLOUDINARY_LOGO_FOLDER
ONEKHUSA_API_KEY, ONEKHUSA_API_SECRET, ONEKHUSA_ORGANISATION_ID, ONEKHUSA_ENV, ONEKHUSA_WEBHOOK_VERIFY
ONEKHUSA_WEBHOOK_SECRET_SUCCESS, ONEKHUSA_WEBHOOK_SECRET_REVERSED
FRONTEND_URL, WEBSITE_URL
```

**Frontend:**
```
VITE_API_URL
```

**Parent Portal:**
```
NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SCHOOL_SLUG
```

### 18.5 Backups

**There is NO automated backup mechanism in the code.** Specifically:
- No `pg_dump` anywhere.
- No backup scripts.
- No backup cron jobs.
- No backup configuration in deployment files.
- The only cron job is a **payment reconciliation sweep** (every 5 minutes) that marks stale pending online payments as expired.

**This is a critical gap.** The school's data is not automatically backed up by the system.

### 18.6 Deployment
- **Admin Dashboard:** Deployed on Vercel (project `fees-system`). The `vercel.json` rewrites all routes to `index.html` (SPA routing).
- **Parent Portal:** No deployment config found in the repo.
- **Backend:** No Docker, no CI/CD config. Runs via `node server.js` on port 5000 (configurable).
- **CORS:** The backend allows requests from `FRONTEND_URL`, `WEBSITE_URL`, localhost:5173/3000, and Vercel preview URLs.

---

## 19. Verification of Old Overview Claims

### Claim 1: "SMS is sent via TumaSend"
**TRUE.** The code in `backend/src/lib/sms.js` uses TumaSend exclusively (`https://gateway.tumasend.com`). Africa's Talking and Twilio are listed as dependencies but never imported or called.

### Claim 2: "SMS to a parent with several children is grouped into one message"
**PARTLY TRUE.** For **Fee Reminder** and **Unpaid Students Alert**, the system groups by `email || phone` and sends one message listing all children's balances. However, for **General Announcements**, the deduplication uses a different key (`phone|email` pair), so a parent with multiple children but different email addresses could receive duplicate messages.

### Claim 3: "Parent OTP login — how long the code lasts"
**TRUE (10 minutes).** The OTP is sent via TumaSend with `expiry_seconds: 600` (10 minutes). The code is 6 digits. The OTP is verified by TumaSend's API, not by the app itself. The app stores the `otpId` (not the code) in the database.

### Claim 4: "Daily automated backups exist"
**FALSE.** There is no backup mechanism anywhere in the code — no scripts, no cron jobs, no configuration. The only cron job is a payment reconciliation sweep.

### Claim 5: "Receipt uploads are stored on Cloudinary"
**TRUE.** Receipts are uploaded to Cloudinary (folder `school_fees_receipts/{schoolId}`). Allowed file types: **jpeg, jpg, png, pdf**. Maximum file size: **5 MB**. The file is stored as a buffer in memory first, then uploaded via Cloudinary's `upload_stream`.

### Claim 6: "The audit trail records every important action"
**PARTLY TRUE.** The audit trail records most important actions (logins, payments, students, staff, roles, settings, exam uploads). However, it does **not** record: parent logins, payment rejections, department changes, pending exam row resolution, or email verification.

### Claim 7: "Payment methods supported"
**TRUE.** The system supports: Cash, Airtel Money, TNM Mpamba, National Bank, Standard Bank, FDH Bank, NBS Bank, Other Bank, and Online (OneKhusa). The `PaymentMethod` enum in the database has exactly these 8 values (excluding online, which is stored as `AIRTEL_MONEY` with `paymentChannel: "ONEKHUSA"`).

---

## 20. Three Summary Lists

### (1) Features that exist and work

- Staff login with email/password, lockout protection, and JWT token refresh
- Parent login via Student ID + DOB or Phone + OTP
- Dashboard with financial summary cards
- Student CRUD (add, view, update, deactivate)
- Bulk student import via Excel with validation
- Bulk promotion with automatic student code regeneration
- Bursar payment recording with auto-generated receipt numbers
- Parent payment submission with receipt upload (Cloudinary)
- Payment verification and rejection workflow
- Online payments via OneKhusa (TAN-based, webhook auto-verification)
- Classes and fee structures management
- Term activation with credit rollover
- Fees report with Excel and PDF export
- Bulk SMS/email (fee reminders, unpaid alerts, announcements)
- Parent-child SMS grouping for reminders and unpaid alerts
- Exam results upload via Excel with automatic grade calculation
- Grade boundaries (points and letter systems)
- Per-class rankings
- Results visibility toggle per exam period
- Staff management with roles and permissions
- Custom role creation with permission matrix
- Audit trail with filtering and CSV export
- School branding (logo, colours, motto)
- Notification preferences (SMS/Email/Both)
- Parent portal with dashboard, payment, history, and results views
- Password reset via email
- Staff invitation flow with 7-day expiry
- Force password change for invited staff

### (2) Features that are partly built or have bugs

- **Payment insights:** "Malipo Online" stats always show zero (channel name mismatch: code stores `"ONEKHUSA"` but queries `"MALIPO"`).
- **Student list pagination:** Status filters applied after pagination — page counts are wrong when filters are active.
- **Add student form:** No phone format validation, no gender enum validation, no DOB validation — invalid data causes 500 errors.
- **Duplicate student check:** Uses raw phone number, so `0991…` and `+265991…` bypass the check.
- **Receipt number generation:** Race condition — two concurrent payments can collide (count+1 scheme).
- **Payment rejection:** No audit log entry (verification is audited, rejection is not).
- **Email send failures:** Logged as "SENT" in the notification log (only "skipped" is detected, not API failures).
- **Grade boundaries:** Delete-and-recreate without transaction; no range/overlap validation.
- **Changing class grading system:** Does not recompute existing exam results.
- **Exam results upload:** Non-numeric marks silently skipped; marks outside 0–100 not validated; header detection by substring can misfire.
- **Pending exam row resolution:** No audit log entries.
- **Announcement SMS deduplication:** Different key than reminders — possible duplicate messages to parents with multiple children.
- **Logo upload:** No file size limit or type restriction (unlike receipt upload).
- **Webhook signature verification:** Off by default (`ONEKHUSA_WEBHOOK_VERIFY` must be `"true"`).
- **Stale payment sweep:** Constant says 16 minutes, error message says 15 minutes.
- **Parent portal:** Single child only; no multi-child support; no settings/profile page.
- **Parent portal:** `website/app/parent/` contains three empty placeholder files; `verify-otp/page.tsx` is orphaned dead code.
- **Force password change:** Current password is pre-filled from sessionStorage but never displayed in the UI.
- **Audit trail:** `"audit"` resource is not in the valid resources list, so roles cannot be granted audit access via the UI (only School Admin or direct DB assignment).
- **Departments:** No audit logging for create/update/delete.
- **Student detail summary:** `totalPaid` counts only the active term, but `pendingCount`/`verifiedCount` span all terms.
- **Report "latest payment":** Relies on database insertion order, not a guaranteed sort.
- **Dead code:** `backend/src/lib/payments.js` contains broken ESM imports and a syntax error — never loaded but present in the repo.
- **Dead code:** `fuse.js` dependency installed but never used.
- **Dead code:** `africastalking`, `twilio`, `pawapay-nodejs-sdk` dependencies installed but never used.
- **Committed secrets:** `backend/.env` and `frontend/.env.local` are tracked by git.

### (3) Things the old overview claims that the code does not support

- **Daily automated backups:** No backup mechanism exists anywhere in the code.
- **Africa's Talking or Twilio for SMS:** Neither is used. Only TumaSend is active.
- **PawaPay integration:** Not implemented. Only OneKhusa is active.
- **Multi-child parent portal:** The portal supports only one child per login.
- **Global results visibility setting:** Does not exist. Visibility is per exam period only.
- **Welcome parent email:** Does not exist. The template file is empty and unused.
- **Manual exam result editing:** No edit endpoint exists. Results can only be changed by re-uploading the Excel file.
- **Student deletion:** No delete endpoint. Deactivation (`isActive: false`) is the only mechanism.
- **Staff reactivation endpoint:** No dedicated endpoint. Reactivation requires a `PUT` update with `isActive: true`.
- **Payment method filter on payments list:** Not available. Only status, term, year, and class filters exist.
- **Receipt number search:** Not available on the payments list.
- **PDF export from backend:** Does not exist. PDF reports are generated in the frontend using the browser's print function.
- **Excel export from backend:** Does not exist. The report endpoint returns JSON only; Excel is built in the frontend.
- **Hardcoded merchant account in OneKhusa:** `backend/src/lib/onekhusa.js` line 26 contains a hardcoded merchant account number (`75480583`) with a comment "any valid merchant under our org works here" — this should be configurable per school in a multi-tenant system.

---

*End of document.*
