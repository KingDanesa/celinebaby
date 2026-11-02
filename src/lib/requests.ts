import "server-only";
import { db, dbEnabled } from "@/lib/db";

/** Requests from the site's forms, kept in the database so none is lost if an e-mail fails. */

export type RequestKind = "contact" | "gift";
export type RequestStatus = "new" | "done";

export interface SiteRequest {
  id: number;
  kind: RequestKind;
  status: RequestStatus;
  createdAt: string;
  data: {
    name: string;
    phone: string;
    email?: string;
    message?: string;
    amount?: number;
    format?: string;
    recipient?: string;
    recipientEmail?: string;
    locale: string;
    emailed?: boolean;
  };
}

type Row = { id: string | number; kind: RequestKind; status: RequestStatus; data: SiteRequest["data"]; created_at: Date };
const toRequest = (r: Row): SiteRequest => ({ id: Number(r.id), kind: r.kind, status: r.status, data: r.data, createdAt: r.created_at.toISOString() });

export async function saveRequest(kind: RequestKind, data: SiteRequest["data"]): Promise<number | null> {
  if (!dbEnabled()) return null;
  const [row] = await db()`insert into requests (kind, data) values (${kind}, ${db().json(data as never)}) returning id`;
  return Number(row.id);
}

export async function markEmailed(id: number) {
  await db()`update requests set data = data || '{"emailed": true}'::jsonb where id = ${id}`;
}

export async function listRequests(): Promise<SiteRequest[]> {
  if (!dbEnabled()) return [];
  const rows = await db()<Row[]>`select * from requests order by created_at desc limit 500`;
  return rows.map(toRequest);
}

export async function countNewRequests(): Promise<number> {
  if (!dbEnabled()) return 0;
  const [row] = await db()`select count(*)::int as n from requests where status = 'new'`;
  return row.n as number;
}

export async function setRequestStatus(id: number, status: RequestStatus) {
  await db()`update requests set status = ${status} where id = ${id}`;
}
