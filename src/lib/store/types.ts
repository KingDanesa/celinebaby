import type { Product, CartItem } from "@/lib/types";

export type OrderStatus = "new" | "paid" | "shipped" | "done" | "cancelled";

export interface Order {
  id: string;
  createdAt: string;
  status: OrderStatus;
  items: CartItem[];
  subtotal: number;
  delivery: string;
  payment: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    city: string;
    address?: string;
    comment?: string;
  };
  locale: string;
}

export interface UploadedImage {
  url: string;
}

/**
 * Storage backend. Two implementations:
 *  - `fs`: JSON files + public/uploads (local development, demo on a laptop)
 *  - `supabase`: Postgres table + Storage bucket (free hosting)
 */
export interface Store {
  readonly name: "fs" | "supabase";
  listProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | null>;
  saveProduct(product: Product): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  nextProductId(): Promise<number>;
  uploadImage(file: { bytes: Uint8Array; contentType: string; name: string }): Promise<UploadedImage>;
  deleteImage(url: string): Promise<void>;
  listOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
  saveOrder(order: Order): Promise<Order>;
}
