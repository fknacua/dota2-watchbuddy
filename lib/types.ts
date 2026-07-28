export type MessageRole = "user" | "assistant";

export interface ItemCandidate {
  name: string;
  imageUrl: string;
}

export type MessageSource = { type: "internal" } | { type: "web"; url: string; title: string };

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  candidates?: ItemCandidate[];
  sources?: MessageSource[];
}

export interface ChatSummary {
  id: string;
  title: string;
  updatedAt: string;
}
