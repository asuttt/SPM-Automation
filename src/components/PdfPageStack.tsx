import { useEffect, useRef, useState } from "react";
import { getPdfDocument } from "@/lib/pdfPreview";

interface PdfPageStackProps {
  pdfUrl: string;
  title: string;
}

export const PdfPageStack = ({ pdfUrl, title }: PdfPageStackProps) => {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [showLoading, setShowLoading] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const element = frameRef.current;

    if (!element) {
      return;
    }

    const updateSize = () => {
      setViewportWidth(element.clientWidth);
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const container = containerRef.current;

    if (!container || viewportWidth === 0) {
      return;
    }

    container.innerHTML = "";
    setStatus("loading");
    setShowLoading(false);

    const loadingIndicatorTimeout = window.setTimeout(() => {
      if (!isCancelled) {
        setShowLoading(true);
      }
    }, 150);

    const renderPdf = async () => {
      try {
        const pdf = await getPdfDocument(pdfUrl);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (isCancelled) {
            return;
          }

          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const cssScale = Math.min((viewportWidth - 8) / baseViewport.width, 1.35);
          const pixelScale = Math.max(cssScale * window.devicePixelRatio, 1);
          const viewport = page.getViewport({ scale: pixelScale });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Canvas rendering unavailable");
          }

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${baseViewport.width * cssScale}px`;
          canvas.style.height = `${baseViewport.height * cssScale}px`;
          canvas.className = "rounded-md border border-border bg-white shadow-sm";

          const wrapper = document.createElement("div");
          wrapper.className = "flex justify-center overflow-hidden rounded-md";
          wrapper.appendChild(canvas);
          container.appendChild(wrapper);

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;
        }

        if (!isCancelled) {
          window.clearTimeout(loadingIndicatorTimeout);
          setShowLoading(false);
          setStatus("ready");
        }
      } catch (error) {
        console.error(`Failed to render PDF preview for ${title}:`, error);
        if (!isCancelled) {
          window.clearTimeout(loadingIndicatorTimeout);
          setShowLoading(false);
          setStatus("error");
        }
      }
    };

    void renderPdf();

    return () => {
      isCancelled = true;
      window.clearTimeout(loadingIndicatorTimeout);
      container.innerHTML = "";
    };
  }, [pdfUrl, title, viewportWidth]);

  return (
    <div ref={frameRef} className="space-y-4">
      {status === "loading" && showLoading && (
        <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
          Rendering sample pages...
        </div>
      )}

      {status === "error" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Unable to render the sample PDF preview
        </div>
      )}

      <div ref={containerRef} className="space-y-4" />
    </div>
  );
};
