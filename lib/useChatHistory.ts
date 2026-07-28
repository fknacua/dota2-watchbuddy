"use client";

import { createContext, useContext } from "react";
import type { ChatSummary, Message } from "@/lib/types";

export interface ChatHistoryApi {
  chats: ChatSummary[];
  getMessages: (chatId: string) => Message[];
  createChat: () => string;
  addMessages: (chatId: string, messages: Message[]) => void;
  patchTitle: (chatId: string, title: string) => void;
  deleteChat: (chatId: string) => void;
  isSending: (chatId: string) => boolean;
  getStatus: (chatId: string) => string | undefined;
  sendMessage: (chatId: string, text: string) => Promise<void>;
}

export const ChatHistoryContext = createContext<ChatHistoryApi | null>(null);

export function useChatHistory(): ChatHistoryApi {
  const ctx = useContext(ChatHistoryContext);
  if (!ctx) {
    throw new Error("useChatHistory must be used within a ChatHistoryProvider");
  }
  return ctx;
}
