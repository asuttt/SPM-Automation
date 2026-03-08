import { useCallback, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
}

export const FileUpload = ({ onFileSelect, selectedFile, onClearFile }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf") {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf") {
        onFileSelect(file);
      }
    }
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "hover-pop group relative cursor-pointer rounded-lg border-2 border-dashed",
            "hover:border-accent hover:bg-secondary/50",
            isDragging
              ? "scale-[1.02] border-accent bg-accent/10 shadow-[0_18px_38px_-24px_hsl(var(--accent)/0.65)]"
              : "border-border bg-card hover:shadow-[0_18px_38px_-24px_hsl(var(--primary)/0.22)]"
          )}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div
              className={cn(
                "mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-colors duration-300 ease-out",
                isDragging
                  ? "bg-accent/10"
                  : "bg-secondary group-hover:bg-accent/10",
              )}
            >
              <Upload
                className={cn(
                  "h-8 w-8 transition-colors duration-300 ease-out",
                  isDragging
                    ? "text-accent"
                    : "text-muted-foreground group-hover:text-accent",
                )}
              />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Upload Document
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Drag and drop your PDF, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              (POS, Prospectus, OM, Circular, etc.)
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-gradient-card p-4 shadow-elegant">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-accent/10">
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={onClearFile}
              className="hover-pop flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md hover:bg-destructive/10"
              aria-label="Remove file"
            >
              <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
