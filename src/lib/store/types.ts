import type { Product, CartItem } from "@/lib/types";

export type OrderStatus = "new" | "paid" | "shipped" | "done" | "cancelled";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";

export interface Order {
  id: string;
  createdAt: string;
  status: OrderStatus;
  items: CartItem[];
  subtotal: number;
  delivery: string;
  /** Payment method id: "halyk" (online) or "kaspi" (invoice from manager). */
  payment: string;
  paymentStatus: PaymentStatus;
  /** Numeric invoice id sent to the acquiring bank. */
  invoiceId?: string;
  paymentRef?: string;
  paidAt?: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    city: string;
    address?: string;
    comment?: string;
  };
  /** Supabase Auth user id when the customer was signed in. */
  userId?: string | null;
  locale: string;
}

export interface UploadedImage {
  url: string;
}

/**
 * Storage backend. Two implementations:
 *  - `fs`: JSON files + public/uploads (local development, demo on a laptop)
 *  - `supabase`: Postgres table + Storage bucket (hosting)
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
  getOrderByInvoice(invoiceId: string): Promise<Order | null>;
  listOrdersForUser(userId: string, email?: string): Promise<Order[]>;
  saveOrder(order: Order): Promise<Order>;
}
