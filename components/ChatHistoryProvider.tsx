"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as chatStore from "@/lib/chatStore";
import { ChatHistoryContext } from "@/lib/useChatHistory";
import type { ChatSummary, Message, MessageSource } from "@/lib/types";

interface StatusEvent {
  type: "status";
  text: string;
}
interface DoneEvent {
  type: "done";
  reply: string;
  sources: MessageSource[];
}
interface ErrorEvent {
  type: "error";
  message: string;
}
type StreamEvent = StatusEvent | DoneEvent | ErrorEvent;

export default function ChatHistoryProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [sendingChatIds, setSendingChatIds] = useState<Set<string>>(new Set());
  const [statusByChatId, setStatusByChatId] = useState<Record<string, string>>({});
  const pendingRequestsRef = useRef(new Map<string, AbortController>());

  const refresh = useCallback(() => {
    setChats(chatStore.loadChats().map(({ id, title, updatedAt }) => ({ id, title, updatedAt })));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getMessages = useCallback((chatId: string): Message[] => {
    return chatStore.loadChat(chatId)?.messages ?? [];
  }, []);

  const createChat = useCallback((): string => {
    const chat = chatStore.createChat();
    refresh();
    return chat.id;
  }, [refresh]);

  const addMessages = useCallback(
    (chatId: string, messages: Message[]) => {
      chatStore.appendMessages(chatId, messages);
      refresh();
    },
    [refresh]
  );

  const patchTitle = useCallback(
    (chatId: string, title: string) => {
      chatStore.patchTitle(chatId, title);
      refresh();
    },
    [refresh]
  );

  const deleteChat = useCallback(
    (chatId: string) => {
      pendingRequestsRef.current.get(chatId)?.abort();
      chatStore.deleteChat(chatId);
      refresh();
    },
    [refresh]
  );

  const isSending = useCallback((chatId: string) => sendingChatIds.has(chatId), [sendingChatIds]);

  const getStatus = useCallback((chatId: string) => statusByChatId[chatId], [statusByChatId]);

  const setStatus = useCallback((chatId: string, text: string | undefined) => {
    setStatusByChatId((prev) => {
      if (text === undefined) {
        if (!(chatId in prev)) return prev;
        const next = { ...prev };
        delete next[chatId];
        return next;
      }
      return { ...prev, [chatId]: text };
    });
  }, []);

  const generateTitle = useCallback(
    async (targetChatId: string, userMessage: string, assistantReply: string) => {
      try {
        const res = await fetch("/api/chat/title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userMessage, assistantReply }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.title) {
          patchTitle(targetChatId, data.title);
        }
      } catch {
        // Title generation is non-critical — leave the default title on failure.
      }
    },
    [patchTitle]
  );

  const sendMessage = useCallback(
    async (chatId: string, text: string) => {
      const priorMessages = getMessages(chatId);
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };
      const nextMessages = [...priorMessages, userMessage];
      addMessages(chatId, [userMessage]);
      setSendingChatIds((prev) => new Set(prev).add(chatId));

      const controller = new AbortController();
      pendingRequestsRef.current.set(chatId, controller);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let doneEvent: DoneEvent | undefined;
        let streamDone = false;

        const handleLine = (line: string) => {
          if (!line.trim()) return;
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "status") {
            setStatus(chatId, event.text);
          } else if (event.type === "done") {
            doneEvent = event;
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        };

        while (!streamDone) {
          const { done, value } = await reader.read();
          streamDone = done;
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) handleLine(line);
        }
        if (buffer.trim()) handleLine(buffer);

        if (!doneEvent) {
          throw new Error("Stream ended without a done event");
        }

        if (!chatStore.loadChat(chatId)) return;

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: doneEvent.reply,
          sources: doneEvent.sources,
        };
        addMessages(chatId, [assistantMessage]);

        if (nextMessages.length === 1) {
          generateTitle(chatId, text, assistantMessage.content);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!chatStore.loadChat(chatId)) return;
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Something went wrong reaching the model — try again.",
        };
        addMessages(chatId, [errorMessage]);
      } finally {
        pendingRequestsRef.current.delete(chatId);
        setStatus(chatId, undefined);
        setSendingChatIds((prev) => {
          const next = new Set(prev);
          next.delete(chatId);
          return next;
        });
      }
    },
    [getMessages, addMessages, generateTitle, setStatus]
  );

  return (
    <ChatHistoryContext.Provider
      value={{
        chats,
        getMessages,
        createChat,
        addMessages,
        patchTitle,
        deleteChat,
        isSending,
        getStatus,
        sendMessage,
      }}
    >
      {children}
    </ChatHistoryContext.Provider>
  );
}
