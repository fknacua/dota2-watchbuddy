import type {
  AbilityAttrib,
  AbilityConstant,
  HeroAghs,
  HeroConstant,
  HeroFacet,
  HeroTalent,
  ItemConstant,
} from "@/lib/opendota";
import { stripValueTemplate } from "@/lib/opendota";
import type { ContentBlock, StatRow } from "@/lib/types";

function prettifyKey(key: string): string {
  return key
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function attribLabel(attrib: AbilityAttrib): string {
  if (attrib.header) return prettifyKey(attrib.header.replace(/:$/, "").trim().replace(/\s+/g, "_"));
  return prettifyKey(attrib.key);
}

function attribValue(value: string | string[]): string {
  return Array.isArray(value) ? value.join("/") : value;
}

function attribRows(attribs: AbilityAttrib[] | undefined): StatRow[] {
  if (!attribs) return [];
  return attribs
    .filter((a) => !a.generated)
    .map((a) => ({ label: attribLabel(a), value: attribValue(a.value) }));
}

export function heroToStatsBlock(hero: HeroConstant): ContentBlock {
  const rows: StatRow[] = [];
  if (hero.base_health != null) rows.push({ label: "Health", value: `${hero.base_health} base` });
  if (hero.base_mana != null) rows.push({ label: "Mana", value: `${hero.base_mana} base` });
  if (hero.base_armor != null) rows.push({ label: "Armor", value: String(hero.base_armor) });
  if (hero.base_attack_min != null && hero.base_attack_max != null) {
    rows.push({ label: "Attack Damage", value: `${hero.base_attack_min}-${hero.base_attack_max}` });
  }
  if (hero.attack_range != null) {
    rows.push({
      label: "Attack Range",
      value: `${hero.attack_range} (${hero.attack_type === "Melee" ? "melee" : "ranged"})`,
    });
  }
  if (hero.move_speed != null) rows.push({ label: "Move Speed", value: String(hero.move_speed) });
  if (hero.base_str != null && hero.base_agi != null && hero.base_int != null) {
    const primary = hero.primary_attr === "all" ? "all-attribute" : hero.primary_attr;
    rows.push({
      label: "Attributes",
      value: `${hero.base_str} STR / ${hero.base_agi} AGI / ${hero.base_int} INT (${primary})`,
    });
  }

  return { type: "statsTable", title: "Base Stats", iconUrl: hero.iconUrl, rows };
}

export function itemToStatsBlock(item: ItemConstant): ContentBlock {
  const descriptionParts: string[] = [];
  for (const ability of item.abilities ?? []) {
    if (ability.description) descriptionParts.push(ability.description.trim());
  }
  if (item.notes) descriptionParts.push(item.notes.trim());
  for (const hint of item.hint ?? []) {
    descriptionParts.push(hint.trim());
  }

  const rows: StatRow[] = [];
  if (item.cost != null) rows.push({ label: "Cost", value: String(item.cost) });
  if (typeof item.mc === "number") rows.push({ label: "Mana Cost", value: String(item.mc) });
  if (typeof item.cd === "number") rows.push({ label: "Cooldown", value: `${item.cd}s` });
  rows.push(...attribRows(item.attrib));

  return {
    type: "statsTable",
    title: item.dname,
    iconUrl: item.iconUrl,
    description: descriptionParts.filter(Boolean).join("\n\n") || undefined,
    rows,
  };
}

export function abilityToBlock(ability: AbilityConstant): ContentBlock {
  const rows: StatRow[] = [];
  if (Array.isArray(ability.mc) || typeof ability.mc === "string") {
    rows.push({ label: "Mana Cost", value: attribValue(ability.mc) });
  }
  if (Array.isArray(ability.cd) || typeof ability.cd === "string") {
    rows.push({ label: "Cooldown", value: `${attribValue(ability.cd)}s` });
  }
  rows.push(...attribRows(ability.attrib));

  return {
    type: "abilityList",
    entries: [
      {
        name: ability.dname ?? "Unknown Ability",
        iconUrl: ability.iconUrl,
        description: ability.desc ? stripValueTemplate(ability.desc) : undefined,
        stats: rows,
      },
    ],
  };
}

export function talentsToBlock(talents: HeroTalent[]): ContentBlock {
  return {
    type: "columnTable",
    title: "Talent Tree",
    columns: ["Level", "Talent"],
    rows: talents.map((t) => [String(t.level), t.name]),
  };
}

export function facetsToBlock(facets: HeroFacet[]): ContentBlock {
  return {
    type: "columnTable",
    title: "Facets",
    columns: ["Facet", "Description"],
    rows: facets.map((f) => [f.title, f.description]),
  };
}

export function aghsToBlock(aghs: HeroAghs): ContentBlock {
  const rows: string[][] = [];
  if (aghs.hasScepter) {
    rows.push([aghs.scepterSkillName ?? "Aghanim's Scepter", aghs.scepterDescription ?? ""]);
  }
  if (aghs.hasShard) {
    rows.push([aghs.shardSkillName ?? "Aghanim's Shard", aghs.shardDescription ?? ""]);
  }
  return {
    type: "columnTable",
    title: "Aghanim's Scepter / Shard",
    columns: ["Upgrade", "Effect"],
    rows,
  };
}
