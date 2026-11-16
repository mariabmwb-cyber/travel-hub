
import "server-only";

import * as cheerio from "cheerio";
import type { gmail_v1 } from "googleapis";

export type FlightBooking = {
  airline: string | null;
  flightNumber: string | null;
  departureAirport: string | null;
  arrivalAirport: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  reservationNumber: string | null;
};

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

function extractHtmlParts(
  part: gmail_v1.Schema$MessagePart | undefined
): string[] {
  if (!part) return [];

  const results: string[] = [];

  if (
    (part.mimeType === "text/html" ||
      part.mimeType === "text/plain") &&
    part.body?.data
  ) {
    const decoded = decodeBase64Url(part.body.data);

    if (/<html\b|<!doctype html/i.test(decoded)) {
      results.push(decoded);
    }
  }

  for (const child of part.parts ?? []) {
    results.push(...extractHtmlParts(child));
  }

  return results;
}

export function extractFlightBookings(
  payload: gmail_v1.Schema$MessagePart | undefined
): FlightBooking[] {
  const htmlParts = extractHtmlParts(payload);
  const bookings: FlightBooking[] = [];

  for (const html of htmlParts) {
    const $ = cheerio.load(html);

    $('[itemtype*="schema.org/FlightReservation"]').each(
      (_, reservation) => {
        const root = $(reservation);

        function property(
          name: string,
          scope = root
        ): string | null {
          const element = scope.find(
            `[itemprop="${name}"]`
          ).first();

          const value =
            element.attr("content") ??
            element.attr("datetime") ??
            element.text().trim();

          return value || null;
        }

        const flight = root
          .find('[itemtype*="schema.org/Flight"]')
          .first();

        bookings.push({
          airline: property("name", flight.find(
            '[itemtype*="schema.org/Airline"]'
          ).first()),
          flightNumber: property("flightNumber", flight),
          departureAirport: property(
            "iataCode",
            flight.find(
              '[itemprop="departureAirport"]'
            ).first()
          ),
          arrivalAirport:
  property(
    "iataCode",
    flight.find('[itemprop="arrivalAirport"]').first()
  ) ||
  property(
    "name",
    flight.find('[itemprop="arrivalAirport"]').first()
  ),
          departureTime: property("departureTime", flight),
          arrivalTime: property("arrivalTime", flight),
          reservationNumber: property("reservationNumber"),
        });
      }
    );
  }

  return bookings.filter(
  (booking, index, all) =>
    index ===
    all.findIndex(
      (other) =>
        other.flightNumber === booking.flightNumber &&
        other.departureTime === booking.departureTime &&
        other.departureAirport === booking.departureAirport &&
        other.arrivalAirport === booking.arrivalAirport
    )
);
}
