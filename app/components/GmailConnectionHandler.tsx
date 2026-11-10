
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function GmailConnectionHandler() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pendingId = params.get("gmail_pending");
    const gmailError = params.get("gmail_error");

    if (gmailError) {
      setMessage(`Gmail connection error: ${gmailError}`);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (!pendingId) return;

    async function confirmConnection() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Please sign in to Travel Hub.");
        }

        const response = await fetch("/api/gmail/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ pendingId }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Gmail connection failed.");
        }

        setMessage(`Gmail connected: ${result.googleEmail}`);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Connection failed."
        );
      } finally {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }

    confirmConnection();
  }, []);

  if (!message) return null;

  return (
    <p className="mt-2 text-sm text-[#24483e]">
      {message}
    </p>
  );
}
