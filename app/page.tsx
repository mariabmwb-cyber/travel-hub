
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

type Booking = {
  id: string;
  trip_id: string;
  booking_type:
    | "flight"
    | "hotel"
    | "train"
    | "bus"
    | "car_rental"
    | "transfer"
    | "ferry"
    | "other";
  title: string;
  provider: string | null;
  confirmation_number: string | null;
  status: "planned" | "confirmed" | "cancelled" | "completed";
  start_at: string | null;
  end_at: string | null;
  location: string | null;
  departure_location: string | null;
  arrival_location: string | null;
  price: number | null;
  currency: string | null;
  notes: string | null;
  source_url: string | null;
};

type TripEvent = {
  id: string;
  trip_id: string;
  title: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  url: string | null;
  source_type: "manual" | "google_calendar";
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [tripEvents, setTripEvents] = useState<TripEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    event_date: "",
    start_time: "",
    end_time: "",
    location: "",
    notes: "",
    url: "",
  });
  const [isAddingBooking, setIsAddingBooking] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [isSavingBooking, setIsSavingBooking] = useState(false);

  const [bookingForm, setBookingForm] = useState({
  booking_type: "flight" as Booking["booking_type"],
  title: "",
  provider: "",
  confirmation_number: "",
  status: "confirmed" as Booking["status"],
  start_at: "",
  end_at: "",
  location: "",
  departure_location: "",
  arrival_location: "",
  price: "",
  currency: "EUR",
  notes: "",
  source_url: "",
    });
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

useEffect(() => {
  async function loadBookings() {
    if (!selectedTrip) {
      setBookings([]);
      return;
    }

    setIsLoadingBookings(true);

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("trip_id", selectedTrip.id)
      .order("start_at", { ascending: true });

    if (error) {
      console.error("Could not load bookings:", error.message);
      setBookings([]);
    } else {
      setBookings((data ?? []) as Booking[]);
    }

    setIsLoadingBookings(false);
  }

  loadBookings();
}, [selectedTrip?.id]);


useEffect(() => {
  async function loadTripEvents() {
    if (!selectedTrip) {
      setTripEvents([]);
      return;
    }

    setIsLoadingEvents(true);

    const { data, error } = await supabase
      .from("trip_events")
      .select("*")
      .eq("trip_id", selectedTrip.id)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Could not load trip events:", error.message);
      setTripEvents([]);
    } else {
      setTripEvents((data ?? []) as TripEvent[]);
    }

    setIsLoadingEvents(false);
  }

  loadTripEvents();
}, [selectedTrip?.id]);

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
  
function startEditBooking(booking: Booking) {
  setBookingForm({
    booking_type: booking.booking_type,
    title: booking.title,
    provider: booking.provider ?? "",
    confirmation_number: booking.confirmation_number ?? "",
    status: booking.status,
    start_at: booking.start_at
      ? new Date(booking.start_at).toISOString().slice(0, 16)
      : "",
    end_at: booking.end_at
      ? new Date(booking.end_at).toISOString().slice(0, 16)
      : "",
    location: booking.location ?? "",
    departure_location: booking.departure_location ?? "",
    arrival_location: booking.arrival_location ?? "",
    price: booking.price != null ? String(booking.price) : "",
    currency: booking.currency ?? "EUR",
    notes: booking.notes ?? "",
    source_url: booking.source_url ?? "",
  });

  setEditingBookingId(booking.id);
  setIsAddingBooking(true);
}

