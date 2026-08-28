import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().min(1, "Email is required").email("Please enter a valid email address."),
    password: z.string().min(6, "Password must be at least 6 characters long."),
    rememberMe: z.boolean().default(false).optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signUpSchema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters."),
    email: z.string().min(1, "Email is required").email("Please enter a valid email address."),
    password: z.string().min(6, "Password must be at least 6 characters long."),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;