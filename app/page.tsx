
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Trip = {
  id: string;
  destination: string;
  country: string;
  dates: string;
  status: "upcoming" | "past";
  emoji: string;
  color: string;
  details: string;
};

const initialTrips: Trip[] = [
  {
    id: "milan",
    destination: "Milan",
    country: "Italy",
    dates: "19–21 November 2026",
    status: "upcoming",
    emoji: "🇮🇹",
    color: "from-amber-100 to-orange-50",
    details: "Museums, fashion & Italian food",
  },
  {
    id: "verona",
    destination: "Verona",
    country: "Italy",
    dates: "2027 · Dates to be confirmed",
    status: "upcoming",
    emoji: "🎵",
    color: "from-rose-100 to-pink-50",
    details: "Sting concert",
  },
];

export default function Home() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All trips");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null); 
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
  destination: "",
  country: "",
  dates: "",
  details: "",
  });

  useEffect(() => {
  async function loadTrips() {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const userId = sessionData.session.user.id;

    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load trips:", error.message);
      alert("Could not load trips. Please check the connection and try again.");
      setIsLoadingTrips(false);
      return;
    }
console.log("Trips loaded from Supabase:", data);

    const loadedTrips: Trip[] = (data ?? []).map((trip) => ({
      id: trip.id,
      destination: trip.destination,
      country: trip.country,
      dates:
        trip.date_label ||
        (trip.start_date && trip.end_date
           ? `${trip.start_date} – ${trip.end_date}`
           : "Dates to be confirmed"),
      status: trip.status,
      emoji: trip.emoji || "✈️",
      color: trip.color || "from-sky-100 to-blue-50",
      details: trip.details || "",
    }));

    setTrips(loadedTrips);
    setIsLoadingTrips(false);
  }

  loadTrips();
}, []);



  const visibleTrips = useMemo(() => {
    return trips.filter((trip) => {
      const matchesSearch =
        `${trip.destination} ${trip.country} ${trip.details}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesFilter =
        filter === "All trips" || trip.status === filter.toLowerCase();

      return matchesSearch && matchesFilter;
    });
  }, [trips, search, filter]);

if (isLoadingTrips) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f2]">
      <p className="text-[#24483e]">Loading your trips...</p>
    </main>
  );
}
  
function addTrip() {
  setEditingId(null);
  setForm({
    destination: "",
    country: "",
    dates: "",
    details: "",
  });
  setSelectedTrip(null);
  setIsEditing(true);
}

function startEdit(trip: Trip) {
  setEditingId(trip.id);
  setForm({
    destination: trip.destination,
    country: trip.country,
    dates: trip.dates,
    details: trip.details,
  });
  setSelectedTrip(null);
  setIsEditing(true);
}


async function saveTrip() {
  const destination = form.destination.trim();
  const country = form.country.trim();

  if (!destination || !country) {
    alert("Please enter a destination and country.");
    return;
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError || !sessionData.session) {
    alert("Please sign in again.");
    window.location.href = "/login";
    return;
  }

  const userId = sessionData.session.user.id;

  if (editingId !== null) {
    const { data, error } = await supabase
      .from("trips")
      .update({
        destination,
        country,
        date_label: form.dates,
        details: form.details,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Could not update trip:", error.message);
      alert("Could not save changes: " + error.message);
      return;
    }

    setTrips((current) =>
      current.map((trip) =>
        trip.id === editingId
          ? {
              ...trip,
              destination: data.destination,
              country: data.country,
              dates: data.date_label || "Dates to be confirmed",
              details: data.details || "",
            }
          : trip
      )
    );
  } else {
    const { data, error } = await supabase
      .from("trips")
      .insert({
        user_id: userId,
        destination,
        country,
        date_label: form.dates,
        details: form.details,
        status: "upcoming",
        emoji: "✈️",
        color: "from-sky-100 to-blue-50",
      })
      .select()
      .single();

    if (error) {
      console.error("Could not create trip:", error.message);
      alert("Could not save trip: " + error.message);
      return;
    }

    const newTrip: Trip = {
      id: data.id,
      destination: data.destination,
      country: data.country,
      dates: data.date_label || "Dates to be confirmed",
      status: data.status,
      emoji: data.emoji || "✈️",
      color: data.color || "from-sky-100 to-blue-50",
      details: data.details || "",
    };

    setTrips((current) => [newTrip, ...current]);
  }

  setIsEditing(false);
  setEditingId(null);
}

async function deleteTrip(trip: Trip) {
  const confirmed = window.confirm(
    `Delete the trip to ${trip.destination}?`
  );

  if (!confirmed) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;

  if (!userId) {
    alert("Please sign in again.");
    window.location.href = "/login";
    return;
  }

  const { error } = await supabase
    .from("trips")
    .delete()
    .eq("id", trip.id)
    .eq("user_id", userId);

  if (error) {
    console.error("Could not delete trip:", error.message);
    alert("Could not delete trip: " + error.message);
    return;
  }

  setTrips((current) =>
    current.filter((item) => item.id !== trip.id)
  );

  setSelectedTrip(null);
}
  
  

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#202b27]">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[#e8e9e3] bg-white px-6 py-8 md:flex">
          <a href="#" className="mb-12 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#24483e] text-xl text-white">
              ↗
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight">
                travel hub
              </span>
              <span className="text-xs text-gray-500">
                Your personal travel space
              </span>
            </span>
          </a>

          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
            Workspace
          </p>

          <button className="flex items-center gap-3 rounded-xl bg-[#edf2ed] px-4 py-3 text-left font-medium text-[#24483e]">
            <span>▦</span> My trips
          </button>
          <div className="mt-2 flex items-center gap-3 rounded-xl px-4 py-3 text-gray-500">
            <span>▤</span> Calendar
            <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs">
              Soon
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-gray-500">
            <span>✉</span> Bookings
            <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs">
              Soon
            </span>
          </div>

          <div className="mt-auto rounded-2xl bg-[#f7f7f4] p-4">
            <div className="mb-2 text-xl">🌍</div>
            <p className="text-sm font-semibold">Your journeys, together</p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Trips, plans and reservations in one place.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
          <header className="mb-10 flex items-center justify-between gap-4">
            <div className="md:hidden">
              <p className="text-lg font-semibold">↗ travel hub</p>
            </div>
            <div className="hidden md:block">
              <p className="text-sm text-gray-500">YOUR PERSONAL TRAVEL PLANNER</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Welcome to your hub
              </h1>
            </div>
            <button
              onClick={addTrip}
              className="shrink-0 rounded-xl bg-[#24483e] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#19372f]"
            >
              <span className="mr-2">＋</span> Add trip
            </button>
          </header>

          <div className="mb-10 overflow-hidden rounded-3xl bg-[#24483e] px-6 py-8 text-white sm:px-9 sm:py-10">
            <div className="max-w-xl">
              <p className="text-sm font-medium text-[#c9d9ce]">
                A LITTLE MORE EXPLORATION
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                The world is yours
                <br />
                to discover.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-[#d8e3dc]">
                Keep every destination, plan and booking together. Your next
                adventure starts here.
              </p>
            </div>
            <div className="mt-7 flex gap-2 text-3xl" aria-hidden="true">
              <span>✈️</span><span>🗺️</span><span>☀️</span>
            </div>
          </div>

          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">My trips</h2>
              <p className="mt-1 text-sm text-gray-500">
                All your adventures, in one place.
              </p>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                ⌕
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search destinations..."
                aria-label="Search trips"
                className="w-full rounded-xl border border-[#e4e5df] bg-white py-3 pl-9 pr-4 text-sm outline-none transition focus:border-[#789487] sm:w-64"
              />
            </div>
          </div>

          <div className="mb-6 flex gap-2">
            {["All trips", "Upcoming", "Past"].map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  filter === item
                    ? "bg-[#24483e] text-white"
                    : "bg-white text-gray-600 ring-1 ring-[#e8e9e3] hover:bg-gray-50"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <p className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-gray-400">
            {visibleTrips.length} {visibleTrips.length === 1 ? "trip" : "trips"}
          </p>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleTrips.map((trip) => (
              <button
                key={trip.id}
                onClick={() => setSelectedTrip(trip)}
                className="group overflow-hidden rounded-2xl border border-[#e8e9e3] bg-white text-left transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div
                  className={`flex h-36 items-center justify-center bg-gradient-to-br ${trip.color}`}
                >
                  <span className="text-6xl transition group-hover:scale-110">
                    {trip.emoji}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold">{trip.destination}</h3>
                      <p className="mt-1 text-sm text-gray-500">{trip.country}</p>
                    </div>
                    <span className="rounded-full bg-[#edf2ed] px-2.5 py-1 text-xs font-medium text-[#315746]">
                      {trip.status === "upcoming" ? "Upcoming" : "Past"}
                    </span>
                  </div>
                  <div className="mt-5 border-t border-[#eeeeea] pt-4">
                    <p className="text-sm">▦ &nbsp;{trip.dates}</p>
                    <p className="mt-2 text-sm text-gray-500">{trip.details}</p>
                  </div>
                  <div className="mt-5 flex items-center justify-between text-sm font-medium text-[#315746]">
                    View trip <span>↗</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {visibleTrips.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <p className="text-lg font-medium">No trips found</p>
              <p className="mt-2 text-sm text-gray-500">
                Try another search or add a new trip.
              </p>
            </div>
          )}

          <footer className="mt-12 border-t border-[#e8e9e3] py-5 text-xs text-gray-400">
            Travel Hub · Your journeys, one place.
          </footer>
        </section>
      </div>

      {selectedTrip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedTrip(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="trip-title"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between">
              <span className="text-4xl">{selectedTrip.emoji}</span>
              <button
                onClick={() => setSelectedTrip(null)}
                aria-label="Close trip details"
                className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 hover:bg-gray-200"
              >
                ✕
              </button>
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Trip details
            </p>
            <h2 id="trip-title" className="mt-2 text-3xl font-semibold">
              {selectedTrip.destination}
            </h2>
            <p className="mt-1 text-gray-500">{selectedTrip.country}</p>
            <div className="mt-6 rounded-2xl bg-[#f7f7f4] p-4">
              <p className="text-sm text-gray-500">Dates</p>
              <p className="mt-1 font-medium">{selectedTrip.dates}</p>
              <p className="mt-4 text-sm text-gray-500">Plans</p>
              <p className="mt-1 font-medium">{selectedTrip.details}</p>
            </div>
            <p className="mt-5 text-sm leading-6 text-gray-500">
              This is your first preview. We’ll add editable trip details,
              itineraries, calendar events and booking imports in the next steps.
            </p>
            
            <div className="mt-6 flex gap-3">
            <button
              onClick={() => startEdit(selectedTrip)}
              className="flex-1 rounded-xl border border-[#dce3dc] px-4 py-3 font-medium text-[#24483e] hover:bg-[#f7f7f4]"
            >
              Edit trip
            </button>

            <button
              onClick={() => deleteTrip(selectedTrip)}
              className="rounded-xl border border-red-200 px-4 py-3 font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
            </div>

            <button
              onClick={() => setSelectedTrip(null)}
              className="mt-6 w-full rounded-xl bg-[#24483e] px-4 py-3 font-medium text-white hover:bg-[#19372f]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveTrip();
            }}
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  YOUR JOURNEY
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {editingId === null ? "Add a trip" : "Edit trip"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 hover:bg-gray-200"
                aria-label="Close form"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium">
                Destination *
                <input
                  required
                  value={form.destination}
                  onChange={(event) =>
                    setForm({ ...form, destination: event.target.value })
                  }
                  placeholder="e.g. Rome"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal outline-none focus:border-[#789487]"
                />
              </label>

              <label className="block text-sm font-medium">
                Country *
                <input
                  required
                  value={form.country}
                  onChange={(event) =>
                    setForm({ ...form, country: event.target.value })
                  }
                  placeholder="e.g. Italy"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal outline-none focus:border-[#789487]"
                />
              </label>

              <label className="block text-sm font-medium">
                Dates
                <input
                  value={form.dates}
                  onChange={(event) =>
                    setForm({ ...form, dates: event.target.value })
                  }
                  placeholder="e.g. 10–14 December 2026"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal outline-none focus:border-[#789487]"
                />
              </label>

              <label className="block text-sm font-medium">
                Plans and notes
                <textarea
                  value={form.details}
                  onChange={(event) =>
                    setForm({ ...form, details: event.target.value })
                  }
                  placeholder="Museums, restaurants, events..."
                  rows={3}
                  className="mt-2 w-full resize-y rounded-xl border border-gray-200 px-4 py-3 font-normal outline-none focus:border-[#789487]"
                />
              </label>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#24483e] px-5 py-3 text-sm font-medium text-white hover:bg-[#19372f]"
              >
                Save trip
              </button>
            </div>
          </form>
        </div>
      )}

    </main>
  );
}
