import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { quoteItemIndices } from "../lib/pdfHighlight.ts"

describe("which PDF text items a quote covers", () => {
  // Slide 13 of the CST235 overview deck, split the way pdf.js splits it.
  const items = [
    "Lexicon & Morphology",
    "Lexicon refers to the set of available words in a given ",
    "context.",
    "A word can have a lexical category or part of speech",
  ]

  it("spans items and ignores how the spaces fell", () => {
    assert.deepEqual(
      quoteItemIndices(
        items,
        "Lexicon refers to the set of available words in a given context."
      ),
      [1, 2]
    )
  })

  it("joins a word pdf.js cut in half", () => {
    assert.deepEqual(
      quoteItemIndices(["the Lex", "icon is a list"], "lexicon is"),
      [0, 1]
    )
  })

  it("finds nothing for a quote that is not on the page", () => {
    assert.deepEqual(
      quoteItemIndices(items, "Natural Language Understanding"),
      []
    )
    assert.deepEqual(quoteItemIndices(items, "   "), [])
  })
})
