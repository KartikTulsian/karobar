import { z } from "zod";

const phoneRegex = /^\d{10}$/;

export const profileSchema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters long."),
    country_code: z.string().default("+91"),
    phone: z.string().regex(phoneRegex, "Phone number must be exactly 10 digits."),
    avatar_url: z.string().optional().nullable(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;