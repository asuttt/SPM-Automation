import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an investment banking analyst specialized in turning offering documents (POS, prospectuses, offering memoranda, etc.) into standardized sales memos for sales & trading.

Follow the provided template exactly.
Match the tone and conciseness of the example memo.
Do not invent facts, numbers, or dates—if missing or unclear, insert:
<span style="color: red; font-weight: bold;">XXXXX</span>

Append optional sections (if any) after the standard sections.
Output the memo in HTML format for clean rendering.`;

const TEMPLATE = `STANDARD SALES MEMO TEMPLATE (STRICT HTML STRUCTURE):

<p style="text-align: center; font-size: 20px;"><strong>Sales Point Memorandum</strong></p>

<p>[Issuer Name]</p>

<table style="width:100%; border-collapse: collapse;">
  <tr>
    <td style="vertical-align: top; padding-right: 12px;">
      <p>[$XXX,000,000]*<br>[Series Name]</p>
    </td>
    <td style="vertical-align: top; padding-right: 12px;">
      <p>[$XXX,000,000]*<br>[Series Name]</p>
    </td>
  </tr>
</table>

<p><strong>BOOKRUNNER:</strong> [Bank A, "Left Lead"]</p>
<p><strong>SENIOR CO-MANAGER(S):</strong> [Bank B]</p>
<p><strong>CO-MANAGER(S):</strong><br>[Bank C]<br>[Bank D]<br>[Bank E]<br>[Bank F]</p>

<p><strong>SCHEDULE:</strong><br>POS: <span style="color: red; font-weight: bold;">XXXXX</span><br>Pricing: <span style="color: red; font-weight: bold;">XXXXX</span><br>Closing: <span style="color: red; font-weight: bold;">XXXXX</span></p>

<p><strong>TAX EXEMPTIONS:</strong></p>
<table style="width:100%; border-collapse: collapse;">
  <tr>
    <td style="padding: 4px 8px;"></td>
    <td style="padding: 4px 8px;"><strong>[Series Name]</strong></td>
    <td style="padding: 4px 8px;"><strong>[Series Name]</strong></td>
  </tr>
  <tr>
    <td style="padding: 4px 8px;">State</td>
    <td style="padding: 4px 8px;">[Yes/No]</td>
    <td style="padding: 4px 8px;">[Yes/No]</td>
  </tr>
  <tr>
    <td style="padding: 4px 8px;">Federal</td>
    <td style="padding: 4px 8px;">[Yes/No]</td>
    <td style="padding: 4px 8px;">[Yes/No]</td>
  </tr>
  <tr>
    <td style="padding: 4px 8px;">AMT</td>
    <td style="padding: 4px 8px;">[No/N/A]</td>
    <td style="padding: 4px 8px;">[No/N/A]</td>
  </tr>
</table>

<p><strong>RATINGS (M/S&P/F/K):</strong> -- / -- / -- / --</p>

<p><strong>INTEREST PAYMENT DATE:</strong></p>
<p>[1–3 concise sentences on interest payment frequency and first payment date.]</p>

<p><strong>MATURITY SCHEDULE:</strong></p>
<p>[Short description and/or "See POS for full schedule."]</p>

<p><strong>PROCEEDS:</strong></p>
<p>[Paragraph summarizing principal uses of proceeds.]</p>

<p><strong>SECURITY OR SOURCE OF FUNDS:</strong></p>
<p>[Paragraph describing pledge / revenues / lien and key funds or accounts.]</p>

<p><strong>OPTIONAL REDEMPTION:</strong></p>
<p>[Paragraph summarizing call provisions.]</p>

<p><strong>MANDATORY REDEMPTION:</strong></p>
<p>[Paragraph summarizing any mandatory sinking fund redemptions.]</p>

<p><strong>THE ISSUER:</strong></p>
<p>[1–3 concise paragraphs describing the issuer / system / service area.]</p>`;

const EXAMPLE = `EXAMPLE SALES MEMO IN HTML STYLE (FOR FORMAT AND BREVITY):

<p><strong>Sales Point Memorandum</strong></p>

<p>Miami-Dade County, Florida</p>

<table style="width:100%; border-collapse: collapse;">
  <tr>
    <td style="vertical-align: top; padding-right: 12px;">
      <p>$575,000,000*<br>Water and Sewer System Revenue<br>Bonds, Series 2025A</p>
    </td>
    <td style="vertical-align: top; padding-right: 12px;">
      <p>$425,000,000*<br>Water and Sewer System Revenue<br>Refunding Bonds, Series 2025B</p>
    </td>
  </tr>
