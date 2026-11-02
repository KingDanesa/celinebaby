import { categories } from "@/data/categories";
import { categoryCover, categoryCount } from "@/lib/catalog";
import type { Product } from "@/lib/types";

export interface MenuData {
  categories: { slug: string; image: string; count: number; group: string }[];
  ageImages: { newborn: string; toddler: string };
  genderImages: { girl: string; boy: string };
}

export function getMenuData(products: Product[]): MenuData {
  const pick = (filter: (p: Product) => boolean) => products.find(filter)?.images[0] ?? "";
  return {
    categories: [...categories]
      .sort((a, b) => a.order - b.order)
      .map((c) => ({
        slug: c.slug,
        image: categoryCover(products, c.slug)?.images[0] ?? "",
        count: categoryCount(products, c.slug),
        group: c.group,
      })),
    ageImages: {
      // Fixed photo chosen by the owner (a baby in a knitted romper).
      newborn: "/img/menu-newborn.jpg",
      toddler: pick((p) => p.ages.includes("toddler") && !p.ages.includes("newborn") && p.images.length > 2),
    },
    genderImages: {
      girl: pick((p) => p.gender === "girl" && p.category === "platya-i-yubki" && p.images.length >= 5) || pick((p) => p.gender === "girl"),
      boy: pick((p) => p.gender === "boy" && p.category === "komplekty" && p.images.length >= 5) || pick((p) => p.gender === "boy"),
    },
  };
}
