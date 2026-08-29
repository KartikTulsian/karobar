import { ActiveTenantContext, Customer, CustomerProfileData, DatabaseBill, MembershipJoinResult, Supplier, SupplierPOSummary, SupplierProfileData, TeamMemberWithDetails, Tenant, TenantInvitation, UserRole } from "@/types/people";
import { supabase } from "../supabase/client";
import { CustomerFormData } from "../validations/customerSchema";
import { SupplierFormData } from "../validations/supplierSchema";
import { TeamMemberFormData } from "../validations/teamMemberSchema";
import { TenantFormData } from "../validations/tenantSchema";

export async function fetchTenantDetails(tenantId: string): Promise<Tenant> {
    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single(); // Using .single() because we expect exactly one matching tenant record
    
    if (error) {
        console.error("Database Error fetching tenant details:", error.message);
        throw new Error("Failed to fetch tenant details");
    }
    
    return data as Tenant;
}

export async function fetchUserBusinesses(): Promise<ActiveTenantContext[]> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
        throw new Error("Not authenticated");
    }

    // Join the memberships table with the tenants table
    const { data, error } = await supabase
        .from('tenant_memberships')
        .select(`
            role,
            tenants ( id, slug, name, gstin, logo_url, plan )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .returns<MembershipJoinResult[]>();

    if (error) {
        console.error("Database Error fetching businesses:", error.message);
        throw new Error("Failed to fetch businesses");
    }
    

    // Map the relational data to match your strict Zustand store interface
    return (data || []).map((membership) => {
        if (!membership.tenants) {
            throw new Error("Invalid tenant relationship detected.");
        }
        
        return {
            tenantId: membership.tenants.id,
            slug: membership.tenants.slug,
            name: membership.tenants.name,
            businessName: membership.tenants.name, 
            role: membership.role,
            gstin: membership.tenants.gstin,
            logoUrl: membership.tenants.logo_url,
            plan: membership.tenants.plan
        };
    });
}

export async function updateTenantDetails(
    tenantId: string, 
    updateData: Partial<TenantFormData> & { logo_url?: string | null }
) {
    // 1. Fetch current logo before updating to check for changes
    const { data: currentTenant } = await supabase
        .from('tenants')
        .select('logo_url')
        .eq('id', tenantId)
        .single<{ logo_url: string | null }>();

    // 2. Execute the update
    const { data: result, error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', tenantId)
        .select()
        .maybeSingle();

    if (error) {
        console.error("Database Error updating tenant:", error.message);
        throw new Error(error.message || "Failed to update business details.");
    }

    if (!result) {
        throw new Error("Update blocked. You do not have permission to edit this shop.");
    }

    // 3. Clean up old logo from Cloudflare R2 if it was replaced or removed
    const oldLogo = currentTenant?.logo_url;
    const newLogo = updateData.logo_url || null;

    if (oldLogo && oldLogo !== newLogo) {
        fetch("/api/upload/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ urls: [oldLogo] }),
        }).catch(console.error);
    }

    return result;
}

export async function fetchCustomers(tenantId: string): Promise<Customer[]> {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
    
    if (error) {
        console.error("Database Error fetching customers:", error.message);
        throw new Error("Failed to fetch customers");
    }
    return data as Customer[];
}

export async function createCustomer(tenantId: string, data: CustomerFormData) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Not authenticated");

    const { id, outstanding_due, advance_balance, reduce_amount, ...insertData } = data;

    // 1. Create the customer record first (Privacy Gate: user_id remains NULL)
    const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
            tenant_id: tenantId,
            advance_balance: advance_balance || 0,
            ...insertData,
        })
        .select()
        .single();

    if (customerError) {
        console.error("Database Error creating customer:", customerError.message);
        throw new Error(customerError.message || "Failed to create customer.");
    }

    if (outstanding_due && outstanding_due > 0) {
        const { error: billError } = await supabase.from('bills').insert({
            tenant_id: tenantId,
            customer_id: customer.id,
            bill_number: `OPENING-BAL-${customer.id.substring(0, 8).toUpperCase()}`,
            bill_date: '2025-01-01', // CRITICAL: Keeps it off current P&L reports
            status: 'issued', // Marks it as unpaid
            is_gst_bill: false, // CRITICAL: Keeps it off GST dashboards
            subtotal: outstanding_due,
            grand_total: outstanding_due,
            amount_paid: 0,
            amount_due: outstanding_due,
            total_profit: 0, // CRITICAL: Prevents fake profit metrics
            notes: 'Historical outstanding balance prior to KAROBAR onboarding',
            created_by: currentUser.id
        });

        if (billError) {
            console.error("Database Error generating historical bill:", billError.message);
            throw new Error(billError.message || "Failed to generate opening balance.");
        }

        await supabase.rpc('sync_customer_metrics', {
            p_customer_id: customer.id
        })
    }

    // 2. The Auto-Match Checking Phase
    let matchedUserId: string | null = null;
    let invitationSent = false;

    if (data.phone || data.email) {
        
        let query = supabase.from('users').select('id, email');

        if (data.phone && data.email) {
            // Using Supabase 'or' syntax to check both
            query = query.or(`phone.eq.${data.phone},email.eq.${data.email}`);
        } else if (data.phone) {
            query = query.eq('phone', data.phone);
        } else if (data.email) {
            query = query.eq('email', data.email);
        }

        const { data: users, error: searchError } = await query.limit(1);

        // Target the provided email, or fallback to their platform email if only phone was given
        let targetEmail = data.email?.trim().toLowerCase() || null;

        if (!searchError && users && users.length > 0) {
            matchedUserId = users[0].id;
            targetEmail = targetEmail || users[0].email;
            console.log(`[Karobar Handshake] Existing user found: ${matchedUserId}.`);
        }

        // If we successfully resolved an email target, generate the request
        if (targetEmail) {
            let skipInvite = false;
            
            // Prevent duplicate invites if they are already an active customer
            if (matchedUserId) {
                const { data: existingMembership } = await supabase
                    .from('tenant_memberships')
                    .select('id, is_active')
                    .eq('tenant_id', tenantId)
                    .eq('user_id', matchedUserId)
                    .maybeSingle();
                    
                if (existingMembership?.is_active) skipInvite = true;
            }

            if (!skipInvite) {
                const token = crypto.randomUUID();
                const { error: inviteErr } = await supabase
                    .from('tenant_invitations')
                    .insert({
                        tenant_id: tenantId,
                        email: targetEmail,
                        role: 'customer',
                        invited_by: currentUser.id,
                        token: token,
                        is_accepted: false
                    });

                if (!inviteErr) invitationSent = true;
            }
        }
    }

    return { customer, matchedUserId, invitationSent };
}

export async function updateCustomer(tenantId: string, customerId: string, data: CustomerFormData) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Not authenticated");
    
    const { id, reduce_amount, outstanding_due, advance_balance, ...updateData } = data;

    const { data: result, error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('tenant_id', tenantId)
        .eq('id', customerId)
        .select()
        .single();

    if (error) {
        console.error("Database Error updating customer:", error.message);
        throw new Error(error.message || "Failed to update customer.");
    }

    if (reduce_amount && reduce_amount > 0) {
        const { data: unpaidBills } = await supabase
            .from('bills')
            .select('id, amount_due, amount_paid')
            .eq('tenant_id', tenantId)
            .eq('customer_id', customerId)
            .gt('amount_due', 0)
            .order('bill_date', { ascending: true });

        if (unpaidBills && unpaidBills.length > 0) {
            let remainingAdjustment = reduce_amount;

            for (const bill of unpaidBills) {
                if (remainingAdjustment <= 0) break;

                const dueOnBill = Number(bill.amount_due);
                const allocation = Math.min(dueOnBill, remainingAdjustment);

                const newAmountDue = dueOnBill - allocation;
                const newAmountPaid = Number(bill.amount_paid) + allocation;

                const newStatus = newAmountDue === 0 ? 'paid' : 'partial';

                await supabase
                    .from('bills')
                    .update({
                        amount_paid: newAmountPaid, 
                        amount_due: newAmountDue,
                        status: newStatus
                    })
                    .eq('id', bill.id);

                await supabase
                    .from('payments')
                    .insert({
                        tenant_id: tenantId,
                        bill_id: bill.id,
                        amount: allocation,
                        method: 'mixed', 
                        note: 'Account adjustment / Write-off from customer profile',
                        status: 'sanctioned',
                        recorded_by: currentUser.id
                    });

                remainingAdjustment -= allocation;
            }

            await supabase.rpc('sync_customer_metrics', { p_customer_id: customerId });
        }
    }

    return result;
}

export async function deleteCustomer(tenantId: string, customerId: string) {
    const { error } = await supabase
        .from('customers')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('id', customerId);

    if (error) {
        console.error("Database Error deleting customer:", error.message);
        // Postgres error code for foreign key violation
        if (error.code === '23503') { 
            throw new Error("Cannot delete customer because they have existing bills or transactions recorded.");
        }
        throw new Error(error.message || "Failed to delete customer.");
    }

    return true;
}

export async function fetchSuppliers(tenantId: string): Promise<Supplier[]> {
    const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
        
    if (error) {
        console.error("Database Error fetching suppliers:", error.message);
        throw new Error("Failed to fetch suppliers");
    }
    return data as Supplier[];
}

export async function createSupplier(tenantId: string, data: SupplierFormData) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Not authenticated");

    const { id, outstanding_due, advance_balance, reduce_amount, ...insertData } = data;
    
    // 1. Create the customer record first (Privacy Gate: user_id remains NULL)
    const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .insert({
            tenant_id: tenantId,
            advance_balance: advance_balance || 0,
            ...insertData,
        })
        .select()
        .single();

    if (supplierError) {
        console.error("Database Error creating supplier:", supplierError.message);
        throw new Error(supplierError.message || "Failed to create supplier.");
    }

    if (outstanding_due && outstanding_due > 0) {
        const { error: poError } = await supabase.from('purchase_orders').insert({
            tenant_id: tenantId,
            supplier_id: supplier.id,
            po_number: `OPENING-BAL-${supplier.id.substring(0, 8).toUpperCase()}`,
            order_date: '2025-01-01', // Backdated to hide from current expense reports
            status: 'received', 
            payment_status: 'unpaid', 
            is_gst_supply: false, 
            subtotal: outstanding_due,
            total_amount: outstanding_due,
            amount_paid: 0,
            amount_due: outstanding_due,
            notes: 'Historical payable balance prior to KAROBAR onboarding',
            created_by: currentUser.id
        });

        if (poError) {
            console.error("Database Error generating historical PO:", poError.message);
            throw new Error(poError.message || "Failed to generate opening balance.");
        }

        // Trigger your database RPC to sum up the new dummy PO and update outstanding_due safely
        await supabase.rpc('sync_supplier_metrics', { p_supplier_id: supplier.id });
    }

    // 2. The Auto-Match Checking Phase
    let matchedUserId = null;

    if (data.phone || data.email) {
        
        let query = supabase.from('users').select('id');

        if (data.phone && data.email) {
            // Using Supabase 'or' syntax to check both
            query = query.or(`phone.eq.${data.phone},email.eq.${data.email}`);
        } else if (data.phone) {
            query = query.eq('phone', data.phone);
        } else if (data.email) {
            query = query.eq('email', data.email);
        }

        const { data: users, error: searchError } = await query.limit(1);

        if (!searchError && users && users.length > 0) {
            matchedUserId = users[0].id;
            
            // FUTURE IMPLEMENTATION:
            // await supabase.from('notifications').insert({
            //     tenant_id: tenantId,
            //     user_id: matchedUserId,
            //     type: 'connection_request',
            //     reference_id: customer.id,
            //     title: "New Connection Request",
            //     body: "A shop wants to connect with your profile."
            // });
            
            console.log(`[Karobar Handshake] Existing user found: ${matchedUserId}. Notification ready to be sent.`);
        }
    }

    return { supplier, matchedUserId };
}

export async function updateSupplier(tenantId: string, supplierId: string, data: SupplierFormData) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Not authenticated");
    
    const { id, reduce_amount, outstanding_due, advance_balance, ...updateData } = data;

    const { data: result, error } = await supabase
        .from('suppliers')
        .update(updateData)
        .eq('tenant_id', tenantId)
        .eq('id', supplierId)
        .select()
        .single();

    if (error) {
        console.error("Database Error updating supplier:", error.message);
        throw new Error(error.message || "Failed to update supplier.");
    }

    if (reduce_amount && reduce_amount > 0) {
        const { data: unpaidPOs } = await supabase
            .from('purchase_orders')
            .select('id, amount_due, amount_paid')
            .eq('tenant_id', tenantId)
            .eq('supplier_id', supplierId)
            .gt('amount_due', 0)
            .order('order_date', { ascending: true }); // Targets the 1970 PO first

        if (unpaidPOs && unpaidPOs.length > 0) {
            let remainingAdjustment = reduce_amount;

            for (const po of unpaidPOs) {
                if (remainingAdjustment <= 0) break;

                const dueOnPO = Number(po.amount_due);
                const allocation = Math.min(dueOnPO, remainingAdjustment);
                
                const newAmountDue = dueOnPO - allocation;
                const newAmountPaid = Number(po.amount_paid) + allocation;
                
                // Matches the purchase_payment_status ENUM
                const newStatus = newAmountDue === 0 ? 'paid' : 'partial';

                await supabase
                    .from('purchase_orders')
                    .update({ 
                        amount_paid: newAmountPaid, 
                        amount_due: newAmountDue,
                        payment_status: newStatus 
                    })
                    .eq('id', po.id);

                await supabase
                    .from('supplier_payments')
                    .insert({
                        tenant_id: tenantId,
                        po_id: po.id,
                        amount: allocation,
                        method: 'mixed', 
                        note: 'Payable adjustment / Write-off from supplier profile',
                        status: 'sanctioned',
                        recorded_by: currentUser.id
                    });

                remainingAdjustment -= allocation;
            }

            await supabase.rpc('sync_supplier_metrics', { p_supplier_id: supplierId });
        }
    }

    return result;
}

export async function deleteSupplier(tenantId: string, supplierId: string) {
    const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('id', supplierId);

    if (error) {
        console.error("Database Error deleting supplier:", error.message);
        if (error.code === '23503') {
            throw new Error("Cannot delete supplier: they have linked purchase orders.");
        }
        throw new Error(error.message || "Failed to delete supplier.");
    }

    return true;
}

export async function fetchCustomerProfile(tenantId: string, customerId: string): Promise<CustomerProfileData> {
    const { data, error } = await supabase
        .from('customers')
        .select(`
            *,
            bills ( 
                *,
                bill_line_items ( * ),
                sales_returns!sales_returns_original_bill_id_fkey (
                    *,
                    sales_return_items (*)
                )
            )
        `)
        .eq('tenant_id', tenantId)
        .eq('id', customerId)
        .single();

    if (error) {
        console.error("Database Error fetching customer profile:", error.message);
        throw new Error("Failed to fetch customer profile");
    }

    // Sort bills by date (newest first) before returning
    if (data && data.bills) {
        data.bills.sort((a: DatabaseBill, b: DatabaseBill) => new Date(b.bill_date).getTime() - new Date(a.bill_date).getTime());
    }

    return data as unknown as CustomerProfileData;
}

export async function fetchSupplierProfile(tenantId: string, supplierId: string): Promise<SupplierProfileData> {
    const { data, error } = await supabase
        .from('suppliers')
        .select(`
            *,
            purchase_orders ( 
                *,
                po_line_items ( * ),
                purchase_returns (
                    *,
                    return_items:purchase_return_items ( * )
                )
            )
        `)
        .eq('tenant_id', tenantId)
        .eq('id', supplierId)
        .single();

    if (error) {
        console.error("Database Error fetching supplier profile:", error.message);
        throw new Error("Failed to fetch supplier profile");
    }

    // Sort bills by date (newest first) before returning
    if (data && data.purchase_orders) {
        data.purchase_orders.sort((a: SupplierPOSummary, b: SupplierPOSummary) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
    }

    return data as unknown as SupplierProfileData;
}

export async function fetchTeamMembers(tenantId: string): Promise<TeamMemberWithDetails[]> {
    const { data, error } = await supabase
        .from('tenant_memberships')
        .select(`
            *,
            users!tenant_memberships_user_id_fkey (
                full_name,
                email,
                avatar_url
            )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Database Error fetching team members:", error.message);
        throw new Error("Failed to fetch team members");
    }
    return data as unknown as TeamMemberWithDetails[];
}

