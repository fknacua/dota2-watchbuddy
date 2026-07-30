import type { ContentBlock } from "@/lib/types";

const PLACEHOLDER_RE = /\[\[block:([\w-]+)\]\]/g;

function appendBlock(result: ContentBlock[], block: ContentBlock) {
  const prev = result[result.length - 1];
  if (prev && prev.type === "abilityList" && block.type === "abilityList") {
    prev.entries.push(...block.entries);
    return;
  }
  result.push(block);
}

/**
 * Splits reply text on `[[block:<tool_use_id>]]` placeholders, resolving each to the
 * pre-formatted block for that tool call. Unknown ids are dropped (logged) rather than
 * leaking a broken token to the user. Adjacent abilityList blocks merge into one table.
 */
export function resolveBlockPlaceholders(
  text: string,
  blocksById: Map<string, ContentBlock>
): ContentBlock[] {
  const result: ContentBlock[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(PLACEHOLDER_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      const segment = text.slice(lastIndex, index);
      if (segment.trim()) appendBlock(result, { type: "text", text: segment });
    }

    const id = match[1];
    const block = blocksById.get(id);
    if (block) {
      appendBlock(result, block);
    } else {
      console.warn(`[chat] Unknown block placeholder id "${id}"`);
    }

    lastIndex = index + match[0].length;
  }

  const tail = text.slice(lastIndex);
  if (tail.trim()) appendBlock(result, { type: "text", text: tail });

  return result;
}
