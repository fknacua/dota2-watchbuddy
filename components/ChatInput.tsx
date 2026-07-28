"use client";

import { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="mt-4 flex gap-3">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about a hero, ability, or item..."
        disabled={disabled}
        className="flex-1 rounded-md border border-border bg-card px-3 py-2.5 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
      />
      <Button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="h-11 rounded-md bg-accent px-6 text-xl font-semibold tracking-wide text-accent-foreground hover:bg-accent/90"
      >
        Send
      </Button>
    </div>
  );
}
