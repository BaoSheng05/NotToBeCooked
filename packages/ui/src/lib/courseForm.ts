import type { CourseCreate } from "@workspace/contracts"

export const COURSE_YEARS = [1, 2, 3, 4] as const
export const COURSE_SEMESTERS = [1, 2] as const

export interface CourseFormValues {
  code: string
  name: string
  year: number
  sem: number
}

export type CourseFormResult =
  | { ok: true; course: CourseCreate }
  | { ok: false; errors: Partial<Record<keyof CourseFormValues, string>> }

/**
 * Tidy and check the Add course form before it is sent.
 *
 * The code is trimmed and upper-cased because the database keeps one course
 * per (user, code, year, semester) and compares codes exactly: without this,
 * "cst235" and "CST235 " would be two different courses. Spaces inside the
 * code go too ("CST 235" -> "CST235"), the way course codes are printed.
 */
export function parseCourseForm(values: CourseFormValues): CourseFormResult {
  const code = values.code.replace(/\s+/g, "").toUpperCase()
  const name = values.name.trim()
  const errors: Partial<Record<keyof CourseFormValues, string>> = {}

  if (!code) errors.code = "Course code is required."
  if (!name) errors.name = "Course name is required."
  if (!(COURSE_YEARS as readonly number[]).includes(values.year)) {
    errors.year = "Choose a year from 1 to 4."
  }
  if (!(COURSE_SEMESTERS as readonly number[]).includes(values.sem)) {
    errors.sem = "Choose semester 1 or 2."
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    course: { code, name, year: values.year, sem: values.sem },
  }
}
