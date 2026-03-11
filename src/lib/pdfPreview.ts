import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PDFJS_LOAD_OPTIONS = {
  disableAutoFetch: true,
  disableRange: true,
  disableStream: true,
  isEvalSupported: false,
  useWorkerFetch: false,
  verbosity: pdfjsLib.VerbosityLevel.ERRORS,
} as const;

const pdfDocumentCache = new Map<string, Promise<pdfjsLib.PDFDocumentProxy>>();

const createPdfDocumentPromise = (pdfUrl: string) => {
  const loadingTask = pdfjsLib.getDocument({
    url: pdfUrl,
    ...PDFJS_LOAD_OPTIONS,
  });

  return loadingTask.promise.catch((error) => {
    pdfDocumentCache.delete(pdfUrl);
    throw error;
  });
};

export const getPdfDocument = (pdfUrl: string) => {
  const cachedDocument = pdfDocumentCache.get(pdfUrl);

  if (cachedDocument) {
    return cachedDocument;
  }

  const documentPromise = createPdfDocumentPromise(pdfUrl);
  pdfDocumentCache.set(pdfUrl, documentPromise);

  return documentPromise;
};

export const preloadPdfDocument = (pdfUrl: string) => {
  void getPdfDocument(pdfUrl);
};
