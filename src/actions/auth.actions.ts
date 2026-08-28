"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signInWithPasswordAction(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { success: false, error: error.message };
    }

    // Once signed in, we redirect to the dashboard. 
    // The middleware we build next will catch this and redirect to /onboarding if needed.
    revalidatePath("/", "layout");
    // redirect("/dashboard");
    return { success: true };
}

export async function signUpAction(formData: FormData){
    const email = formData.get("email") as string;
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
    const siteUrl = "http://127.0.0.1:3000";

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