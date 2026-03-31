import type { ExportBrandingSelection } from "@/types/export";

import bnyLogo from "@/assets/bank-logos/BNY.png";
import barclaysLogo from "@/assets/bank-logos/Barclays.png";
import bofaLogo from "@/assets/bank-logos/BofA.png";
import citiLogo from "@/assets/bank-logos/Citi.png";
import goldmanLogo from "@/assets/bank-logos/Goldman.png";
import jefferiesLogo from "@/assets/bank-logos/Jefferies.png";
import jpmorganLogo from "@/assets/bank-logos/JPMorgan.png";
import keybancLogo from "@/assets/bank-logos/Keybanc.png";
import msLogo from "@/assets/bank-logos/MS.png";
import pncLogo from "@/assets/bank-logos/PNC.png";
import piperSandlerLogo from "@/assets/bank-logos/Piper Sandler.png";
import rbcLogo from "@/assets/bank-logos/RBC.png";
import raymondJamesLogo from "@/assets/bank-logos/Raymond James.png";
import ubsLogo from "@/assets/bank-logos/UBS.png";
import wellsFargoLogo from "@/assets/bank-logos/Wells Fargo.png";

export type BrandingId =
  | "none"
  | "bny"
  | "barclays"
  | "bofa"
  | "citi"
  | "goldman"
  | "jefferies"
  | "jpmorgan"
  | "keybanc"
  | "ms"
  | "pnc"
  | "piper-sandler"
  | "rbc"
  | "raymond-james"
  | "ubs"
  | "wells-fargo";

export interface BrandingRegistryEntry extends ExportBrandingSelection {
  id: BrandingId;
  logoHeightInches: number;
  logoScale?: number;
  description?: string;
  sortLabel?: string;
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
    id: "barclays",
    label: "Barclays",
    logoSrc: barclaysLogo,
    logoHeightInches: DEFAULT_LOGO_HEIGHT_IN,
    logoScale: 0.65,
  },
  {
    id: "bny",
    label: "BNY",
    logoSrc: bnyLogo,
    logoHeightInches: DEFAULT_LOGO_HEIGHT_IN,
    logoScale: 0.55,
    sortLabel: "Bank of New York Mellon",
  },
  {
    id: "bofa",
    label: "BofA Securities",
    logoSrc: bofaLogo,
    logoHeightInches: DEFAULT_LOGO_HEIGHT_IN,
    logoScale: 0.92,
    sortLabel: "Bank of America Securities",
  },
  {
    id: "citi",
    label: "Citi",
    logoSrc: citiLogo,
    logoHeightInches: DEFAULT_LOGO_HEIGHT_IN,
    logoScale: 0.92,
  },
  {
    id: "goldman",
    label: "Goldman Sachs",
    logoSrc: goldmanLogo,
    logoHeightInches: STANDARD_LOGO_HEIGHT_IN,
    logoScale: 1,
  },
  {
    id: "jefferies",
    label: "Jefferies",
    logoSrc: jefferiesLogo,
    logoHeightInches: DEFAULT_LOGO_HEIGHT_IN,
    logoScale: 0.6,
  },
  {
    id: "jpmorgan",
    label: "JPMorgan",
    logoSrc: jpmorganLogo,
    logoHeightInches: DEFAULT_LOGO_HEIGHT_IN,
    logoScale: 0.7,
  },
  {
    id: "keybanc",
    label: "KeyBanc Capital Markets",
    logoSrc: keybancLogo,
    logoHeightInches: DEFAULT_LOGO_HEIGHT_IN,
    logoScale: 0.94,
  },
  {
    id: "ms",
    label: "Morgan Stanley",
    logoSrc: msLogo,
    logoHeightInches: STANDARD_LOGO_HEIGHT_IN,
    logoScale: 1,
  },
  {
    id: "piper-sandler",
    label: "Piper Sandler",
    logoSrc: piperSandlerLogo,
    logoHeightInches: DEFAULT_LOGO_HEIGHT_IN,
    logoScale: 0.65,
  },
  {
    id: "pnc",
    label: "PNC",
    logoSrc: pncLogo,
    logoHeightInches: DEFAULT_LOGO_HEIGHT_IN,
    logoScale: 0.85,
  },
  {
    id: "raymond-james",
    label: "Raymond James",
    logoSrc: raymondJamesLogo,
    logoHeightInches: DEFAULT_LOGO_HEIGHT_IN,
    logoScale: 1,
  },
  {
    id: "rbc",
    label: "RBC Capital Markets",
    logoSrc: rbcLogo,
    logoHeightInches: DEFAULT_LOGO_HEIGHT_IN,
    logoScale: 1.2,
  },
  {
    id: "ubs",
    label: "UBS",
    logoSrc: ubsLogo,
    logoHeightInches: DEFAULT_LOGO_HEIGHT_IN,
    logoScale: 0.9,
  },
  {
    id: "wells-fargo",
    label: "Wells Fargo",
    logoSrc: wellsFargoLogo,
    logoHeightInches: STANDARD_LOGO_HEIGHT_IN,
    logoScale: 1,
  },
] as const satisfies readonly BrandingRegistryEntry[];

const compareBrandingEntries = (
  left: BrandingRegistryEntry,
  right: BrandingRegistryEntry,
) => {
  if (left.id === "none") {
    return -1;
  }

  if (right.id === "none") {
    return 1;
  }

  return (left.sortLabel ?? left.label).localeCompare(
    right.sortLabel ?? right.label,
  );
};

export const DEFAULT_BRANDING_ID: BrandingId = "none";

export const BRANDING_OPTIONS = [...BRANDING_REGISTRY].sort(compareBrandingEntries);

export const DEFAULT_BRANDING = BRANDING_OPTIONS.find(
  (branding) => branding.id === DEFAULT_BRANDING_ID,
) ?? BRANDING_OPTIONS[0];

export const resolveBranding = (
  id?: string | null,
): BrandingRegistryEntry => {
  if (!id) {
    return DEFAULT_BRANDING;
  }

  return (
    BRANDING_OPTIONS.find((branding) => branding.id === id) ?? DEFAULT_BRANDING
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
