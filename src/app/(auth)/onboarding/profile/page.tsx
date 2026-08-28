import ProfileForm from '@/components/auth/ProfileForm';
import { createClient } from '@/lib/supabase/server';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';


export const metadata: Metadata = {
    title: "Complete Profile | Karobar",
    description: "Verify your contact details to continue.",
};

export default async function ProfilePage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        redirect("/login");
    }

    const initialName = user.user_metadata?.full_name || "";

    return (
        <ProfileForm
            initialEmail={user.email}
            initialName={initialName}
        />
    )
}
