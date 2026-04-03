/**
 * Checks if a given date is a working day (Monday-Friday).
 */
export function isWorkingDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

/**
 * Gets the current date in the specified timezone.
 */
export function getCurrentDateInTimezone(timezone: string): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const dateParts: Record<string, string> = {};

  for (const part of parts) {
    dateParts[part.type] = part.value;
  }

  return new Date(
    parseInt(dateParts.year ?? '0', 10),
    parseInt(dateParts.month ?? '1', 10) - 1,
    parseInt(dateParts.day ?? '1', 10),
    parseInt(dateParts.hour ?? '0', 10),
    parseInt(dateParts.minute ?? '0', 10),
    parseInt(dateParts.second ?? '0', 10)
  );
}

/**
 * Creates ISO date strings for a time entry with 8-hour duration.
 * The entry starts at 9:00 AM and ends at 5:00 PM in the specified timezone.
 */
export function createTimeEntryDates(
  date: Date,
  _timezone: string,
  durationHours: number = 8
): { start: string; end: string } {
  // Set start time to 9:00 AM
  const startDate = new Date(date);
  startDate.setHours(9, 0, 0, 0);

  // Set end time to 5:00 PM (9 + 8 hours)
  const endDate = new Date(startDate);
  endDate.setHours(startDate.getHours() + durationHours);

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
}

/**
 * Formats a date string for display (YYYY-MM-DD format).
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
