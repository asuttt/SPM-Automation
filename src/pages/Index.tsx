import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { OptionalSectionsSelector } from "@/components/OptionalSectionsSelector";
import { ResultsPanel } from "@/components/ResultsPanel";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ViewState = "upload" | "generating" | "results";

const Index = () => {
  const [viewState, setViewState] = useState<ViewState>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [generatedMemo, setGeneratedMemo] = useState("");

  const handleGenerate = async () => {
    if (!selectedFile) return;

    setViewState("generating");

    try {
      // Extract text from PDF
      const formData = new FormData();
      formData.append("pdf", selectedFile);

      // Read file as base64 for sending to edge function
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;

        try {
          const { data, error } = await supabase.functions.invoke("generate-memo", {
            body: {
              pdfBase64: base64.split(",")[1], // Remove data:application/pdf;base64, prefix
              optionalSections: selectedSections,
            },
          });

          if (error) {
            console.error("Error generating memo:", error);
            toast.error("Failed to generate memo. Please try again.");
            setViewState("upload");
            return;
          }

          setGeneratedMemo(data.memo);
          setViewState("results");
          toast.success("Sales memo generated successfully!");
        } catch (err) {
          console.error("Error:", err);
          toast.error("An error occurred. Please try again.");
          setViewState("upload");
        }
      };

      reader.onerror = () => {
        toast.error("Failed to read PDF file");
        setViewState("upload");
      };

      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred. Please try again.");
      setViewState("upload");
    }
  };

  const handleStartOver = () => {
    setViewState("upload");
    setSelectedFile(null);
    setSelectedSections([]);
    setGeneratedMemo("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      {/* Header */}
      <header className="bg-gradient-hero shadow-elegant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-primary-foreground">
              Sales Memo Generator
            </h1>
          </div>
          <p className="mt-2 text-sm text-primary-foreground/80">
            Transform offering documents into standardized sales memos with AI
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {viewState === "upload" && (
          <div className="bg-card border border-border rounded-lg shadow-lift p-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Upload Document
                </h2>
                <p className="text-sm text-muted-foreground">
                  Upload your offering document to generate a standardized sales memo
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

              <div className="pt-4">
                <Button
                  onClick={handleGenerate}
                  disabled={!selectedFile}
                  size="lg"
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Sales Memo
                </Button>
              </div>
            </div>
          </div>
        )}

        {viewState === "generating" && (
          <div className="bg-card border border-border rounded-lg shadow-lift p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
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
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12">
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Sales Memo Generator • Powered by AI • Always verify generated information
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
