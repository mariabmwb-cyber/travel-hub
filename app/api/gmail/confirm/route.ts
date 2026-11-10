
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/supabase-server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const accessToken = authorization.slice(7);
  const user = await getAuthenticatedUser(accessToken);

  if (!user) {
    return NextResponse.json(
      { error: "Invalid or expired session" },
      { status: 401 }
    );
  }

  
let body: { pendingId?: string };

try {
  body = await request.json();
} catch {
  return NextResponse.json(
    { error: "Invalid request body" },
    { status: 400 }
  );
}

const pendingId = body?.pendingId;

if (
  typeof pendingId !== "string" ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pendingId)
) {
  return NextResponse.json(
    { error: "Invalid pending connection ID" },
    { status: 400 }
  );
}

const { data: pending, error } = await supabaseAdmin
  .from("gmail_oauth_pending")
  .select("id, user_id, google_email, encrypted_refresh_token, expires_at")
  .eq("id", pendingId)
  .eq("user_id", user.id)
  .gt("expires_at", new Date().toISOString())
  .maybeSingle();

if (error) {
  console.error("Failed to verify pending Gmail connection:", error);

  return NextResponse.json(
    { error: "Failed to verify Gmail connection" },
    { status: 500 }
  );
}

if (!pending) {
  return NextResponse.json(
    { error: "Connection not found or expired" },
    { status: 404 }
  );
}


const { error: saveError } = await supabaseAdmin
  .from("gmail_connections")
  .upsert({
    user_id: user.id,
    google_email: pending.google_email,
    encrypted_refresh_token: pending.encrypted_refresh_token,
    updated_at: new Date().toISOString(),
  });

if (saveError) {
  console.error("Failed to save Gmail connection:", saveError);

  return NextResponse.json(
    { error: "Failed to save Gmail connection" },
    { status: 500 }
  );
}

const { error: deleteError } = await supabaseAdmin
  .from("gmail_oauth_pending")
  .delete()
  .eq("id", pending.id)
  .eq("user_id", user.id);

if (deleteError) {
  console.error("Failed to delete pending connection:", deleteError);
}

return NextResponse.json({
  connected: true,
  googleEmail: pending.google_email,
});


}
