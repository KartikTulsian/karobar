import { UserRole } from "@/types/people";

// src/lib/auth/roles.ts
export interface TenantContext {
  tenantId: string;
  businessName: string;
  role: UserRole;
}