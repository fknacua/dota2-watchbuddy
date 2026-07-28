import { Message as MessageRow, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";

interface TypingIndicatorProps {
  status?: string;
}

export default function TypingIndicator({ status }: TypingIndicatorProps) {
  return (
    <MessageRow align="start">
      <MessageContent>
        <Bubble align="start" variant="secondary">
          <BubbleContent className="flex items-center gap-2 py-3">
            <span className="flex items-center gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current" />
            </span>
            {status && <span className="text-xs text-muted-foreground">{status}</span>}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </MessageRow>
  );
}