async function saveTripEvent() {
  if (!selectedTrip) return;

  const title = eventForm.title.trim();

  if (!title) {
    alert("Please enter an event title.");
    return;
  }

  setIsSavingEvent(true);

  try {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      alert("Please sign in again.");
      window.location.href = "/login";
      return;
    }

    const userId = sessionData.session.user.id;

    const eventData = {
  trip_id: selectedTrip.id,
  user_id: userId,
  title,
  event_date: eventForm.event_date || null,
  start_time: eventForm.start_time || null,
  end_time: eventForm.end_time || null,
  location: eventForm.location.trim() || null,
  notes: eventForm.notes.trim() || null,
  url: eventForm.url.trim() || null,
};


const query = editingEventId
  ? supabase
      .from("trip_events")
      .update(eventData)
      .eq("id", editingEventId)
      .eq("trip_id", selectedTrip.id)
  : supabase
      .from("trip_events")
      .insert({
        ...eventData,
        source_type: "manual",
      });

const { data, error } = await query.select().single();

    if (error) {
      console.error("Could not save event:", error.message);
      alert("Could not save event: " + error.message);
      return;
    }

    setTripEvents((current) => {
  const updatedEvents = editingEventId
    ? current.map((item) =>
        item.id === editingEventId ? (data as TripEvent) : item
      )
    : [...current, data as TripEvent];

  return updatedEvents.sort((a, b) => {
    const dateA = a.event_date ?? "9999-12-31";
    const dateB = b.event_date ?? "9999-12-31";

    if (dateA !== dateB) return dateA.localeCompare(dateB);

    return (a.start_time ?? "99:99").localeCompare(
      b.start_time ?? "99:99"
    );
  });
});

    setEventForm({
      title: "",
      event_date: "",
      start_time: "",
      end_time: "",
      location: "",
      notes: "",
      url: "",
    });

    setIsAddingEvent(false);
    setEditingEventId(null);
  } finally {
    setIsSavingEvent(false);
  }
}

function startEditEvent(event: TripEvent) {
  setEditingEventId(event.id);

  setEventForm({
    title: event.title,
    event_date: event.event_date ?? "",
    start_time: event.start_time ?? "",
    end_time: event.end_time ?? "",
    location: event.location ?? "",
    notes: event.notes ?? "",
    url: event.url ?? "",
  });

  setIsAddingEvent(true);
}

async function deleteTripEvent(eventId: string) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this event?"
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from("trip_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    console.error("Could not delete event:", error.message);
    alert("Could not delete event: " + error.message);
    return;
  }

  setTripEvents((current) =>
    current.filter((event) => event.id !== eventId)
  );
}

 async function saveBooking() {
  if (!selectedTrip) return;

  const title = bookingForm.title.trim();

  if (!title) {
    alert("Please enter a booking title.");
    return;
  }

  if (
    bookingForm.price.trim() &&
    (!Number.isFinite(Number(bookingForm.price)) ||
      Number(bookingForm.price) < 0)
  ) {
    alert("Please enter a valid price.");
    return;
  }

  if (
    bookingForm.start_at &&
    bookingForm.end_at &&
    bookingForm.end_at < bookingForm.start_at
  ) {
    alert("End date must be after start date.");
    return;
  }

  setIsSavingBooking(true);

  try {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      alert("Please sign in again.");
      window.location.href = "/login";
      return;
    }

    const userId = sessionData.session.user.id;

    const bookingData = {
      booking_type: bookingForm.booking_type,
      title,
      provider: bookingForm.provider.trim() || null,
      confirmation_number:
        bookingForm.confirmation_number.trim() || null,
      status: bookingForm.status,
      start_at: bookingForm.start_at
        ? new Date(bookingForm.start_at).toISOString()
        : null,
      end_at: bookingForm.end_at
        ? new Date(bookingForm.end_at).toISOString()
        : null,
      location: bookingForm.location.trim() || null,
      departure_location:
        bookingForm.departure_location.trim() || null,
      arrival_location: bookingForm.arrival_location.trim() || null,
      price: bookingForm.price.trim()
        ? Number(bookingForm.price)
        : null,
      currency: bookingForm.currency.trim() || "EUR",
      notes: bookingForm.notes.trim() || null,
      source_url: bookingForm.source_url.trim() || null,
    };

    if (editingBookingId !== null) {
      const { data, error } = await supabase
        .from("bookings")
        .update({
          ...bookingData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingBookingId)
        .eq("trip_id", selectedTrip.id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        console.error("Could not update booking:", error.message);
        alert("Could not update booking: " + error.message);
        return;
      }

      setBookings((current) =>
        current.map((booking) =>
          booking.id === editingBookingId ? (data as Booking) : booking
        ).sort((a, b) => {
          if (!a.start_at) return 1;
          if (!b.start_at) return -1;
          return a.start_at.localeCompare(b.start_at);
        })
      );
    } else {
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          ...bookingData,
          trip_id: selectedTrip.id,
          user_id: userId,
          source_type: "manual",
        })
        .select()
        .single();

      if (error) {
        console.error("Could not save booking:", error.message);
        alert("Could not save booking: " + error.message);
        return;
      }

      setBookings((current) =>
        [...current, data as Booking].sort((a, b) => {
          if (!a.start_at) return 1;
          if (!b.start_at) return -1;
          return a.start_at.localeCompare(b.start_at);
        })
      );
    }

    setBookingForm({
      booking_type: "flight",
      title: "",
      provider: "",
      confirmation_number: "",
      status: "confirmed",
      start_at: "",
      end_at: "",
      location: "",
      departure_location: "",
      arrival_location: "",
      price: "",
      currency: "EUR",
      notes: "",
      source_url: "",
    });

    setEditingBookingId(null);
    setIsAddingBooking(false);
  } finally {
    setIsSavingBooking(false);
  }
}

