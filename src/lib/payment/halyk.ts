import "server-only";

/**
 * Halyk Bank ePay (epayment.kz) — the same acquiring the old OpenCart site used.
 * Flow: server obtains an OAuth token bound to the invoice → browser opens the
 * bank's payment widget with that token → bank calls postLink → we verify via
 * the status API and mark the order paid.
 */

export interface HalykConfig {
  test: boolean;
  clientId: string;
  clientSecret: string;
  terminal: string;
  oauthUrl: string;
  statusUrl: string;
  paymentJs: string;
}

export function halykConfig(): HalykConfig {
  const test = process.env.HALYK_TEST !== "0";
  const cfg = {
    test,
    clientId: process.env.HALYK_CLIENT_ID ?? "",
    clientSecret: process.env.HALYK_CLIENT_SECRET ?? "",
    terminal: process.env.HALYK_TERMINAL ?? "",
    oauthUrl: test ? "https://test-epay-oauth.epayment.kz/oauth2/token" : "https://epay-oauth.homebank.kz/oauth2/token",
    statusUrl: test
      ? "https://test-epay-api.epayment.kz/check-status/payment/transaction/"
      : "https://epay-api.homebank.kz/check-status/payment/transaction/",
    paymentJs: test ? "https://test-epay.epayment.kz/payform/payment-api.js" : "https://epay.homebank.kz/payform/payment-api.js",
  };
  return cfg;
}

export function halykEnabled(): boolean {
  const c = halykConfig();
  return !!(c.clientId && c.clientSecret && c.terminal);
}

export interface HalykAuth {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

async function requestToken(extra: Record<string, string>): Promise<HalykAuth> {
  const c = halykConfig();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "webapi usermanagement email_send verification statement statistics payment",
    client_id: c.clientId,
    client_secret: c.clientSecret,
    ...extra,
  });
  const res = await fetch(c.oauthUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Halyk OAuth failed: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()) as HalykAuth;
}

/** Token for creating a payment for a specific invoice (used by the widget). */
export function invoiceToken(p: { invoiceId: string; amount: number; postLink: string; failurePostLink: string }) {
  const c = halykConfig();
  return requestToken({
    invoiceID: p.invoiceId,
    amount: String(p.amount),
    currency: "KZT",
    terminal: c.terminal,
    postLink: p.postLink,
    failurePostLink: p.failurePostLink,
  });
}

export interface HalykTransaction {
  id: string;
  invoiceID: string;
  amount: number;
  currency: string;
  terminal?: string;
  terminalID?: string;
  statusName: string; // NEW | AUTH | CHARGE | CANCEL | REFUND | FAILED | ...
  reason?: string;
  reasonCode?: number;
  cardMask?: string;
  dateTime?: string;
}

/** Ask the bank for the current state of an invoice. */
export async function checkStatus(invoiceId: string): Promise<{ ok: boolean; transaction?: HalykTransaction; raw?: unknown }> {
  const c = halykConfig();
  const auth = await requestToken({ terminal: c.terminal });
  const res = await fetch(`${c.statusUrl}${invoiceId}`, {
    headers: { Authorization: `Bearer ${auth.access_token}` },
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, raw: await res.text() };
  const data = (await res.json()) as { resultCode?: string; transaction?: HalykTransaction };
  if (data.resultCode === "100" && data.transaction) return { ok: true, transaction: data.transaction, raw: data };
  return { ok: false, raw: data };
}

export function isPaidStatus(statusName: string | undefined): boolean {
  return ["AUTH", "CHARGE"].includes((statusName ?? "").toUpperCase());
}

export function isFailedStatus(statusName: string | undefined): boolean {
  return ["FAILED", "CANCEL", "CANCEL_OLD", "REFUND", "REJECT"].includes((statusName ?? "").toUpperCase());
}

/** Bank requires a numeric invoice id, 6–10 digits, unique per terminal. */
export function newInvoiceId(): string {
  return String(Date.now()).slice(-10);
}
