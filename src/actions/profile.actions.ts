"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateHumanProfileAction(formData: FormData) {
    console.log("[DEBUG - Profile] 🚀 Initiating profile update...");
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        console.error("[DEBUG - Profile] ❌ Auth Error: No active session found.", authError);
        return { error: "Unauthorized access." };
    }

    const fullName = formData.get("fullName") as string;
    const phone = formData.get("phone") as string;
    const avatarUrl = formData.get("avatar_url") as string | null;

    console.log(`[DEBUG - Profile] 📦 Payload for User ${user.id}:`, { fullName, phone, avatarUrl });

    // IMPORTANT: We added .select() here. 
    // Without it, Supabase won't return the updated row, making it impossible to know if it updated 0 rows.
    const { data: updatedData, error: dbError } = await supabase
        .from('users')
        .update({ 
            full_name: fullName, 
            phone: phone,
            ...(avatarUrl && { avatar_url: avatarUrl })
        })
        .eq('id', user.id)
        .select(); 

    if (dbError) {
        // This catches hard SQL errors (e.g., RLS violations, constraint failures, type mismatches)
        console.error("[DEBUG - Profile] ❌ SUPABASE DB ERROR:", JSON.stringify(dbError, null, 2));
        
        // Pass the actual database error message to the frontend so we can read it on the screen
        return { error: `Database Error: ${dbError.message}` };
    }

    if (!updatedData || updatedData.length === 0) {
        // This catches the "Silent Failure" where the trigger never created the row in the first place
        console.error("[DEBUG - Profile] ⚠️ ZERO ROWS UPDATED. The users row does not exist!");
        return { error: "Profile record missing from database. The signup trigger failed." };
    }

    console.log("[DEBUG - Profile] ✅ Database updated successfully:", updatedData);

    const { error: updateUserError } = await supabase.auth.updateUser({
        data: { full_name: fullName, phone: phone }
    });

    if (updateUserError) {
         console.error("[DEBUG - Profile] ❌ Auth Meta Update Error:", updateUserError);
    }

    revalidatePath("/", "layout");
    // redirect("/onboarding");
    return { success: true };
}