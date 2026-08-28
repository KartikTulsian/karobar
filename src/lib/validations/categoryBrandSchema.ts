import { z } from "zod";

export const categorySchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Category name is required"),
    slug: z.string().min(1, "Slug is required"),
    parent_id: z.string().nullable().optional().or(z.literal("")),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

export const brandSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Brand name is required"),
    logo_url: z.string().url("Must be a valid URL").nullable().optional().or(z.literal("")),
});

export type BrandFormData = z.infer<typeof brandSchema>;