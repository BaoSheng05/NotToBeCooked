import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { parseCourseForm } from "../lib/courseForm.ts"

describe("add course form", () => {
  it("normalises the code so the duplicate check compares like with like", () => {
    const result = parseCourseForm({
      code: "  cst 235 ",
      name: " Natural Language Processing ",
      year: 2,
      sem: 2,
    })
    assert.deepEqual(result, {
      ok: true,
      course: {
        code: "CST235",
        name: "Natural Language Processing",
        year: 2,
        sem: 2,
      },
    })
  })

  it("names every field that is missing or out of range", () => {
    const result = parseCourseForm({ code: " ", name: "", year: 5, sem: 3 })
    assert.equal(result.ok, false)
    assert.deepEqual(Object.keys(result.ok ? {} : result.errors).sort(), [
      "code",
      "name",
      "sem",
      "year",
    ])
  })
})
