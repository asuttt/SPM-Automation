import { useState } from "react";
import { DateField } from "@/components/DateField";
import { DocsSheet } from "@/components/DocsSheet";
import { FeedbackSheet } from "@/components/FeedbackSheet";
import { FileUpload } from "@/components/FileUpload";
import { OptionalSectionsSelector } from "@/components/OptionalSectionsSelector";
import { ResultsPanel } from "@/components/ResultsPanel";
import { SampleMemoDialog } from "@/components/SampleMemoDialog";
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

type ViewState = "upload" | "generating" | "results";

const formatDateToMMDD = (value: string) => {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 3) return "";
  const [, month, day] = parts;
  if (!month || !day) return "";
  return `${month}/${day}`;
};

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

  const handleGenerate = async () => {
    if (!selectedFile) return;

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
            scheduleOverrides: {
              posMail: formatDateToMMDD(posMailDate),
              pricing: formatDateToMMDD(pricingDate),
              closing: formatDateToMMDD(closingDate),
            },
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
  };

  const handleGoBack = () => {
    setViewState("upload");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-hero border-b border-white/15 shadow-elegant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="hover-pop rounded-md p-1 text-accent hover:bg-white/10"
                  aria-label="Reset memo generator"
                >
                  <FileOutput className="h-7 w-7" />
                </button>
                <h1 className="text-2xl font-bold text-primary-foreground">
                  Sales Memo Generator
                </h1>
              </div>
              <p className="ml-10 mt-1.5 text-sm text-primary-foreground/75">
                Transform offering docs into standardized memos in seconds
              </p>
            </div>

            <div className="ml-10 flex flex-wrap gap-1 md:ml-0 md:justify-end">
              <DocsSheet />
              <SampleMemoDialog />
              <FeedbackSheet />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 pt-8 pb-6 sm:px-6 lg:px-8">
          {viewState === "upload" && (
            <div className="bg-card border border-border rounded-lg shadow-lift p-7">
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Document Upload
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Upload a <span className="font-semibold">word-searchable</span>{" "}
                    offering document to get started
                  </p>
                </div>

                <FileUpload
                  selectedFile={selectedFile}
                  onFileSelect={setSelectedFile}
                  onClearFile={() => setSelectedFile(null)}
                />

                <OptionalSectionsSelector
                  selectedSections={selectedSections}
                  onSectionsChange={setSelectedSections}
                />

                <div className="grid gap-4 sm:grid-cols-3">
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
                    className="hover-pop w-full bg-accent text-accent-foreground font-semibold shadow-lg hover:shadow-xl hover:[background-color:hsl(var(--accent-hover))] disabled:hover:translate-y-0 disabled:hover:scale-100"
                  >
                    <Wand2 className="mr-2 h-5 w-5" />
                    Generate Sales Memo
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
              onMaturityScheduleChange={setGeneratedMaturitySchedule}
              memoSections={generatedMemoSections}
              memoTitleHtml={generatedMemoTitleHtml}
              onGoBack={handleGoBack}
              onStartOver={handleStartOver}
              pdfProcessing={pdfProcessing}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-4 pt-1 pb-6 sm:px-6 lg:px-8">
        <div className="text-center text-xs text-muted-foreground">
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
            {" "}Verify model outputs prior to distribution.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
