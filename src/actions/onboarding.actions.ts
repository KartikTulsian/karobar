"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function acceptStaffInviteAction(token: string) {
    console.log(`[DEBUG - Onboarding] Starting acceptStaffInviteAction with token: ${token}`);
    
    const supabase = await createClient();

    const { data: tenantId, error } = await supabase.rpc('accept_tenant_invitation', {
        p_token: token
    });

    if (error) {
        console.error(`[DEBUG - Onboarding] Error accepting invite:`, error.message);
        return { error: error.message };
    }

    console.log(`[DEBUG - Onboarding] Successfully accepted invite for tenant ID: ${tenantId}`);
    revalidatePath("/", "layout");
    return { success: true, tenantId };
}

export async function claimCustomerProfileAction(customerId: string, tenantId: string) {
    console.log(`[DEBUG - Onboarding] Starting claimCustomerProfileAction for customer ${customerId} in tenant ${tenantId}`);
    
    const supabase = await createClient();
    const adminDb = getAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error("[DEBUG - Onboarding] claimCustomerProfile: No authenticated user found.");
        return { error: "Unauthorized" };
    }

    const { data: profile } = await supabase.from('users').select('phone').eq('id', user.id).single();
    if (!profile?.phone) {
        console.error("[DEBUG - Onboarding] claimCustomerProfile: User profile has no phone number attached.");
        return { error: "Phone number required to claim profiles." };
    }

    console.log(`[DEBUG - Onboarding] Found verified user phone: ${profile.phone}. Fetching shadow customer record...`);

    // Atomically link the profile using the Admin Client
    // 1. Verify the customer record actually belongs to this phone number
    const { data: customerRecord } = await adminDb
        .from('customers')
        .select('phone, user_id')
        .eq('id', customerId)
        .eq('tenant_id', tenantId)
        .single();

    if (!customerRecord) {
        console.error("[DEBUG - Onboarding] claimCustomerProfile: Customer record not found.");
        return { error: "Invalid claim request." };
    }
    
    if (customerRecord.phone !== profile.phone) {
        console.error(`[DEBUG - Onboarding] claimCustomerProfile: Phone mismatch. DB: ${customerRecord.phone} != User: ${profile.phone}`);
        return { error: "Invalid claim request. Phone number mismatch." };
    }
    
    if (customerRecord.user_id !== null) {
        console.error("[DEBUG - Onboarding] claimCustomerProfile: Customer record is already claimed by another user_id.");
        return { error: "Profile is already linked." };
    }

    console.log("[DEBUG - Onboarding] Validation passed. Updating customer record and inserting membership...");

    // 2. Update the customer record and insert the membership
    const { error: updateError } = await adminDb.from('customers').update({ user_id: user.id }).eq('id', customerId);
    if (updateError) {
        console.error("[DEBUG - Onboarding] claimCustomerProfile: Failed to update customer table.", updateError);
        return { error: "Failed to link profile to database." };
    }

    const { error: insertError } = await adminDb.from('tenant_memberships').insert({
        user_id: user.id,
        tenant_id: tenantId,
        role: 'customer'
    });
    
    if (insertError) {
        console.error("[DEBUG - Onboarding] claimCustomerProfile: Failed to insert tenant membership.", insertError);
        return { error: "Failed to generate customer membership." };
    }

    console.log("[DEBUG - Onboarding] Successfully claimed profile and added membership. Redirecting...");
    revalidatePath("/", "layout");
    return { success: true }; 
}