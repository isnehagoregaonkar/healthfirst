/** Short time for a meal log row (device locale). */
export function formatMealLogTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
