import { UserRole } from "@/types/people";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Box, Briefcase, CreditCard, Download, FileText, History, Landmark, LayoutDashboard, LifeBuoy, List, ListTodo, LogOut, MessageSquare, Package, PackagePlus, Receipt, RefreshCcw, ScanLine, Settings, Shield, ShieldAlert, ShoppingBag, SquareActivity, Store, Ticket, Users } from "lucide-react";

export type ExtendedRole = UserRole | 'system_admin';

export interface NavigationItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: ExtendedRole[];
}

export interface NavigationGroup {
    title: string;
    items: NavigationItem[];
}

export const navigationRegistry: NavigationGroup[] = [

    // ---------------- SYSTEM ADMIN EXCLUSIVES ----------------
    {
        title: "Platform",
        items: [
            { name: "System dashboard", href: "/admin/dashboard", icon: LayoutDashboard, roles: ["system_admin"] },
            { name: "All tenants", href: "/admin/tenants", icon: Store, roles: ["system_admin"] },
            { name: "Platform health", href: "/admin/health", icon: Activity, roles: ["system_admin"] },
            { name: "Usage analytics", href: "/admin/analytics", icon: BarChart3, roles: ["system_admin"] },
            { name: "Anomaly feed", href: "/admin/anomalies", icon: AlertTriangle, roles: ["system_admin"] },
        ]
    },
    {
        title: "Subscriptions",
        items: [
            { name: "Plans & packages", href: "/admin/plans", icon: Package, roles: ["system_admin"] },
            { name: "Transactions", href: "/admin/transactions", icon: Receipt, roles: ["system_admin"] },
            { name: "Renewals & churn", href: "/admin/renewals", icon: RefreshCcw, roles: ["system_admin"] },
        ]
    },
    {
        title: "Support",
        items: [
            { name: "Support / Access grants", href: "/admin/support", icon: LifeBuoy, roles: ["system_admin"] },
        ]
    },
    {
        title: "Security",
        items: [
            { name: "Audit log", href: "/admin/audit", icon: List, roles: ["system_admin"] },
            { name: "Auth events", href: "/admin/auth-events", icon: Shield, roles: ["system_admin"] },
            { name: "Error tracker", href: "/admin/errors", icon: ShieldAlert, roles: ["system_admin"] },
        ]
    },

    // ---------------- TENANT: MAIN ----------------
    {
        title: "Main",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["owner", "manager", "staff"] },
            // { name: "POS billing", href: "/pos", icon: CreditCard, roles: ["owner", "manager", "staff"] },
        ]
    },
    {
        title: "My Account",
        items: [
            { name: "My dashboard", href: "/customer/dashboard", icon: LayoutDashboard, roles: ["customer"] },
            { name: "My bills", href: "/customer/bills", icon: Receipt, roles: ["customer"] },
            { name: "Purchase history", href: "/customer/history", icon: History, roles: ["customer"] },
            { name: "Dues & payments", href: "/customer/dues", icon: Landmark, roles: ["customer"] },
        ]
    },

    // ---------------- TENANT: INVENTORY & SALES ----------------
    {
        title: "Inventory",
        items: [
            { name: "All items", href: "/inventory/items", icon: Box, roles: ["owner", "manager", "staff"] },
            { name: "Low stock", href: "/inventory/low-stock", icon: AlertTriangle, roles: ["owner", "manager", "staff"] },
            { name: "Categories & brands", href: "/inventory/categories-brands", icon: Briefcase, roles: ["owner", "manager"] },
            { name: "Stock Movement", href: "/inventory/movements", icon: SquareActivity, roles: ["owner", "manager"] },
        ]
    },
    {
        title: "Sales & Billing",
        items: [
            { name: "All bills", href: "/billing/bills", icon: Receipt, roles: ["owner", "manager", "staff"] },
            { name: "New bill", href: "/billing/new", icon: PackagePlus, roles: ["owner", "manager"] },
            // { name: "AI bill scan", href: "/billing/scan", icon: ScanLine, roles: ["owner", "manager", "staff"] },
            { name: "Sales returns", href: "/billing/sales-returns", icon: ArrowDownRight, roles: ["owner", "manager"] },
        ]
    },
    {
        title: "Purchases",
        items: [
            { name: "To Purchase", href: "/purchases/to-purchase", icon: ListTodo, roles: ["owner", "manager"] },
            { name: "New Purchase Order", href: "/purchases/new", icon: PackagePlus, roles: ["owner", "manager"] },
            { name: "Purchase orders", href: "/purchases/orders", icon: ShoppingBag, roles: ["owner", "manager"] },
            { name: "Purchase returns", href: "/purchases/returns", icon: ArrowUpRight, roles: ["owner", "manager"] },
        ]
    },

    // ---------------- TENANT: CRM & SHOPS ----------------
    {
        title: "People",
        items: [
            { name: "Customers", href: "/people/customers", icon: Users, roles: ["owner", "manager", "staff"] },
            { name: "Suppliers", href: "/people/suppliers", icon: Briefcase, roles: ["owner", "manager", "staff"] },
            { name: "Team members", href: "/people/team", icon: Shield, roles: ["owner", "manager"] },
        ]
    },
    {
        title: "My Shops",
        items: [
            { name: "Ravi Auto Parts", href: "/customer/shops/ravi", icon: Store, roles: ["customer"] },
            { name: "SRM Spares", href: "/customer/shops/srm", icon: Store, roles: ["customer"] },
        ]
    },

    // ---------------- TENANT: FINANCE & REPORTS ----------------
    {
        title: "Finance & GST",
        items: [
            { name: "Payments", href: "/finance/payments", icon: CreditCard, roles: ["owner", "manager"] },
            { name: "P&L dashboard", href: "/finance/pnl", icon: BarChart3, roles: ["owner"] },
            { name: "GST reports", href: "/finance/gst", icon: FileText, roles: ["owner"] },
            { name: "Expenses", href: "/finance/expenses", icon: Receipt, roles: ["owner"] },
            // { name: "Bank accounts", href: "/finance/banks", icon: Landmark, roles: ["owner"] },
            { name: "Cash Book", href: "/finance/cashbook", icon: FileText, roles: ["owner"] },
        ]
    },
    {
        title: "Reports",
        items: [
            { name: "P&L Overview", href: "/reports/pnl", icon: BarChart3, roles: ["manager"] },
            { name: "Sales report", href: "/reports/sales", icon: FileText, roles: ["owner", "manager"] },
            { name: "Inventory report", href: "/reports/inventory", icon: Box, roles: ["owner", "manager"] },
            { name: "Top suppliers", href: "/reports/suppliers", icon: Briefcase, roles: ["owner", "manager"] },
            { name: "Top customers", href: "/reports/customers", icon: Users, roles: ["owner", "manager"] },
            { name: "Annual report", href: "/reports/annual", icon: FileText, roles: ["owner"] },
        ]
    },

    // ---------------- UNIVERSAL SECTIONS ----------------
    {
        title: "Support",
        items: [
            { name: "Message shop", href: "/support/message", icon: MessageSquare, roles: ["customer"] },
            { name: "Notifications", href: "/support/notifications", icon: AlertTriangle, roles: ["customer"] },
            { name: "Download bills", href: "/support/downloads", icon: Download, roles: ["customer"] },
        ]
    },
    {
        title: "Settings",
        items: [
            { name: "Platform config", href: "/admin/config", icon: Settings, roles: ["system_admin"] },
            { name: "Email templates", href: "/admin/emails", icon: MessageSquare, roles: ["system_admin"] },
            { name: "Shop settings", href: "/settings/shop", icon: Settings, roles: ["owner"] },
            { name: "Subscription", href: "/settings/subscription", icon: Ticket, roles: ["owner"] },
            { name: "Messages", href: "/settings/messages", icon: MessageSquare, roles: ["owner", "manager", "staff"] },
            { name: "Notifications", href: "/settings/notifications", icon: AlertTriangle, roles: ["owner", "manager", "staff"] },
            { name: "Log out", href: "/logout", icon: LogOut, roles: ["customer"] },
            { name: "Settings", href: "/settings", icon: Settings, roles: ["customer"] },
        ]
    }
]