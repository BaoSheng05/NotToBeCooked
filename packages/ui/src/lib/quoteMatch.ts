/**
 * Where a citation's quote sits in a passage, or null.
 *
 * Matches the way grounding.py's _normalise compares quotes: runs of
 * whitespace are equal to one space, and case is ignored. Nothing else is
 * loosened, so a quote that passed the check is found and one that did not
 * pass would not be.
 */
export function findQuote(
  text: string,
  quote: string
): { start: number; end: number } | null {
  const words = quote.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return null
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const match = new RegExp(escaped.join("\\s+"), "i").exec(text)
  return match
    ? { start: match.index, end: match.index + match[0].length }
    : null
}

/** A passage cut into plain and highlighted runs, one run per found quote. */
export function highlightSegments(
  text: string,
  quotes: readonly string[]
): { text: string; mark: boolean }[] {
  const hits = quotes
    .map((q) => findQuote(text, q))
    .filter((h): h is { start: number; end: number } => h !== null)
    .sort((a, b) => a.start - b.start)
  const segments: { text: string; mark: boolean }[] = []
  let at = 0
  for (const hit of hits) {
    if (hit.start < at) continue // overlapping quotes: keep the first
    if (hit.start > at)
      segments.push({ text: text.slice(at, hit.start), mark: false })
    segments.push({ text: text.slice(hit.start, hit.end), mark: true })
    at = hit.end
  }
  if (at < text.length) segments.push({ text: text.slice(at), mark: false })
  return segments
}
