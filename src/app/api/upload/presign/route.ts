import { NextRequest, NextResponse } from "next/server";
import { generateUploadUrl } from "@/lib/storage/r2";
import { PresignRequestDTO } from "@/types/storage";
import { createClient } from "@/lib/supabase/server"; // Adjust path to your Supabase server client

export async function POST(req: NextRequest) {
  try {
    // 1. Verify User Session via Supabase Auth
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate Payload
    const body: PresignRequestDTO = await req.json();
    const { filename, contentType, category, tenantId, entityId } = body;

    if (!filename || !contentType || !category) {
      return NextResponse.json(
        { error: "Missing required upload parameters." },
        { status: 400 }
      );
    }

    let targetEntityId = entityId;
    if (category === "user_avatar" && !entityId) {
      targetEntityId = user.id;
    }

    // 3. Generate the presigned URL
    const presignData = await generateUploadUrl(
      category,
      contentType,
      tenantId,
      targetEntityId, // Fallback to current user ID for avatars
      filename
    );

    return NextResponse.json(presignData, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to generate upload URL.";
    console.error("[Presign API Error]:", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}