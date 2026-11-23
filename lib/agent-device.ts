import { NextRequest, NextResponse } from "next/server";
import { hashToken, safeEqual } from "@/lib/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthenticatedDevice = {
  deviceId: string;
  admin: ReturnType<typeof createAdminClient>;
};

/** Verify device id + token headers. Returns device context or an error Response. */
export async function authenticateAgentDevice(
  req: NextRequest,
): Promise<AuthenticatedDevice | NextResponse> {
  const deviceId = req.headers.get("x-hudl-device-id") ?? "";
  const token = req.headers.get("x-hudl-device-token") ?? "";
  if (!deviceId || !token) {
    return NextResponse.json({ error: "Missing device credentials" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: tokRow, error: tokErr } = await admin
    .from("device_tokens")
    .select("token_hash")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (tokErr) throw tokErr;
  if (!tokRow?.token_hash || !safeEqual(tokRow.token_hash, hashToken(token))) {
    return NextResponse.json({ error: "Invalid device token" }, { status: 401 });
  }

  return { deviceId, admin };
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
