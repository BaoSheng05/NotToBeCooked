// What the upload modal lets through. Every type here is one Docling parses:
// PPTX and TXT were added on 11 October 2026 after the acceptance test found
// them blocked by this list alone. Run through ingestion locally, a 52-slide
// CST235 deck gave 157 text items with slide numbers as pages, and a .txt
// question bank gave 124 items. The backend never filtered by type.
export const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "pptx",
  "doc",
  "docx",
  "md",
  "markdown",
  "txt",
])

export const ACCEPT_ATTRIBUTE = [...ALLOWED_EXTENSIONS]
  .map((ext) => `.${ext}`)
  .join(",")

export function fileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? ""
}

export function isSupportedUpload(filename: string): boolean {
  return ALLOWED_EXTENSIONS.has(fileExtension(filename))
}
