import { BookOpenText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const DOC_SECTIONS = [
  {
    title: "How it works",
    bullets: [
      "Upload POS / Prospectus / OM",
      "Select all desired categories",
      "Enter key dates",
      "Generate memo",
    ],
  },
  {
    title: "What documents work best",
    bullets: [
      "POS",
      "Official Statement",
      "Offering Memo",
      "Circular",
    ],
  },
  {
    title: "Limitations",
    bullets: [
      "AI may miss data in scanned PDFs",
      "Tables sometimes require manual review",
    ],
  },
];

export const DocsSheet = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hover-pop h-8 px-2 text-primary-foreground hover:bg-white/10 hover:text-accent"
        >
          <BookOpenText className="h-4 w-4" />
          Docs
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full border-border bg-background sm:max-w-xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <SheetHeader className="border-b border-border pb-4 text-left">
          <SheetTitle>Docs</SheetTitle>
          <SheetDescription>
            Quick reference for using the memo generator
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {DOC_SECTIONS.map((section) => (
            <section key={section.title} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3 text-sm text-foreground">
                    <span className="mt-[0.45rem] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
