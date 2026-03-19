import { useState } from "react";
import { DateField } from "@/components/DateField";
import { DocsSheet } from "@/components/DocsSheet";
import { FeedbackSheet } from "@/components/FeedbackSheet";
import { FileUpload } from "@/components/FileUpload";
import { OptionalSectionsSelector } from "@/components/OptionalSectionsSelector";
import { ResultsPanel } from "@/components/ResultsPanel";
import { SampleMemoDialog } from "@/components/SampleMemoDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  type GenerateMemoResponse,
  type MaturitySchedule,
  type MemoSection,
  type PdfProcessingMetadata,
} from "@/types/generateMemo";
import { FileOutput, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/functions-js";
import { cn } from "@/lib/utils";

type ViewState = "upload" | "generating" | "results";

const LARGE_PDF_WARNING_BYTES = 6.5 * 1024 * 1024;
const LARGE_PDF_ERROR_MESSAGE =
  "This PDF may be too large for direct upload. Please try a smaller PDF and check the Docs tab for large-file tips.";

interface CachedMemoResult {
  signature: string;
  fileSignature: string;
  selectedSections: string[];
  memo: string;
  memoTitleHtml: string;
  memoSections: MemoSection[];
  maturitySchedule?: MaturitySchedule;
  pdfProcessing?: PdfProcessingMetadata;
}

const formatDateToMemoDisplay = (value: string) => {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 3) return "";
  const [year, month, day] = parts;
  if (!year || !month || !day) return "";
  return `${month}/${day}/${year}`;
};

