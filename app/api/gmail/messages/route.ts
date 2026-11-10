
import "server-only";

import { NextResponse } from "next/server";
import { google } from "googleapis";

import { getAuthenticatedUser } from "../../../../lib/supabase-server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { decryptGmailToken } from "../../../../lib/gmail-encryption";
import { extractGmailText } from "../../../../lib/gmail-message-parser";
import { findBookingDates } from "../../../../lib/booking-dates";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const user = await getAuthenticatedUser(
    authorization.slice(7)
  );

  if (!user) {
    return NextResponse.json(
      { error: "Invalid session" },
      { status: 401 }
    );
  }

  const { data: connection, error } = await supabaseAdmin
    .from("gmail_connections")
    .select("encrypted_refresh_token")
    .eq("user_id", user.id)
    .single();

  if (error || !connection?.encrypted_refresh_token) {
    return NextResponse.json(
      { error: "Gmail is not connected" },
      { status: 404 }
    );
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: decryptGmailToken(
        connection.encrypted_refresh_token
      ),
    });

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    const result = await gmail.users.messages.list({
      userId: "me",
      q: "category:travel OR subject:(booking confirmation reservation itinerary)",
      maxResults: 50,
    });


const messages = await Promise.all(
  (result.data.messages ?? []).map(async (message) => {
    const details = await gmail.users.messages.get({
  userId: "me",
  id: message.id!,
  format: "full",
});

    const headers = details.data.payload?.headers ?? [];

    function getHeader(name: string) {
      return (
        headers.find(
          (header) =>
            header.name?.toLowerCase() === name.toLowerCase()
        )?.value ?? ""
      );
    }

  
const emailText = extractGmailText(details.data.payload);

const dateCandidates = findBookingDates(
  `${getHeader("Subject")}\n${emailText}`
);

return {
  id: message.id,
  threadId: message.threadId,
  subject: getHeader("Subject"),
  from: getHeader("From"),
  date: getHeader("Date"),
  dateCandidates: dateCandidates.slice(0, 10),
};

  })
);

return NextResponse.json({ messages });

  } catch (error) {
    console.error("Gmail reading failed:", error);

    return NextResponse.json(
      { error: "Failed to read Gmail messages" },
      { status: 500 }
    );
  }
}
