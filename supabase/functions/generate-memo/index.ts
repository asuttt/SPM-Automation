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

const TEMPLATE = `STANDARD SALES MEMO TEMPLATE (STRUCTURE TO FOLLOW STRICTLY):

Sales Point Memorandum

[Issuer Name]

[$XXX,000,000]* 
[Series Name]

[$XXX,000,000]* 
[Series Name]

TRIP ID: XXXXX

BOOKRUNNER: [Bank A, "Left Lead"]

SENIOR CO-MANAGER(S): [Bank B]

CO-MANAGER(S): [Bank C]
[Bank D]
[Bank E]
[Bank F]

SCHEDULE:
  POS: [mm/dd]
  Pricing: [mm/dd]
  Closing: [mm/dd]

TAX EXEMPTIONS:
                [Series Name]   [Series Name]
  State         [Yes/No]        [Yes/No]
  Federal       [Yes/No]        [Yes/No]
  AMT           [No/N/A]        [No/N/A]

RATINGS (M/S&P/F/K): -- / -- / -- / --

INTEREST PAYMENT DATE:
[1–3 concise sentences on interest payment frequency and first payment date.]

MATURITY SCHEDULE:
[Short description and/or "See POS for full schedule." Eventually, goal would be for LLM to screenshot maturity schedule, if available on the inside cover, and paste into output/doc.]

PROCEEDS:
[Paragraph summarizing principal uses of proceeds.]

SECURITY OR SOURCE OF FUNDS:
[Paragraph describing pledge / revenues / lien and key funds or accounts.]

OPTIONAL REDEMPTION:
[Paragraph summarizing call provisions.]

MANDATORY REDEMPTION:
[Paragraph summarizing any mandatory sinking fund redemptions.]

THE ISSUER:
[1–3 concise paragraphs describing the issuer / system / service area. Full history not needed. Context is for traders to have a fact sheet while relaying deal info across teams and to potential investors]`;

