import { NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { executeLookupTool, lookupTool } from "@/lib/tools/lookupTool";
import { executeHeroKitTool, heroKitTool } from "@/lib/tools/heroKitTool";
import { checkRateLimit } from "@/lib/rateLimit";
import { resolveBlockPlaceholders } from "@/lib/contentBlocks";
import type { ContentBlock, MessageSource } from "@/lib/types";

const ALLOWED_WEB_SEARCH_DOMAINS: string[] = [
  "dota2.com",
  "dotafire.com",
  "dotabuff.com",
  "dota2.fandom.com",
];

const webSearchTool: Anthropic.WebSearchTool20260209 = {
  type: "web_search_20260209",
  name: "web_search",
  allowed_domains: ALLOWED_WEB_SEARCH_DOMAINS,
};

const codeExecutionTool: Anthropic.CodeExecutionTool20260120 = {
  type: "code_execution_20260120",
  name: "code_execution",
};

interface ChatRequestMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_TOOL_ITERATIONS = 10;

function toolStatusText(block: Anthropic.ToolUseBlock): string {
  if (block.name === "lookup_dota_entity") {
    const input = block.input as { name?: string };
    return input?.name ? `Looking up ${input.name}...` : "Looking up Dota data...";
  }
  if (block.name === "lookup_hero_kit") {
    const input = block.input as { hero_name?: string };
    return input?.hero_name ? `Looking up ${input.hero_name}...` : "Looking up hero kit...";
  }
  return "Working...";
}

function clientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const allowed = await checkRateLimit(clientIp(req));
  if (!allowed) {
    const encoder = new TextEncoder();
    const event = { type: "error", message: "You've sent a lot of messages recently — please wait a bit and try again." };
    return new Response(encoder.encode(JSON.stringify(event) + "\n"), {
      status: 429,
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }

  const body = await req.json();
  const requestMessages: ChatRequestMessage[] = body?.messages ?? [];

  const messages: Anthropic.MessageParam[] = requestMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        let containerId: string | undefined;

        const createMessage = async (forceFinalAnswer = false) => {
          const anthropicStream = anthropic.messages.stream({
            model: CLAUDE_MODEL,
            max_tokens: 2048,
            system: SYSTEM_PROMPT,
            tools: [lookupTool, heroKitTool, webSearchTool, codeExecutionTool],
            tool_choice: forceFinalAnswer ? { type: "none" } : undefined,
            messages,
            container: containerId,
          });
          anthropicStream.on("streamEvent", (event) => {
            if (event.type === "message_start" && event.message.container) {
              containerId = event.message.container.id;
            }
            if (event.type === "message_delta" && event.delta.container) {
              containerId = event.delta.container.id;
            }
            if (
              event.type === "content_block_start" &&
              event.content_block.type === "server_tool_use" &&
              event.content_block.name === "web_search"
            ) {
              send({ type: "status", text: "Searching the web..." });
            }
          });
          return anthropicStream.finalMessage();
        };

        let usedOpenDota = false;
        const allContent: Anthropic.ContentBlock[] = [];
        const blocksByPlaceholderId = new Map<string, ContentBlock>();
        let blockCounter = 0;
        let response = await createMessage();
        let iterations = 0;

        while (response.stop_reason === "tool_use" && iterations < MAX_TOOL_ITERATIONS) {
          iterations++;
          allContent.push(...response.content);
          messages.push({ role: "assistant", content: response.content });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of response.content) {
            if (block.type !== "tool_use") continue;
            send({ type: "status", text: toolStatusText(block) });
            let text: string;
            let contentBlock: ContentBlock | undefined;
            if (block.name === "lookup_dota_entity") {
              usedOpenDota = true;
              const result = await executeLookupTool(block.input as { entity_type: string; name: string });
              text = result.text;
              contentBlock = result.block;
            } else if (block.name === "lookup_hero_kit") {
              usedOpenDota = true;
              const result = await executeHeroKitTool(block.input as { kit_type: string; hero_name: string });
              text = result.text;
              contentBlock = result.block;
            } else {
              text = `Unknown tool "${block.name}".`;
            }
            if (contentBlock) {
              blockCounter++;
              const placeholderId = String(blockCounter);
              blocksByPlaceholderId.set(placeholderId, contentBlock);
              text += `\n\n[To show this data to the user, copy this exact token into your reply at the point it should appear: [[block:${placeholderId}]] — copy it verbatim, do not modify it.]`;
            }
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: text });
          }

          if (toolResults.length > 0) {
            messages.push({ role: "user", content: toolResults });
          }
          response = await createMessage(iterations >= MAX_TOOL_ITERATIONS);
        }
        allContent.push(...response.content);

        const replyText = response.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("\n");

        const content = resolveBlockPlaceholders(replyText, blocksByPlaceholderId);

        const sources: MessageSource[] = [];
        if (usedOpenDota) {
          sources.push({ type: "internal" });
        }

        const seenUrls = new Set<string>();
        for (const block of allContent) {
          if (block.type !== "text" || !block.citations) continue;
          for (const citation of block.citations) {
            if (citation.type !== "web_search_result_location") continue;
            if (seenUrls.has(citation.url)) continue;
            seenUrls.add(citation.url);
            sources.push({ type: "web", url: citation.url, title: citation.title ?? citation.url });
          }
        }

        // Fall back to raw (un-cited) search-result URLs when a search ran
        // but Claude never quoted a page directly enough to earn a citation —
        // the user still wants to know where the info could have come from.
        // Capped so a multi-query turn doesn't flood the pill row.
        const MAX_FALLBACK_SOURCES = 5;
        if (!sources.some((s) => s.type === "web")) {
          outer: for (const block of allContent) {
            if (block.type !== "web_search_tool_result" || !Array.isArray(block.content)) continue;
            for (const result of block.content) {
              if (sources.length >= MAX_FALLBACK_SOURCES) break outer;
              if (seenUrls.has(result.url)) continue;
              seenUrls.add(result.url);
              sources.push({ type: "web", url: result.url, title: result.title });
            }
          }
        }

        send({ type: "done", content, sources });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