async function deleteBooking(booking: Booking) {
  const confirmed = window.confirm(
    `Delete booking "${booking.title}"?`
  );

  if (!confirmed) return;

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError || !sessionData.session) {
    alert("Please sign in again.");
    window.location.href = "/login";
    return;
  }

  const userId = sessionData.session.user.id;

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", booking.id)
    .eq("user_id", userId);

  if (error) {
    console.error("Could not delete booking:", error.message);
    alert("Could not delete booking: " + error.message);
    return;
  }

  setBookings((current) =>
    current.filter((item) => item.id !== booking.id)
  );
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
            className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-y-auto overscroll-contain rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
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
            <div className="mt-6">
  <div className="mb-3 flex items-center justify-between">
    <h3 className="text-lg font-semibold text-[#243b2f]">
      Itinerary
    </h3>

    <div className="flex items-center gap-2">
      <span className="rounded-full bg-[#edf3ed] px-3 py-1 text-sm text-[#45634e]">
        {tripEvents.length}
      </span>

      <button
        type="button"
        onClick={() => setIsAddingEvent((current) => !current)}
        className="rounded-xl bg-[#315b43] px-3 py-2 text-sm font-medium text-white hover:bg-[#264a36]"
      >
        {isAddingEvent ? "Cancel" : "+ Add event"}
      </button>
    </div>
  </div>

  {isAddingEvent && (
    <form
      className="mb-4 space-y-4 rounded-2xl border border-[#dce6dc] bg-[#f8faf7] p-4"
      onSubmit={(event) => {
        event.preventDefault();
        saveTripEvent();
      }}
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Event title *
        </label>
        <input
          required
          value={eventForm.title}
          onChange={(event) =>
            setEventForm({ ...eventForm, title: event.target.value })
          }
          placeholder="e.g. Visit the Duomo"
          className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Date
        </label>
        <input
          type="date"
          value={eventForm.event_date}
          onChange={(event) =>
            setEventForm({ ...eventForm, event_date: event.target.value })
          }
          className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Start time
          </label>
          <input
            type="time"
            value={eventForm.start_time}
            onChange={(event) =>
              setEventForm({ ...eventForm, start_time: event.target.value })
            }
            className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            End time
          </label>
          <input
            type="time"
            value={eventForm.end_time}
            onChange={(event) =>
              setEventForm({ ...eventForm, end_time: event.target.value })
            }
            className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Location
        </label>
        <input
          value={eventForm.location}
          onChange={(event) =>
            setEventForm({ ...eventForm, location: event.target.value })
          }
          placeholder="Address or place name"
          className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Link
        </label>
        <input
          type="url"
          value={eventForm.url}
          onChange={(event) =>
            setEventForm({ ...eventForm, url: event.target.value })
          }
          placeholder="https://..."
          className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          value={eventForm.notes}
          onChange={(event) =>
            setEventForm({ ...eventForm, notes: event.target.value })
          }
          rows={3}
          placeholder="Tickets, meeting point, useful details..."
          className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={isSavingEvent}
        className="w-full rounded-xl bg-[#315b43] px-4 py-3 font-medium text-white hover:bg-[#264a36] disabled:opacity-60"
      >
        {isSavingEvent
          ? "Saving..."
          : editingEventId
              ? "Save changes"
              : "Save event"}
      </button>
    </form>
  )}

  {isLoadingEvents ? (
    <p className="text-sm text-gray-500">Loading events...</p>
  ) : tripEvents.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-center">
      <p className="text-2xl">🗓️</p>
      <p className="mt-2 font-medium text-gray-700">No events yet</p>
      <p className="mt-1 text-sm text-gray-500">
        Add museums, restaurants, concerts and other plans for this trip.
      </p>
    </div>
  ) : (
    <div className="space-y-3">
      {tripEvents.map((tripEvent) => (
        <div
          key={tripEvent.id}
          className="rounded-2xl border border-gray-200 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-[60px] text-sm font-medium text-[#45634e]">
              {tripEvent.start_time
                ? tripEvent.start_time.slice(0, 5)
                : "—"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-800">
                {tripEvent.title}
              </p>

              {tripEvent.event_date && (
                <p className="mt-1 text-sm text-gray-500">
                  {new Date(
                    `${tripEvent.event_date}T12:00:00`
                  ).toLocaleDateString()}
                  {tripEvent.end_time
                    ? ` · Until ${tripEvent.end_time.slice(0, 5)}`
                    : ""}
                </p>
              )}

              {tripEvent.location && (
                <p className="mt-1 text-sm text-gray-500">
                  {tripEvent.location}
                </p>
              )}

              {tripEvent.notes && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                  {tripEvent.notes}
                </p>
              )}

              {tripEvent.url && (
                <a
                  href={tripEvent.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm text-[#315b43] underline"
                >
                  Open link
                </a>
              )}
                            <div className="mt-3 flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => startEditEvent(tripEvent)}
                                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-[#315b43] hover:bg-gray-50"
                              >
                                Edit
                              </button>

                               <button
                                  type="button"
                                  onClick={() => deleteTripEvent(tripEvent.id)}
                                  className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                            </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
            <div className="mt-6">
  <div className="mb-3 flex items-center justify-between">
  <h3 className="text-lg font-semibold text-[#243b2f]">
    Bookings
  </h3>

  <div className="flex items-center gap-2">
    <span className="rounded-full bg-[#edf3ed] px-3 py-1 text-sm text-[#45634e]">
      {bookings.length}
    </span>

    <button
      onClick={() => setIsAddingBooking((current) => !current)}
      className="rounded-xl bg-[#315b43] px-3 py-2 text-sm font-medium text-white hover:bg-[#264a36]"
    >
      {isAddingBooking
        ? "Cancel"
        : editingBookingId
          ? "Edit booking"
          : "+ Add booking"}
    </button>
  </div>
</div>

{isAddingBooking && (
  <form
    className="mb-4 space-y-4 rounded-2xl border border-[#dce6dc] bg-[#f8faf7] p-4"
    onSubmit={(event) => {
      event.preventDefault();
      saveBooking();
    }}
  >
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Booking type
      </label>
      <select
        value={bookingForm.booking_type}
        onChange={(event) =>
          setBookingForm({
            ...bookingForm,
            booking_type: event.target.value as Booking["booking_type"],
          })
        }
        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
      >
        <option value="flight">Flight</option>
        <option value="hotel">Hotel</option>
        <option value="train">Train</option>
        <option value="bus">Bus</option>
        <option value="car_rental">Car rental</option>
        <option value="transfer">Transfer</option>
        <option value="ferry">Ferry</option>
        <option value="other">Other</option>
      </select>
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Title *
      </label>
      <input
        required
        value={bookingForm.title}
        onChange={(event) =>
          setBookingForm({ ...bookingForm, title: event.target.value })
        }
        placeholder="e.g. Flight to Milan"
        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Provider
      </label>
      <input
        value={bookingForm.provider}
        onChange={(event) =>
          setBookingForm({ ...bookingForm, provider: event.target.value })
        }
        placeholder="e.g. Lufthansa, Booking.com"
        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Confirmation number
      </label>
      <input
        value={bookingForm.confirmation_number}
        onChange={(event) =>
          setBookingForm({
            ...bookingForm,
            confirmation_number: event.target.value,
          })
        }
        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Status
      </label>
      <select
        value={bookingForm.status}
        onChange={(event) =>
          setBookingForm({
            ...bookingForm,
            status: event.target.value as Booking["status"],
          })
        }
        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
      >
        <option value="planned">Planned</option>
        <option value="confirmed">Confirmed</option>
        <option value="cancelled">Cancelled</option>
        <option value="completed">Completed</option>
      </select>
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Start date and time
      </label>
      <input
        type="datetime-local"
        value={bookingForm.start_at}
        onChange={(event) =>
          setBookingForm({ ...bookingForm, start_at: event.target.value })
        }
        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        End date and time
      </label>
      <input
        type="datetime-local"
        value={bookingForm.end_at}
        onChange={(event) =>
          setBookingForm({ ...bookingForm, end_at: event.target.value })
        }
        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Location
      </label>
      <input
        value={bookingForm.location}
        onChange={(event) =>
          setBookingForm({ ...bookingForm, location: event.target.value })
        }
        placeholder="e.g. Hotel address or airport"
        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
      />
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Departure
        </label>
        <input
          value={bookingForm.departure_location}
          onChange={(event) =>
            setBookingForm({
              ...bookingForm,
              departure_location: event.target.value,
            })
          }
          placeholder="From"
          className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Arrival
        </label>
        <input
          value={bookingForm.arrival_location}
          onChange={(event) =>
            setBookingForm({
              ...bookingForm,
              arrival_location: event.target.value,
            })
          }
          placeholder="To"
          className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Price
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={bookingForm.price}
          onChange={(event) =>
            setBookingForm({ ...bookingForm, price: event.target.value })
          }
          placeholder="0.00"
          className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Currency
        </label>
        <select
          value={bookingForm.currency}
          onChange={(event) =>
            setBookingForm({ ...bookingForm, currency: event.target.value })
          }
          className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
        >
          <option value="EUR">EUR (€)</option>
          <option value="USD">USD ($)</option>
          <option value="GBP">GBP (£)</option>
          <option value="RUB">RUB (₽)</option>
        </select>
      </div>
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Booking link
      </label>
      <input
        type="url"
        value={bookingForm.source_url}
        onChange={(event) =>
          setBookingForm({ ...bookingForm, source_url: event.target.value })
        }
        placeholder="https://..."
        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Notes
      </label>
      <textarea
        value={bookingForm.notes}
        onChange={(event) =>
          setBookingForm({ ...bookingForm, notes: event.target.value })
        }
        rows={3}
        placeholder="Additional details..."
        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
      />
    </div>

    <button
      type="submit"
      disabled={isSavingBooking}
      className="w-full rounded-xl bg-[#315b43] px-4 py-3 font-medium text-white hover:bg-[#264a36] disabled:opacity-60"
    >
      {isSavingBooking
        ? "Saving..."
        : editingBookingId
          ? "Save changes"
          : "Save booking"}
    </button>
  </form>
)}

  {isLoadingBookings ? (
    <p className="text-sm text-gray-500">
      Loading bookings...
    </p>
  ) : bookings.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-center">
      <p className="text-2xl">🎫</p>
      <p className="mt-2 font-medium text-gray-700">
        No bookings yet
      </p>
      <p className="mt-1 text-sm text-gray-500">
        Flights, hotels and other reservations will appear here.
      </p>
    </div>
  ) : (
    <div className="space-y-3">
      {bookings.map((booking) => (
        <div
          key={booking.id}
          className="rounded-2xl border border-gray-200 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-gray-800">
                {booking.title}
              </p>
              {booking.provider && (
                <p className="mt-1 text-sm text-gray-500">
                  {booking.provider}
                </p>
              )}
              {booking.start_at && (
                <p className="mt-1 text-sm text-gray-500">
                  {new Date(booking.start_at).toLocaleString()}
                </p>
              )}
            </div>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
              {booking.status}
            </span>
            <button
              type="button"
              onClick={() => startEditBooking(booking)}
              className="mt-3 mr-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Edit
            </button>
            
            <button
              type="button"
              onClick={() => deleteBooking(booking)}
              className="mt-3 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )}
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
