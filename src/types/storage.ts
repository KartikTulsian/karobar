export type UploadAssetCategory = 
  | 'product_image'  // -> tenants/{tenantId}/items/{itemId}/{uuid}.webp[cite: 1]
  | 'shop_logo'      // -> tenants/{tenantId}/branding/logo.png[cite: 1]
  | 'user_avatar'    // -> users/{userId}/avatar.jpg[cite: 1]
  | 'expense_receipt'; // -> tenants/{tenantId}/documents/{billId}.pdf[cite: 1]

// The payload your React form will send to the Next.js API Route (/api/upload/presign)
export interface PresignRequestDTO {
  filename: string;
  contentType: string; // e.g., 'image/webp' or 'application/pdf'
  category: UploadAssetCategory;
  
  // Contextual IDs needed to build the strict Cloudflare file path
  tenantId?: string; // Required for product_image, shop_logo, expense_receipt[cite: 1]
  entityId?: string; // Maps to itemId, userId, or billId depending on category[cite: 1]
}

// What the Next.js server returns to the browser
export interface PresignResponseDTO {
  uploadUrl: string; // The 60-second temporary S3 PUT URL to upload directly to R2[cite: 1]
  publicUrl: string; // The permanent string to save to Supabase[cite: 1]
  key: string;       // The raw storage path in the bucket (useful for future deletions)
}