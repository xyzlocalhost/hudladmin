import { createClient } from "@supabase/supabase-js";
import { requireEnv, supabaseUrl } from "./env";

/** Secret-key client for agent enroll/heartbeat. Server-only — never ship to the browser. */
export function createAdminClient() {
  return createClient(supabaseUrl(), requireEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
