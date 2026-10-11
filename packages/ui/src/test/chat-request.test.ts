import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { QUICK_PROMPTS, classifyChatRequest } from "../lib/chatRequest.ts"

describe("chat request classification", () => {
  it("treats a natural whole-file explanation as a document summary", () => {
    const result = classifyChatRequest(
      "Explain all the concepts in this file in layman terms"
    )
    assert.deepEqual(result, {
      intent: "document_summary",
      scopesCurrentDocument: true,
    })
  })

  it("recognizes a whole-file explanation without requiring this file wording", () => {
    const result = classifyChatRequest(
      "Explain all the concepts in laymen term"
    )
    assert.deepEqual(result, {
      intent: "document_summary",
      scopesCurrentDocument: true,
    })
  })

  it("scopes a normal question about this document without forcing summary mode", () => {
    const result = classifyChatRequest(
      "What does this document say about conflict?"
    )
    assert.equal(result.intent, "question")
    assert.equal(result.scopesCurrentDocument, true)
  })

  it("keeps an ordinary course question at course scope", () => {
    const result = classifyChatRequest("What is conflict?")
    assert.equal(result.scopesCurrentDocument, false)
  })

  it("keeps the Condense quick action as a document summary", () => {
    const result = classifyChatRequest("Condense")
    assert.equal(result.intent, "document_summary")
  })

  it("routes each quick prompt by the message it sends, not its label", () => {
    const routed = Object.fromEntries(
      QUICK_PROMPTS.map((q) => [q.label, classifyChatRequest(q.message)])
    )
    assert.deepEqual(routed, {
      Condense: { intent: "document_summary", scopesCurrentDocument: true },
      "Quiz me": { intent: "question", scopesCurrentDocument: true },
      Simplify: { intent: "document_summary", scopesCurrentDocument: true },
    })
  })

  it("offers no Storyboard chip", () => {
    assert.deepEqual(
      QUICK_PROMPTS.map((q) => q.label),
      ["Condense", "Quiz me", "Simplify"]
    )
  })
})
