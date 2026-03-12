import {
  EXAMPLE,
  placeholderSpan,
  SYSTEM_PROMPT,
  TEMPLATE,
} from "./constants.ts";
import { type PromptBuildOptions, type ScheduleOverrides } from "./types.ts";

const normalizeOptionalSection = (section: string) =>
  section === "Risks" ? "Investment Considerations" : section;

export const buildPrompt = (
  optionalSections: string[],
  scheduleOverrides: ScheduleOverrides,
  options: PromptBuildOptions = {},
) => {
  const normalizedOptionalSections = optionalSections.map(
    normalizeOptionalSection,
  );
  const manualPos = scheduleOverrides.posMail?.trim();
  const manualPricing = scheduleOverrides.pricing?.trim();
  const manualClosing = scheduleOverrides.closing?.trim();

  let userPrompt = `${TEMPLATE}\n\n---\n\n${EXAMPLE}\n\n---\n\n`;

  if (normalizedOptionalSections.length > 0) {
    userPrompt += `OPTIONAL SECTIONS REQUESTED (APPEND THESE AT THE END):\n`;
    normalizedOptionalSections.forEach((section) => {
      userPrompt += `- ${section}\n`;
    });
    userPrompt += `\nREQUIRED OPTIONAL SECTION OUTPUT RULES:\n`;
    userPrompt += `- After the standard template, continue directly into the requested optional section headings without adding an "OPTIONAL SECTIONS" subtitle\n`;
    userPrompt += `- Output every requested optional section as its own heading using the exact requested name followed by a colon\n`;
    userPrompt += `- Never omit a requested optional section, even if support is weak or absent in the source document\n`;
    userPrompt += `- If a requested optional section cannot be supported from the source document, still output that heading and place ${placeholderSpan} in the body paragraph for that section\n`;
    userPrompt += `- For custom section names, search for exact heading matches first, then close variants or directly relevant discussion elsewhere in the document\n`;
    userPrompt += `- For requested optional sections, check the table of contents first and prefer the dedicated section referenced there over shorter mentions that appear earlier in the document\n`;
    userPrompt += `- If both a short mention and a fuller definitional or disclosure section exist, summarize from the fuller dedicated section\n`;
    userPrompt += "\n---\n\n";
  }

  if (manualPos || manualPricing || manualClosing) {
    userPrompt += `MANUAL SCHEDULE OVERRIDES (USE THESE IF PROVIDED):\n`;
    userPrompt += `POS: ${manualPos || placeholderSpan}\n`;
    userPrompt += `Pricing: ${manualPricing || placeholderSpan}\n`;
    userPrompt += `Closing: ${manualClosing || placeholderSpan}\n`;
    userPrompt += "\n---\n\n";
  }

  if (options.supplementalText) {
    userPrompt += `SUPPLEMENTAL OCR TEXT (USE THIS TO LOCATE FACTS IF THE PDF TEXT LAYER IS WEAK, BUT DO NOT INVENT OR OVERRIDE CLEAR PDF FACTS):\n`;
    userPrompt += `${options.supplementalText}\n`;
    userPrompt += "\n---\n\n";
  }

  if (options.extractedArtifact) {
    userPrompt += `EXTRACTED DOCUMENT DOSSIER (COMPILED FROM THE FULL OFFERING DOCUMENT FOR MODEL EFFICIENCY):\n`;
    userPrompt += `${options.extractedArtifact}\n`;
    userPrompt += "\n---\n\n";
  }

  if (options.sourceMode === "artifact") {
    userPrompt += `The source material for this run is the extracted document dossier above, which was compiled from the full offering document. Treat that dossier as the source of truth for all facts and numbers in this run.\n\n---\n\n`;
  } else if (options.sourceMode === "hybrid") {
    userPrompt += `The source PDF is attached as a separate part and an extracted document dossier is provided above. Use the dossier for efficient navigation, but anchor the memo to the supplied source material.\n\n---\n\n`;
  } else {
    userPrompt += `The source PDF is attached as a separate part. Treat the PDF as the only source of truth for all facts and numbers.\n\n---\n\n`;
  }
  userPrompt += `INSTRUCTIONS:
1. Follow the STANDARD TEMPLATE headings and order exactly.
2. Use all provided source material; if ratings or other data appear later in the document dossier or attached source, include them.
3. Match the EXAMPLE memo's tone and discipline, but do not compress away material mechanics, definitions, triggers, cash-flow steps, or legal structure that are necessary for accurate sales use.
4. Populate only from SOURCE DOCUMENT TEXT.
5. For anything missing or uncertain, insert: ${placeholderSpan}
6. If optional sections are requested, append them directly after the standard template without adding any "OPTIONAL SECTIONS" subtitle. Output every requested section using the provided section name verbatim as its own heading. Never omit a requested optional section. If content is missing, uncertain, or unsupported by the document, output the section heading anyway and use ${placeholderSpan} in the paragraph body.
7. Follow the HTML formatting shown in the TEMPLATE and EXAMPLE exactly: every heading in <p><strong>Heading:</strong></p>, every paragraph/bullet in its own <p>, and use <br> for line breaks inside a section (e.g., multiple series lines or schedules).
8. Output valid HTML only—no leading or trailing plain text outside of tags.
9. Preserve the layout from the TEMPLATE (line breaks, order, and section boundaries).
10. Section-specific guidance:
    - Use concise summaries by default, but let section depth expand in proportion to document complexity. Simpler provisions can be short; technical sections must be complete enough to avoid being misleading.
    - Prefer density over mere brevity: include the operative mechanics needed for a salesperson or investor-facing reader to understand how the provision actually works.
    - Ratings: search the entire document; pull agency ratings wherever they appear (cover or back pages). Use agencies Moody's, S&P, Fitch, Kroll when present; list all in M/S&P/F/K order. If any agency is absent, use the red placeholder for that slot.
    - Bookrunner/Managers: deals always have at least one manager on the cover. Search the cover (including centered single-bank names at the bottom) and populate BOOKRUNNER. If not found, use a single red placeholder rather than leaving blank.
    - Proceeds: write 2–4 concise sentences for straightforward deals, but expand as needed for multi-step or structured transactions. For complex structures (e.g., prepaid gas), spell out the actual steps (prepayment, deposits/reserves, reimbursements, project uses).
    - Security or Source of Funds: specify the pledged revenues/funds (fees, user charges, specific receipts, or tax revenues for GO). Avoid only saying "Trust Estate"—include its components if listed (e.g., contract rights, purchase payments, termination payments, reserves). If the structure involves flow of funds, reserve accounts, rate covenants, indenture mechanics, or defined revenue waterfalls, summarize those operative mechanics clearly enough to show how repayment works. If the security section is sparse, search elsewhere (e.g., "special limited obligations", "limited obligations", Net Revenues definitions) and include the defined revenue sources; if still unclear, add a red placeholder sentence for pledged revenues.
    - Defined terms: retain quotation marks and defined terms in-line with the sections so their role is clear.
    - Optional Redemption: summarize the operative provision fully enough to preserve timing, price, premium, and any unusual pricing or make-whole mechanics. Do not reduce a complex call provision to a generic one-line call summary.
    - Mandatory Redemption vs Mandatory Tender: Mandatory Redemption is for sinking funds/term bonds. Only populate Mandatory Redemption if the document explicitly describes "mandatory redemption" or sinking fund schedules; do NOT describe tender/purchase here. If the only language is about tender/purchase, use the red placeholder for Mandatory Redemption. Mandatory Tender/Purchase is separate; do not conflate. If a mandatory redemption provision contains detailed schedules, trigger conditions, or premium mechanics, summarize those mechanics rather than collapsing to a bare label.
    - Dates in SCHEDULE: output dates plainly (mm/dd) without square brackets; if missing, use the red placeholder.
    - Series/columns: if the deal has fewer series than columns shown in the template, remove unused columns entirely (leave blank/omit, do NOT fill with placeholders for non-existent series). Placeholders are only for missing/uncertain information that should exist, not for items that do not exist in the deal.
    - For requested optional/custom sections, check the table of contents first. If the TOC points to a dedicated section, use that fuller section as the primary source instead of a shorter cover mention, glossary mention, or earlier passing reference.
    - For requested optional/custom sections, prefer substantive definitional/disclosure paragraphs over brief mentions when both exist in the document, and use enough detail to preserve the section's operative meaning.
    - If supplemental OCR text is provided, use it only as a fallback aid for weak PDFs and still anchor the memo to the attached document or extracted dossier.
    - If an extracted document dossier is provided, prefer the cited snippets and page references inside it when locating facts quickly.`;

  return `${SYSTEM_PROMPT}\n\n${userPrompt}`;
};
