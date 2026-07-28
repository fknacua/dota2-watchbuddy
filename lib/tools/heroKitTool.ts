import type Anthropic from "@anthropic-ai/sdk";
import { getHeroAghs, getHeroFacets, getHeroTalents } from "@/lib/opendota";

export const heroKitTool: Anthropic.Tool = {
  name: "lookup_hero_kit",
  description:
    "Look up a hero's talent tree, facets, or Aghanim's Scepter/Shard effects, sourced from OpenDota data. Use this for questions the lookup_dota_entity tool can't answer, e.g. \"what are Pudge's talents\", \"what facets does Nature's Prophet have\", or \"what does Void Spirit's Aghanim's Shard do\" — never answer these from memory.",
  input_schema: {
    type: "object",
    properties: {
      kit_type: {
        type: "string",
        enum: ["talents", "facets", "aghanim"],
        description: "Which part of the hero's kit to look up.",
      },
      hero_name: {
        type: "string",
        description: "The hero's display name, e.g. \"Nature's Prophet\".",
      },
    },
    required: ["kit_type", "hero_name"],
  },
};

interface HeroKitToolInput {
  kit_type: string;
  hero_name: string;
}

export async function executeHeroKitTool(input: HeroKitToolInput): Promise<string> {
  const { kit_type, hero_name } = input;

  try {
    switch (kit_type) {
      case "talents": {
        const talents = await getHeroTalents(hero_name);
        return talents ? JSON.stringify(talents) : `No hero found matching "${hero_name}".`;
      }
      case "facets": {
        const facets = await getHeroFacets(hero_name);
        return facets ? JSON.stringify(facets) : `No hero found matching "${hero_name}".`;
      }
      case "aghanim": {
        const aghs = await getHeroAghs(hero_name);
        return aghs
          ? JSON.stringify(aghs)
          : `No Aghanim's Scepter/Shard data found for "${hero_name}".`;
      }
      default:
        return `Unknown kit_type "${kit_type}". Must be one of: talents, facets, aghanim.`;
    }
  } catch (err) {
    return `Lookup failed due to an error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
