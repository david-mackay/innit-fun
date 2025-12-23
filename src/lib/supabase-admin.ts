import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  // We don't throw here to avoid breaking build if envs are missing during build time,
  // but runtime usage will fail if these aren't present.
  console.warn("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
}

// Create a single supabase client for interacting with your database
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
