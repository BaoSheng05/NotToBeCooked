import { useId, useState } from "react"
import { BookPlus, CircleAlert, LoaderCircle } from "lucide-react"
import { isApiClientError } from "@workspace/contracts"

import { Button } from "../button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../dialog"
import { Input } from "../input"
import {
  COURSE_SEMESTERS,
  COURSE_YEARS,
  parseCourseForm,
  type CourseFormValues,
} from "../../lib/courseForm"
import type { CourseCreate } from "@workspace/contracts"

interface CreateCourseDialogProps {
  open: boolean
  defaultYear: number
  defaultSem: number
  onOpenChange: (open: boolean) => void
  onCreate: (course: CourseCreate) => Promise<void>
}

const SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"

export function CreateCourseDialog({
  open,
  defaultYear,
  defaultSem,
  onOpenChange,
  onCreate,
}: CreateCourseDialogProps) {
  const id = useId()
  const [values, setValues] = useState<CourseFormValues>({
    code: "",
    name: "",
    // A user with no courses yet has no current year (EMPTY_COURSE is 0/0).
    year: defaultYear || 1,
    sem: defaultSem || 1,
  })
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  const parsed = parseCourseForm(values)
  const errors = hasSubmitted && !parsed.ok ? parsed.errors : {}

  const update = (patch: Partial<CourseFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }))
    setRequestError(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHasSubmitted(true)
    setRequestError(null)
    if (!parsed.ok) return

    setIsSubmitting(true)
    try {
      await onCreate(parsed.course)
      onOpenChange(false)
    } catch (error) {
      // The API's 409 names the clash ("You already have CST235 in Year 2,
      // Semester 2 ..."), so it is shown as written.
      setRequestError(
        isApiClientError(error)
          ? error.message
          : "Couldn’t add this course. Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="min-w-0 gap-0 overflow-hidden border-(--line,#25313E) bg-(--bg-panel,#121A23) p-0 text-(--tx,#DCE3EA) shadow-2xl sm:max-w-md">
        <DialogHeader className="border-b border-(--line-soft,#1B2530) px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <BookPlus className="h-4 w-4 text-(--acc,#52A8EA)" />
            Add course
          </DialogTitle>
          <DialogDescription className="text-xs text-(--tx-faint,#5C6976)">
            It starts with five folders: Course Planner, Lecture Slides,
            Tutorials, Past Year Papers and Other.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <div className="flex flex-col gap-4 px-5 py-4">
            {requestError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-sm border border-(--danger,#E0625C)/30 bg-(--danger,#E0625C)/10 px-3 py-2 text-xs text-(--danger-tx,#F0A19D)"
              >
                <CircleAlert
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span>{requestError}</span>
              </div>
            )}

            <Field id={`${id}-code`} label="Course code" error={errors.code}>
              <Input
                id={`${id}-code`}
                value={values.code}
                onChange={(e) => update({ code: e.target.value })}
                autoFocus
                disabled={isSubmitting}
                placeholder="e.g. CST235"
                aria-invalid={Boolean(errors.code)}
                className="h-10 text-sm"
              />
            </Field>

            <Field id={`${id}-name`} label="Course name" error={errors.name}>
              <Input
                id={`${id}-name`}
                value={values.name}
                onChange={(e) => update({ name: e.target.value })}
                disabled={isSubmitting}
                placeholder="e.g. Natural Language Processing"
                aria-invalid={Boolean(errors.name)}
                className="h-10 text-sm"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field id={`${id}-year`} label="Year" error={errors.year}>
                <select
                  id={`${id}-year`}
                  value={values.year}
                  onChange={(e) => update({ year: Number(e.target.value) })}
                  disabled={isSubmitting}
                  className={SELECT_CLASS}
                >
                  {COURSE_YEARS.map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id={`${id}-sem`} label="Semester" error={errors.sem}>
                <select
                  id={`${id}-sem`}
                  value={values.sem}
                  onChange={(e) => update({ sem: Number(e.target.value) })}
                  disabled={isSubmitting}
                  className={SELECT_CLASS}
                >
                  {COURSE_SEMESTERS.map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <DialogFooter className="border-t border-(--line-soft,#1B2530) px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Adding…
                </>
              ) : (
                <>
                  <BookPlus />
                  Add course
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-(--danger-tx,#F0A19D)">{error}</p>}
    </div>
  )
}
