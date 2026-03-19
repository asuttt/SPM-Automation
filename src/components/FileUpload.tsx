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
            "group relative cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-all duration-150",
            "hover:border-[#3f6285] hover:bg-[#f0f4f8]",
            isDragging
              ? "scale-[1.01] border-[#3f6285] bg-[#f0f4f8] shadow-[0_18px_38px_-24px_rgba(63,98,133,0.32)]"
              : "hover:shadow-[0_18px_38px_-24px_rgba(63,98,133,0.22)]"
          )}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="flex flex-col items-center justify-center py-8 px-6">
            <div
              className={cn(
                "mb-4 flex h-18 w-18 items-center justify-center rounded-full transition-all duration-150",
                isDragging
                  ? "bg-[#3f6285]/10"
                  : "bg-[#F9FAFB] group-hover:bg-[#3f6285]/10",
              )}
            >
              <Upload
                className={cn(
                  "h-9 w-9 transition-colors duration-150",
                  isDragging
                    ? "text-[#3f6285]"
                    : "text-[#3f6285] group-hover:text-[#355775]",
                )}
              />
            </div>
            <h3 className="mb-2 text-lg font-semibold tracking-[-0.2px] text-foreground">
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
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[#3f6285]/10">
                <FileText className="h-5 w-5 text-[#3f6285]" />
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
              className="dismiss-button hover-pop flex-shrink-0"
              aria-label="Remove file"
            >
              <X className="dismiss-icon" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
