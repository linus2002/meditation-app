/**
 * The home screen's greeting. Serenity has no accounts and so no name to use;
 * rather than address everyone by a made-up one, it greets by the time of day.
 * Late at night, when someone is awake and probably not by choice, it says a
 * plain hello instead of a cheerful "Good evening".
 */
export function timeOfDayGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Hello';
}

/** "Saturday 17 October", for the line above the greeting. */
export function longDateLabel(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}
