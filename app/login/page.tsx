
"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (error) throw error;

        if (data.session) {
          window.location.href = "/";
        } else {
          setMessage(
            "Registration started. Check your email for a confirmation link."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        window.location.href = "/";
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f2] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[#e8e9e3] bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 text-4xl">✈️</div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#24483e]">
            Travel Hub
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Your journeys, all in one place.
          </p>
        </div>

        <h2 className="mb-5 text-xl font-semibold text-gray-800">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#789487]"
              placeholder="you@example.com"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Password
            <input
              type="password"
              required
              minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#789487]"
              placeholder="At least 6 characters"
            />
          </label>

          {message && (
            <p
              role="status"
              className="rounded-xl bg-[#f1f5f0] p-3 text-sm text-[#315746]"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#24483e] px-4 py-3 font-medium text-white transition hover:bg-[#19372f] disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : isSignUp
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {isSignUp ? "Already have an account?" : "New to Travel Hub?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage("");
            }}
            className="font-medium text-[#315746] underline underline-offset-4"
          >
            {isSignUp ? "Sign in" : "Create account"}
          </button>
        </p>
      </div>
    </main>
  );
}
