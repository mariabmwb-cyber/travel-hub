
"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function GmailConnectButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function connectGmail() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Please sign in to Travel Hub first.");
      }

      const response = await fetch("/api/gmail/connect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to connect Gmail.");
      }

      if (!result.authorizationUrl) {
        throw new Error("Google authorization URL is missing.");
      }

      window.location.assign(result.authorizationUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={connectGmail}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Connecting..." : "Connect Gmail"}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
