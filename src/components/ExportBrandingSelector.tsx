import { BRANDING_OPTIONS, DEFAULT_BRANDING } from "@/lib/export/branding";
import { cn } from "@/lib/utils";
import type { ExportBrandingSelection } from "@/types/export";

export const DEFAULT_EXPORT_BRANDING: ExportBrandingSelection = {
  id: DEFAULT_BRANDING.id,
  label: DEFAULT_BRANDING.label,
  logoSrc: DEFAULT_BRANDING.logoSrc,
};

interface ExportBrandingSelectorProps {
  value: ExportBrandingSelection;
  onValueChange: (branding: ExportBrandingSelection) => void;
  className?: string;
}

export const ExportBrandingSelector = ({
  value,
  onValueChange,
  className,
}: ExportBrandingSelectorProps) => {
  return (
    <div className={cn("grid grid-cols-3 gap-3 sm:grid-cols-4", className)}>
      {BRANDING_OPTIONS.map((branding) => {
        const isSelected = branding.id === value.id;

        return (
          <button
            key={branding.id}
            type="button"
            onClick={() =>
              onValueChange({
                id: branding.id,
                label: branding.label,
                logoSrc: branding.logoSrc,
              })}
            className={cn(
              "flex h-16 items-center justify-center rounded-xl border bg-card/70 px-3 shadow-sm transition-colors",
              "hover:border-accent/30 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
              isSelected
                ? "border-accent/45 bg-accent/10 shadow-[0_8px_18px_rgba(255,106,26,0.08)]"
                : "border-border/80",
            )}
            aria-label={branding.label}
            title={branding.label}
          >
            {branding.logoSrc ? (
              <img
                src={branding.logoSrc}
                alt=""
                className="max-h-7 w-auto max-w-full object-contain"
              />
            ) : (
              <span className="text-sm font-medium text-muted-foreground">
                No Logo
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
