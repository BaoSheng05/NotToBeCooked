/**
 * The line under an answer saying which files it searched (US-12). The scope
 * is read back from the stored turn -- MESSAGE.mentioned_file_ids, the ids the
 * request named -- so a conversation reopened later shows what that answer
 * actually searched, not what is selected now. No ids means the request named
 * no files and the search covered the whole course.
 */
export function describeScope(
  fileIds: readonly string[] | null | undefined,
  lookupName: (id: string) => string | undefined
): string {
  if (!fileIds || fileIds.length === 0) {
    return "Searched all files in this course"
  }
  const names = fileIds.map((id) => lookupName(id) ?? "a file no longer here")
  if (names.length === 1) return `Searched only ${names[0]}`
  const shown = names.slice(0, 3).join(", ")
  const more = names.length > 3 ? ` and ${names.length - 3} more` : ""
  return `Searched ${names.length} files: ${shown}${more}`
}

export interface RetryableTurn {
  role?: "user" | "assistant"
  content?: string
  grounded?: boolean
  mentionedFileIds?: string[] | null
}

/**
 * What "Ask again" resends (US-11): the question before the last answer,
 * with the files it named, when that answer was not grounded -- a refusal,
 * a withheld answer, or a failed call. Only the last answer gets the button;
 * resending an older question would answer it out of order.
 */
export function retryTarget(
  messages: readonly RetryableTurn[]
): { text: string; fileIds: string[] | null } | null {
  const last = messages.at(-1)
  const question = messages.at(-2)
  if (
    !last ||
    !question ||
    last.role !== "assistant" ||
    last.grounded !== false ||
    question.role !== "user" ||
    !question.content
  ) {
    return null
  }
  return {
    text: question.content,
    fileIds: question.mentionedFileIds?.length
      ? question.mentionedFileIds
      : null,
  }
}
