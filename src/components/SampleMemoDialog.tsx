import { useEffect } from "react";
import { FileBadge } from "lucide-react";

import { PdfPageStack } from "@/components/PdfPageStack";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { preloadPdfDocument } from "@/lib/pdfPreview";

const SAMPLE_MEMO_PDF_URL = "/spm-sample-v1.pdf";

export const SampleMemoDialog = () => {
  useEffect(() => {
    preloadPdfDocument(SAMPLE_MEMO_PDF_URL);
  }, []);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hover-pop h-8 px-2 text-primary-foreground hover:bg-white/10 hover:text-accent"
        >
          <FileBadge className="h-4 w-4" />
          Sample
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full border-border bg-background sm:max-w-xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <SheetHeader className="border-b border-border pb-4 text-left">
          <SheetTitle>Sample Memo</SheetTitle>
          <SheetDescription>
            Preview of the generated memo output
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 overflow-y-auto">
          <PdfPageStack
            pdfUrl={SAMPLE_MEMO_PDF_URL}
            title="Sample Memo"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
