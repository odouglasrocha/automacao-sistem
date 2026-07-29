import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://pattfqziunpslpncgjsx.supabase.co";
const key =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  "sb_publishable_H_P7c-wuId_FTvCNr4FYww_wvAfhZGZ";

// Opaque publishable keys (sb_publishable_...) are not JWTs. The client
// still works — it sends the key via the `apikey` header — but never send
// it as a Bearer to PostgREST manually.
export const supabase: SupabaseClient = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "ics-auth",
  },
});

export type AppRole = "admin" | "supervisor" | "operador" | "visitante";