export async function inviteTeamMember(tenantId: string, data: TeamMemberFormData) {
    const { data: { user }} = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const email = data.email.trim().toLowerCase();
    const role = data.role as UserRole;

    // 1. Check if the user already has an ACTIVE membership
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

    if (existingUser) {
        // Check if a membership already exists for this tenant
        const { data: existingMembership } = await supabase
            .from('tenant_memberships')
            .select('id, is_active')
            .eq('tenant_id', tenantId)
            .eq('user_id', existingUser.id)
            .maybeSingle();
        
        if (existingMembership?.is_active) {
            throw new Error("This user is already an active member of this business.");
        }

        // if (existingMembership) {
        //     if (existingMembership.is_active) {
        //         throw new Error("This user is already an active member of this business.");
        //     } else {
        //         // Reactivate previously revoked membership
        //         const { data: updated, error: updateErr } = await supabase
        //             .from('tenant_memberships')
        //             .update({ role, is_active: true, invited_by: user.id })
        //             .eq('id', existingMembership.id)
        //             .select()
        //             .single();

        //         if (updateErr) throw new Error(updateErr.message);
        //         return { status: 'reactivated', data: updated };
        //     }
        // }
    }

    console.log(`[DEBUG - Invite] Creating invitation for lowercase email: ${email}`);
    
    // 2. Generate a secure invitation token (Required for ALL new or revoked users)
    const token = crypto.randomUUID();
    const { data: invitation, error: inviteErr } = await supabase
        .from('tenant_invitations')
        .insert({
            tenant_id: tenantId,
            email: email,
            role: role,
            invited_by: user.id,
            token: token,
            is_accepted: false,
        })
        .select()
        .single();

    if (inviteErr) {
        console.error("Database Error creating tenant invitation:", inviteErr.message);
        throw new Error(inviteErr.message || "Failed to create invitation.");
    }

    // Trigger an email sending service here if implemented (e.g., Resend, AWS SES)
    console.log(`[Karobar] Invitation created for ${email} with token: ${token}`);

    return { status: 'invited', data: invitation };
}

