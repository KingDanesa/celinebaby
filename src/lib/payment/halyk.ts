import "server-only";
import { randomBytes, timingSafeEqual } from "crypto";

/**
 * Halyk Bank ePay (epayment.kz) API client — a port of the old site's OpenCart module
 * (hbepay 2.0.3): same endpoints, same OAuth fields, same two-stage AUTH → charge flow.
 */

export interface HalykConfig {
  test: boolean;
  clientId: string;
  clientSecret: string;
  terminal: string;
  oauthUrl: string;
  statusUrl: string;
  operationUrl: string;
  paymentJs: string;
}

const SCOPE = "webapi usermanagement email_send verification statement statistics payment";

export function halykConfig(test = process.env.HALYK_TEST !== "0"): HalykConfig {
  // Local bank simulator for automated checks; ignored in live mode.
  const sim = test ? process.env.HALYK_TEST_API?.replace(/\/$/, "") : undefined;
  if (sim) {
    return {
      test,
      clientId: process.env.HALYK_CLIENT_ID ?? "",
      clientSecret: process.env.HALYK_CLIENT_SECRET ?? "",
      terminal: process.env.HALYK_TERMINAL ?? "",
      oauthUrl: `${sim}/oauth2/token`,
      statusUrl: `${sim}/check-status/payment/transaction/`,
      operationUrl: `${sim}/operation/`,
      paymentJs: "https://test-epay.epayment.kz/payform/payment-api.js",
    };
  }
  return {
    test,
    clientId: process.env.HALYK_CLIENT_ID ?? "",
    clientSecret: process.env.HALYK_CLIENT_SECRET ?? "",
    terminal: process.env.HALYK_TERMINAL ?? "",
    oauthUrl: test ? "https://test-epay-oauth.epayment.kz/oauth2/token" : "https://epay-oauth.homebank.kz/oauth2/token",
    statusUrl: test
      ? "https://test-epay-api.epayment.kz/check-status/payment/transaction/"
      : "https://epay-api.homebank.kz/check-status/payment/transaction/",
    operationUrl: test ? "https://test-epay-api.epayment.kz/operation/" : "https://epay-api.homebank.kz/operation/",
    paymentJs: test ? "https://test-epay.epayment.kz/payform/payment-api.js" : "https://epay.homebank.kz/payform/payment-api.js",
  };
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

export interface HttpResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string;
}

async function http<T>(url: string, init: RequestInit, allowEmpty = false): Promise<HttpResult<T>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...(init.headers ?? {}) },
      cache: "no-store",
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data: T | null = null;
    if (text.trim()) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        return { ok: false, status: res.status, data: null, error: "invalid_json" };
      }
    } else if (!allowEmpty) {
      return { ok: false, status: res.status, data: null, error: "empty_response" };
    }
    return res.ok ? { ok: true, status: res.status, data, error: "" } : { ok: false, status: res.status, data, error: `http_${res.status}` };
  } catch (e) {
    return { ok: false, status: 0, data: null, error: e instanceof Error ? e.name : "request_failed" };
  } finally {
    clearTimeout(timer);
  }
}

async function requestToken(extra: Record<string, string>, test?: boolean): Promise<HttpResult<HalykAuth>> {
  const c = halykConfig(test);
  if (!c.clientId || !c.clientSecret || !c.terminal) return { ok: false, status: 0, data: null, error: "credentials_missing" };
  const body = new URLSearchParams({ grant_type: "client_credentials", scope: SCOPE, client_id: c.clientId, client_secret: c.clientSecret, ...extra });
  const res = await http<HalykAuth>(c.oauthUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (res.ok && typeof res.data?.access_token !== "string") return { ...res, ok: false, error: "access_token_missing" };
  return res;
}

/** Token bound to one invoice, handed to the bank's payment form. */
export function invoiceToken(p: {
  invoiceId: string;
  secretHash: string;
  amountMinor: number;
  terminal: string;
  postLink: string;
  failurePostLink: string;
  test: boolean;
}) {
  return requestToken(
    {
      invoiceID: p.invoiceId,
      secret_hash: p.secretHash,
      amount: minorToAmount(p.amountMinor),
      currency: "KZT",
      terminal: p.terminal,
      postLink: p.postLink,
      failurePostLink: p.failurePostLink,
    },
    p.test,
  );
}

export interface HalykTransaction {
  id?: string;
  invoiceID?: string;
  invoiceId?: string;
  amount?: number | string;
  currency?: string;
  terminalID?: string;
  terminalId?: string;
  statusName?: string;
  reference?: string;
  cardMask?: string;
  reason?: string;
  reasonCode?: number;
}

export interface StatusResponse {
  resultCode?: string | number;
  resultMessage?: string;
  transaction?: HalykTransaction;
}

/** Current state of an invoice at the bank. */
export async function requestStatus(invoiceId: string, terminal: string, test: boolean) {
  const token = await requestToken({ terminal }, test);
  if (!token.ok || !token.data) return { ...token, data: null } as HttpResult<StatusResponse>;
  return http<StatusResponse>(`${halykConfig(test).statusUrl}${encodeURIComponent(invoiceId)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token.data.access_token}` },
  });
}

/** Second stage: charge the full blocked amount (POST /operation/{id}/charge). */
export async function requestCharge(halykId: string, terminal: string, test: boolean) {
  const token = await requestToken({ terminal }, test);
  if (!token.ok || !token.data) return { ...token, data: null } as HttpResult<unknown>;
  return http<unknown>(
    `${halykConfig(test).operationUrl}${encodeURIComponent(halykId)}/charge`,
    { method: "POST", headers: { Authorization: `Bearer ${token.data.access_token}` } },
    true,
  );
}

/* ---------------- helpers, same rules as the PHP module ---------------- */

export function generateSecretHash(): string {
  return randomBytes(32).toString("hex");
}

export function secureEquals(known: string, provided: unknown): boolean {
  if (typeof provided !== "string") return false;
  const a = Buffer.from(known);
  const b = Buffer.from(provided);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

/** "12900.00" / 12900 / "12900,5" → minor units (tiyn), rounding the third decimal like the PHP code. */
export function amountToMinor(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const s = String(value).trim().replace(",", ".");
  const m = s.match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) return null;
  const fraction = (m[2] ?? "").padEnd(3, "0");
  let minor = Number(m[1]) * 100 + Number(fraction.slice(0, 2));
  if (Number(fraction[2]) >= 5) minor++;
  return minor;
}

export function minorToAmount(minor: number): string {
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;
}

/** Numeric invoice id, 12 digits (the bank accepts 6–15), unique per terminal. */
export function newInvoiceId(): string {
  return String(Date.now()).slice(-10) + String(Math.floor(Math.random() * 100)).padStart(2, "0");
}

export const INVOICE_RE = /^[0-9]{6,15}$/;
