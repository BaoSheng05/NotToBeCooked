/**
 * Which of a PDF page's text items a quote covers (US-13).
 *
 * pdf.js hands a page back as many small strings -- a line, part of a line,
 * sometimes half a word -- and the spaces between them are not reliable:
 * "Lex" + "icon" is one word, "context." + "A" is two. Docling, which made the
 * chunk the quote was checked against, split the same page its own way. So
 * the quote is matched with whitespace ignored altogether, and every item
 * overlapping the match is returned. That is looser than the grounding check
 * on purpose: this only decides what to paint, never what is true.
 */
export function quoteItemIndices(
  items: readonly string[],
  quote: string
): number[] {
  const chars = [...quote.replace(/\s+/g, "")]
  if (chars.length === 0) return []

  // The page as one string, with each item's place in it remembered.
  let joined = ""
  const spans: { start: number; end: number }[] = []
  for (const item of items) {
    const start = joined.length
    joined += item
    spans.push({ start, end: joined.length })
    joined += " "
  }

  const escaped = chars.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const match = new RegExp(escaped.join("\\s*"), "i").exec(joined)
  if (!match) return []
  const from = match.index
  const to = from + match[0].length

  const hits: number[] = []
  spans.forEach((span, index) => {
    if (span.end > from && span.start < to && span.end > span.start) {
      hits.push(index)
    }
  })
  return hits
}
