import { useEffect, useState } from "react";
import { Copy, Download, FileDown } from "lucide-react";

import { ExportBrandingSelector, DEFAULT_EXPORT_BRANDING } from "@/components/ExportBrandingSelector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ExportBrandingSelection } from "@/types/export";

interface ExportMenuProps {
  onCopyPlainText: () => void | Promise<void>;
  onCopyRichText: () => void | Promise<void>;
  onExportDocx: (branding: ExportBrandingSelection) => void | Promise<void>;
  branding?: ExportBrandingSelection;
  onBrandingChange?: (branding: ExportBrandingSelection) => void;
  triggerClassName?: string;
}

export const ExportMenu = ({
  onCopyPlainText,
  onCopyRichText,
  onExportDocx,
  branding = DEFAULT_EXPORT_BRANDING,
  onBrandingChange,
  triggerClassName,
}: ExportMenuProps) => {
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isDocxDialogOpen, setIsDocxDialogOpen] = useState(false);
  const [selectedBranding, setSelectedBranding] =
    useState<ExportBrandingSelection>(branding);

  useEffect(() => {
    setSelectedBranding(branding);
  }, [branding]);

  const handleBrandingChange = (nextBranding: ExportBrandingSelection) => {
    setSelectedBranding(nextBranding);
    onBrandingChange?.(nextBranding);
  };

  const handleDownloadDocx = async () => {
    await onExportDocx(selectedBranding);
    setIsDocxDialogOpen(false);
  };

  const handleCopyPlainText = async () => {
    await onCopyPlainText();
    setIsCopyDialogOpen(false);
  };

  const handleCopyRichText = async () => {
    await onCopyRichText();
    setIsCopyDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              "h-10 w-10 border-accent/25 bg-accent/10 p-0 text-accent hover:bg-accent/15 hover:text-[hsl(var(--accent-hover))] md:h-9 md:w-auto md:px-3",
              triggerClassName,
            )}
          >
            <Download className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Export</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setIsCopyDialogOpen(true);
            }}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setIsDocxDialogOpen(true);
            }}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            Export DOCX
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Memo</DialogTitle>
            <DialogDescription>
              Choose how you want the memo copied to the clipboard
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-2">
            <Button
              type="button"
              variant="secondary"
              className="justify-start"
              onClick={handleCopyRichText}
            >
              Copy for Word
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="justify-start"
              onClick={handleCopyPlainText}
            >
              Copy Plain Text
            </Button>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="secondary" onClick={() => setIsCopyDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDocxDialogOpen} onOpenChange={setIsDocxDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Export DOCX</DialogTitle>
            <DialogDescription>
              Choose a logo for the memo before downloading
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <ExportBrandingSelector
              value={selectedBranding}
              onValueChange={handleBrandingChange}
              className="w-full items-center justify-between"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="secondary" onClick={() => setIsDocxDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-accent text-accent-foreground hover:[background-color:hsl(var(--accent-hover))]"
              onClick={handleDownloadDocx}
            >
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
