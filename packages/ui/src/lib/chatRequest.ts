export interface ChatRequestClassification {
  intent: "question" | "document_summary"
  scopesCurrentDocument: boolean
}

export interface QuickPrompt {
  label: string
  message: string
}

// The chips under the chat box. The label is what the button says; the
// message is what gets sent, and it is written so that classifyChatRequest
// routes it on its own words. Until 11 October 2026 the chips sent their bare
// label ("Quiz me") and all four were classified as a whole-document summary,
// so Quiz me came back as a summary. Typed out in full, the same request
// returned three cited practice questions. Storyboard was dropped: no user
// story asks for it, and unbuilt features stay out of the UI.
export const QUICK_PROMPTS: QuickPrompt[] = [
  { label: "Condense", message: "Condense" },
  {
    label: "Quiz me",
    message:
      "Quiz me: give me 3 practice questions about this document, with the answers.",
  },
  {
    label: "Simplify",
    message:
      "Simplify: explain all the concepts in this document in everyday words.",
  },
]

const CURRENT_DOCUMENT_PATTERN = /\b(?:this|current|open)\s+(?:file|document)\b/
const WHOLE_DOCUMENT_ACTIONS = new Set(["condense", "simplify"])
const SUMMARY_PATTERN =
  /\b(?:condense|summari[sz]e|overview|explain all(?: the)? concepts?)\b/

export function classifyChatRequest(text: string): ChatRequestClassification {
  const normalized = text.trim().toLowerCase()
  const referencesCurrentDocument = CURRENT_DOCUMENT_PATTERN.test(normalized)
  const isWholeDocumentAction = WHOLE_DOCUMENT_ACTIONS.has(normalized)
  const isDocumentSummary =
    isWholeDocumentAction || SUMMARY_PATTERN.test(normalized)

  return {
    intent: isDocumentSummary ? "document_summary" : "question",
    scopesCurrentDocument: isDocumentSummary || referencesCurrentDocument,
  }
}
