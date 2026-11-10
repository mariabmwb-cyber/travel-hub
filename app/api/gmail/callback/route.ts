
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { verifyOAuthState } from "../../../../lib/gmail-oauth-state";
import { google } from "googleapis";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { encryptGmailToken } from "../../../../lib/gmail-encryption";


export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const googleError = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const savedState = request.cookies.get(
    "gmail_oauth_state"
  )?.value;

  const savedUserId = request.cookies.get(
    "gmail_oauth_user"
  )?.value;

const savedSignature = request.cookies.get(
  "gmail_oauth_signature"
)?.value;

const issuedAt = request.cookies.get(
  "gmail_oauth_issued_at"
)?.value;
  
function finishOAuth(error?: string) {
  const destination = new URL("/", request.url);

  if (error) {
    destination.searchParams.set("gmail_error", error);
  }

  const response = NextResponse.redirect(destination);

  response.cookies.delete("gmail_oauth_state");
  response.cookies.delete("gmail_oauth_user");
  response.cookies.delete("gmail_oauth_signature");
  response.cookies.delete("gmail_oauth_issued_at");

  return response;
}


  if (googleError) {
    return finishOAuth("google_denied");
  }

  if (
  !code ||
  !returnedState ||
  !savedState ||
  !savedUserId ||
  !savedSignature ||
  !issuedAt
) {
    return finishOAuth("missing_oauth_data");
  }

  const received = Buffer.from(returnedState);
  const expected = Buffer.from(savedState);

  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return finishOAuth("invalid_state");
  }


if (
  !verifyOAuthState(
    savedState,
    savedUserId,
    issuedAt,
    savedSignature
  )
) {
  return finishOAuth("invalid_signature");
}



  
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

if (!clientId || !clientSecret || !redirectUri) {
  return finishOAuth("google_not_configured");
}

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUri
);

try {
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    return finishOAuth("missing_refresh_token");
  }

  
oauth2Client.setCredentials(tokens);

const gmail = google.gmail({
  version: "v1",
  auth: oauth2Client,
});

const profile = await gmail.users.getProfile({
  userId: "me",
});

const googleEmail = profile.data.emailAddress;

if (!googleEmail) {
  return finishOAuth("gmail_profile_missing");
}


const encryptedToken = encryptGmailToken(
  tokens.refresh_token
);


const { data: pendingConnection, error: saveError } =
  await supabaseAdmin
    .from("gmail_oauth_pending")
    .insert({
      user_id: savedUserId,
      encrypted_refresh_token: encryptedToken,
      google_email: googleEmail,
    })
    .select("id")
    .single();


if (saveError) {
  console.error("Failed to save pending Gmail connection:", saveError);
  return finishOAuth("pending_save_failed");
}


if (!pendingConnection) {
  return finishOAuth("pending_connection_missing");
}

const destination = new URL("/", request.url);
destination.searchParams.set(
  "gmail_pending",
  pendingConnection.id
);

const response = finishOAuth();
response.headers.set("Location", destination.toString());

return response;



} catch (error) {
  console.error("Google OAuth token exchange failed:", error);
  return finishOAuth("token_exchange_failed");
}


  return finishOAuth("gmail_connection_pending");
}
