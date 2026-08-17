// Local calendar date, not UTC — toISOString() would roll the date over at
// UTC midnight instead of the user's local midnight (e.g. ~5:30am late for
// IST), so a fresh day wouldn't start on time.
export function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
