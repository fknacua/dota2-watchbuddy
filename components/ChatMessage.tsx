import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, Link2 } from "lucide-react";
import type { Message as ChatMessageData } from "@/lib/types";
import { Message as MessageRow, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";

type SourceGroup =
  | { type: "internal" }
  | { type: "web"; hostname: string; title: string; url: string; count: number };

function groupSources(sources: NonNullable<ChatMessageData["sources"]>): SourceGroup[] {
  const groups: SourceGroup[] = [];
  const webGroupByHostname = new Map<string, SourceGroup & { type: "web" }>();

  for (const source of sources) {
    if (source.type === "internal") {
      if (!groups.some((g) => g.type === "internal")) groups.push({ type: "internal" });
      continue;
    }
    const hostname = new URL(source.url).hostname.replace(/^www\./, "");
    const existing = webGroupByHostname.get(hostname);
    if (existing) {
      existing.count += 1;
    } else {
      const group: SourceGroup & { type: "web" } = {
        type: "web",
        hostname,
        title: source.title,
        url: source.url,
        count: 1,
      };
      webGroupByHostname.set(hostname, group);
      groups.push(group);
    }
  }

  return groups;
}

function SourcePills({ sources }: { sources: NonNullable<ChatMessageData["sources"]> }) {
  if (sources.length === 0) return null;
  const groups = groupSources(sources);

  return (
    <details className="group/sources">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground select-none hover:bg-secondary/20">
        <Link2 className="size-3" />
        Sources · {groups.length}
        <ChevronDown className="size-3 transition-transform group-open/sources:rotate-180" />
      </summary>
      <div className="mt-1.5 flex flex-col gap-1">
        {groups.map((group, i) =>
          group.type === "internal" ? (
            <span key={i} className="text-xs text-muted-foreground">
              Internal Resource
            </span>
          ) : (
            <a
              key={i}
              href={group.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
              title={group.title}
            >
              {group.hostname}
              {group.count > 1 && ` (${group.count})`}
            </a>
          )
        )}
      </div>
    </details>
  );
}

export default function ChatMessage({ message }: { message: ChatMessageData }) {
  const isUser = message.role === "user";

  return (
    <MessageRow align={isUser ? "end" : "start"}>
      <MessageContent>
        <Bubble align={isUser ? "end" : "start"} variant={isUser ? "default" : "secondary"}>
          <BubbleContent
            className={isUser ? "!bg-accent !text-accent-foreground whitespace-pre-wrap" : undefined}
          >
            {isUser ? (
              message.content
            ) : (
              <div className="prose-chat">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              </div>
            )}
          </BubbleContent>
        </Bubble>
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourcePills sources={message.sources} />
        )}
      </MessageContent>
    </MessageRow>
  );
}
