import { useMemo, useState } from "react";
import { ValidationError, useForm } from "@formspree/react";
import { MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const FEEDBACK_TYPES = [
  "Bug",
  "Feature Request",
  "Output Issue",
  "Other",
] as const;

const getFeedbackSubject = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = String(now.getFullYear()).slice(-2);

  return `SPM GENERATOR FEEDBACK (${month}/${day}/${year})`;
};

interface FeedbackSheetProps {
  triggerClassName?: string;
  iconClassName?: string;
  labelClassName?: string;
}

export const FeedbackSheet = ({
  triggerClassName,
  iconClassName,
  labelClassName,
}: FeedbackSheetProps) => {
  const [state, handleSubmit] = useForm("xjgakdpg");
  const [feedbackType, setFeedbackType] = useState<string>("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const subject = useMemo(getFeedbackSubject, []);
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit =
    Boolean(feedbackType) &&
    message.trim().length > 0 &&
    emailIsValid &&
    !state.submitting;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "hover-pop h-8 px-2 text-primary-foreground hover:bg-white/10 hover:text-accent",
            triggerClassName,
          )}
        >
          <MessageSquareText className={cn("h-4 w-4", iconClassName)} />
          <span className={labelClassName}>Feedback</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full border-border bg-background sm:max-w-xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <SheetHeader className="border-b border-border pb-4 text-left">
          <SheetTitle>Feedback</SheetTitle>
          <SheetDescription>
            Send bugs, requests, or output issues directly to the team
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {state.succeeded ? (
            <div className="rounded-lg border border-border bg-secondary/35 p-4 text-sm text-foreground">
              Thanks for the feedback. Your note has been sent.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="_subject" value={subject} />
              <input type="hidden" name="type" value={feedbackType} />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Type
                </label>
                <Select value={feedbackType} onValueChange={setFeedbackType}>
                  <SelectTrigger className="text-muted-foreground data-[placeholder]:text-muted-foreground focus:ring-accent focus:ring-offset-0">
                    <SelectValue placeholder="Select feedback type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!feedbackType && (
                  <p className="text-xs text-muted-foreground">
                    Select a feedback type before submitting
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-foreground"
                >
                  Message
                </label>
                <Textarea
                  id="message"
                  name="message"
                  required
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="min-h-[140px] focus-visible:ring-accent focus-visible:ring-offset-0"
                  placeholder="Describe the issue, request, or output behavior"
                />
                <ValidationError
                  prefix="Message"
                  field="message"
                  errors={state.errors}
                  className="text-sm text-destructive"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="focus-visible:ring-accent focus-visible:ring-offset-0"
                  placeholder="name@company.com"
                />
                {email.length > 0 && !emailIsValid && (
                  <p className="text-xs text-muted-foreground">
                    Enter a valid email address
                  </p>
                )}
                <ValidationError
                  prefix="Email"
                  field="email"
                  errors={state.errors}
                  className="text-sm text-destructive"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="hover-pop bg-accent text-accent-foreground hover:[background-color:hsl(var(--accent-hover))]"
                >
                  {state.submitting ? "Sending..." : "Send Feedback"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
