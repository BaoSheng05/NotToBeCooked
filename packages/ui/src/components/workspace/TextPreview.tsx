import { useEffect, useMemo, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { api, isApiClientError } from "@workspace/contracts"
import { Clock3, Download, LoaderCircle } from "lucide-react"

import type { FileStatus } from "../../types/course"
import type { CitationItem } from "../../lib/citations"
import { highlightSegments } from "../../lib/quoteMatch"
import { Button } from "../button"

interface TextPreviewProps {
  fileId: string
  fileName: string
  status: FileStatus | undefined
  page: number
  /** The citation being viewed, when it points into this file. */
  citation: CitationItem | null
  isVisible: boolean
  isDownloading: boolean
  onDownload: () => void
}

/**
 * The reader for DOCX, PPTX, Markdown and plain text (US-08): the file's
 * indexed text, passage by passage, with a cited quote highlighted (US-13).
 * It is the text the AI read, so every verified quote can be found in it.
 */
export function TextPreview({
  fileId,
  fileName,
  status,
  page,
  citation,
  isVisible,
  isDownloading,
  onDownload,
}: TextPreviewProps) {
  const query = useQuery({
    queryKey: ["files", fileId, "text"],
    queryFn: () => api.files.text(fileId),
    enabled: isVisible && status === "ready",
  })

  const passages = useMemo(() => query.data?.passages ?? [], [query.data])
  const quotes = useMemo(
    () =>
      citation
        ? (citation.quotes ?? (citation.quote ? [citation.quote] : []))
        : [],
    [citation]
  )
  const pageCount = new Set(passages.map((p) => p.page_start)).size
  const unit = fileName.toLowerCase().endsWith(".pptx") ? "Slide" : "Page"

  // Which passage to bring into view: the first one holding a cited quote,
  // otherwise the first one on the page the tab is on.
  const segmented = useMemo(
    () => passages.map((p) => highlightSegments(p.text, quotes)),
    [passages, quotes]
  )
  const target = useMemo(() => {
    const quoted = segmented.findIndex((s) => s.some((run) => run.mark))
    if (quoted >= 0) return quoted
    return passages.findIndex((p) => (p.page_start ?? 1) >= page)
  }, [segmented, passages, page])

  const refs = useRef<(HTMLElement | null)[]>([])
  useEffect(() => {
    if (!isVisible || target < 0) return
    refs.current[target]?.scrollIntoView({ block: "center" })
  }, [isVisible, target])

  if (status !== "ready") {
    return (
      <Notice
        title={
          status === "failed"
            ? "No preview: indexing failed"
            : "Preview appears once indexing finishes"
        }
        body="This file is shown from the text the AI reads, which exists only after indexing. The original is available to download."
        isDownloading={isDownloading}
        onDownload={onDownload}
      />
    )
  }

  if (query.isPending) {
    return (
      <div className="flex items-center gap-2 text-xs text-(--tx-dim,#8B98A7)">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading text…
      </div>
    )
  }

  if (query.isError) {
    return (
      <Notice
        title="Couldn’t load the text"
        body={
          isApiClientError(query.error)
            ? query.error.message
            : "Try again, or download the original."
        }
        isDownloading={isDownloading}
        onDownload={onDownload}
      />
    )
  }

  return (
    <article className="mx-auto w-full max-w-3xl rounded-sm border border-(--line,#25313E) bg-(--bg-panel,#121A23) px-6 py-5 text-[13.5px] leading-relaxed text-(--tx,#DCE3EA)">
      {passages.map((passage, index) => {
        const header =
          pageCount > 1 &&
          (index === 0 ||
            passages[index - 1]!.page_start !== passage.page_start)
            ? `${unit} ${passage.page_start ?? "?"}`
            : null
        return (
          <section
            key={index}
            ref={(el) => {
              refs.current[index] = el
            }}
            className="mb-3"
          >
            {header && (
              <h3 className="mt-4 mb-1.5 font-mono text-[11px] font-semibold tracking-wider text-(--tx-faint,#5C6976) uppercase first:mt-0">
                {header}
              </h3>
            )}
            <p className="whitespace-pre-wrap">
              {segmented[index]!.map((run, i) =>
                run.mark ? (
                  <mark
                    key={i}
                    className="rounded-xs bg-(--cite-bg-strong,rgba(227,166,63,0.35)) px-0.5 text-inherit"
                  >
                    {run.text}
                  </mark>
                ) : (
                  <span key={i}>{run.text}</span>
                )
              )}
            </p>
          </section>
        )
      })}
    </article>
  )
}

function Notice({
  title,
  body,
  isDownloading,
  onDownload,
}: {
  title: string
  body: string
  isDownloading: boolean
  onDownload: () => void
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-10 text-center text-xs text-(--tx-dim,#8B98A7)">
      <Clock3 className="h-6 w-6 text-(--acc,#52A8EA)" />
      <p className="text-sm font-semibold text-(--tx,#DCE3EA)">{title}</p>
      <p>{body}</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isDownloading}
        onClick={onDownload}
      >
        <Download />
        {isDownloading ? "Downloading…" : "Download original"}
      </Button>
    </div>
  )
}