const formatFileSizeDisplay = (bytes: number) =>
  `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;

      if (typeof result !== "string") {
        reject(new Error("Failed to read PDF file"));
        return;
      }

      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };

    reader.onerror = () => reject(new Error("Failed to read PDF file"));
    reader.readAsDataURL(file);
  });

const extractFunctionsErrorMessage = async (error: unknown) => {
  if (!(error instanceof FunctionsHttpError)) {
    return error instanceof Error ? error.message : "An error occurred. Please try again.";
  }

  const response = error.context as Response | undefined;

  if (!response) {
    return error.message;
  }

  if (response.status === 546) {
    return LARGE_PDF_ERROR_MESSAGE;
  }

  try {
    const payload = await response.clone().json();

    if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      const errorText =
        typeof record.error === "string" && record.error.trim()
          ? record.error.trim()
          : error.message;
      const source =
        typeof record.source === "string" && record.source.trim()
          ? ` [source: ${record.source.trim()}]`
          : "";

      return `${errorText}${source}`;
    }
  } catch {
    try {
      const text = await response.clone().text();

      if (text.trim()) {
        return text.trim();
      }
    } catch {
      return error.message;
    }
  }

  return error.message;
};

const buildRequestSignature = (options: {
  file: File;
  selectedSections: string[];
}) =>
  JSON.stringify({
    file: JSON.parse(buildFileSignature(options.file)) as {
      name: string;
      size: number;
      type: string;
      lastModified: number;
    },
    selectedSections: [...options.selectedSections].sort((a, b) =>
      a.localeCompare(b),
    ),
  });

const buildFileSignature = (file: File) =>
  JSON.stringify({
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  });

const normalizeOptionalSection = (section: string) => {
  const normalized = section.trim().replace(/\s+/g, " ");

  return normalized.toLowerCase() === "risks"
    ? "Investment Considerations"
    : normalized;
};

const toOptionalSectionKey = (section: string) =>
  normalizeOptionalSection(section).toLowerCase();

const isOptionalSectionSubset = (
  nextSections: string[],
  cachedSections: string[],
) => {
  const cachedSectionKeys = new Set(cachedSections.map(toOptionalSectionKey));

  return nextSections
    .map(toOptionalSectionKey)
    .every((sectionKey) => cachedSectionKeys.has(sectionKey));
};

const filterMemoSectionsForSelectedOptionalSections = (
  memoSections: MemoSection[],
  cachedSections: string[],
  nextSections: string[],
) => {
  const cachedSectionKeys = new Set(cachedSections.map(toOptionalSectionKey));
  const nextSectionKeys = new Set(nextSections.map(toOptionalSectionKey));

  return memoSections.filter((section) => {
    const sectionKey = toOptionalSectionKey(section.title);

    if (!cachedSectionKeys.has(sectionKey)) {
      return true;
    }

    return nextSectionKeys.has(sectionKey);
  });
};

const buildMemoHtmlFromSections = (
  memoTitleHtml: string,
  memoSections: MemoSection[],
  fallbackMemo: string,
) => {
  if (!memoTitleHtml.trim()) {
    return fallbackMemo;
  }

  return `${memoTitleHtml}${memoSections.map((section) => section.html).join("")}`;
};

const deriveSubsetCachedMemoResult = (
  cachedResult: CachedMemoResult,
  nextSelectedSections: string[],
): CachedMemoResult => {
  const memoSections = filterMemoSectionsForSelectedOptionalSections(
    cachedResult.memoSections,
    cachedResult.selectedSections,
    nextSelectedSections,
  );

  return {
    ...cachedResult,
    memoSections,
    memo: buildMemoHtmlFromSections(
      cachedResult.memoTitleHtml,
      memoSections,
      cachedResult.memo,
    ),
  };
};

const Index = () => {
  const [viewState, setViewState] = useState<ViewState>("upload");
  const [generationStage, setGenerationStage] = useState("Generating sales memo");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [generatedMemo, setGeneratedMemo] = useState("");
  const [generatedMemoTitleHtml, setGeneratedMemoTitleHtml] = useState("");
  const [generatedMemoSections, setGeneratedMemoSections] = useState<MemoSection[]>([]);
  const [generatedMaturitySchedule, setGeneratedMaturitySchedule] = useState<
    MaturitySchedule | undefined
  >();
  const [pdfProcessing, setPdfProcessing] = useState<
    PdfProcessingMetadata | undefined
  >();
  const [posMailDate, setPosMailDate] = useState("");
  const [pricingDate, setPricingDate] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [dealId, setDealId] = useState("");
  const [cachedMemoResult, setCachedMemoResult] = useState<CachedMemoResult | null>(
    null,
  );

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);

    if (file.size >= LARGE_PDF_WARNING_BYTES) {
      toast.warning(
        `${formatFileSizeDisplay(file.size)} PDF selected. Large files may fail direct upload. If needed, try a smaller PDF and check the Docs tab for large-file tips.`,
      );
    }
  };

  const applyCachedMemoResult = (result: CachedMemoResult) => {
    setGeneratedMemo(result.memo);
    setGeneratedMemoTitleHtml(result.memoTitleHtml);
    setGeneratedMemoSections(result.memoSections);
    setGeneratedMaturitySchedule(result.maturitySchedule);
    setPdfProcessing(result.pdfProcessing);
    setViewState("results");
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;

    const fileSignature = buildFileSignature(selectedFile);
    const requestSignature = buildRequestSignature({
      file: selectedFile,
      selectedSections,
    });

    if (cachedMemoResult?.signature === requestSignature) {
      applyCachedMemoResult(cachedMemoResult);
      toast.success("Loaded previous memo result");
      return;
    }

    if (
      cachedMemoResult?.fileSignature === fileSignature &&
      isOptionalSectionSubset(selectedSections, cachedMemoResult.selectedSections)
    ) {
      applyCachedMemoResult(
        deriveSubsetCachedMemoResult(cachedMemoResult, selectedSections),
      );
      toast.success("Loaded previous memo result");
      return;
    }

    setGenerationStage("Analyzing document");
    setGeneratedMaturitySchedule(undefined);
    setPdfProcessing(undefined);
    setViewState("generating");

    try {
      setGenerationStage("Generating sales memo");
      const pdfBase64 = await readFileAsBase64(selectedFile);

      const { data, error } =
        await supabase.functions.invoke<GenerateMemoResponse>("generate-memo", {
          body: {
            pdfBase64,
            optionalSections: selectedSections,
          },
        });

      if (error) {
        console.error("Error generating memo:", error);
        const errorMessage = await extractFunctionsErrorMessage(error);
        toast.error(errorMessage);
        setViewState("upload");
        return;
      }

      if (!data?.memo) {
        toast.error("No memo was returned.");
        setViewState("upload");
        return;
      }

      setGeneratedMemo(data.memo);
      setGeneratedMemoTitleHtml(data.memoTitleHtml ?? "");
      setGeneratedMemoSections(data.memoSections ?? []);
      setPdfProcessing(data.pdfProcessing);
      setViewState("results");
      setCachedMemoResult({
        signature: requestSignature,
        fileSignature,
        selectedSections: [...selectedSections],
        memo: data.memo,
        memoTitleHtml: data.memoTitleHtml ?? "",
        memoSections: data.memoSections ?? [],
        pdfProcessing: data.pdfProcessing,
      });

      if (data.pdfProcessing?.normalizationApplied) {
        toast.success(
          "Sales memo generated successfully. Document was auto-normalized first.",
        );
      } else if (data.pdfProcessing?.warning) {
        toast.warning(data.pdfProcessing.warning);
        toast.success("Sales memo generated successfully!");
      } else {
        toast.success("Sales memo generated successfully!");
      }
    } catch (error) {
      console.error("Error:", error);
      setPdfProcessing(undefined);
      const errorMessage = await extractFunctionsErrorMessage(error);
      toast.error(errorMessage);
      setViewState("upload");
    }
  };

  const handleStartOver = () => {
    setViewState("upload");
    setSelectedFile(null);
    setSelectedSections([]);
    setGeneratedMemo("");
    setGeneratedMemoTitleHtml("");
    setGeneratedMemoSections([]);
    setGeneratedMaturitySchedule(undefined);
    setPdfProcessing(undefined);
    setGenerationStage("Generating sales memo");
    setPosMailDate("");
    setPricingDate("");
    setClosingDate("");
    setDealId("");
    setCachedMemoResult(null);
  };

  const handleGoBack = () => {
    setViewState("upload");
  };

  const handleMaturityScheduleChange = (value?: MaturitySchedule) => {
    setGeneratedMaturitySchedule(value);
    setCachedMemoResult((currentResult) =>
      currentResult
        ? {
            ...currentResult,
            maturitySchedule: value,
          }
        : currentResult,
    );
  };

  const hasMobileUtilityDock = viewState !== "generating";

  return (
    <div className="flex min-h-[100svh] flex-col bg-background">
      {/* Header */}
      <header className="app-safe-top sticky top-0 z-50 bg-gradient-hero">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 md:py-4 lg:px-8">
          <div className="flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="hover-pop rounded-md p-1 text-primary-foreground/80 transition-all duration-150 hover:bg-white/10 hover:text-white"
                  aria-label="Reset memo generator"
                >
                  <FileOutput className="h-7 w-7" />
                </button>
                <h1 className="text-xl font-bold text-primary-foreground md:text-2xl">
                  Sales Memo Generator
                </h1>
              </div>
              <p className="ml-10 mt-1 text-sm text-primary-foreground/72">
                Summarize financial documents in seconds
              </p>
            </div>

            <div className="ml-10 hidden flex-wrap gap-1 md:ml-0 md:flex md:justify-end">
              <DocsSheet />
              <SampleMemoDialog />
              <FeedbackSheet />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn(viewState === "generating" ? "flex-1" : "md:flex-1")}>
        <div className="max-w-4xl mx-auto px-4 pt-8 pb-4 sm:px-6 md:pb-6 lg:px-8">
          {viewState === "upload" && (
            <div className="mx-auto max-w-[760px] rounded-xl border border-gray-200 bg-white p-7 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
              <div className="space-y-5">
                <div>
                  <h2 className="mb-2 text-xl font-semibold tracking-[-0.2px] text-foreground">
                    Document Upload
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Upload a <span className="font-semibold">word-searchable</span>{" "}
                    offering document to get started
                  </p>
                </div>

                <FileUpload
                  selectedFile={selectedFile}
                  onFileSelect={handleFileSelect}
                  onClearFile={() => setSelectedFile(null)}
                />

                <OptionalSectionsSelector
                  selectedSections={selectedSections}
                  onSectionsChange={setSelectedSections}
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="deal-id"
                      className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      Deal ID
                    </label>
                    <Input
                      id="deal-id"
                      value={dealId}
                      onChange={(event) => setDealId(event.target.value)}
                      className="h-auto rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-all duration-150 focus-visible:border-[#3f6285] focus-visible:ring-2 focus-visible:ring-[#3f6285]/20 focus-visible:ring-offset-0"
                      placeholder="Enter deal ID"
                    />
                  </div>
                  <DateField
                    id="pos-mail-date"
                    label="Mailing"
                    value={posMailDate}
                    onChange={setPosMailDate}
                  />
                  <DateField
                    id="pricing-date"
                    label="Pricing"
                    value={pricingDate}
                    onChange={setPricingDate}
                  />
                  <DateField
                    id="closing-date"
                    label="Closing"
                    value={closingDate}
                    onChange={setClosingDate}
                  />
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={!selectedFile}
                    size="lg"
                    className="w-full bg-[linear-gradient(135deg,#ff7a1a_0%,#f97316_100%)] font-semibold tracking-[0.2px] text-accent-foreground shadow-md transition-all duration-150 hover:-translate-y-[1px] hover:shadow-lg hover:shadow-orange-500/25 disabled:hover:translate-y-0 disabled:hover:shadow-md"
                  >
                    <Wand2 className="mr-2 h-5 w-5" />
                    Generate Memo
                  </Button>
                </div>
              </div>
            </div>
          )}

          {viewState === "generating" && (
            <div className="bg-card border border-border rounded-lg shadow-lift p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {generationStage}
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Scanning the PDF, normalizing content, and
                  generating your custom sales memo. Ready for you shortly!
                </p>
              </div>
            </div>
          )}

          {viewState === "results" && (
            <ResultsPanel
              memo={generatedMemo}
              maturitySchedule={generatedMaturitySchedule}
              onMaturityScheduleChange={handleMaturityScheduleChange}
              memoSections={generatedMemoSections}
              memoTitleHtml={generatedMemoTitleHtml}
              scheduleOverrides={{
                dealId: dealId.trim(),
                posMail: formatDateToMemoDisplay(posMailDate),
                pricing: formatDateToMemoDisplay(pricingDate),
                closing: formatDateToMemoDisplay(closingDate),
              }}
              onGoBack={handleGoBack}
              onStartOver={handleStartOver}
              pdfProcessing={pdfProcessing}
            />
          )}
        </div>
      </main>

      {hasMobileUtilityDock && (
        <div className="mobile-utility-dock fixed inset-x-0 bottom-0 z-40 px-4 pb-4 md:hidden">
          <div className="mx-auto grid max-w-[19rem] grid-cols-3 gap-2.5">
            <DocsSheet
              triggerClassName="mobile-utility-button h-14 w-full flex-col gap-1 rounded-[0.9rem] border-0 px-2 hover:text-accent"
              iconClassName="h-4 w-4"
              labelClassName="text-[11px] font-semibold tracking-[0.02em]"
            />
            <SampleMemoDialog
              triggerClassName="mobile-utility-button h-14 w-full flex-col gap-1 rounded-[0.9rem] border-0 px-2 hover:text-accent"
              iconClassName="h-4 w-4"
              labelClassName="text-[11px] font-semibold tracking-[0.02em]"
            />
            <FeedbackSheet
              triggerClassName="mobile-utility-button h-14 w-full flex-col gap-1 rounded-[0.9rem] border-0 px-2 hover:text-accent"
              iconClassName="h-4 w-4"
              labelClassName="text-[11px] font-semibold tracking-[0.02em]"
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        className={cn(
          "max-w-7xl mx-auto w-full px-4 pt-2 sm:px-6 lg:px-8",
          hasMobileUtilityDock ? "pb-[5.75rem] md:pb-6" : "pb-6",
        )}
      >
        <div className="text-center text-xs text-gray-400">
          <p>
            © 2026. Designed and deployed by{" "}
            <a
              href="https://tryshipyard.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="text-hover-link hover-pop-text"
            >
              Arseni Sutton.
            </a>
            <span className="block md:inline">
              {" "}Review outputs prior to distribution.
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
