export type AppRole =
  | "admin"
  | "socio"
  | "licitaciones"
  | "ventas"
  | "rh"
  | "logistica";

export type Permission =
  | "users.manage"
  | "system.configure"
  | "approvals.manage"
  | "bids.manage"
  | "contracts.read"
  | "contracts.manage"
  | "quotes.manage"
  | "orders.manage"
  | "shipments.manage"
  | "inventory.manage"
  | "clients.manage"
  | "hr.manage"
  | "payroll.manage"
  | "finance.read"
  | "finance.manage"
  | "reports.export"
  | "audit.read";

export const roleLabels: Record<AppRole, string> = {
  admin: "Admin",
  socio: "Socio",
  licitaciones: "Licitaciones",
  ventas: "Ventas",
  rh: "RH",
  logistica: "Logistica"
};

export const rolePermissions: Record<AppRole, Permission[]> = {
  admin: [
    "users.manage",
    "system.configure",
    "approvals.manage",
    "bids.manage",
    "contracts.read",
    "contracts.manage",
    "quotes.manage",
    "orders.manage",
    "shipments.manage",
    "inventory.manage",
    "clients.manage",
    "hr.manage",
    "payroll.manage",
    "finance.read",
    "finance.manage",
    "reports.export",
    "audit.read"
  ],
  socio: [
    "approvals.manage",
    "contracts.read",
    "hr.manage",
    "finance.read",
    "finance.manage",
    "reports.export",
    "audit.read"
  ],
  licitaciones: ["bids.manage", "contracts.read", "reports.export"],
  ventas: [
    "contracts.read",
    "quotes.manage",
    "orders.manage",
    "clients.manage",
    "reports.export"
  ],
  rh: ["hr.manage", "payroll.manage", "reports.export"],
  logistica: ["contracts.read", "shipments.manage", "orders.manage", "inventory.manage"]
};

export function can(role: AppRole | undefined, permission: Permission) {
  if (!role) {
    return false;
  }

  return rolePermissions[role].includes(permission);
}

export function canAny(role: AppRole | undefined, permissions: Permission[]) {
  return permissions.some((permission) => can(role, permission));
}