</table>

<p><strong>BOOKRUNNER:</strong> Wells Fargo Securities</p>
<p><strong>SENIOR CO-MANAGER(S):</strong><br>Estrada Hinojosa<br>Loop Capital</p>
<p><strong>CO-MANAGER(S):</strong><br>Barclays<br>FHN Financial<br>Jefferies<br>Stern Brothers</p>

<p><strong>SCHEDULE:</strong><br>POS: 10/30<br>Pricing: 11/6<br>Closing: 11/20</p>

<p><strong>TAX EXEMPTIONS:</strong></p>
<table style="width:100%; border-collapse: collapse;">
  <tr>
    <td style="padding: 4px 8px;"></td>
    <td style="padding: 4px 8px;"><strong>Series 2025A</strong></td>
    <td style="padding: 4px 8px;"><strong>Series 2025B</strong></td>
  </tr>
  <tr>
    <td style="padding: 4px 8px;">State</td>
    <td style="padding: 4px 8px;">Yes</td>
    <td style="padding: 4px 8px;">Yes</td>
  </tr>
  <tr>
    <td style="padding: 4px 8px;">Federal</td>
    <td style="padding: 4px 8px;">Yes</td>
    <td style="padding: 4px 8px;">Yes</td>
  </tr>
  <tr>
    <td style="padding: 4px 8px;">AMT</td>
    <td style="padding: 4px 8px;">No</td>
    <td style="padding: 4px 8px;">No</td>
  </tr>
</table>

<p><strong>RATINGS (M/S&P/F/K):</strong> Aa3 / AA / AA- / AA</p>

<p><strong>INTEREST PAYMENT DATE:</strong></p>
<p>Interest on the Series 2025 Bonds will be payable semi-annually on April 1 and October 1 of each year, commencing April 1, 2026.</p>

<p><strong>MATURITY SCHEDULE:</strong></p>
<p>See POS for full maturity schedule.</p>

<p><strong>PROCEEDS:</strong></p>
<p>The proceeds of the Series 2025A Bonds, together with other legally available moneys of the Miami-Dade Water and Sewer Department (the "Department"), will be used to: (i) pay the costs of the Series 2025 Project; (ii) make a deposit to the Reserve Account; and (iii) pay the costs of issuance of the Series 2025A Bonds.</p>
<p>The proceeds of the Series 2025B Bonds, together with other legally available moneys of the Department, will be used to: (i) refund and defease the Refunded Bonds; and (ii) pay the costs of issuance of the Series 2025B Bonds.</p>

<p><strong>SECURITY OR SOURCE OF FUNDS:</strong></p>
<p>The payment of principal of and interest on the Series 2025 Bonds is secured by a pledge of and lien on the Net Operating Revenues (see "Flow of Funds" in the POS). The Series 2025 Bonds are being issued on a parity basis as to source and security for payment with the Outstanding Bonds, any future Bonds, and certain Hedge Obligations which may be incurred in the future.</p>
<p><strong>Flow of Funds:</strong><br>(a) the Revenue Fund;<br>(b) the Debt Service Fund (Bond Service Account, Redemption Account, Reserve Account);<br>(c) the Renewal and Replacement Fund;<br>(d) the Plant Expansion Fund;<br>(e) the Rate Stabilization Fund;<br>(f) the General Reserve Fund.</p>
<p>Also created: Series 2025A Bond Service Subaccount, Series 2025B Bond Service Subaccount, Series 2025A Redemption Subaccount, Series 2025B Redemption Subaccount in the Debt Service Fund.</p>

<p><strong>OPTIONAL REDEMPTION:</strong></p>
<p>The Series 2025 Bonds maturing on or prior to October 1, 20__ will not be subject to optional redemption prior to maturity. The Series 2025 Bonds maturing on or after October 1, 20__ will be subject to optional redemption, at the option of the County, in whole or in part, on or after October 1, 20__, at a redemption price equal to 100% of the principal amount to be redeemed plus accrued interest to the redemption date, without premium.</p>

<p><strong>MANDATORY REDEMPTION:</strong></p>
<p>The Series 2025A Bonds maturing on October 1, 20__ are subject to mandatory sinking fund redemption in part, prior to maturity, by lot, at a redemption price equal to the principal amount of the Series 2025A Bonds to be redeemed, commencing October 1, 20__, in the years and principal amounts set forth in the POS.</p>

