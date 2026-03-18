export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLACEHOLDER_COLOR = "hsl(21 100% 55%)";

export const placeholderSpan =
  `<span style="color: ${PLACEHOLDER_COLOR}; font-weight: bold;">XXXXX</span>`;

export const SYSTEM_PROMPT = `You are an investment banking analyst specialized in turning offering documents (POS, prospectuses, offering memoranda, etc.) into standardized sales memos for sales & trading.

Follow the provided template exactly.
Match the example memo's clarity, discipline, and professional tone, but expand any section as needed to preserve material mechanics and avoid oversimplifying technical provisions.
Do not invent facts, numbers, or dates—if missing or unclear, insert:
<span style="color: ${PLACEHOLDER_COLOR}; font-weight: bold;">XXXXX</span>

Append optional sections (if any) after the standard sections.
Output the memo in HTML format for clean rendering.`;

export const TEMPLATE = `STANDARD SALES MEMO TEMPLATE (STRICT HTML STRUCTURE):

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

<p><strong>BOOKRUNNER:</strong> [Bank A]</p>
<p><strong>CO-SENIOR:</strong> [Bank B]</p>
<p><strong>CO-MANAGER:</strong><br>[Bank C]<br>[Bank D]<br>[Bank E]<br>[Bank F]</p>

<p><strong>SCHEDULE:</strong><br>POS: <span style="color: ${PLACEHOLDER_COLOR}; font-weight: bold;">XXXXX</span><br>Pricing: <span style="color: ${PLACEHOLDER_COLOR}; font-weight: bold;">XXXXX</span><br>Closing: <span style="color: ${PLACEHOLDER_COLOR}; font-weight: bold;">XXXXX</span></p>

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

export const EXAMPLE = `EXAMPLE SALES MEMO IN HTML STYLE (FOR FORMAT AND BREVITY):

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
<p><strong>CO-SENIOR:</strong> Estrada Hinojosa</p>
<p><strong>CO-MANAGER:</strong><br>Loop Capital<br>Barclays<br>FHN Financial<br>Jefferies<br>Stern Brothers</p>

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
