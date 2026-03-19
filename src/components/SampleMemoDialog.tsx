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
import { cn } from "@/lib/utils";

const SAMPLE_MEMO_PDF_URL = "/spm-sample-v1.pdf";

interface SampleMemoDialogProps {
  triggerClassName?: string;
  iconClassName?: string;
  labelClassName?: string;
}

export const SampleMemoDialog = ({
  triggerClassName,
  iconClassName,
  labelClassName,
}: SampleMemoDialogProps) => {
  useEffect(() => {
    preloadPdfDocument(SAMPLE_MEMO_PDF_URL);
  }, []);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2 text-white/70 transition-all duration-150 hover:bg-white/10 hover:text-white",
            triggerClassName,
          )}
        >
          <FileBadge className={cn("h-4 w-4", iconClassName)} />
          <span className={labelClassName}>Sample</span>
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
