import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { uploadStatusLabel } from "../lib/uploadProgress.ts"

describe("upload status line", () => {
  it("tells sending apart from the server saving", () => {
    assert.equal(uploadStatusLabel(undefined), "Waiting to start…")
    assert.equal(uploadStatusLabel(0.427), "Uploading… 42%")
    assert.equal(uploadStatusLabel(0.999), "Uploading… 99%")
    assert.equal(uploadStatusLabel(1), "Saving on the server…")
  })
})
