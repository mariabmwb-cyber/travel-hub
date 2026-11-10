
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthenticatedUser } from "../../../../lib/supabase-server";
import { signOAuthState } from "../../../../lib/gmail-oauth-state";


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


  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: "Google OAuth is not configured" },
      { status: 500 }
    );
  }

  const state = randomBytes(32).toString("hex");

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    prompt: "consent",
    state,
  });

  const response = NextResponse.json({
        authorizationUrl,
    });

  response.cookies.set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });


response.cookies.set("gmail_oauth_user", user.id, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 600,
});



const issuedAt = Date.now().toString();
const signature = signOAuthState(state, user.id, issuedAt);


response.cookies.set("gmail_oauth_signature", signature, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 600,
});



response.cookies.set("gmail_oauth_issued_at", issuedAt, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 600,
});


  return response;
}
