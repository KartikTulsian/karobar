import { createCustomer, createSupplier, deleteCustomer, deleteInvitation, deleteSupplier, deleteTeamMember, fetchCustomerProfile, fetchCustomers, fetchPendingInvitations, fetchSupplierProfile, fetchSuppliers, fetchTeamMembers, fetchTenantDetails, fetchUserBusinesses, inviteTeamMember, toggleTeamMemberStatus, updateCustomer, updateSupplier, updateTeamMemberRole, updateTenantDetails } from "@/lib/api/people";
import { CustomerFormData } from "@/lib/validations/customerSchema";
import { SupplierFormData } from "@/lib/validations/supplierSchema";
import { TeamMemberFormData } from "@/lib/validations/teamMemberSchema";
import { TenantUpdatePayload, UserRole } from "@/types/people";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useTenant(tenantId: string) {
    return useQuery({
        queryKey: ['tenant', tenantId],
        queryFn: () => fetchTenantDetails(tenantId),
        enabled: !!tenantId, // Prevents the query from running if tenantId is missing
    });
}

export function useUpdateTenantDetails(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: TenantUpdatePayload) => updateTenantDetails(tenantId, data),
        onSuccess: () => {
            // Refresh tenant data across the app[cite: 31]
            queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['user_businesses'] });
        },
    });
}

export function useUserBusinesses() {
    return useQuery({
        queryKey: ['user_businesses'],
        queryFn: fetchUserBusinesses,
    });
}

export function useCustomers(tenantId: string) {
    return useQuery({
        queryKey: ['customers', tenantId],
        queryFn: () => fetchCustomers(tenantId),
        enabled: !!tenantId,
    });
}

export function useCreateCustomer(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CustomerFormData) => createCustomer(tenantId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers', tenantId] });
        },
    });
}

export function useUpdateCustomer(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ customerId, data }: { customerId: string; data: CustomerFormData }) => updateCustomer(tenantId, customerId, data),
        onSuccess: (_, variables) => {
            // Refresh the main list
            queryClient.invalidateQueries({ queryKey: ['customers', tenantId] });
            // If they are on the profile page, refresh that specific profile too
            queryClient.invalidateQueries({ queryKey: ['customer_profile', variables.customerId, tenantId] });
        }
    })
}

export function useDeleteCustomer(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (customerId: string) => deleteCustomer(tenantId, customerId),
        onSuccess: () => {
            // Refresh the list so the deleted customer disappears immediately
            queryClient.invalidateQueries({ queryKey: ['customers', tenantId] });
        },
    });
}

export function useSuppliers(tenantId: string) {
    return useQuery({
        queryKey: ['suppliers', tenantId],
        queryFn: () => fetchSuppliers(tenantId),
        enabled: !!tenantId,
    });
}

export function useCreateSupplier(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SupplierFormData) => createSupplier(tenantId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers', tenantId] });
        },
    });
}

export function useUpdateSupplier(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ supplierId, data }: { supplierId: string; data: SupplierFormData }) =>
            updateSupplier(tenantId, supplierId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['suppliers', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['supplier_profile', variables.supplierId, tenantId] });
        },
    });
}

export function useDeleteSupplier(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (supplierId: string) => deleteSupplier(tenantId, supplierId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers', tenantId] });
        },
    });
}

export function useCustomerProfile(tenantId: string, customerId: string) {
    return useQuery({
        queryKey: ['customer_profile', customerId, tenantId],
        queryFn: () => fetchCustomerProfile(tenantId, customerId),
        enabled: !!tenantId && !!customerId, // Only run if we have both IDs
    });
}

export function useSupplierProfile(tenantId: string, supplierId: string) {
    return useQuery({
        queryKey: ['supplier_profile', supplierId, tenantId],
        queryFn: () => fetchSupplierProfile(tenantId, supplierId),
        enabled: !!tenantId && !!supplierId, 
    });
}

// ====================================================================
// TEAM QUERY HOOKS
// ====================================================================

export function useTeamMembers(tenantId: string) {
    return useQuery({
        queryKey: ['team_members', tenantId],
        queryFn: () => fetchTeamMembers(tenantId),
        enabled: !!tenantId,
    });
}

export function useInviteTeamMember(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: TeamMemberFormData) => inviteTeamMember(tenantId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team_members', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['pending_invitations', tenantId] });
        },
    });
}

export function useUpdateTeamMemberRole(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ membershipId, role }: { membershipId: string; role: UserRole }) =>
            updateTeamMemberRole(tenantId, membershipId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team_members', tenantId] });
        },
    });
}

export function useToggleTeamMemberStatus(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ membershipId, isActive }: { membershipId: string; isActive: boolean }) =>
            toggleTeamMemberStatus(tenantId, membershipId, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team_members', tenantId] });
        },
    });
}

export function useDeleteTeamMember(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (membershipId: string) => deleteTeamMember(tenantId, membershipId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team_members', tenantId] });
        },
    });
}

export function usePendingInvitations(tenantId: string) {
    return useQuery({
        queryKey: ['pending_invitations', tenantId],
        queryFn: () => fetchPendingInvitations(tenantId),
        enabled: !!tenantId,
    });
}

export function useDeleteInvitation(tenantId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (invitationId: string) => deleteInvitation(invitationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending_invitations', tenantId] });
        },
    });
}