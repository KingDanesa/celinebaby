import type { AgeGroup, Gender } from "@/data/categories";

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  id: number;
  slug: string;
  sku: string;
  name: string;
  price: number;
  oldPrice: number | null;
  category: string;
  gender: Gender;
  ages: AgeGroup[];
  brand: string | null;
  sizes: string[];
  ageMonths: [number, number] | null;
  colors: ProductColor[];
  images: string[];
  imagesFull: string[];
  description: string;
  composition: string | null;
  care: string | null;
  lining: string | null;
  /** "hit" and "sale" are editorial labels; "new" is legacy and migrated to `showInNew`. */
  tags: ("new" | "hit" | "sale")[];
  inStock: boolean;
  sourceUrl?: string;
  /** Drafts are hidden from the public site. */
  status?: "active" | "draft";
  /** Checkbox in admin: show in the "Новинки" slider on the home page. */
  showInNew?: boolean;
  nameKk?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  key: string;
  productId: number;
  slug: string;
  name: string;
  price: number;
  image: string;
  size: string | null;
  color: string | null;
  qty: number;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  image: string;
  readMinutes: number;
  html: string;
}

export interface SiteUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  city?: string;
  address?: string;
  createdAt?: string;
}
