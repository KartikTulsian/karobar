import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Create Account | Karobar",
    description: "Sign up to start managing your automotive business.",
};

export default function SignUpPage() {
    return (
        <SignUpForm />
    );
}