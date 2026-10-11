import React, { useCallback, useEffect, useRef } from "react"
import type { Tab } from "../../store/workspace"
import { TabItem } from "./TabItem"

export interface TabBarProps {
  tabs: Tab[]
  activeFileId: string | null
  onSelectTab: (tab: Tab) => void
  onCloseTab: (fileId: string) => void
  rightActions?: React.ReactNode
  className?: string
}

export const TabBar: React.FC<TabBarProps> = React.memo(
  ({
    tabs,
    activeFileId,
    onSelectTab,
    onCloseTab,
    rightActions,
    className = "",
  }) => {
    const handleSelect = useCallback(
      (tab: Tab) => {
        onSelectTab(tab)
      },
      [onSelectTab]
    )

    const handleClose = useCallback(
      (fileId: string) => {
        onCloseTab(fileId)
      },
      [onCloseTab]
    )

    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
      if (e.deltaY !== 0) {
        e.currentTarget.scrollLeft += e.deltaY
      }
    }, [])

    // Bring the active tab into view when it changes. With several tabs in a
    // narrow pane, a newly opened file's tab landed past the right edge and
    // the row gave no sign it was there.
    const rowRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
      rowRef.current
        ?.querySelector('[aria-selected="true"]')
        ?.scrollIntoView({ inline: "nearest", block: "nearest" })
    }, [activeFileId, tabs.length])

    if (tabs.length === 0) {
      return null
    }

    return (
      <header
        role="tablist"
        aria-label="Open documents"
        className={`flex h-9 flex-none items-center justify-between border-b border-(--line,#25313E) bg-(--bg-bar,#101821) px-1.5 ${className}`}
      >
        {/* Scrollable Tabs Row */}
        <div
          ref={rowRef}
          onWheel={handleWheel}
          className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none overscroll-contain"
        >
          {tabs.map((tab) => (
            <TabItem
              key={tab.fileId}
              tab={tab}
              isActive={tab.fileId === activeFileId}
              onSelect={handleSelect}
              onClose={handleClose}
            />
          ))}
        </div>

        {/* Right Actions Slot (e.g. Fullscreen Toggle, Split View) */}
        {rightActions && (
          <div className="flex shrink-0 items-center gap-1.5 pl-2 pr-1">
            {rightActions}
          </div>
        )}
      </header>
    )
  }
)

TabBar.displayName = "TabBar"
