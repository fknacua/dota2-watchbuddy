"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import SuggestedPrompts from "@/components/SuggestedPrompts";
import { useChatHistory } from "@/lib/useChatHistory";

interface ChatWindowProps {
  chatId: string | null;
}

export default function ChatWindow({ chatId }: ChatWindowProps) {
  const router = useRouter();
  const { getMessages, createChat, isSending, getStatus, sendMessage } = useChatHistory();
  const messages = chatId ? getMessages(chatId) : [];
  const sending = chatId ? isSending(chatId) : false;
  const status = chatId ? getStatus(chatId) : undefined;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  const handleSend = (text: string) => {
    const activeChatId = chatId ?? createChat();
    if (!chatId) {
      router.replace(`/chat/${activeChatId}`);
    }
    sendMessage(activeChatId, text);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && <SuggestedPrompts onSelect={handleSend} />}
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
        {sending && <TypingIndicator status={status} />}
        <div ref={bottomRef} />
      </div>
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
