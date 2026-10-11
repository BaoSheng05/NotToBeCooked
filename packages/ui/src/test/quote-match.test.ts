import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { findQuote } from "../lib/quoteMatch.ts"

describe("finding a quote to highlight", () => {
  const passage =
    "Lexicon & Morphology\nLexicon refers to the set of\navailable words in a given context."

  it("matches across line breaks and case, like the grounding check", () => {
    const quote = "lexicon refers to the set of available words"
    const hit = findQuote(passage, quote)
    assert.ok(hit)
    assert.equal(
      passage.slice(hit.start, hit.end),
      "Lexicon refers to the set of\navailable words"
    )
  })

  it("treats regex characters in a quote as text", () => {
    assert.ok(findQuote("rrf_k (default 60) [see §2]", "(default 60) [see"))
  })

  it("does not match a changed word", () => {
    assert.equal(findQuote(passage, "the set of all words"), null)
  })
})

import { previewStateFor } from "../lib/explorerData.ts"

describe("which reader a file opens in", () => {
  it("sends PDFs to the browser and the rest to the text preview", () => {
    assert.equal(previewStateFor("01 Overview.pdf", "application/pdf"), "ready")
    assert.equal(
      previewStateFor("GLOSSARY.md", "application/octet-stream"),
      "text"
    )
    assert.equal(
      previewStateFor(
        "c1_ques.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ),
      "text"
    )
    assert.equal(previewStateFor("Part 4.PPTX", ""), "text")
    assert.equal(
      previewStateFor("old.doc", "application/msword"),
      "unsupported"
    )
  })
})

import { highlightSegments } from "../lib/quoteMatch.ts"

describe("highlighting quotes in a passage", () => {
  it("marks each quote once and keeps the rest as plain text", () => {
    assert.deepEqual(
      highlightSegments("A lexicon is a list. A morpheme is a unit.", [
        "a morpheme is a unit",
        "lexicon is",
      ]),
      [
        { text: "A ", mark: false },
        { text: "lexicon is", mark: true },
        { text: " a list. ", mark: false },
        { text: "A morpheme is a unit", mark: true },
        { text: ".", mark: false },
      ]
    )
  })

  it("leaves a passage without the quote untouched", () => {
    assert.deepEqual(highlightSegments("no match here", ["lexicon"]), [
      { text: "no match here", mark: false },
    ])
  })
})
