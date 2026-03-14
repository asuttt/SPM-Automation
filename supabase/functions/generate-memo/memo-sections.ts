const TOP_LEVEL_NODE_PATTERN = /<(p|table)\b[\s\S]*?<\/\1>/gi;

type MemoSectionKind =
  | "issuer_series"
  | "syndicate"
  | "schedule"
  | "maturity_schedule"
  | "tax_exemptions"
  | "ratings"
  | "content";

export interface MemoSection {
  id: string;
  title: string;
  kind: MemoSectionKind;
  html: string;
}

export interface MemoStructure {
  titleHtml: string;
  sections: MemoSection[];
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const stripHtml = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const getHeadingOnlyTitle = (node: string) => {
  const match = node.match(
    /^<p[^>]*>\s*<strong>(.*?)<\/strong>\s*<\/p>$/i,
  );

  if (!match?.[1]) {
    return null;
  }

  return stripHtml(match[1]).replace(/:\s*$/, "");
};

const startsWithAny = (value: string, prefixes: string[]) =>
  prefixes.some((prefix) => value.startsWith(prefix));

const getSectionKindForHeading = (title: string): MemoSectionKind => {
  const normalized = title.trim().toUpperCase();

  if (normalized === "MATURITY SCHEDULE") {
    return "maturity_schedule";
  }

  return "content";
};

const buildSection = (
  title: string,
  kind: MemoSectionKind,
  nodes: string[],
  index: number,
): MemoSection => ({
  id: `${index}-${slugify(title) || kind}`,
  title,
  kind,
  html: nodes.join(""),
});

export const buildMemoStructure = (memoHtml: string): MemoStructure => {
  const nodes = memoHtml.match(TOP_LEVEL_NODE_PATTERN) ?? [];
  const sections: MemoSection[] = [];
  let index = 0;
  let cursor = 0;
  let titleHtml = "";

  if (nodes[0] && stripHtml(nodes[0]).includes("Sales Point Memorandum")) {
    titleHtml = nodes[0];
    cursor = 1;
  }

  if (nodes[cursor]?.startsWith("<p") && nodes[cursor + 1]?.startsWith("<table")) {
    sections.push(
      buildSection("Issuer & Series", "issuer_series", [nodes[cursor], nodes[cursor + 1]], index),
    );
    index += 1;
    cursor += 2;
  }

  const syndicateNodes: string[] = [];

  while (nodes[cursor]) {
    const text = stripHtml(nodes[cursor]);

    if (
      startsWithAny(text, [
        "BOOKRUNNER:",
        "CO-SENIOR:",
        "CO-MANAGER:",
        "SENIOR CO-MANAGER(S):",
        "CO-MANAGER(S):",
      ])
    ) {
      syndicateNodes.push(nodes[cursor]);
      cursor += 1;
      continue;
    }

    break;
  }

  if (syndicateNodes.length > 0) {
    sections.push(buildSection("Syndicate", "syndicate", syndicateNodes, index));
    index += 1;
  }

  if (nodes[cursor] && stripHtml(nodes[cursor]).startsWith("SCHEDULE:")) {
    sections.push(buildSection("Schedule", "schedule", [nodes[cursor]], index));
    index += 1;
    cursor += 1;
  }

  if (
    nodes[cursor] &&
    getHeadingOnlyTitle(nodes[cursor])?.toUpperCase() === "MATURITY SCHEDULE"
  ) {
    const maturityNodes = [nodes[cursor]];
    cursor += 1;

    while (cursor < nodes.length && !getHeadingOnlyTitle(nodes[cursor])) {
      maturityNodes.push(nodes[cursor]);
      cursor += 1;
    }

    sections.push(
      buildSection("Maturity Schedule", "maturity_schedule", maturityNodes, index),
    );
    index += 1;
  }

  if (
    nodes[cursor] &&
    getHeadingOnlyTitle(nodes[cursor])?.toUpperCase() === "TAX EXEMPTIONS" &&
    nodes[cursor + 1]?.startsWith("<table")
  ) {
    sections.push(
      buildSection(
        "Tax Exemptions",
        "tax_exemptions",
        [nodes[cursor], nodes[cursor + 1]],
        index,
      ),
    );
    index += 1;
    cursor += 2;
  }

  if (nodes[cursor] && stripHtml(nodes[cursor]).startsWith("RATINGS (M/S&P/F/K):")) {
    sections.push(buildSection("Ratings", "ratings", [nodes[cursor]], index));
    index += 1;
    cursor += 1;
  }

  while (cursor < nodes.length) {
    const current = nodes[cursor];
    const title = getHeadingOnlyTitle(current);

    if (title) {
      const sectionNodes = [current];
      const kind = getSectionKindForHeading(title);
      cursor += 1;

      while (cursor < nodes.length && !getHeadingOnlyTitle(nodes[cursor])) {
        sectionNodes.push(nodes[cursor]);
        cursor += 1;
      }

      sections.push(buildSection(title, kind, sectionNodes, index));
      index += 1;
      continue;
    }

    const fallbackText = stripHtml(current).slice(0, 40) || `Section ${index + 1}`;
    sections.push(buildSection(fallbackText, "content", [current], index));
    index += 1;
    cursor += 1;
  }

  return { titleHtml, sections };
};
