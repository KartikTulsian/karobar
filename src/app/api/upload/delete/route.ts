import { NextRequest, NextResponse } from "next/server";
import { deleteStorageObject } from "@/lib/storage/r2";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the request
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { urls } = await req.json();

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ success: true }); // Nothing to delete
    }

    // 2. Execute R2 Deletions in parallel
    await Promise.all(
      urls.map((url) => deleteStorageObject(url))
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("[Delete API Error]:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to delete storage objects." },
      { status: 500 }
    );
  }
}