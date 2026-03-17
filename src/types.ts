export interface CalendarEvent {
  id: string;
  type: "training" | "game" | "other";
  title: string;
  subtitle: string;
  description: string;
  date: string; // YYYY-MM-DD
  meetTime: string | null; // HH:MM
  startTime: string | null; // HH:MM
  endTime: string | null; // HH:MM
  address: string | null;
  url: string;
}