<p><strong>THE ISSUER:</strong></p>
<p>The Utility is divided into the Water System and the Sewer System (the "Wastewater System"). The Department administers each system on a unified basis for purposes of billing but separates them for rates, capital improvements, and accounting; the Utility is combined for financial statement purposes.</p>
<p>The Utility currently provides water and wastewater treatment to substantially all of the County either directly to retail customers or indirectly through wholesale contracts with various municipalities. In 2024, the population of the County was estimated at approximately 2,774,841.</p>
<p>The Department's long-term objective of expansion to County-wide operation has been achieved by the acquisition of all privately-owned utilities in the County. Since 1973, the Department has acquired multiple independent systems.</p>`;

const MAX_PAGES_TO_INCLUDE = 30;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      pdfBase64,
      optionalSections = [],
      scheduleOverrides = {},
    } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: "PDF file is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build the user prompt
    let userPrompt = `${TEMPLATE}\n\n---\n\n${EXAMPLE}\n\n---\n\n`;

    // Normalize optional section names (legacy "Risks" -> "Investment Considerations")
    const normalizedOptionalSections = optionalSections.map((section: string) =>
      section === "Risks" ? "Investment Considerations" : section,
    );

    const manualPos = scheduleOverrides?.posMail?.trim();
    const manualPricing = scheduleOverrides?.pricing?.trim();
    const manualClosing = scheduleOverrides?.closing?.trim();

    if (normalizedOptionalSections.length > 0) {
      userPrompt += `OPTIONAL SECTIONS REQUESTED (APPEND THESE AT THE END):\n`;
      normalizedOptionalSections.forEach((section: string) => {
        userPrompt += `- ${section}\n`;
      });
      userPrompt += `\n---\n\n`;
    }

    if (manualPos || manualPricing || manualClosing) {
      userPrompt += `MANUAL SCHEDULE OVERRIDES (USE THESE IF PROVIDED):\n`;
      userPrompt += `POS: ${manualPos || "<span style=\"color: red; font-weight: bold;\">XXXXX</span>"}\n`;
      userPrompt += `Pricing: ${manualPricing || "<span style=\"color: red; font-weight: bold;\">XXXXX</span>"}\n`;
      userPrompt += `Closing: ${manualClosing || "<span style=\"color: red; font-weight: bold;\">XXXXX</span>"}\n`;
      userPrompt += `\n---\n\n`;
    }

    userPrompt += `The source PDF is attached as a separate part. Treat the PDF as the only source of truth for all facts and numbers.\n\n---\n\n`;
    userPrompt += `INSTRUCTIONS:
1. Follow the STANDARD TEMPLATE headings and order exactly.
2. Use the entire PDF (no page-limit assumptions); if ratings or other data appear later in the document, include them.
3. Match the tone and brevity of the EXAMPLE memo.
4. Populate only from SOURCE DOCUMENT TEXT.
5. For anything missing or uncertain, insert: <span style="color: red; font-weight: bold;">XXXXX</span>
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

    console.log("Calling Gemini API...");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Normalize base64 in case a data URL was sent
    const cleanedPdfBase64 = pdfBase64.replace(
      /^data:application\/pdf;base64,/,
      "",
    );

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
                },
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: cleanedPdfBase64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded. Please try again in a moment." 
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "AI credits depleted. Please add credits to continue." 
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const memo =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!memo) {
      throw new Error("No memo generated from AI");
    }

    console.log("Memo generated successfully");

    // Enforce red placeholder styling for any remaining bare 'XXXXX'
    const placeholderSpan =
      '<span style="color: red; font-weight: bold;">XXXXX</span>';
    const protectedToken = "__RED_PLACEHOLDER__";
    let safeMemo = memo.replaceAll(placeholderSpan, protectedToken);
    safeMemo = safeMemo.replace(/XXXXX/g, placeholderSpan);
    safeMemo = safeMemo.replaceAll(protectedToken, placeholderSpan);
    // Replace bare double-dashes with placeholders to avoid blank ratings slots
    safeMemo = safeMemo.replace(/--/g, placeholderSpan);
    // Normalize vague references
    safeMemo = safeMemo.replace(/as described herein/gi, "as described in the POS");
    // Make "herein" references explicit to the POS
    safeMemo = safeMemo.replace(/\bherein\b/gi, "in the POS");
    // Collapse consecutive placeholders within a single field to one marker
    safeMemo = safeMemo.replace(
      /(?:<span style="color: red; font-weight: bold;">XXXXX<\/span>\s*(?:<br>\s*)?){2,}/g,
      placeholderSpan,
    );

    return new Response(
      JSON.stringify({ memo: safeMemo }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-memo function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