export async function updateTeamMemberRole(tenantId: string, membershipId: string, role: UserRole) {
    const { data, error } = await supabase
        .from('tenant_memberships')
        .update({ role })
        .eq('tenant_id', tenantId)
        .eq('id', membershipId)
        .select()
        .single();

    if (error) {
        console.error("Database Error updating team member role:", error.message);
        throw new Error(error.message || "Failed to update role.");
    }

    return data;
}

export async function toggleTeamMemberStatus(tenantId: string, membershipId: string, isActive: boolean) {
    const { data, error } = await supabase
        .from('tenant_memberships')
        .update({ is_active: isActive })
        .eq('tenant_id', tenantId)
        .eq('id', membershipId)
        .select()
        .single();

    if (error) {
        console.error("Database Error updating team member status:", error.message);
        throw new Error(error.message || "Failed to update member status.");
    }

    return data;
}

export async function deleteTeamMember(tenantId: string, membershipId: string) {
    const { error } = await supabase
        .from('tenant_memberships')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('id', membershipId);

    if (error) {
        console.error("Database Error deleting team member:", error.message);
        throw new Error(error.message || "Failed to delete team member.");
    }

    return true;
}

export async function fetchPendingInvitations(tenantId: string): Promise<TenantInvitation[]> {
    const { data, error } = await supabase
        .from('tenant_invitations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_accepted', false)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message || "Failed to fetch pending invitations.");
    return data as TenantInvitation[];
}

export async function deleteInvitation(invitationId: string) {
    const { error } = await supabase
        .from('tenant_invitations')
        .delete()
        .eq('id', invitationId);

    if (error) throw new Error(error.message || "Failed to delete invitation.");
    return true;
}