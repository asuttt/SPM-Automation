import type { ExportBrandingSelection } from "@/types/export";

import bnyLogo from "@/assets/bank-logos/BNY.png";
import barclaysLogo from "@/assets/bank-logos/Barclays.png";
import goldmanLogo from "@/assets/bank-logos/Goldman.png";
import jpmorganLogo from "@/assets/bank-logos/JPMorgan.png";
import msLogo from "@/assets/bank-logos/MS.png";
import pncLogo from "@/assets/bank-logos/PNC.png";
import rbcLogo from "@/assets/bank-logos/RBC.png";
import wellsFargoLogo from "@/assets/bank-logos/Wells Fargo.png";

export type BrandingId =
  | "none"
  | "bny"
  | "barclays"
  | "goldman"
  | "jpmorgan"
  | "ms"
  | "pnc"
  | "rbc"
  | "wells-fargo";

export interface BrandingRegistryEntry extends ExportBrandingSelection {
  id: BrandingId;
  logoHeightInches: number;
  logoScale?: number;
  description?: string;
}

const STANDARD_LOGO_HEIGHT_IN = 0.58;
const DEFAULT_LOGO_HEIGHT_IN = 0.54;

export const BRANDING_REGISTRY = [
  {
    id: "none",
    label: "No Logo",
    logoSrc: null,
    logoHeightInches: 0,
    logoScale: 1,
    description: "Unbranded memo export",
  },
  {
    id: "bny",
    label: "BNY",
    logoSrc: bnyLogo,
    logoHeightInches: DEFAULT_LOGO_HEIGHT_IN,
    logoScale: 0.74,
  },
  {
    id: "barclays",
    label: "Barclays",
    logoSrc: barclaysLogo,
    logoHeightInches: DEFAULT_LOGO_HEIGHT_IN,
    logoScale: 0.9,
  },
  {
    id: "goldman",
    label: "Goldman Sachs",
    logoSrc: goldmanLogo,
    logoHeightInches: STANDARD_LOGO_HEIGHT_IN,
    logoScale: 1,
  },
  {
    id: "jpmorgan",
    label: "JPMorgan",
    logoSrc: jpmorganLogo,
    logoHeightInches: DEFAULT_LOGO_HEIGHT_IN,
    logoScale: 0.92,
  },
  {
    id: "ms",
    label: "Morgan Stanley",
    logoSrc: msLogo,
    logoHeightInches: STANDARD_LOGO_HEIGHT_IN,
    logoScale: 1,
  },
  {
    id: "pnc",
    label: "PNC",
    logoSrc: pncLogo,
    logoHeightInches: DEFAULT_LOGO_HEIGHT_IN,
    logoScale: 0.94,
  },
  {
    id: "rbc",
    label: "RBC Capital Markets",
    logoSrc: rbcLogo,
    logoHeightInches: DEFAULT_LOGO_HEIGHT_IN,
    logoScale: 1.06,
  },
  {
    id: "wells-fargo",
    label: "Wells Fargo",
    logoSrc: wellsFargoLogo,
    logoHeightInches: STANDARD_LOGO_HEIGHT_IN,
    logoScale: 1,
  },
] as const satisfies readonly BrandingRegistryEntry[];

export const DEFAULT_BRANDING_ID: BrandingId = "none";

export const DEFAULT_BRANDING = BRANDING_REGISTRY.find(
  (branding) => branding.id === DEFAULT_BRANDING_ID,
) ?? BRANDING_REGISTRY[0];

export const BRANDING_OPTIONS = BRANDING_REGISTRY;

export const resolveBranding = (
  id?: string | null,
): BrandingRegistryEntry => {
  if (!id) {
    return DEFAULT_BRANDING;
  }

  return (
    BRANDING_REGISTRY.find((branding) => branding.id === id) ?? DEFAULT_BRANDING
  );
};

export const toExportBrandingSelection = (
  id?: string | null,
): ExportBrandingSelection => {
  const branding = resolveBranding(id);

  return {
    id: branding.id,
    label: branding.label,
    logoSrc: branding.logoSrc,
  };
};

export const getBrandingRenderHeightInches = (branding: BrandingRegistryEntry) =>
  branding.logoHeightInches * (branding.logoScale ?? 1);
