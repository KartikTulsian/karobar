"use client";

import DeleteConfirmForm from '@/components/common/DeleteConfirmForm';
import TeamMemberForm from '@/components/people/team/TeamMemberForm';
import TeamMembersTable from '@/components/people/team/TeamMembersTable';
import ActionModal from '@/components/ui/ActionModal';
import { useDeleteInvitation, useDeleteTeamMember, useInviteTeamMember, usePendingInvitations, useTeamMembers, useUpdateTeamMemberRole } from '@/hooks/usePeople';
import { TeamMemberFormData } from '@/lib/validations/teamMemberSchema';
import { useTenantStore } from '@/store/useTenantStore';
import { TeamMemberRow } from '@/types/people';
import { Plus, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react'
import { toast } from 'react-toastify';

export default function TeamMembersPage() {

    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";
    
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [activeTab, setActiveTab] = useState<'team' | 'invitations'>('team');

    const { data: team = [], isLoading: isTeamLoading, isError } = useTeamMembers(tenantId);
    const { data: invitations = [], isLoading: isInvitesLoading } = usePendingInvitations(tenantId);

    const { mutateAsync: inviteMember } = useInviteTeamMember(tenantId);
    const { mutateAsync: updateRole } = useUpdateTeamMemberRole(tenantId);
    const { mutateAsync: deleteMember, isPending: isDeleteingMember } = useDeleteTeamMember(tenantId);
    const { mutateAsync: deleteInvite, isPending: isDeletingInvite } = useDeleteInvitation(tenantId);
    
    const isLoading = activeTab === 'team' ? isTeamLoading : isInvitesLoading;
    const isDeleting = activeTab === 'team' ? isDeletingInvite : false;
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"create" | "update" | "delete">("create");
    const [selectedMember, setSelectedMember] = useState<TeamMemberRow | null>(null);
    
    const handleOpenCreate = () => {
        setModalType("create");
        setSelectedMember(null);
        setIsModalOpen(true);
    };

    const handleOpenUpdate = (member: TeamMemberRow) => {
        setModalType("update");
        setSelectedMember(member);
        setIsModalOpen(true);
    };

    const handleOpenDelete = (member: TeamMemberRow) => {
        setModalType("delete");
        setSelectedMember(member);
        setIsModalOpen(true);
    };

    const handleCreateSubmit = async (data: TeamMemberFormData) => {
        try {
            const res = await inviteMember(data);
            
            const status = (res as { status?: string })?.status || 'invited';

            if (status === 'joined' || status === 'reactivated') {
                toast.success("Team member added to business!");
            } else {
                toast.success("Invitation sent successfully!");
            }
            setIsModalOpen(false);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to send invitation.");
        }
    };

    const handleUpdateSubmit = async (data: TeamMemberFormData) => {
        if (!selectedMember?.id) return;
        try {
            await updateRole({ membershipId: selectedMember.id, role: data.role });
            toast.success("Team member role updated successfully!");
            setIsModalOpen(false);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to update role.");
        }
    };

    const handleDeleteSubmit = async () => {
        if (!selectedMember?.id) return;
        try {
            if (selectedMember.is_pending) {
                await deleteInvite(selectedMember.id);
                toast.success("Invitation removed successfully!");
            } else {
                await deleteMember(selectedMember.id);
                toast.success("Team member removed successfully!");
            }
            setIsModalOpen(false);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to remove team member.");
        }
    };

    // const filteredTeam = useMemo(() => {
    //     let result = team;

    //     if (roleFilter) {
    //         result = result.filter(member => member.role === roleFilter);
    //     }

    //     if (searchQuery) {
    //         const query = searchQuery.toLowerCase();
    //         result = result.filter(member =>
    //             (member.users?.full_name || "").toLowerCase().includes(query) ||
    //             (member.users?.email || "").toLowerCase().includes(query)
    //         );
    //     }

    //     return result;
    // }, [searchQuery, roleFilter, team]);

    const tableData: TeamMemberRow[] = useMemo(() => {
        if (activeTab === 'invitations') {
            // Map invitations to match the table's expected TeamMemberWithDetails structure
            let result: TeamMemberRow[] = invitations.map(inv => ({
                id: inv.id,
                user_id: '',
                tenant_id: inv.tenant_id,
                role: inv.role,
                invited_by: inv.invited_by,
                is_active: false, // forces the styling for inactive
                is_pending: true, // Custom flag to identify invitations
                created_at: inv.created_at,
                users: {
                    full_name: "Pending Invite",
                    email: inv.email,
                    avatar_url: null,
                }
            }));

            if (roleFilter) result = result.filter(m => m.role === roleFilter);
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                result = result.filter(m => (m.users?.email || "").toLowerCase().includes(query));
            }
            return result;
        } else {
            // Normal team members logic
            let result: TeamMemberRow[] = team.map(member => ({ ...member, is_pending: false }));
            if (roleFilter) result = result.filter(member => member.role === roleFilter);
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                result = result.filter(member =>
                    (member.users?.full_name || "").toLowerCase().includes(query) ||
                    (member.users?.email || "").toLowerCase().includes(query)
                );
            }
            return result;
        }
    }, [activeTab, team, invitations, searchQuery, roleFilter]);

    const defaultFormData: Partial<TeamMemberFormData> | undefined = selectedMember ? {
        email: selectedMember.users?.email || "",
        role: selectedMember.role === "manager" ? "manager" : "staff", 
    } : undefined;

    return (
        <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50/50 dark:bg-slate-900'>
            
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Team Members</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage staff access, roles, and permissions for your store.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleOpenCreate}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 shadow-sm"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Invite Staff
                    </button>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                
                <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-3 gap-6 bg-slate-50/50 dark:bg-slate-900/50">
                    <button
                        onClick={() => setActiveTab('team')}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'team'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Active Team
                    </button>
                    <button
                        onClick={() => setActiveTab('invitations')}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'invitations'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Pending Invitations
                        {invitations.length > 0 && (
                            <span className="bg-indigo-100 text-indigo-600 py-0.5 px-2 rounded-full text-xs font-bold dark:bg-indigo-900/50 dark:text-indigo-300">
                                {invitations.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <select 
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                            <option value="">All Roles</option>
                            <option value="owner">Owner</option>
                            <option value="manager">Manager</option>
                            <option value="staff">Staff</option>
                        </select>
                    </div>
                </div>

                {/* Table Rendering */}
                {isLoading ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                        <span className="text-sm font-medium text-slate-500">Loading team...</span>
                    </div>
                ) : isError ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3 text-red-500">
                        <span className="text-sm font-medium">Failed to load team data.</span>
                    </div>
                ) : tableData.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3 text-slate-500">
                        <Users className="h-10 w-10 text-slate-300" />
                        <span className="text-sm font-medium">No team members found.</span>
                    </div>
                ) : (
                    <TeamMembersTable 
                        data={tableData} 
                        onEdit={handleOpenUpdate}
                        onDelete={handleOpenDelete}
                    />
                )}
            </div>

            <ActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalType === "create" ? "Invite Team Member" : modalType === "update" ? "Edit Team Member" : ""}
            >
                {modalType === "delete" ? (
                    <DeleteConfirmForm
                        itemName={selectedMember?.users?.full_name || "this team member"}
                        itemType='Team Member'
                        isDeleting={isDeleting}
                        onCancel={() => setIsModalOpen(false)}
                        onConfirm={handleDeleteSubmit}
                    />
                ) : (
                    <TeamMemberForm
                        // Make sure TeamMemberForm accepts a defaultValues prop just like CustomerForm
                        defaultValues={defaultFormData} 
                        isModal={true}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={modalType === "create" ? handleCreateSubmit : handleUpdateSubmit}
                    />
                )}
            </ActionModal>
        </div>
    );
}
