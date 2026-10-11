// Vite turns `import x from "file?url"` into the file's served URL. The web
// app gets this declaration from vite/client; this package typechecks on its
// own, so it carries the one piece it uses -- the pdf.js worker's URL.
declare module "*?url" {
  const url: string
  export default url
}

// A plain stylesheet import, bundled by Vite (PdfViewer's text-layer rules).
declare module "*.css"
