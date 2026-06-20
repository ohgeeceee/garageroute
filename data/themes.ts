import { Baby, Armchair, Wrench, Radio, Gem } from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface Theme {
  slug: string;
  name: string;
  description: string;
  categories: string[];
  icon: LucideIcon;
  color: string;
}

export const themes: Theme[] = [
  {
    slug: "vintage",
    name: "Vintage Treasures",
    description: "Mid-century furniture, decor, collectibles, and antiques.",
    categories: ["Vintage", "Collectibles"],
    icon: Gem,
    color: "bg-amber-100 text-amber-700",
  },
  {
    slug: "baby-kids",
    name: "Baby & Kids",
    description: "Strollers, clothes, toys, cribs, and kid gear.",
    categories: ["Baby", "Clothing", "Toys"],
    icon: Baby,
    color: "bg-pink-100 text-pink-700",
  },
  {
    slug: "tools-sports",
    name: "Tools & Sports",
    description: "Power tools, bikes, camping gear, and outdoor equipment.",
    categories: ["Tools", "Sports"],
    icon: Wrench,
    color: "bg-blue-100 text-blue-700",
  },
  {
    slug: "furniture",
    name: "Furniture Finds",
    description: "Couches, tables, kitchenware, and home goods.",
    categories: ["Furniture", "Kitchen"],
    icon: Armchair,
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    slug: "tech-media",
    name: "Tech & Media",
    description: "Electronics, books, vinyl, games, and gadgets.",
    categories: ["Electronics", "Books"],
    icon: Radio,
    color: "bg-violet-100 text-violet-700",
  },
];

export function getThemeBySlug(slug: string): Theme | undefined {
  return themes.find((t) => t.slug === slug);
}
