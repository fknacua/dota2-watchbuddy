"use client";

import { Button } from "@/components/ui/button";

const PROMPTS = [
  "What can you do?",
  "I want to ask about an item or ability",
  "I want to ask about a hero",
  "What patch are we on right now?",
];

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
}

export default function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10">
      <p className="max-w-md text-center text-sm text-muted-foreground">
        Dota Watchbuddy — hero, item, and ability questions using live OpenDota data, plus focused web
        searches for related info.
      </p>
      <p className="text-sm text-muted-foreground">Not sure where to start? Try one of these:</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            variant="outline"
            onClick={() => onSelect(prompt)}
            className="h-auto whitespace-normal rounded-full border-border bg-card px-4 py-2 text-left text-sm font-normal text-foreground hover:bg-secondary/20"
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}