const EXAMPLE = `EXAMPLE OF A WELL-FORMATTED SALES MEMO (FOR STYLE AND BREVITY):

Sales Point Memorandum

Miami-Dade County, Florida

$575,000,000*
Water and Sewer System Revenue
Bonds, Series 2025A

$425,000,000*
Water and Sewer System Revenue
Refunding Bonds, Series 2025B

TRIP ID: XXXXX

BOOKRUNNER: Wells Fargo Securities

SENIOR CO-MANAGER(S): Estrada Hinojosa
Loop Capital

CO-MANAGER(S): Barclays
FHN Financial
Jefferies
Stern Brothers

SCHEDULE:
  POS: 10/30
  Pricing: 11/6
  Closing: 11/20

TAX EXEMPTIONS:             Series 2025A   Series 2025B
  State                      Yes           Yes
  Federal                    Yes           Yes
  AMT                        No            No

RATINGS (M/S&P/F/K): Aa3 / AA / AA- / AA

INTEREST PAYMENT DATE:
Interest on the Series 2025 Bonds will be payable semi-annually
on April 1 and October 1 of each year, commencing April 1, 2026.

MATURITY SCHEDULE:
[Language or reference as used in your final document, e.g., "See POS
for full maturity schedule."]

PROCEEDS:
The proceeds of the Series 2025A Bonds, together with other legally
available moneys of the Miami-Dade Water and Sewer Department
(the "Department"), will be used to: (i) pay the costs of the Series 2025
Project; (ii) make a deposit to the Reserve Account; and (iii) pay the
costs of issuance of the Series 2025A Bonds.

The proceeds of the Series 2025B Bonds, together with other legally
available moneys of the Department, will be used to: (i) refund and
defease the Refunded Bonds; and (ii) pay the costs of issuance of the
Series 2025B Bonds.

SECURITY OR SOURCE OF FUNDS:
The payment of principal of and interest on the Series 2025 Bonds is
secured by a pledge of and lien on the Net Operating Revenues (see
"Flow of Funds" in the POS). The Series 2025 Bonds are being issued
on a parity basis as to source and security for payment with the
Outstanding Bonds, any future Bonds, and certain Hedge Obligations
which may be incurred in the future.

Flow of Funds:
Section 502 of the Master Ordinance creates the following funds and
accounts (all held by the County) for the security of the Outstanding
Bonds, the Series 2025 Bonds, and any future Bonds:
  (a) the Revenue Fund;
  (b) the Debt Service Fund, including a Bond Service Account,
      a Redemption Account, and a Reserve Account;
  (c) the Renewal and Replacement Fund;
  (d) the Plant Expansion Fund;
  (e) the Rate Stabilization Fund; and
  (f) the General Reserve Fund.

In addition, the Series 2025 Resolution creates the "Series 2025A
Bond Service Subaccount," the "Series 2025B Bond Service
Subaccount," the "Series 2025A Redemption Subaccount," and the
"Series 2025B Redemption Subaccount" in the Debt Service Fund.

OPTIONAL REDEMPTION:
The Series 2025 Bonds maturing on or prior to October 1, 20__ will
not be subject to optional redemption prior to maturity. The Series
2025 Bonds maturing on or after October 1, 20__ will be subject to
optional redemption, at the option of the County, in whole or in part, on
or after October 1, 20__, at a redemption price equal to 100% of the
principal amount to be redeemed plus accrued interest to the
redemption date, without premium.

MANDATORY REDEMPTION:
The Series 2025A Bonds maturing on October 1, 20__ are subject to
mandatory sinking fund redemption in part, prior to maturity, by lot, at a
redemption price equal to the principal amount of the Series 2025A
Bonds to be redeemed, commencing October 1, 20__, in the years and
principal amounts set forth in the POS.

THE ISSUER:
The Utility is divided into the Water System and the Sewer System
(the "Wastewater System"). The Department administers each
system on a unified basis for purposes of billing but separates them
for rates, capital improvements, and accounting; the Utility is
combined for financial statement purposes.

The Utility currently provides water and wastewater treatment to
substantially all of the County either directly to retail customers or
indirectly through wholesale contracts with various municipalities.
In 2024, the population of the County was estimated at
approximately 2,774,841.

The Department's long-term objective of expansion to County-wide
operation has been achieved by the acquisition of all privately-owned
utilities in the County. Since 1973, the Department has acquired
multiple independent systems.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, optionalSections = [] } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: "PDF file is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Extracting text from PDF...");
    
    // Decode base64 PDF
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    
    // Extract text using simple approach with aggressive filtering
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let rawText = decoder.decode(pdfBytes);
    
    // Extract readable text segments (between common PDF text markers)
    const textSegments: string[] = [];
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let match;
    
    while ((match = streamRegex.exec(rawText)) !== null) {
      const segment = match[1]
        .replace(/[^\x20-\x7E\n\r]/g, ' ') // Keep only printable ASCII
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      if (segment.length > 50) { // Only keep substantial segments
        textSegments.push(segment);
      }
    }
    
    let pdfText = textSegments.join('\n\n');
    
    // If extraction failed, fall back to basic filtering
    if (pdfText.length < 100) {
      pdfText = rawText
        .replace(/[^\x20-\x7E\n\r]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    console.log("PDF text extracted, length:", pdfText.length);
    
    // Aggressive truncation to prevent token overflow (max 200k chars ~= 50k tokens)
    const MAX_TEXT_LENGTH = 200000;
    if (pdfText.length > MAX_TEXT_LENGTH) {
      console.log(`PDF text too long (${pdfText.length} chars), truncating to ${MAX_TEXT_LENGTH}`);
      pdfText = pdfText.substring(0, MAX_TEXT_LENGTH) + "\n\n[Document truncated due to length...]";
    }

    // Build the user prompt
    let userPrompt = `${TEMPLATE}\n\n---\n\n${EXAMPLE}\n\n---\n\n`;

    if (optionalSections.length > 0) {
      userPrompt += `OPTIONAL SECTIONS REQUESTED (APPEND THESE AT THE END):\n`;
      optionalSections.forEach((section: string) => {
        userPrompt += `- ${section}\n`;
      });
      userPrompt += `\n---\n\n`;
    }

    userPrompt += `SOURCE DOCUMENT TEXT (EXTRACTED FROM PDF — ONLY SOURCE OF TRUTH):\n${pdfText}\n\n---\n\n`;
    userPrompt += `INSTRUCTIONS:
1. Follow the STANDARD TEMPLATE headings and order exactly.
2. Match the tone and brevity of the EXAMPLE memo.
3. Populate only from SOURCE DOCUMENT TEXT.
4. For anything missing or uncertain, insert: <span style="color: red; font-weight: bold;">XXXXX</span>
5. If optional sections requested, append them after the standard template.
6. Output the final memo as HTML with proper formatting, using <p>, <strong>, <br>, etc.
7. Preserve the structure and indentation from the template.`;

    console.log("Calling Lovable AI...");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
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
    const memo = data.choices?.[0]?.message?.content;

    if (!memo) {
      throw new Error("No memo generated from AI");
    }

    console.log("Memo generated successfully");

    return new Response(
      JSON.stringify({ memo }),
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
