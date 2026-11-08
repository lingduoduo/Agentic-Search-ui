import {
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ChartColumn,
  Clapperboard,
  Code2,
  FileText,
  FlaskConical,
  Globe,
  GraduationCap,
  Landmark,
  Lightbulb,
  MapPin,
  MessageCircle,
  Newspaper,
  Plane,
  Scale,
  School,
  Shapes,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SearchDomainOption } from "../models";

/**
 * A family of search sources, shaped like the tool store's `ToolCategory`
 * (`{ category, icon, name }`). `/api/search-domains` has no grouping, so the
 * families and icons live here; a domain the backend adds later lands in Other.
 */
export type SourceCategory = {
  category: string;
  name: string;
  icon: LucideIcon;
  /** Soft tile color for the category's icons, like a tool provider's `background`. */
  background: string;
};

export const SOURCE_CATEGORIES: SourceCategory[] = [
  { category: "research", name: "Research", icon: FlaskConical, background: "#ede9fe" },
  { category: "news", name: "News & social", icon: Newspaper, background: "#fee2e2" },
  { category: "code", name: "Code & data", icon: Code2, background: "#e0f2fe" },
  { category: "government", name: "Government & law", icon: Landmark, background: "#e2e8f0" },
  { category: "business", name: "Business & money", icon: TrendingUp, background: "#dcfce7" },
  { category: "places", name: "Places & events", icon: MapPin, background: "#fef3c7" },
];

const OTHER: SourceCategory = {
  category: "other",
  name: "Other",
  icon: Shapes,
  background: "#f1f5f9",
};

// Each backend domain's family and icon. Names are DOMAIN_REGISTRY's keys.
const DOMAIN_META: Record<string, { category: string; icon: LucideIcon }> = {
  academic: { category: "research", icon: GraduationCap },
  patent: { category: "research", icon: Lightbulb },
  books: { category: "research", icon: BookOpen },
  education: { category: "research", icon: School },
  statistics: { category: "research", icon: ChartColumn },
  news: { category: "news", icon: Newspaper },
  social_media: { category: "news", icon: MessageCircle },
  media: { category: "news", icon: Clapperboard },
  code: { category: "code", icon: Code2 },
  resource: { category: "code", icon: FileText },
  official: { category: "government", icon: Landmark },
  legal: { category: "government", icon: Scale },
  financial: { category: "business", icon: TrendingUp },
  business: { category: "business", icon: Building2 },
  product: { category: "business", icon: ShoppingBag },
  jobs: { category: "business", icon: Briefcase },
  local: { category: "places", icon: MapPin },
  travel: { category: "places", icon: Plane },
  events: { category: "places", icon: CalendarDays },
};

export const domainLabel = (name: string) => name.replace(/_/g, " ");

/** A family's icon and color by key; unknown keys get Other's. */
export const familyOf = (key: string | undefined) =>
  SOURCE_CATEGORIES.find((c) => c.category === key) ?? OTHER;

/** How to draw one domain: its label, icon and its family's tile color. */
export function domainStyle(name: string) {
  if (name === "web") return { label: "All sources", icon: Globe, background: OTHER.background };
  if (name === "auto") return { label: "Auto", icon: Sparkles, background: "#eef2ff" };
  const meta = DOMAIN_META[name];
  const category = familyOf(meta?.category);
  return {
    label: domainLabel(name),
    icon: meta?.icon ?? category.icon,
    background: category.background,
  };
}

/** The options grouped by family, in SOURCE_CATEGORIES order; empty families are left out. */
export function groupByCategory(options: SearchDomainOption[]) {
  return [...SOURCE_CATEGORIES, OTHER]
    .map((category) => ({
      ...category,
      options: options.filter(
        (option) => (DOMAIN_META[option.name]?.category ?? OTHER.category) === category.category,
      ),
    }))
    .filter((group) => group.options.length > 0);
}
