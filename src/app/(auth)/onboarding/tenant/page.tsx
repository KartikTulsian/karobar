import TenantCreateForm from "@/components/auth/TenantCreateForm";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Register Business | Karobar",
    description: "Set up your shop details to start billing.",
};

export default function TenantCreationPage() {
    return (
        <TenantCreateForm />
    );
}