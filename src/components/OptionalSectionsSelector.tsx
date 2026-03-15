import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface OptionalSectionsSelectorProps {
  selectedSections: string[];
  onSectionsChange: (sections: string[]) => void;
}

const AVAILABLE_SECTIONS = [
  "Additional Bonds Test",
  "Covenants & Triggers",
  "ESG Designation",
  "Extraordinary Mandatory Redemption",
  "Investment Considerations",
  "Financial Information",
  "Mandatory Tender",
  "Remarketing Date",
  "Risks",
  "Sponsor",
  "Tax Considerations",
  "Use of Proceeds (Detailed)",
];

export const OptionalSectionsSelector = ({
  selectedSections,
  onSectionsChange,
}: OptionalSectionsSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customSection, setCustomSection] = useState("");

  const normalizeSection = (value: string) =>
    value.trim().replace(/\s+/g, " ");

  const hasSection = (value: string) => {
    const normalized = normalizeSection(value).toLowerCase();
    return selectedSections.some(
      (section) => normalizeSection(section).toLowerCase() === normalized,
    );
  };

  const toggleSection = (section: string) => {
    if (selectedSections.includes(section)) {
      onSectionsChange(selectedSections.filter((s) => s !== section));
    } else {
      onSectionsChange([...selectedSections, section]);
    }
  };

  const handleAddCustomSection = () => {
    const normalized = normalizeSection(customSection);

    if (normalized.length < 3 || hasSection(normalized)) {
      return;
    }

    onSectionsChange([...selectedSections, normalized]);
    setCustomSection("");
    setIsAddingCustom(false);
  };

  return (
    <div className="w-full relative">
      <label className="block text-sm font-medium text-foreground mb-2">
        Optional Categories
      </label>
      <p className="mb-3 text-sm text-muted-foreground">
        Preloaded selections: Issuer, Syndicate Members, Security,
        Ratings, Call Provisions, Use of Proceeds
      </p>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all",
            "bg-card text-foreground hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25",
            isOpen ? "border-accent" : "border-border"
          )}
        >
          <span
            className={cn(
              "text-sm",
              selectedSections.length === 0 && "text-muted-foreground",
            )}
          >
            {selectedSections.length > 0
              ? `${selectedSections.length} section${
                  selectedSections.length > 1 ? "s" : ""
                } selected`
              : "Select"}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 w-full mt-2 bg-card border border-border rounded-lg shadow-lift overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {AVAILABLE_SECTIONS.map((section) => {
                  const isSelected = selectedSections.includes(section);
                  return (
                    <button
                      key={section}
                      type="button"
                      onClick={() => toggleSection(section)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                        "hover:bg-secondary",
                        isSelected && "bg-accent/5"
                      )}
                    >
                      <span className="text-sm text-foreground">{section}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-accent flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="mt-3">
        {isAddingCustom ? (
          <div className="flex items-center gap-2">
            <Input
              value={customSection}
              onChange={(event) => setCustomSection(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddCustomSection();
                }

                if (event.key === "Escape") {
                  setCustomSection("");
                  setIsAddingCustom(false);
                }
              }}
              className="focus-visible:ring-accent focus-visible:ring-offset-0"
              placeholder="Section/category name"
              autoFocus
            />
            <button
              type="button"
              onClick={handleAddCustomSection}
              disabled={normalizeSection(customSection).length < 3}
              className="dismiss-button h-8 w-auto rounded-sm px-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomSection("");
                setIsAddingCustom(false);
              }}
              className="dismiss-button h-8 w-auto rounded-sm px-2 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingCustom(true)}
            className="text-sm font-semibold text-accent transition-colors hover:text-[hsl(var(--accent-hover))]"
          >
            + Add Custom
          </button>
        )}
      </div>
      {selectedSections.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedSections.map((section) => (
            <div
              key={section}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium"
            >
              {section}
              <button
                onClick={() => toggleSection(section)}
                className="dismiss-button h-5 w-5 rounded-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const X = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);
