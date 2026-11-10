
import "server-only";

export type BookingDateCandidate = {
  date: string;
  context: string;
};

export function findBookingDates(
  text: string
): BookingDateCandidate[] {
  const results: BookingDateCandidate[] = [];

  // Examples: 20/11/2026, 20.11.2026, 20-11-2026
  const pattern =
    /\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/g;

  for (const match of text.matchAll(pattern)) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(
      Date.UTC(year, month - 1, day)
    );

    // Reject impossible dates, such as 31/02/2026.
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      continue;
    }

    const position = match.index;

    const context = text
      .slice(
        Math.max(0, position - 70),
        Math.min(text.length, position + match[0].length + 70)
      )
      .replace(/\s+/g, " ")
      .trim();

    results.push({
      date: date.toISOString().slice(0, 10),
      context,
    });
  }

  return results;
}
