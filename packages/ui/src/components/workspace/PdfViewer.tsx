import { useEffect, useRef, useState } from "react"
import {
  GlobalWorkerOptions,
  TextLayer,
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist"
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import { LoaderCircle } from "lucide-react"

import { quoteItemIndices } from "../../lib/pdfHighlight"
import "./pdf-text-layer.css"

GlobalWorkerOptions.workerSrc = workerUrl

interface PdfViewerProps {
  /** Object URL of the PDF's bytes, from useFileContent. */
  url: string
  page: number
  /** 100 = page width fits the reader. */
  zoom: number
  /** Quotes to highlight on this page; empty for none. */
  quotes: readonly string[]
  /** Told whether the quotes were found, so the caller can fall back. */
  onQuoteFound?: (found: boolean) => void
}

/**
 * One PDF page drawn by pdf.js: a canvas, with a transparent text layer over
 * it that makes the text selectable and lets a cited quote be marked (US-13).
 *
 * Until 11 October 2026 the reader was the browser's own PDF viewer in an
 * iframe, which a web page cannot draw into -- so a citation could open the
 * right page but never point at the line. This file is loaded lazily, so
 * pdf.js (and its 1.2 MB worker) is fetched only when a PDF is opened.
 */
export default function PdfViewer({
  url,
  page,
  zoom,
  quotes,
  onQuoteFound,
}: PdfViewerProps) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [width, setWidth] = useState(0)
  const frameRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const quoteKey = quotes.join("\u0000")

  // Load the document once per URL.
  useEffect(() => {
    let cancelled = false
    const task = getDocument({ url })
    task.promise.then(
      (loaded) => {
        // A cancelled load is torn down by task.destroy() below.
        if (!cancelled) setDoc(loaded)
      },
      (err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not open this PDF."
          )
        }
      }
    )
    return () => {
      cancelled = true
      setDoc(null)
      void task.destroy()
    }
  }, [url])

  // Fit to the reader's width, and follow it when the panes are resized.
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry!.contentRect.width))
    )
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  // Draw the page, then its text layer, then mark the quote.
  useEffect(() => {
    if (!doc || width === 0) return
    let cancelled = false
    let renderTask: { cancel: () => void } | null = null
    let textLayer: TextLayer | null = null

    void (async () => {
      const pdfPage = await doc.getPage(
        Math.min(Math.max(page, 1), doc.numPages)
      )
      if (cancelled) return
      const fit = width / pdfPage.getViewport({ scale: 1 }).width
      const viewport = pdfPage.getViewport({ scale: fit * (zoom / 100) })

      const canvas = canvasRef.current!
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.floor(viewport.width * ratio)
      canvas.height = Math.floor(viewport.height * ratio)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`
      pageRef.current!.style.setProperty(
        "--scale-factor",
        String(viewport.scale)
      )

      const task = pdfPage.render({
        canvas,
        viewport,
        transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
      })
      renderTask = task
      await task.promise.catch(() => undefined)
      if (cancelled) return

      const container = textRef.current!
      container.replaceChildren()
      textLayer = new TextLayer({
        textContentSource: await pdfPage.getTextContent(),
        container,
        viewport,
      })
      await textLayer.render()
      if (cancelled) return

      const items = textLayer.textContentItemsStr
      const divs = textLayer.textDivs
      const marked = new Set(quotes.flatMap((q) => quoteItemIndices(items, q)))
      marked.forEach((index) => divs[index]?.classList.add("ntbc-quote"))
      if (quotes.length > 0) {
        onQuoteFound?.(marked.size > 0)
        const first = Math.min(...marked)
        divs[first]?.scrollIntoView({ block: "center" })
      }
    })().catch((err: unknown) => {
      if (!cancelled) {
        setError(
          err instanceof Error ? err.message : "Could not draw this page."
        )
      }
    })

    return () => {
      cancelled = true
      renderTask?.cancel()
      textLayer?.cancel()
    }
    // quoteKey stands in for `quotes`, whose identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, page, zoom, width, quoteKey, onQuoteFound])

  if (error) {
    return (
      <p role="alert" className="text-xs text-(--danger-tx,#F0A19D)">
        {error}
      </p>
    )
  }

  return (
    <div ref={frameRef} className="w-full">
      {!doc && (
        <div className="flex items-center gap-2 text-xs text-(--tx-dim,#8B98A7)">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Opening PDF…
        </div>
      )}
      <div
        ref={pageRef}
        className="ntbc-pdf-page relative mx-auto w-fit bg-white shadow-sm"
      >
        <canvas ref={canvasRef} className="block" />
        <div ref={textRef} className="textLayer" />
      </div>
    </div>
  )
}
