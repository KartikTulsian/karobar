import { z } from "zod";

export const teamMemberSchema = z.object({
    email: z.string()
        .min(1, "Email is required")
        .email("Please enter a valid email address"),
    role: z.enum(["manager", "staff"], {
        error: "Please select a role for this team member",
    }),
});

export type TeamMemberFormData = z.infer<typeof teamMemberSchema>;