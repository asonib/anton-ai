/**
 * Minimal typings for pdf-parse v1. We import the library entry
 * (`pdf-parse/lib/pdf-parse.js`) instead of the package index, whose
 * "debug mode" tries to read a bundled test PDF when `module.parent` is unset.
 */
declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
    text: string;
  }
  interface PdfParseOptions {
    max?: number;
    version?: string;
  }
  function pdfParse(data: Buffer, options?: PdfParseOptions): Promise<PdfParseResult>;
  export = pdfParse;
}
