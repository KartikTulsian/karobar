export async function uploadFilesClient(
  files: File[],
  category: string,
  tenantId: string,
  entityId: string
): Promise<string[]> {
  const uploadedUrls: string[] = [];

  for (const file of files) {
    // 1. Get the Presigned URL from your existing Next.js route
    const res = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        category,
        tenantId,
        entityId,
      }),
    });

    if (!res.ok) throw new Error("Failed to get presigned URL");
    const { uploadUrl, publicUrl } = await res.json();

    // 2. Upload the file directly to Cloudflare R2
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadRes.ok) throw new Error("Failed to upload file to Cloudflare");

    // 3. Store the final public URL
    uploadedUrls.push(publicUrl);
  }

  return uploadedUrls;
}