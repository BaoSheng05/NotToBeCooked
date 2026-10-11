/**
 * The line under a file while it uploads. Added 11 October 2026: the
 * acceptance test saw a 108 KB file sit on "Uploading…" for over a minute
 * with nothing to say whether bytes were moving or the server was busy. The
 * two cases now read differently: a percentage while the browser is sending,
 * and "Saving on the server" once every byte has left.
 */
export function uploadStatusLabel(fraction: number | undefined): string {
  if (fraction === undefined) return "Waiting to start…"
  if (fraction >= 1) return "Saving on the server…"
  return `Uploading… ${Math.floor(Math.max(0, fraction) * 100)}%`
}
