"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signInWithPasswordAction(formData: FormData) {
    const email = (formData.get("email") as string).trim().toLowerCase();
    const password = formData.get("password") as string;
    const supabase = await createClient();

    console.log(`[Auth Action Debug] Attempting password sign-in for: ${email}`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    // if (error) {
    //     return { success: false, error: error.message };
    // }

    if (error) {
        console.error(`[Auth Action Debug] Sign-in failed: ${error.message}`);
        // Hint for the frontend to show an OAuth warning
        if (error.message.includes("Invalid login credentials")) {
            return { success: false, error: "Invalid credentials. If you signed up with Google, use the 'Forgot Password' link to set a password." };
        }
        return { success: false, error: error.message };
    }

    console.log(`[Auth Action Debug] Sign-in successful for user: ${data.user?.id}`);
    revalidatePath("/", "layout");
    return { success: true };
}

export async function signUpAction(formData: FormData){
    const email = (formData.get("email") as string).trim().toLowerCase();
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },

        },
    });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    // redirect("/dashboard");
    return { success: true };
}

export async function signOutAction() {
    const supabase = await  createClient();
    await supabase.auth.signOut();

    revalidatePath("/", "layout");
    // redirect("/login");
    return { success: true };
}

export async function signInWithOAuthAction(provider: 'google' | 'github') {
    const supabase = await createClient();
    // const origin = (await headers()).get("origin") || "http://localhost:3000";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) throw new Error("Missing NEXT_PUBLIC_SITE_URL environment variable.");

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
            // This is where we tell Supabase to send the user AFTER they log in with Google
            redirectTo: `${siteUrl}/callback?next=/onboarding`,
        },
    });

    if (error) {
        console.error("OAuth Action Error:", error.message);
        return { error: error.message };
    }

    // Redirect the user to the Google/GitHub login page
    if (data.url) {
        redirect(data.url);
    }
}

export async function requestPasswordResetAction(formData: FormData) {
    const email = (formData.get("email") as string).trim();
    const supabase = await createClient();
    
    // In production, use your actual domain (e.g., process.env.NEXT_PUBLIC_SITE_URL)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) throw new Error("Missing NEXT_PUBLIC_SITE_URL environment variable.");
    console.log(`[Auth Action Debug] Requesting password reset for: ${email}`);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/callback?next=/update-password`, // Where they land after clicking the email link
    });

    if (error) {
        console.error(`[Auth Action Debug] Reset request failed: ${error.message}`);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function updatePasswordAction(formData: FormData) {
    const password = formData.get("password") as string;
    const supabase = await createClient();

    console.log(`[Auth Action Debug] Updating password for authenticated user`);

    // updateUser automatically updates the password for the currently logged-in user
    // (Clicking the reset link creates a temporary secure session)
    const { error } = await supabase.auth.updateUser({
        password: password
    });

    if (error) {
         console.error(`[Auth Action Debug] Password update failed: ${error.message}`);
         return { success: false, error: error.message };
    }

    return { success: true };
}