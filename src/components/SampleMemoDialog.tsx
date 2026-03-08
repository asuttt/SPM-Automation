import { FileBadge } from "lucide-react";

import { PdfPageStack } from "@/components/PdfPageStack";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const SampleMemoDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hover-pop h-8 px-2 text-primary-foreground hover:bg-white/10 hover:text-accent"
        >
          <FileBadge className="h-4 w-4" />
          Sample
        </Button>
      </DialogTrigger>
      <DialogContent
        className="h-[92vh] w-[min(92vw,780px)] max-w-none overflow-hidden border-border bg-background p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="border-b border-border px-6 py-4 text-left">
          <DialogTitle>Sample Memo</DialogTitle>
          <DialogDescription>
            Preview of the generated memo output
          </DialogDescription>
        </DialogHeader>

        <div className="h-[calc(92vh-81px)] overflow-y-auto px-5 py-4">
          <PdfPageStack
            pdfUrl="/sample-memo-placeholder.pdf"
            title="Sample Memo"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
