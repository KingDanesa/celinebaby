import "server-only";

/**
 * Kaspi online payment — the ONLY file that talks to Kaspi.
 *
 * Everything around it is ready: the «Kaspi онлайн» option at checkout (shown when KASPI_ENABLED=1),
 * the pay page that sends the customer to Kaspi, the callback URL, status re-checks every 10 minutes,
 * paid e-mails and the admin view. When Kaspi hands over the API documentation and keys,
 * fill in the three functions marked TODO below and set the KASPI_* variables in /etc/celinebaby/env.
 *
 * Give Kaspi these addresses when they ask:
 *   callback (payment notifications): https://celinebaby.kz/api/payment/kaspi/callback?inv=<invoice>&sig=<signature>
 *     — the inv/sig part is added by us per payment, register the address without it if they need a fixed URL;
 *   return page after payment:        https://celinebaby.kz/ru/checkout/success?order=<order id>
 *   server IP (if they whitelist):    89.35.124.200
 */

export interface KaspiConfig {
  enabled: boolean;
  test: boolean;
  apiUrl: string;
  merchantId: string;
  apiKey: string;
}

export function kaspiConfig(): KaspiConfig {
  return {
    enabled: process.env.KASPI_ENABLED === "1",
    test: process.env.KASPI_TEST !== "0",
    apiUrl: (process.env.KASPI_API_URL ?? "").replace(/\/$/, ""),
    merchantId: process.env.KASPI_MERCHANT_ID ?? "",
    apiKey: process.env.KASPI_API_KEY ?? "",
  };
}

/** Kaspi online shows up at checkout only when switched on and configured. */
export function kaspiOnlineEnabled(): boolean {
  const c = kaspiConfig();
  return c.enabled && !!(c.apiUrl && c.merchantId && c.apiKey);
}

/** Our view of a Kaspi payment; mapped onto the order's payment states by kaspi-service.ts. */
export type KaspiStatus = "pending" | "paid" | "failed" | "refunded";

export interface KaspiCreateInput {
  /** Our unique id for this attempt (numeric, like Halyk invoices). */
  invoiceId: string;
  orderId: string;
  amount: number; // tenge
  description: string;
  phone: string;
  returnUrl: string;
  callbackUrl: string;
}

export interface KaspiCreateResult {
  /** Payment id on Kaspi's side, used for status checks. */
  externalId: string;
  /** Page or deep link where the customer confirms the payment in Kaspi. */
  redirectUrl: string;
}

class KaspiNotConnected extends Error {
  constructor(what: string) {
    super(`Kaspi API is not connected yet (${what}): complete src/lib/payment/kaspi.ts with Kaspi's documentation`);
  }
}

/** TODO(Kaspi docs): create a payment and return where to send the customer. */
export async function kaspiCreatePayment(input: KaspiCreateInput): Promise<KaspiCreateResult> {
  void input;
  throw new KaspiNotConnected("create payment");
}

/** TODO(Kaspi docs): ask Kaspi for the current state of a payment. Return null if Kaspi cannot answer now. */
export async function kaspiGetStatus(externalId: string, invoiceId: string): Promise<{ status: KaspiStatus; amount?: number } | null> {
  void externalId;
  void invoiceId;
  throw new KaspiNotConnected("status");
}

/**
 * TODO(Kaspi docs): if Kaspi signs its notifications, check the signature here.
 * Our own per-payment signature in the callback URL is already checked before this is called,
 * and the real state is always re-read with kaspiGetStatus, so returning true is safe meanwhile.
 */
export async function kaspiVerifyNotification(rawBody: string, headers: Headers): Promise<boolean> {
  void rawBody;
  void headers;
  return true;
}
