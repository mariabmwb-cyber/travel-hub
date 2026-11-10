
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabaseServer = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

export async function getAuthenticatedUser(
  accessToken: string
) {
  const { data, error } = await supabaseServer.auth.getUser(
    accessToken
  );

  if (error || !data.user) {
    return null;
  }

  return data.user;
}
