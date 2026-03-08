import {
  EXAMPLE,
  placeholderSpan,
  SYSTEM_PROMPT,
  TEMPLATE,
} from "./constants.ts";
import { type ScheduleOverrides } from "./types.ts";

const normalizeOptionalSection = (section: string) =>
  section === "Risks" ? "Investment Considerations" : section;

export const buildPrompt = (
  optionalSections: string[],
  scheduleOverrides: ScheduleOverrides,
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
    userPrompt += "\n---\n\n";
  }

  if (manualPos || manualPricing || manualClosing) {
    userPrompt += `MANUAL SCHEDULE OVERRIDES (USE THESE IF PROVIDED):\n`;
    userPrompt += `POS: ${manualPos || placeholderSpan}\n`;
    userPrompt += `Pricing: ${manualPricing || placeholderSpan}\n`;
    userPrompt += `Closing: ${manualClosing || placeholderSpan}\n`;
    userPrompt += "\n---\n\n";
  }

  userPrompt += `The source PDF is attached as a separate part. Treat the PDF as the only source of truth for all facts and numbers.\n\n---\n\n`;
  userPrompt += `INSTRUCTIONS:
1. Follow the STANDARD TEMPLATE headings and order exactly.
2. Use the entire PDF (no page-limit assumptions); if ratings or other data appear later in the document, include them.
3. Match the tone and brevity of the EXAMPLE memo.
4. Populate only from SOURCE DOCUMENT TEXT.
5. For anything missing or uncertain, insert: ${placeholderSpan}
6. If optional sections requested, append them after the standard template with the heading <p><strong>OPTIONAL SECTIONS:</strong></p>. Use the provided section names verbatim (e.g., Investment Considerations, Mandatory Tender, Remarketing, Extraordinary Mandatory Redemption, Additional Bonds).
7. Follow the HTML formatting shown in the TEMPLATE and EXAMPLE exactly: every heading in <p><strong>Heading:</strong></p>, every paragraph/bullet in its own <p>, and use <br> for line breaks inside a section (e.g., multiple series lines or schedules).
8. Output valid HTML only—no leading or trailing plain text outside of tags.
9. Preserve the layout from the TEMPLATE (line breaks, order, and section boundaries).
10. Section-specific guidance:
    - Ratings: search the entire document; pull agency ratings wherever they appear (cover or back pages). Use agencies Moody's, S&P, Fitch, Kroll when present; list all in M/S&P/F/K order. If any agency is absent, use the red placeholder for that slot.
    - Bookrunner/Managers: deals always have at least one manager on the cover. Search the cover (including centered single-bank names at the bottom) and populate BOOKRUNNER. If not found, use a single red placeholder rather than leaving blank.
    - Proceeds: write 2–4 concise sentences capturing key uses and flows; for complex structures (e.g., prepaid gas), spell out the steps (prepayment, deposits/reserves, reimbursements, project uses).
    - Security or Source of Funds: specify the pledged revenues/funds (fees, user charges, specific receipts, or tax revenues for GO). Avoid only saying "Trust Estate"—include its components if listed (e.g., contract rights, purchase payments, termination payments, reserves). If the security section is sparse, search elsewhere (e.g., "special limited obligations", "limited obligations", Net Revenues definitions) and include the defined revenue sources; if still unclear, add a red placeholder sentence for pledged revenues.
    - Defined terms: retain quotation marks and defined terms in-line with the sections so their role is clear.
    - Optional Redemption: include the full provision as written (especially unusual pricing/make-whole formulas).
    - Mandatory Redemption vs Mandatory Tender: Mandatory Redemption is for sinking funds/term bonds. Only populate Mandatory Redemption if the document explicitly describes "mandatory redemption" or sinking fund schedules; do NOT describe tender/purchase here. If the only language is about tender/purchase, use the red placeholder for Mandatory Redemption. Mandatory Tender/Purchase is separate; do not conflate.
    - Dates in SCHEDULE: output dates plainly (mm/dd) without square brackets; if missing, use the red placeholder.
    - Series/columns: if the deal has fewer series than columns shown in the template, remove unused columns entirely (leave blank/omit, do NOT fill with placeholders for non-existent series). Placeholders are only for missing/uncertain information that should exist, not for items that do not exist in the deal.`;

  return `${SYSTEM_PROMPT}\n\n${userPrompt}`;
};
