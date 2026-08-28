import LoginForm from "@/components/auth/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign In | Karobar",
    description: "Sign in to manage your automotive business.",
};

export default function LoginPage() {
    return (
        <LoginForm />
    );
}