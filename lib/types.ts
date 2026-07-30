export type MessageRole = "user" | "assistant";

export interface ItemCandidate {
  name: string;
  imageUrl: string;
}

export type MessageSource = { type: "internal" } | { type: "web"; url: string; title: string };

export type StatRow = { label: string; value: string };

export type AbilityEntry = {
  name: string;
  iconUrl?: string;
  description?: string;
  stats: StatRow[];
};

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "statsTable"; title?: string; iconUrl?: string; description?: string; rows: StatRow[] }
  | { type: "columnTable"; title?: string; columns: string[]; rows: string[][] }
  | { type: "abilityList"; title?: string; entries: AbilityEntry[] };

export function blocksToPlainText(blocks: ContentBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "text":
          return block.text;
        case "statsTable": {
          const lines = [block.title, block.description, ...block.rows.map((r) => `${r.label}: ${r.value}`)];
          return lines.filter(Boolean).join("\n");
        }
        case "columnTable": {
          const lines = [block.title, ...block.rows.map((r) => r.join(" | "))];
          return lines.filter(Boolean).join("\n");
        }
        case "abilityList": {
          const lines = [
            block.title,
            ...block.entries.map((e) => {
              const statsLine = e.stats.map((s) => `${s.label}: ${s.value}`).join(", ");
              return [e.name, e.description, statsLine].filter(Boolean).join(" — ");
            }),
          ];
          return lines.filter(Boolean).join("\n");
        }
      }
    })
    .join("\n\n");
}

export interface ToolExecutionResult {
  text: string;
  block?: ContentBlock;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: ContentBlock[];
  candidates?: ItemCandidate[];
  sources?: MessageSource[];
}

export interface ChatSummary {
  id: string;
  title: string;
  updatedAt: string;
}
