import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { UploadAssetCategory, PresignResponseDTO } from "@/types/storage";

const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

/**
 * Builds the strict tenant-isolated object key in R2
 */

export function buildStorageKey(
    category: UploadAssetCategory,
    tenantId?: string,
    entityId?: string,
    fileName?: string
): string {
    const extension = fileName?.split(".").pop() || "webp";
    const fileUuid = crypto.randomUUID();

    switch (category) {
        case "product_image":
            if (!tenantId || !entityId) {
                throw new Error("Product images require both tenantId and itemId.");
            }
            return `tenants/${tenantId}/items/${entityId}/${fileUuid}.${extension}`;

        case "shop_logo":
            if (!tenantId) {
                throw new Error("Shop logos require a tenantId.");
            }
            return `tenants/${tenantId}/branding/logo.${extension}`;

        case "expense_receipt":
            if (!tenantId || !entityId) {
                throw new Error("Expense receipts require both tenantId and billId.");
            }
            return `tenants/${tenantId}/documents/${entityId}.${extension}`;

        case "user_avatar":
            if (!entityId) {
                throw new Error("User avatars require a userId.");
            }
            return `users/${entityId}/avatar.${extension}`;

        default:
            throw new Error(`Unsupported upload category: ${category}`);
    }
}

/**
 * Generates a signed PUT URL for direct-to-R2 upload
 */
export async function generateUploadUrl(
  category: UploadAssetCategory,
  contentType: string,
  tenantId?: string,
  entityId?: string,
  fileName?: string
): Promise<PresignResponseDTO> {
  const key = buildStorageKey(category, tenantId, entityId, fileName);

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });

  // Generate 60-second temporary signed PUT URL
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
  const publicUrl = `${process.env.NEXT_PUBLIC_CDN_URL}/${key}`;

  return {
    uploadUrl,
    publicUrl,
    key,
  };
}

/**
 * Extracts the raw Cloudflare Object Key from your public CDN URL
 * Example: "https://pub-xxx.r2.dev/tenants/123/items/456/uuid.webp" -> "tenants/123/items/456/uuid.webp"
 */
export function extractKeyFromUrl(publicUrl: string): string | null {
  try {
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || "";
    if (!publicUrl.startsWith(cdnUrl)) return null;
    
    // Remove the CDN base URL and the leading slash to get the exact bucket key
    return publicUrl.replace(cdnUrl + "/", "");
  } catch (error) {
    return null;
  }
}

/**
 * Deletes a single object from the Cloudflare R2 bucket
 */
export async function deleteStorageObject(publicUrl: string) {
  const key = extractKeyFromUrl(publicUrl);
  if (!key) return;

  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });

  await s3Client.send(command);
}