import type Anthropic from "@anthropic-ai/sdk";
import { findAbilityByName, findHeroByName, findItemByName } from "@/lib/opendota";

export const lookupTool: Anthropic.Tool = {
  name: "lookup_dota_entity",
  description:
    "Look up current, verified data for a Dota 2 hero, ability, or item by its display name, sourced live from OpenDota. Always call this before answering any question about specific hero/ability/item stats — never answer those from memory, since numbers change between patches.",
  input_schema: {
    type: "object",
    properties: {
      entity_type: {
        type: "string",
        enum: ["hero", "ability", "item"],
        description: "The kind of entity to look up.",
      },
      name: {
        type: "string",
        description:
          "The display name as a player would recognize it, e.g. \"Nature's Prophet\", \"Sprout\", \"Blink Dagger\".",
      },
    },
    required: ["entity_type", "name"],
  },
};

interface LookupToolInput {
  entity_type: string;
  name: string;
}

export async function executeLookupTool(input: LookupToolInput): Promise<string> {
  const { entity_type, name } = input;

  try {
    switch (entity_type) {
      case "hero": {
        const hero = await findHeroByName(name);
        return hero ? JSON.stringify(hero) : `No hero found matching "${name}".`;
      }
      case "ability": {
        const ability = await findAbilityByName(name);
        return ability ? JSON.stringify(ability) : `No ability found matching "${name}".`;
      }
      case "item": {
        const item = await findItemByName(name);
        return item ? JSON.stringify(item) : `No item found matching "${name}".`;
      }
      default:
        return `Unknown entity_type "${entity_type}". Must be one of: hero, ability, item.`;
    }
  } catch (err) {
    return `Lookup failed due to an error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
