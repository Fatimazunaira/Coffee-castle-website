// The server stores times in UTC like "2026-11-12 09:30:00".
// This turns one into the viewer's local date and time.
export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function money(amount) {
  return "Rs. " + amount;
}
