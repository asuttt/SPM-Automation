import { Copy, RotateCcw, Check } from "lucide-react";
import { useState } from "react";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const extractMemoHtml = (content: string) => {
  const trimmed = content.trim();

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:\s*\w+)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
};

interface ResultsPanelProps {
  memo: string;
  onStartOver: () => void;
}

export const ResultsPanel = ({ memo, onStartOver }: ResultsPanelProps) => {
  const [copied, setCopied] = useState(false);
  const memoHtml = DOMPurify.sanitize(extractMemoHtml(memo));

  const handleCopy = async () => {
    try {
      // Create a temporary element to get plain text from HTML
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = memoHtml;
      const plainText = tempDiv.innerText || tempDiv.textContent || "";

      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="bg-card border border-border rounded-lg shadow-elegant overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-hero px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-foreground">
            Generated Sales Memo
          </h2>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onStartOver}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Start Over
            </Button>
          </div>
        </div>

        {/* Memo Content */}
        <div className="p-8 bg-white">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: memoHtml }}
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              lineHeight: "1.6",
              textAlign: "justify",
            }}
          />
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-4 bg-muted/50 border border-border rounded-lg">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold" style={{ color: "hsl(var(--error-marker))" }}>
            XXXXX
          </span>{" "}
          markers indicate missing or uncertain information that requires verification.
        </p>
      </div>
    </div>
  );
};
