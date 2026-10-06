// backend/src/lib/defaultRoles.js
// Default roles every school starts with. Created automatically when the
// first admin registers. Admin can edit them in Settings afterward.

/**
 * permissions shape:
 *   { [resource]: Array<"read"|"write"|"verify"|"delete"> }
 *
 * Resources: dashboard, students, payments, classes, reports, sms, results, staff, settings
 */
const DEFAULT_ROLES = [
  {
    name: "School Admin",
    description: "Full access to everything in the system",
    isSystem: true,
    permissions: {
      dashboard: ["read"],
      students: ["read", "write", "delete"],
      payments: ["read", "write", "verify", "delete"],
      classes: ["read", "write", "delete"],
      reports: ["read"],
      sms: ["read", "write"],
      results: ["read", "write"],
      staff: ["read", "write", "delete"],
      settings: ["read", "write"],
    },
  },
  {
    name: "Bursar",
    description: "Records student payments and handles day-to-day finance",
    isSystem: true,
    permissions: {
      dashboard: ["read"],
      students: ["read", "write"],
      payments: ["read", "write", "verify"],
      classes: ["read"],
      reports: ["read"],
      sms: [],
      results: [],
      staff: [],
      settings: [],
    },
  },
  {
    name: "Finance",
    description: "Views financial reports and reconciles accounts",
    isSystem: true,
    permissions: {
      dashboard: ["read"],
      students: ["read"],
      payments: ["read", "verify"],
      classes: [],
      reports: ["read"],
      sms: [],
      results: [],
      staff: [],
      settings: [],
    },
  },
  {
    name: "Registrar",
    description: "Manages students, classes, and enrollment",
    isSystem: true,
    permissions: {
      dashboard: ["read"],
      students: ["read", "write", "delete"],
      payments: ["read"],
      classes: ["read", "write"],
      reports: ["read"],
      sms: [],
      results: [],
      staff: [],
      settings: [],
    },
  },
  {
    name: "Teacher",
    description: "Views student records and enters exam results",
    isSystem: true,
    permissions: {
      dashboard: ["read"],
      students: ["read"],
      payments: [],
      classes: ["read"],
      reports: [],
      sms: [],
      results: ["read", "write"],
      staff: [],
      settings: [],
    },
  },
  {
    name: "Other",
    description: "Custom role — assign permissions manually",
    isSystem: false,
    permissions: {
      dashboard: ["read"],
      students: [],
      payments: [],
      classes: [],
      reports: [],
      sms: [],
      results: [],
      staff: [],
      settings: [],
    },
  },
];

/**
 * Creates the 6 default roles for a school inside a Prisma transaction.
 * Returns a map { roleName -> roleId } for convenience.
 */
const createDefaultRolesForSchool = async (tx, schoolId) => {
  const roleMap = {};
  for (const role of DEFAULT_ROLES) {
    const created = await tx.role.create({
      data: {
        schoolId,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isSystem: role.isSystem,
      },
    });
    roleMap[role.name] = created.id;
  }
  return roleMap;
};

module.exports = { DEFAULT_ROLES, createDefaultRolesForSchool };
