import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { ACCEPT_ATTRIBUTE, isSupportedUpload } from "../lib/uploadTypes.ts"

describe("upload file types", () => {
  it("accepts slides and plain text alongside the original types", () => {
    for (const name of [
      "Part 4 Network Layer.pptx",
      "Alembic S2 Scroll 1 Question & Ans.txt",
      "02 Corpus Processing Tools.PDF",
      "c1_ques.docx",
      "GLOSSARY.md",
    ]) {
      assert.equal(isSupportedUpload(name), true, name)
    }
  })

  it("still rejects what ingestion cannot read", () => {
    for (const name of ["unsupported.png", "notes", "archive.zip"]) {
      assert.equal(isSupportedUpload(name), false, name)
    }
  })

  it("offers the same types in the file picker", () => {
    assert.equal(ACCEPT_ATTRIBUTE, ".pdf,.pptx,.doc,.docx,.md,.markdown,.txt")
  })
})
