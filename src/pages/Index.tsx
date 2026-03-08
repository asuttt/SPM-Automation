import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { OptionalSectionsSelector } from "@/components/OptionalSectionsSelector";
import { ResultsPanel } from "@/components/ResultsPanel";
import { Button } from "@/components/ui/button";
import { FileOutput, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

const Index = () => {
  const [viewState, setViewState] = useState<ViewState>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [generatedMemo, setGeneratedMemo] = useState("");
  const [posMailDate, setPosMailDate] = useState("");
  const [pricingDate, setPricingDate] = useState("");
  const [closingDate, setClosingDate] = useState("");

  const handleGenerate = async () => {
    if (!selectedFile) return;

    setViewState("generating");

    try {
      const pdfBase64 = await readFileAsBase64(selectedFile);
      const { data, error } = await supabase.functions.invoke("generate-memo", {
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
        toast.error(error.message || "Failed to generate memo. Please try again.");
        setViewState("upload");
        return;
      }

      if (!data?.memo) {
        toast.error("No memo was returned.");
        setViewState("upload");
        return;
      }

      setGeneratedMemo(data.memo);
      setViewState("results");
      toast.success("Sales memo generated successfully!");
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        error instanceof Error ? error.message : "An error occurred. Please try again.",
      );
      setViewState("upload");
    }
  };

  const handleStartOver = () => {
    setViewState("upload");
    setSelectedFile(null);
    setSelectedSections([]);
    setGeneratedMemo("");
    setPosMailDate("");
    setPricingDate("");
    setClosingDate("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="bg-gradient-hero border-b border-white/15 shadow-elegant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <FileOutput className="h-7 w-7 text-accent" />
            <h1 className="text-2xl font-bold text-primary-foreground">
              Sales Memo Generator
            </h1>
          </div>
          <p className="ml-10 mt-1.5 text-sm text-primary-foreground/75">
            Transform offering docs into standardized memos in seconds
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {viewState === "upload" && (
            <div className="bg-card border border-border rounded-lg shadow-lift p-7">
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Document Upload
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Upload your offering document to get started
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
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      POS Mailing Date
                    </label>
                    <input
                      type="date"
                      value={posMailDate}
                      onChange={(e) => setPosMailDate(e.target.value)}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Pricing Date
                    </label>
                    <input
                      type="date"
                      value={pricingDate}
                      onChange={(e) => setPricingDate(e.target.value)}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Closing Date
                    </label>
                    <input
                      type="date"
                      value={closingDate}
                      onChange={(e) => setClosingDate(e.target.value)}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                    />
                  </div>
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
                  Generating Your Sales Memo
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Our AI is analyzing your document and creating a standardized memo.
                  This may take a moment...
                </p>
              </div>
            </div>
          )}

          {viewState === "results" && (
            <ResultsPanel memo={generatedMemo} onStartOver={handleStartOver} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-4 pt-2 pb-8 sm:px-6 lg:px-8">
        <div className="text-center text-sm text-muted-foreground">
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
            {" "}Please verify outputs prior to distribution.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
