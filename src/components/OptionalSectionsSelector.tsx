import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface OptionalSectionsSelectorProps {
  selectedSections: string[];
  onSectionsChange: (sections: string[]) => void;
}

const AVAILABLE_SECTIONS = [
  "Call Features",
  "Covenants & Triggers",
  "ESG Designation",
  "Investment Considerations",
  "Sponsor",
  "Use of Proceeds (Detailed)",
  "Financial Information",
  "Tax Considerations",
  "Mandatory Tender",
  "Remarketing",
  "Extraordinary Mandatory Redemption",
  "Additional Bonds",
];

export const OptionalSectionsSelector = ({
  selectedSections,
  onSectionsChange,
}: OptionalSectionsSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSection = (section: string) => {
    if (selectedSections.includes(section)) {
      onSectionsChange(selectedSections.filter((s) => s !== section));
    } else {
      onSectionsChange([...selectedSections, section]);
    }
  };

  return (
    <div className="w-full relative">
      <label className="block text-sm font-medium text-foreground mb-2">
        Optional Sections
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all",
            "bg-card text-foreground hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
            isOpen ? "border-primary" : "border-border"
          )}
        >
          <span className="text-sm">
            {selectedSections.length > 0
              ? `${selectedSections.length} section${
                  selectedSections.length > 1 ? "s" : ""
                } selected`
              : "Select optional sections"}
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
                        isSelected && "bg-primary/5"
                      )}
                    >
                      <span className="text-sm text-foreground">{section}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
      {selectedSections.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedSections.map((section) => (
            <div
              key={section}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
            >
              {section}
              <button
                onClick={() => toggleSection(section)}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
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
