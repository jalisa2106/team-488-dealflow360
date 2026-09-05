export type UserRole =
  | "ADMIN"
  | "SALES_REP"
  | "SALES_MANAGER"
  | "FINANCE"
  | "OPERATIONS"
  | "CUSTOMER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export const DEMO_USERS: Record<UserRole, User> = {
  ADMIN: {
    id: "usr_admin_001",
    email: "admin@dealflow360.com",
    name: "Alex Vance (Admin)",
    role: "ADMIN",
    active: true,
    createdAt: new Date().toISOString(),
  },
  SALES_REP: {
    id: "usr_sales_001",
    email: "salesrep@dealflow360.com",
    name: "Sarah Jenkins (Sales Rep)",
    role: "SALES_REP",
    active: true,
    createdAt: new Date().toISOString(),
  },
  SALES_MANAGER: {
    id: "usr_mgr_001",
    email: "salesmgr@dealflow360.com",
    name: "Marcus Brody (Sales Manager)",
    role: "SALES_MANAGER",
    active: true,
    createdAt: new Date().toISOString(),
  },
  FINANCE: {
    id: "usr_fin_001",
    email: "finance@dealflow360.com",
    name: "Fiona Gallagher (Finance Lead)",
    role: "FINANCE",
    active: true,
    createdAt: new Date().toISOString(),
  },
  OPERATIONS: {
    id: "usr_ops_001",
    email: "ops@dealflow360.com",
    name: "Oliver Stone (Operations Lead)",
    role: "OPERATIONS",
    active: true,
    createdAt: new Date().toISOString(),
  },
  CUSTOMER: {
    id: "usr_cust_001",
    email: "customer@acme.com",
    name: "Acme Corp Procurement",
    role: "CUSTOMER",
    active: true,
    createdAt: new Date().toISOString(),
  },
};
