import type { Product, CartItem } from "@/lib/types";

export type OrderStatus = "new" | "paid" | "shipped" | "done" | "cancelled";
/**
 * unpaid     — online payment not started yet
 * pending    — the customer is on the bank's form / the bank has not decided yet
 * authorized — money is blocked on the card, the charge is being completed
 * paid       — money is charged (Halyk CHARGE)
 * failed     — declined or cancelled, the customer can try again
 * refunded   — the money was returned
 */
export type PaymentStatus = "unpaid" | "pending" | "authorized" | "paid" | "failed" | "refunded";

/** Halyk ePay state of one payment attempt; mirrors the old OpenCart module. */
export type HalykState =
  | "CREATED"
  | "PENDING"
  | "NEW"
  | "FINGERPRINT"
  | "VERIFIED"
  | "AUTH"
  | "CAPTURING"
  | "CHARGE"
  | "FAILED"
  | "REJECT"
  | "3D"
  | "CANCEL"
  | "CANCEL_OLD"
  | "REFUND"
  | "ERROR";

/** One attempt to pay an order online (a new attempt gets a new invoice id). */
export interface PaymentAttempt {
  invoiceId: string;
  /** Random per-attempt secret, sent to the bank and checked in its callback. Never shown to the browser. */
  secretHash: string;
  amountMinor: number;
  currency: "KZT";
  terminal: string;
  test: boolean;
  state: HalykState;
  halykId?: string;
  reference?: string;
  cardMask?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

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
  /** Invoice id of the current payment attempt. */
  invoiceId?: string;
  /** Bank transaction id of the successful payment. */
  paymentRef?: string;
  paidAt?: string;
  /** Online payment attempts, oldest first. */
  payments?: PaymentAttempt[];
  customer: {
    name: string;
    phone: string;
    email?: string;
    city: string;
    address?: string;
    comment?: string;
  };
  /** Account id when the customer was signed in. */
  userId?: string | null;
  locale: string;
  /** Optimistic-lock counter, bumped by every updateOrder. */
  version?: number;
}

export interface UploadedImage {
  url: string;
}

/**
 * Storage backend. Three implementations:
 *  - `fs`: JSON files + media folder (local development without a database)
 *  - `supabase`: Supabase tables + Storage bucket (the Vercel demo)
 *  - `pg`: own PostgreSQL + media folder on the server (production)
 */
export interface Store {
  readonly name: "fs" | "supabase" | "pg";
  listProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | null>;
  saveProduct(product: Product): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  nextProductId(): Promise<number>;
  uploadImage(file: { bytes: Uint8Array; contentType: string; name: string }): Promise<UploadedImage>;
  deleteImage(url: string): Promise<void>;
  listOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
  /** Finds the order by the invoice id of any of its payment attempts. */
  getOrderByInvoice(invoiceId: string): Promise<Order | null>;
  listOrdersForUser(userId: string, email?: string): Promise<Order[]>;
  /** Inserts a new order. */
  createOrder(order: Order): Promise<Order>;
  /**
   * Writes the order only if nobody changed it since it was read (version check).
   * Returns false on a conflict; the caller re-reads and retries.
   */
  updateOrder(order: Order, expectedVersion: number): Promise<boolean>;
}

export const orderVersion = (o: Order) => o.version ?? 0;

/** Removes payment secrets before an order leaves the server. */
export function publicOrder(o: Order): Order {
  return { ...o, payments: o.payments?.map((p) => ({ ...p, secretHash: "" })) };
}
