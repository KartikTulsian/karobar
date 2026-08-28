"use client";

import Table from '@/components/common/Table';
import { TeamMemberRow, TeamMemberWithDetails, UserRole } from '@/types/people';
import { ShieldAlert, UserCog, User, Edit2, ShieldCheck, Trash2, Clock } from 'lucide-react';

interface TeamMembersTableProps {
    data: TeamMemberRow[];
    onEdit: (member: TeamMemberWithDetails) => void;
    onDelete: (member: TeamMemberWithDetails) => void;
}

export default function TeamMembersTable({ data, onEdit, onDelete }: TeamMembersTableProps) {

    const columns = [
        { header: "Team Member", accessor: "user", sortable: true },
        { header: "Role", accessor: "role", sortable: true },
        { header: "Status", accessor: "is_active", sortable: true },
        { header: "Joined Date", accessor: "created_at", sortable: true, className: "hidden sm:table-cell" },
        { header: "Actions", accessor: "actions", className: "text-right" }
    ];

    const getRoleIcon = (role: UserRole) => {
        switch (role) {
            case 'owner': return <ShieldAlert className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
            case 'manager': return <UserCog className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
            default: return <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />;
        }
    };

    const getRoleBadgeColor = (role: UserRole) => {
        switch (role) {
            case 'owner': return 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/10 dark:text-purple-400';
            case 'manager': return 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400';
            default: return 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300';
        }
    };

    const renderRow = (member: TeamMemberRow) => (
        <tr
            key={member.id}
            className={`transition-colors border-b border-slate-100 dark:border-slate-800/50 ${!member.is_active ? 'bg-slate-50/50 dark:bg-slate-900/50 opacity-75' : 'hover:bg-slate-50 dark:hover:bg-slate-800/20'}`}
        >
            {/* Member Details */}
            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase">
                        {member.users?.full_name ? member.users.full_name.charAt(0) : '?'}
                    </div>
                    <div>
                        <p className={`font-medium ${!member.is_active && !member.is_pending ? 'line-through text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                            {member.users?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-slate-500">{member.users?.email}</p>
                    </div>
                </div>
            </td>

            {/* Role Badge */}
            <td className="px-5 py-4">
                <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset ${getRoleBadgeColor(member.role)}`}>
                    {getRoleIcon(member.role)} {member.role}
                </span>
            </td>

            {/* Status (Active/Revoked) */}
            <td className="px-5 py-4">
                {member.is_pending ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-500">
                        <Clock className="h-4 w-4" /> Pending
                    </span>
                ) : member.is_active ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-4 w-4" /> Active
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-red-500">
                        <ShieldAlert className="h-4 w-4" /> Revoked
                    </span>
                )}
            </td>

            {/* Joined Date */}
            <td className="px-5 py-4 hidden sm:table-cell text-sm text-slate-600 dark:text-slate-400">
                {new Date(member.created_at).toLocaleDateString('en-GB')}
            </td>

            {/* Actions */}
            <td className="px-5 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                    {onEdit && !(member).is_pending && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(member);
                            }}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors"
                        >
                            <Edit2 className="h-4 w-4" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(member);
                            }}
                            className={`rounded p-1.5 transition-colors ${member.role === 'owner' ? 'opacity-30 cursor-not-allowed text-slate-300' : 'text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400'}`}
                            disabled={member.role === 'owner'}
                            title={(member).is_pending ? "Cancel Invitation" : "Remove Access"}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
    return <Table columns={columns} renderRow={renderRow} data={data} />;
}
