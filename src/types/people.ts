import { TenantFormData } from "@/lib/validations/tenantSchema";
import { BillLineItem, PaymentMethod, BillStatus, SalesReturnWithItems } from "./billing";
import { POLineItem, PurchaseOrder, PurchaseOrderStatus, PurchaseReturnWithDetails } from "./purchases";

export type CustomerType = 'registered' | 'flying';
export type UserRole = 'owner' | 'manager' | 'staff' | 'customer';

// ==========================================
// 1. CORE DATABASE ENTITIES
// ==========================================

export interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Tenant {
    id: string;
    slug: string;
    name: string;
    email: string;
    gstin: string | null;
    state_code: string | null;
    address: string | null;
    city: string | null;    
    pincode: string | null; 
    country: string | null; 
    country_code: string | null;
    phone: string | null;
    logo_url: string | null;
    plan: string;
    plan_expires_at: string | null;
    razorpay_sub_id: string | null;
    is_active: boolean;
    created_at: string;
}

export interface TenantInvitation {
  id: string;
  tenant_id: string;
  email: string;
  role: UserRole;
  invited_by: string | null;
  token: string;
  is_accepted: boolean;
  expires_at: string;
  created_at: string;
  revoked_at: string;
  access_level: string;
  // Joined relation for UI display
  tenants?: {
    name: string;
    logo_url: string | null;
  } | null;
}

// ==========================================
// 2. ACTIVE CONTEXT & STORE TYPES
// ==========================================

export interface ActiveTenantContext {
  tenantId: string;
  slug: string;
  name: string;          // Maps to tenants.name
  businessName: string;  // Alias for compatibility with ShopSwitcher.tsx
  role: UserRole;        // Maps to tenant_memberships.role
  gstin?: string | null;
  logoUrl?: string | null;
  plan: string;
}

export interface MembershipJoinResult {
    role: UserRole;
    tenants: {
        id: string;
        slug: string;
        name: string;
        gstin: string | null;
        logo_url: string | null;
        plan: string;
    } | null;
}

export type TeamMemberRow = TeamMemberWithDetails & { is_pending?: boolean };

export type TenantUpdatePayload = TenantFormData & { logo_url: string | null };

// ==========================================
// 3. ONBOARDING & FORM DTOs
// ==========================================

export interface UpdateProfileInput {
  full_name: string;
  phone: string;
}

export interface CreateTenantInput {
  name: string;
  gstin?: string;
  state_code?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface CustomerClaimMatch {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  outstanding_due: number;
  tenant: {
    name: string;
    address: string | null;
    phone: string | null;
  };
}

export interface Customer {
    id: string;
    tenant_id: string;
    user_id: string | null;
    name: string;
    company_name: string | null;
    phone: string | null;
    country_code: string | null;
    email: string | null;
    gstin: string | null;
    address: string | null;
    city: string | null;
    pincode: string | null;
    state_code: string | null;
    country: string | null;
    type: CustomerType;
    credit_limit: number;
    outstanding_due: number;
    total_write_offs: number;
    total_purchases: number;
    advance_balance: number;
    visit_count: number;
    last_purchase_at: string | null;
    notes: string | null;
    created_at: string;
}

export interface Supplier {
    id: string;
    tenant_id: string;
    user_id: string | null;
    name: string;
    company_name: string | null;
    gstin: string | null;
    state_code: string | null;
    country_code: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    pincode: string | null;
    country: string | null;
    payment_terms: string | null;      // e.g., 'Net 30'
    outstanding_due: number;
    total_write_offs: number;
    total_purchases: number;
    advance_balance: number;
    notes: string | null;
    created_at: string;
}

export interface TenantMembership {
    id: string;
    user_id: string;
    tenant_id: string;
    role: UserRole;
    invited_by: string | null;
    is_active: boolean;
    created_at: string;
}

// The joined shape for the UI table so we can show names/emails
export interface TeamMemberWithDetails extends TenantMembership {
    users?: {
        full_name: string;
        email: string;
        avatar_url?: string | null;
    } | null;
}

export interface DatabaseBill {
    id: string;
    tenant_id: string;
    customer_id: string;
    created_by: string;
    bill_number: string;
    bill_date: string;
    due_date: string | null;
    status: BillStatus;
    is_gst_bill: boolean;
    is_interstate: boolean;
    subtotal: number;
    discount_amount: number;
    cgst_total: number;
    sgst_total: number;
    igst_total: number;
    grand_total: number;
    amount_paid: number;
    amount_due: number;
    total_profit?: number;
    settlement_discount: number;
    round_off: number;
    payment_method: PaymentMethod | null;
    notes: string | null;
    ai_parsed: boolean;
    vehicle_no: string | null;
    reference_name: string | null;
    terms_conditions: string | null;
    created_at: string;
    updated_at: string;

    bill_line_items?: BillLineItem[];
    sales_returns?: SalesReturnWithItems[];
}

export interface CustomerProfileData extends Customer {
    bills: DatabaseBill[];
}

export interface SupplierPOSummary extends PurchaseOrder{
    id: string;
    po_number: string;
    order_date: string;
    status: PurchaseOrderStatus;
    total_amount: number;
    amount_paid: number;
    amount_due: number;
    
    po_line_items?: POLineItem[];
    purchase_returns?: PurchaseReturnWithDetails[];
}

export interface SupplierProfileData extends Supplier {
    purchase_orders: SupplierPOSummary[];
}