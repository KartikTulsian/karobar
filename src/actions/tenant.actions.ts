"use server";

import { createClient } from "@/lib/supabase/server";
import { ActiveTenantContext } from "@/types/people";
import { revalidatePath } from "next/cache";

export async function createBusinessAccountAction(formData: FormData) {
    console.log("[Server Action] Starting createBusinessAccountAction...");
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.log("[Server Action] Error: Unauthorized access.");
            return { error: "Unauthorized access." };
        }

        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const country_code = formData.get("country_code") as string;
        const phone = formData.get("phone") as string;

        const gstin = formData.get("gstin") as string;
        const stateCode = formData.get("state_code") as string;

        const address = formData.get("address") as string;
        const city = formData.get("city") as string;
        const pincode = formData.get("pincode") as string;
        const country = formData.get("country") as string;
        // const logoUrl = formData.get("logo_url") as string | null;

        // Generate a URL-safe slug
        const baseSlug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
        const slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;

        console.log(`[Server Action] Executing RPC for slug: ${slug}`);

        // Call the Postgres RPC to ensure atomic insertion into both tenants and tenant_memberships
        const { data: tenantId, error: rpcError } = await supabase.rpc('create_tenant_with_owner', {
            p_name: name,
            p_slug: slug,
            p_email: email || null,
            p_gstin: gstin || null,
            p_state_code: stateCode || null,
            p_address: address || null,
            p_city: city || null,
            p_pincode: pincode || null,
            p_country: country || 'India',
            p_country_code: country_code || '+91',
            p_phone: phone || null
        });

        if (rpcError || !tenantId) {
            console.error("[Server Action] RPC Error:", rpcError?.message);
            return { error: rpcError?.message || "Failed to create business account." };
        }

        console.log(`[Server Action] Tenant created successfully with ID: ${tenantId}`);

        // if (logoUrl) {
        //     await supabase.from('tenants').update({ logo_url: logoUrl }).eq('id', tenantId);
        // }

        revalidatePath("/", "layout");

        const safeTenantId = String(tenantId);

        // Format the response to match your ActiveTenantContext interface
        const activeTenant: ActiveTenantContext = {
            tenantId: safeTenantId,
            slug: slug,
            name: name,
            businessName: name, // Alias for UI compatibility
            role: 'owner',
            gstin: gstin || null,
            logoUrl: null,
            plan: 'free',
        };

        return { success: true, tenant: activeTenant };
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.error("[Server Action] Exception in createBusinessAccountAction:", err.message);
            return { error: err.message };
        }
        return { error: "An unexpected error occurred." };
    }
}

export async function updateTenantLogoAction(tenantId: string, logoUrl: string) {
    console.log(`[Server Action] Starting updateTenantLogoAction for tenant: ${tenantId}`);
    
    try {
        if (!tenantId || !logoUrl) {
            console.log("[Server Action] Validation Failed: Missing tenantId or logoUrl.");
            return { error: "Missing required parameters." };
        }

        const supabase = await createClient();
        const { error } = await supabase
            .from('tenants')
            .update({ logo_url: logoUrl })
            .eq('id', tenantId);

        if (error) {
            console.error("[Server Action] Supabase Update Error:", error.message);
            return { error: "Failed to save logo to database: " + error.message };
        }
        
        console.log("[Server Action] Logo updated successfully in database.");
        return { success: true };
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.error("[Server Action] Exception in updateTenantLogoAction:", err.message);
            return { error: err.message };
        }
        return { error: "An unexpected error occurred." };
    }
}