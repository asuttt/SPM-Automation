import { useEffect, useRef, useState } from "react";
import { FunctionsHttpError } from "@supabase/functions-js";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type ExtractMaturityScheduleResponse,
  type MaturitySchedule,
} from "@/types/generateMemo";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface MaturityScheduleCaptureProps {
  disabled?: boolean;
  value?: MaturitySchedule;
  onChange: (value?: MaturitySchedule) => void;
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;

      if (typeof result !== "string") {
        reject(new Error("Failed to read image"));
        return;
      }

      resolve(result);
    };

    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });

const isImageFile = (file: File) => file.type.startsWith("image/");

const extractFunctionsErrorMessage = async (error: unknown) => {
  if (!(error instanceof FunctionsHttpError)) {
    return error instanceof Error ? error.message : "Unable to extract maturity schedule.";
  }

  const response = error.context as Response | undefined;

  if (!response) {
    return error.message;
  }

  try {
    const payload = await response.clone().json();
    const message =
      payload &&
      typeof payload === "object" &&
      typeof (payload as Record<string, unknown>).error === "string"
        ? (payload as Record<string, unknown>).error
        : error.message;

    return message;
  } catch {
    return error.message;
  }
};

export const MaturityScheduleCapture = ({
  disabled,
  value,
  onChange,
}: MaturityScheduleCaptureProps) => {
  const [open, setOpen] = useState(false);
  const [previewDataUrls, setPreviewDataUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!value) {
      setPreviewDataUrls([]);
    }
  }, [value]);

  const handleImageFiles = async (files: File[]) => {
    const imageFiles = files.filter(isImageFile);

    if (imageFiles.length === 0) {
      toast.error("Please use image screenshots for the maturity schedule.");
      return;
    }

    if (imageFiles.length !== files.length) {
      toast.error("Some files were skipped because they were not images.");
    }

    const nextDataUrls = await Promise.all(imageFiles.map(readFileAsDataUrl));
    setPreviewDataUrls((current) => [...current, ...nextDataUrls]);
  };

  const handleConfirm = async () => {
    if (previewDataUrls.length === 0) {
      return;
    }

    setIsExtracting(true);

    try {
      const { data, error } =
        await supabase.functions.invoke<ExtractMaturityScheduleResponse>(
          "extract-maturity-schedule",
          {
            body: {
              imageDataUrls: previewDataUrls,
            },
          },
        );

      if (error) {
        throw error;
      }

      if (!data?.maturitySchedule?.series?.length) {
        toast.error("No maturity schedule tables could be extracted.");
        return;
      }

      onChange(data.maturitySchedule);
      toast.success("Maturity schedule extracted.");
      setOpen(false);
    } catch (error) {
      const message = await extractFunctionsErrorMessage(error);
      toast.error(message);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="text-sm font-semibold text-accent transition-colors hover:text-[hsl(var(--accent-hover))] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {value ? "Edit Maturity Schedule" : "+ Add Maturity Schedule"}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[25rem] border-border p-0"
          collisionPadding={12}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              Insert Screenshot
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Paste or upload the maturity schedule. You&apos;ll get an immediate image preview before extraction
            </p>
          </div>

          <div className="space-y-3 p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (event) => {
                const files = Array.from(event.target.files ?? []);

                if (files.length === 0) {
                  return;
                }

                await handleImageFiles(files);
                event.target.value = "";
              }}
            />

            <div
              tabIndex={0}
              onPaste={async (event) => {
                const files = Array.from(event.clipboardData.items)
                  .filter((item) => item.type.startsWith("image/"))
                  .map((item) => item.getAsFile())
                  .filter((file): file is File => Boolean(file));

                if (files.length > 0) {
                  await handleImageFiles(files);
                }
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={async (event) => {
                event.preventDefault();
                setIsDragging(false);
                const files = Array.from(event.dataTransfer.files ?? []);

                if (files.length > 0) {
                  await handleImageFiles(files);
                }
              }}
              className={cn(
                "rounded-lg border border-dashed border-border bg-secondary/40 p-4 outline-none transition-colors",
                isDragging && "border-accent bg-accent/5",
                previewDataUrls.length > 0 && "border-solid bg-card",
              )}
            >
              {previewDataUrls.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {previewDataUrls.map((previewDataUrl, index) => (
                      <div
                        key={`${previewDataUrl.slice(0, 32)}-${index}`}
                        className="rounded-md border border-border bg-background p-2"
                      >
                        <img
                          src={previewDataUrl}
                          alt={`Maturity schedule preview ${index + 1}`}
                          className="h-32 w-full rounded object-contain"
                        />
                        <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                          Screenshot {index + 1}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Confirm to extract tables from these screenshots in the order shown above.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-accent hover:text-accent"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Add More Images
                  </button>
                </div>
              ) : (
                <div className="flex min-h-40 flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <ImagePlus className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Paste, drop, or upload screenshot
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    For best results, use tightly cropped image
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-accent hover:text-accent"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload Image
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {previewDataUrls.length > 0
                  ? `${previewDataUrls.length} screenshot${previewDataUrls.length === 1 ? "" : "s"} selected`
                  : value
                    ? `${value.series.length} series table${value.series.length === 1 ? "" : "s"} ready`
                    : "No schedule extracted yet"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewDataUrls([]);
                    onChange(undefined);
                  }}
                  className="dismiss-button h-8 w-auto rounded-md px-2.5 text-sm"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={previewDataUrls.length === 0 || isExtracting}
                  className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-sm font-semibold text-accent-foreground transition-colors hover:[background-color:hsl(var(--accent-hover))] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Extracting
                    </>
                  ) : (
                    "Generate"
                  )}
                </button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
