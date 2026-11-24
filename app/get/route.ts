import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseUrl } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "agent-releases";
const OBJECT_PATH = "latest/NDASign.exe";
const DOWNLOAD_NAME = "NDASign.exe";

/**
 * Clean distribution link — no .exe in the URL.
 * Share: https://hudladmin.vercel.app/get
 * Browser downloads NDASign.exe via Supabase Storage.
 */
export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(OBJECT_PATH, 60 * 60, { download: DOWNLOAD_NAME });

    if (!error && data?.signedUrl) {
      return NextResponse.redirect(data.signedUrl, 302);
    }

    // Fallback: public object URL with download hint (bucket is public).
    const publicUrl = new URL(
      `/storage/v1/object/public/${BUCKET}/${OBJECT_PATH}`,
      supabaseUrl(),
    );
    publicUrl.searchParams.set("download", DOWNLOAD_NAME);
    return NextResponse.redirect(publicUrl.toString(), 302);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Download unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
