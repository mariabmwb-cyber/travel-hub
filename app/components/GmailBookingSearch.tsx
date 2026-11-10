
"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

type GmailMessage = {
  id: string;
  threadId?: string;
  subject: string;
  from: string;
  date: string;
  dateCandidates: {
    date: string;
    context: string;
  }[];
};

export default function GmailBookingSearch() {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function searchBookings() {
    setLoading(true);
    setError("");
    setSearched(false);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Please sign in to Travel Hub.");
      }

      const response = await fetch("/api/gmail/messages", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to search Gmail.");
      }

      setMessages(result.messages ?? []);
      setSearched(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Search failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={searchBookings}
        disabled={loading}
        className="rounded-lg bg-[#24483e] px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {loading ? "Searching..." : "Search bookings"}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      
{searched && (
  <div className="mt-3">
    <p className="mb-3 text-sm text-gray-600">
      Found {messages.length} matching emails
    </p>

    <div className="space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className="rounded-lg border border-gray-200 bg-white p-3 text-sm"
        >
          <p className="font-semibold text-gray-900">
            {message.subject || "No subject"}
          </p>

          <p className="mt-1 break-words text-xs text-gray-600">
            {message.from}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {message.date}
          </p>


<div className="mt-3 border-t border-gray-100 pt-2">
  <p className="mb-2 text-xs font-semibold text-gray-700">
    Dates found in email:
  </p>

  {message.dateCandidates?.length ? (
    <div className="space-y-2">
      {message.dateCandidates.map((candidate, index) => (
        <div
          key={`${candidate.date}-${index}`}
          className="rounded-md bg-gray-50 p-2"
        >
          <p className="text-xs font-semibold text-gray-900">
            {candidate.date}
          </p>
          <p className="mt-1 break-words text-xs text-gray-600">
            {candidate.context}
          </p>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-xs text-gray-500">
      No dates detected
    </p>
  )}
</div>


          <a
            href={`https://mail.google.com/mail/u/0/#all/${message.threadId ?? message.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-blue-600 underline"
          >
            Open in Gmail
          </a>
        </div>
      ))}
    </div>
  </div>
)}

    </div>
  );
}
