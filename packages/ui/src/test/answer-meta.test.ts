import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { describeScope, retryTarget } from "../lib/answerMeta.ts"

const names: Record<string, string> = {
  a: "01 Overview.pdf",
  b: "GLOSSARY.md",
  c: "c1_ques.docx",
  d: "Part 4.pptx",
}
const lookup = (id: string) => names[id]

describe("answer scope line", () => {
  it("says the whole course when the turn named no files", () => {
    assert.equal(
      describeScope(null, lookup),
      "Searched all files in this course"
    )
    assert.equal(describeScope([], lookup), "Searched all files in this course")
  })

  it("names the files a turn was limited to", () => {
    assert.equal(describeScope(["a"], lookup), "Searched only 01 Overview.pdf")
    assert.equal(
      describeScope(["a", "b", "c", "d"], lookup),
      "Searched 4 files: 01 Overview.pdf, GLOSSARY.md, c1_ques.docx and 1 more"
    )
  })

  it("does not show an id for a file that has since been deleted", () => {
    assert.equal(
      describeScope(["gone"], lookup),
      "Searched only a file no longer here"
    )
  })
})

describe("ask again", () => {
  const question = {
    role: "user" as const,
    content: "what is rrf_k",
    mentionedFileIds: ["b"],
  }

  it("resends the question and its files after an ungrounded answer", () => {
    assert.deepEqual(
      retryTarget([question, { role: "assistant", grounded: false }]),
      { text: "what is rrf_k", fileIds: ["b"] }
    )
  })

  it("offers nothing after a grounded answer or while the answer is pending", () => {
    assert.equal(
      retryTarget([question, { role: "assistant", grounded: true }]),
      null
    )
    assert.equal(retryTarget([question]), null)
  })
})
