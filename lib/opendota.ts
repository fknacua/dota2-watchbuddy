const OPENDOTA_BASE = "https://api.opendota.com/api";
const OPENDOTA_CDN_BASE = "https://cdn.cloudflare.steamstatic.com";
const CACHE_TTL_MS = 60 * 60 * 1000;

export interface HeroConstant {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: string;
  attack_type: string;
  roles: string[];
  icon?: string;
  iconUrl?: string;
  base_health?: number;
  base_mana?: number;
  base_armor?: number;
  base_attack_min?: number;
  base_attack_max?: number;
  base_str?: number;
  base_agi?: number;
  base_int?: number;
  attack_range?: number;
  move_speed?: number;
  [key: string]: unknown;
}

export interface AbilityAttrib {
  key: string;
  header?: string;
  value: string | string[];
  generated?: boolean;
}

export interface AbilityConstant {
  dname?: string;
  behavior?: string | string[];
  lore?: string;
  desc?: string;
  img?: string;
  iconUrl?: string;
  mc?: string | string[] | false;
  cd?: string | string[] | false;
  attrib?: AbilityAttrib[];
  [key: string]: unknown;
}

export interface ItemAbility {
  type?: string;
  title?: string;
  description?: string;
}

export interface ItemConstant {
  id: number;
  dname?: string;
  cost?: number;
  qual?: string;
  desc?: string;
  notes?: string;
  hint?: string[];
  abilities?: ItemAbility[];
  mc?: number | false;
  cd?: number | false;
  attrib?: AbilityAttrib[];
  img?: string;
  iconUrl?: string;
  [key: string]: unknown;
}

export interface HeroAbilitiesConstant {
  abilities: string[];
  talents: { name: string; level: number }[];
  facets?: {
    id: number;
    name: string;
    deprecated?: string;
    icon: string;
    color: string;
    gradient_id: number;
    title: string;
    description: string;
  }[];
  [key: string]: unknown;
}

interface ConstantsCache {
  heroes: Record<string, HeroConstant>;
  abilities: Record<string, AbilityConstant>;
  items: Record<string, ItemConstant>;
  heroAbilities: Record<string, HeroAbilitiesConstant>;
  fetchedAt: number;
}

let cache: ConstantsCache | null = null;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${OPENDOTA_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`OpenDota request to ${path} failed: ${res.status}`);
  }
  return res.json();
}

function resolveIconUrl(relativePath: string | undefined): string | undefined {
  return relativePath ? `${OPENDOTA_CDN_BASE}${relativePath}` : undefined;
}

async function fetchConstants(): Promise<ConstantsCache> {
  const [heroes, abilities, items, heroAbilities] = await Promise.all([
    fetchJson<Record<string, HeroConstant>>("/constants/heroes"),
    fetchJson<Record<string, AbilityConstant>>("/constants/abilities"),
    fetchJson<Record<string, ItemConstant>>("/constants/items"),
    fetchJson<Record<string, HeroAbilitiesConstant>>("/constants/hero_abilities"),
  ]);

  for (const hero of Object.values(heroes)) {
    hero.iconUrl = resolveIconUrl(hero.icon);
  }
  for (const item of Object.values(items)) {
    item.iconUrl = resolveIconUrl(item.img);
  }
  for (const ability of Object.values(abilities)) {
    ability.iconUrl = resolveIconUrl(ability.img);
  }

  return { heroes, abilities, items, heroAbilities, fetchedAt: Date.now() };
}

async function getConstants(): Promise<ConstantsCache> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    console.log("[opendota] constants cache hit");
    return cache;
  }
  console.log("[opendota] constants cache miss — fetching");
  cache = await fetchConstants();
  return cache;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function findByDisplayName<T>(
  entries: T[],
  displayNameOf: (entry: T) => string | undefined,
  name: string
): T | null {
  const target = normalize(name);
  const named = entries
    .map((entry) => ({ entry, dname: displayNameOf(entry) }))
    .filter((e): e is { entry: T; dname: string } => typeof e.dname === "string");

  const exact = named.find((e) => normalize(e.dname) === target);
  if (exact) return exact.entry;

  const partial = named.find((e) => normalize(e.dname).includes(target));
  return partial ? partial.entry : null;
}

export async function findHeroByName(name: string): Promise<HeroConstant | null> {
  const { heroes } = await getConstants();
  return findByDisplayName(Object.values(heroes), (h) => h.localized_name, name);
}

export async function findAbilityByName(name: string): Promise<AbilityConstant | null> {
  const { abilities } = await getConstants();
  return findByDisplayName(Object.values(abilities), (a) => a.dname, name);
}

export async function findItemByName(name: string): Promise<ItemConstant | null> {
  const { items } = await getConstants();
  return findByDisplayName(Object.values(items), (i) => i.dname, name);
}

// Strips OpenDota's unresolved value-template syntax (e.g. "{s:bonus_stack_bonus_damage}") —
// neither the live API nor dotaconstants resolves these to their actual numbers.
export function stripValueTemplate(dname: string): string {
  return dname.replace(/\s*\{[^}]*\}\s*/g, " ").replace(/\s+/g, " ").trim();
}

export interface HeroTalent {
  level: number;
  name: string;
}

export async function getHeroTalents(heroName: string): Promise<HeroTalent[] | null> {
  const { heroAbilities, abilities } = await getConstants();
  const hero = await findHeroByName(heroName);
  if (!hero) return null;

  const kit = heroAbilities[hero.name];
  if (!kit) return null;

  return kit.talents.map((talent) => {
    const dname = abilities[talent.name]?.dname ?? talent.name;
    return { level: talent.level, name: stripValueTemplate(dname) };
  });
}

export interface HeroFacet {
  title: string;
  description: string;
}

export async function getHeroFacets(heroName: string): Promise<HeroFacet[] | null> {
  const { heroAbilities } = await getConstants();
  const hero = await findHeroByName(heroName);
  if (!hero) return null;

  const kit = heroAbilities[hero.name];
  if (!kit) return null;

  return (kit.facets ?? [])
    .filter((facet) => facet.deprecated !== "true")
    .map((facet) => ({ title: facet.title, description: facet.description }));
}

export interface HeroAghs {
  hasScepter: boolean;
  scepterSkillName?: string;
  scepterDescription?: string;
  hasShard: boolean;
  shardSkillName?: string;
  shardDescription?: string;
}

interface AghsDescEntry {
  hero_name: string;
  has_scepter: boolean;
  scepter_desc?: string;
  scepter_skill_name?: string;
  has_shard: boolean;
  shard_desc?: string;
  shard_skill_name?: string;
}

export async function getHeroAghs(heroName: string): Promise<HeroAghs | null> {
  const hero = await findHeroByName(heroName);
  if (!hero) return null;

  const { aghs_desc } = await import("dotaconstants");
  const entry = (aghs_desc as AghsDescEntry[]).find((e) => e.hero_name === hero.name);
  if (!entry) return null;

  return {
    hasScepter: entry.has_scepter,
    scepterSkillName: entry.scepter_skill_name,
    scepterDescription: entry.scepter_desc,
    hasShard: entry.has_shard,
    shardSkillName: entry.shard_skill_name,
    shardDescription: entry.shard_desc,
  };
}
