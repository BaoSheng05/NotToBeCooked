import { useState } from "react"
import type { CourseCreate } from "@workspace/contracts"
import type { MockCourse } from "../../types/course"
import { UserProfileDropdown } from "../profile/UserProfileDropdown"
import { ChevronDown, Plus } from "lucide-react"
import { CreateCourseDialog } from "./CreateCourseDialog"

export interface TopBarProps {
  platform?: "web" | "tauri"
  currentCourse: MockCourse
  courses: MockCourse[]
  userEmail?: string
  onSwitchCourse: (courseId: string) => void
  onCreateCourse: (course: CourseCreate) => Promise<void>
  onLogout: () => void
}

const YEARS = [1, 2, 3, 4]
const SEMESTERS = [1, 2]

export function TopBar({
  currentCourse,
  courses,
  onSwitchCourse,
  onCreateCourse,
  onLogout,
}: TopBarProps) {
  const [openYearDropdown, setOpenYearDropdown] = useState(false)
  const [openSemDropdown, setOpenSemDropdown] = useState(false)
  const [openCourseDropdown, setOpenCourseDropdown] = useState(false)
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false)

  const selectedYear = currentCourse.year || 1
  const selectedSem = currentCourse.semester || 1

  const displayedCourses = courses.filter(
    (c) => c.year === selectedYear && c.semester === selectedSem
  )

  const closeAllDropdowns = () => {
    setOpenYearDropdown(false)
    setOpenSemDropdown(false)
    setOpenCourseDropdown(false)
  }

  return (
    <header
      onClick={closeAllDropdowns}
      className="relative flex h-12 w-full flex-none items-center justify-between border-b border-(--line,#25313E) bg-(--bg-bar,#101821) px-4 text-xs select-none"
    >
      {/* Left: Scope Selectors (Year, Sem, Course) */}
      <div
        className="relative flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Year Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setOpenYearDropdown(!openYearDropdown)
              setOpenSemDropdown(false)
              setOpenCourseDropdown(false)
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-(--bg-raise,#1C2833)/70 px-2.5 py-1.5 text-xs font-medium text-(--tx-dim,#8B98A7) transition-colors hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
          >
            <span>Year {selectedYear}</span>
            <ChevronDown className="h-3 w-3 text-(--tx-faint,#5C6976)" />
          </button>

          {openYearDropdown && (
            <div className="absolute top-full left-0 z-50 mt-1 flex w-32 flex-col rounded-lg border-0 bg-(--bg-panel,#121A23) p-1 shadow-2xl backdrop-blur-md">
              {YEARS.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => {
                    const target =
                      courses.find(
                        (c) => c.year === yr && c.semester === selectedSem
                      ) ||
                      courses.find((c) => c.year === yr) ||
                      courses[0]
                    // No courses at all: nothing to switch to. This used to
                    // read courses[0]!.id and crash the page for a new user.
                    if (target) onSwitchCourse(target.id)
                    setOpenYearDropdown(false)
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition-colors ${
                    selectedYear === yr
                      ? "bg-(--acc,#52A8EA)/15 font-semibold text-(--acc,#52A8EA)"
                      : "text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
                  }`}
                >
                  <span>Year {yr}</span>
                  {selectedYear === yr && (
                    <span className="text-xs font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sem Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setOpenSemDropdown(!openSemDropdown)
              setOpenYearDropdown(false)
              setOpenCourseDropdown(false)
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-(--bg-raise,#1C2833)/70 px-2.5 py-1.5 text-xs font-medium text-(--tx-dim,#8B98A7) transition-colors hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
          >
            <span>Sem {selectedSem}</span>
            <ChevronDown className="h-3 w-3 text-(--tx-faint,#5C6976)" />
          </button>

          {openSemDropdown && (
            <div className="absolute top-full left-0 z-50 mt-1 flex w-32 flex-col rounded-lg border-0 bg-(--bg-panel,#121A23) p-1 shadow-2xl backdrop-blur-md">
              {SEMESTERS.map((sm) => (
                <button
                  key={sm}
                  type="button"
                  onClick={() => {
                    const target =
                      courses.find(
                        (c) => c.year === selectedYear && c.semester === sm
                      ) ||
                      courses.find((c) => c.semester === sm) ||
                      courses[0]
                    if (target) onSwitchCourse(target.id)
                    setOpenSemDropdown(false)
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition-colors ${
                    selectedSem === sm
                      ? "bg-(--acc,#52A8EA)/15 font-semibold text-(--acc,#52A8EA)"
                      : "text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
                  }`}
                >
                  <span>Sem {sm}</span>
                  {selectedSem === sm && (
                    <span className="text-xs font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Course Selection Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setOpenCourseDropdown(!openCourseDropdown)
              setOpenYearDropdown(false)
              setOpenSemDropdown(false)
            }}
            className="flex max-w-72 cursor-pointer items-center gap-2 rounded-lg border-0 bg-(--bg-raise,#1C2833)/80 px-3 py-1.5 text-xs text-(--tx,#DCE3EA) shadow-xs transition-colors hover:bg-(--bg-hover,#213040)"
          >
            <span className="font-bold text-(--acc,#52A8EA)">
              {currentCourse.code}
            </span>
            <span className="truncate font-medium text-(--tx-dim,#8B98A7)">
              {currentCourse.name}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 text-(--tx-faint,#5C6976)" />
          </button>

          {openCourseDropdown && (
            <div className="absolute top-full left-0 z-50 mt-1 flex w-80 flex-col rounded-lg border-0 bg-(--bg-panel,#121A23) p-1.5 shadow-2xl backdrop-blur-md">
              <div className="px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-wider text-(--tx-faint,#5C6976) uppercase">
                Enrolled Courses · Year {selectedYear} Sem {selectedSem}
              </div>
              {displayedCourses.map((c) => {
                const isSelected = c.id === currentCourse.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSwitchCourse(c.id)
                      setOpenCourseDropdown(false)
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded px-2.5 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-(--acc,#52A8EA)/15 font-semibold text-(--acc,#52A8EA)"
                        : "text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono font-bold">{c.code}</span>
                      <span className="text-[11px] text-(--tx-dim,#8B98A7)">
                        {c.name}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="font-mono text-xs font-bold text-(--acc,#52A8EA)">
                        ACTIVE
                      </span>
                    )}
                  </button>
                )
              })}
              {displayedCourses.length === 0 && (
                <div className="px-2.5 py-2 text-[11px] text-(--tx-faint,#5C6976)">
                  No courses in this semester yet.
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpenCourseDropdown(false)
                  setIsCreateCourseOpen(true)
                }}
                className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded border-t border-(--line-soft,#1B2530) px-2.5 py-2 text-left text-xs font-medium text-(--acc,#52A8EA) transition-colors hover:bg-(--bg-hover,#213040)"
              >
                <Plus className="h-3.5 w-3.5" />
                Add course
              </button>
            </div>
          )}
        </div>
      </div>

      {isCreateCourseOpen && (
        <CreateCourseDialog
          open
          defaultYear={selectedYear}
          defaultSem={selectedSem}
          onOpenChange={setIsCreateCourseOpen}
          onCreate={onCreateCourse}
        />
      )}

      {/* Center: Brand Logo & Title. Absolutely centred, so it takes no room
          from the course selectors -- and below 1280 px a long course name
          ran underneath it. Hidden there; the selectors matter more. */}
      <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 sm:pointer-events-auto xl:flex">
        <img
          src="/ntbc-logo.png"
          alt="NotToBeCooked Logo"
          className="h-6 w-6 rounded object-contain"
        />
        <span className="text-[15px] font-bold tracking-wide text-(--tx,#DCE3EA)">
          NotToBeCooked
        </span>
      </div>

      {/* Right: User Profile. A search box sat here until 11 October 2026;
          nothing read what was typed into it (US-03 is not built), so it was
          removed rather than left looking like a working search. */}
      <div className="flex items-center gap-3">
        <UserProfileDropdown onLogout={onLogout} />
      </div>
    </header>
  )
}
