import "server-only";
import { Resend } from "resend";
import type { Transporter } from "nodemailer";
import type { Order } from "@/lib/store/types";
import { formatPrice } from "@/lib/format";
import { STORE } from "@/data/categories";
import { getDictionary } from "@/i18n";
import { siteUrl } from "@/lib/site";

/**
 * Order e-mails. Two ways to send, picked by env vars:
 *  - SMTP_HOST (+ SMTP_PORT, SMTP_USER, SMTP_PASS): any mailbox, e.g. Gmail with an app password
 *    or the domain's mail at the hosting provider;
 *  - RESEND_API_KEY: resend.com with the celinebaby.kz domain verified.
 * Without either, e-mails are only written to the log.
 */

const FROM = process.env.EMAIL_FROM || "Celine Baby <onboarding@resend.dev>";
const NOTIFY = (process.env.ORDER_NOTIFY_EMAIL || STORE.email)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

let smtp: Transporter | null = null;
async function smtpTransport(): Promise<Transporter | null> {
  if (!process.env.SMTP_HOST) return null;
  if (smtp) return smtp;
  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT || 465);
  smtp = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
  });
  return smtp;
}

export function emailMode(): "smtp" | "resend" | "log" {
  if (process.env.SMTP_HOST) return "smtp";
  if (process.env.RESEND_API_KEY) return "resend";
  return "log";
}

export async function sendEmail(to: string | string[], subject: string, html: string, replyTo?: string): Promise<boolean> {
  const recipients = Array.isArray(to) ? to : [to];
  if (!recipients.length) return false;
  try {
    const transport = await smtpTransport();
    if (transport) {
      await transport.sendMail({ from: FROM, to: recipients, subject, html, replyTo });
      return true;
    }
    const key = process.env.RESEND_API_KEY;
    if (key) {
      const { error } = await new Resend(key).emails.send({ from: FROM, to: recipients, subject, html, replyTo });
      if (error) throw new Error(error.message);
      return true;
    }
    console.log(`[email skipped: no SMTP_HOST / RESEND_API_KEY] to=${recipients.join(",")} subject=${subject}`);
    if (process.env.NODE_ENV === "development") {
      const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&")).filter((h) => !h.startsWith("tel:") && !h.includes("wa.me") && !h.includes("instagram"));
      console.log(`[email links] ${links.join(" ")}`);
    }
    return false;
  } catch (e) {
    console.error(`[email] failed to=${recipients.join(",")} subject=${subject}:`, e);
    return false;
  }
}

/* ---------------- templates ---------------- */

type L = "ru" | "kk";
const lang = (o: Order): L => (o.locale === "kk" ? "kk" : "ru");
const tr = (l: L, ru: string, kk: string) => (l === "kk" ? kk : ru);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const C = { burgundy: "#50222c", rose: "#b46b7a", ink: "#3a2c31", muted: "#8a7a7f", line: "#ecdfe2", pink: "#f8e1e6", cream: "#f8eee4" };

function orderTable(order: Order, l: L): string {
  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${C.line}">${esc(i.name)}<br><span style="color:${C.muted};font-size:12px">${esc([i.color, i.size].filter(Boolean).join(" · "))} × ${i.qty}</span></td>
        <td style="padding:10px 0;border-bottom:1px solid ${C.line};text-align:right;white-space:nowrap">${formatPrice(i.price * i.qty)}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;color:${C.ink}">${rows}
    <tr><td style="padding:14px 0;font-weight:bold">${tr(l, "Итого", "Барлығы")}</td><td style="padding:14px 0;text-align:right;font-weight:bold">${formatPrice(order.subtotal)}</td></tr>
  </table>`;
}

function button(href: string, label: string) {
  return `<p style="margin:22px 0"><a href="${esc(href)}" style="display:inline-block;background:${C.burgundy};color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-size:13px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase">${esc(label)}</a></p>`;
}

function layout(title: string, body: string, siteUrl: string, l: L = "ru"): string {
  return `<!doctype html><html lang="${l}"><body style="margin:0;background:${C.cream};padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden">
    <div style="background:${C.burgundy};padding:22px 28px;text-align:center">
      <a href="${esc(siteUrl)}" style="color:#fff;text-decoration:none;font-size:22px;letter-spacing:.18em;text-transform:lowercase">celine baby</a>
    </div>
    <div style="padding:28px;color:${C.ink};font-size:14px;line-height:1.55">
      <h1 style="font-size:20px;margin:0 0 14px;color:${C.ink}">${esc(title)}</h1>
      ${body}
    </div>
    <div style="background:${C.pink};padding:18px 28px;font-size:12px;color:${C.ink};line-height:1.6">
      ${esc(STORE.address)} · ${esc(STORE.hours)}<br>
      <a href="tel:+${STORE.phoneRaw}" style="color:${C.ink}">${esc(STORE.phone)}</a> ·
      <a href="${esc(STORE.whatsapp)}" style="color:${C.ink}">WhatsApp</a> ·
      <a href="${esc(STORE.instagram)}" style="color:${C.ink}">Instagram</a>
    </div>
  </div></body></html>`;
}

function deliveryText(order: Order, l: L) {
  return getDictionary(l).checkout.deliveryMethods.find((m) => m.id === order.delivery)?.title ?? order.delivery;
}

function paymentText(order: Order, l: L) {
  return getDictionary(l).checkout.paymentMethods.find((m) => m.id === order.payment)?.title ?? order.payment;
}

function customerBlock(order: Order) {
  const c = order.customer;
  return `<table role="presentation" style="width:100%;font-size:14px;margin:0 0 18px;background:${C.cream};border-radius:12px;padding:14px 16px">
    <tr><td style="padding:3px 0;color:${C.muted};width:110px">Покупатель</td><td>${esc(c.name)}</td></tr>
    <tr><td style="padding:3px 0;color:${C.muted}">Телефон</td><td><a href="tel:${esc(c.phone)}" style="color:${C.ink}">${esc(c.phone)}</a></td></tr>
    ${c.email ? `<tr><td style="padding:3px 0;color:${C.muted}">E-mail</td><td>${esc(c.email)}</td></tr>` : ""}
    <tr><td style="padding:3px 0;color:${C.muted}">Адрес</td><td>${esc(c.city)}${c.address ? `, ${esc(c.address)}` : ""}</td></tr>
    <tr><td style="padding:3px 0;color:${C.muted}">Доставка</td><td>${esc(deliveryText(order, "ru"))}</td></tr>
    <tr><td style="padding:3px 0;color:${C.muted}">Оплата</td><td>${esc(paymentText(order, "ru"))}</td></tr>
    ${c.comment ? `<tr><td style="padding:3px 0;color:${C.muted}">Комментарий</td><td>${esc(c.comment)}</td></tr>` : ""}
    <tr><td style="padding:3px 0;color:${C.muted}">Аккаунт</td><td>${order.userId ? "зарегистрированный покупатель" : "гость"}</td></tr>
  </table>`;
}

/* ---------------- messages ---------------- */

/** New order: notify the shop and confirm to the customer. */
export async function sendNewOrderEmails(order: Order, siteUrl: string) {
  const admin = `${siteUrl}/admin/orders/${order.id}`;
  const waiting = order.payment === "halyk" ? " · ждёт онлайн-оплату" : "";
  await sendEmail(
    NOTIFY,
    `Новый заказ ${order.id} на ${formatPrice(order.subtotal)}${waiting}`,
    layout(`Новый заказ ${order.id}`, customerBlock(order) + orderTable(order, "ru") + button(admin, "Открыть в админке"), siteUrl),
    order.customer.email,
  );

  const email = order.customer.email;
  if (!email) return;
  const l = lang(order);
  const next =
    order.payment === "halyk"
      ? `<p>${tr(l, "Если оплата ещё не завершена, вернитесь к ней по кнопке ниже.", "Төлем әлі аяқталмаса, төмендегі батырма арқылы оралыңыз.")}</p>${button(`${siteUrl}/${l}/pay/${order.id}`, tr(l, "Оплатить заказ", "Тапсырысты төлеу"))}`
      : `<p>${tr(l, "Менеджер свяжется с вами в ближайшее время и пришлёт счёт для оплаты через Kaspi.", "Менеджер жақын арада сізбен байланысып, Kaspi арқылы төлеуге шот жібереді.")}</p>`;
  await sendEmail(
    email,
    tr(l, `Ваш заказ ${order.id} принят — Celine Baby`, `${order.id} тапсырысыңыз қабылданды — Celine Baby`),
    layout(
      tr(l, `Спасибо за заказ, ${order.customer.name}!`, `Тапсырысыңызға рахмет, ${order.customer.name}!`),
      `<p>${tr(l, `Мы получили ваш заказ <b>${order.id}</b>.`, `<b>${order.id}</b> тапсырысыңызды алдық.`)}</p>` +
        orderTable(order, l) +
        `<p style="color:${C.muted}">${tr(l, "Доставка", "Жеткізу")}: ${esc(deliveryText(order, l))}<br>${tr(l, "Оплата", "Төлем")}: ${esc(paymentText(order, l))}</p>` +
        next,
      siteUrl,
      l,
    ),
  );
}

/** Payment confirmed by the bank (or marked paid by the manager). */
export async function sendPaidEmails(order: Order, siteUrl: string) {
  await sendEmail(
    NOTIFY,
    `Оплачен заказ ${order.id} на ${formatPrice(order.subtotal)}`,
    layout(`Заказ ${order.id} оплачен`, `<p>${order.payment === "halyk" ? "Банк подтвердил оплату, деньги списаны." : "Заказ отмечен оплаченным в админке."}</p>` + customerBlock(order) + orderTable(order, "ru") + button(`${siteUrl}/admin/orders/${order.id}`, "Открыть в админке"), siteUrl),
  );
  const email = order.customer.email;
  if (!email) return;
  const l = lang(order);
  await sendEmail(
    email,
    tr(l, `Оплата заказа ${order.id} получена — Celine Baby`, `${order.id} тапсырысының төлемі алынды — Celine Baby`),
    layout(
      tr(l, "Оплата получена", "Төлем алынды"),
      `<p>${tr(l, `Спасибо! Заказ <b>${order.id}</b> оплачен. Мы соберём его и отправим в течение 48 часов.`, `Рахмет! <b>${order.id}</b> тапсырысы төленді. Біз оны жинап, 48 сағат ішінде жібереміз.`)}</p>` + orderTable(order, l),
      siteUrl,
      l,
    ),
  );
}

/** Status changed in the admin: tell the customer about the steps that matter to them. */
export async function sendStatusEmail(order: Order, siteUrl: string) {
  const email = order.customer.email;
  if (order.status === "paid" && order.payment !== "halyk") return sendPaidEmails(order, siteUrl);
  if (!email) return;
  const l = lang(order);
  const account = order.userId ? button(`${siteUrl}/${l}/account/orders/${order.id}`, tr(l, "Мой заказ", "Менің тапсырысым")) : "";
  if (order.status === "shipped") {
    await sendEmail(
      email,
      tr(l, `Заказ ${order.id} отправлен — Celine Baby`, `${order.id} тапсырысы жіберілді — Celine Baby`),
      layout(
        tr(l, "Заказ в пути", "Тапсырыс жолда"),
        `<p>${tr(l, `Заказ <b>${order.id}</b> передан в доставку. Если появятся вопросы, напишите нам в WhatsApp.`, `<b>${order.id}</b> тапсырысы жеткізуге берілді. Сұрақтар болса, WhatsApp-қа жазыңыз.`)}</p>` +
          orderTable(order, l) +
          account,
        siteUrl,
        l,
      ),
    );
  } else if (order.status === "cancelled") {
    await sendEmail(
      email,
      tr(l, `Заказ ${order.id} отменён — Celine Baby`, `${order.id} тапсырысы жойылды — Celine Baby`),
      layout(
        tr(l, "Заказ отменён", "Тапсырыс жойылды"),
        `<p>${tr(l, `Заказ <b>${order.id}</b> отменён. Если это ошибка или остались вопросы, напишите нам в WhatsApp или позвоните ${esc(STORE.phone)}.`, `<b>${order.id}</b> тапсырысы жойылды. Егер бұл қате болса, WhatsApp-қа жазыңыз немесе ${esc(STORE.phone)} нөміріне қоңырау шалыңыз.`)}</p>`,
        siteUrl,
        l,
      ),
    );
  }
}

export async function sendPasswordResetEmail(to: string, link: string, locale = "ru") {
  const l: L = locale === "kk" ? "kk" : "ru";
  const site = siteUrl();
  return sendEmail(
    to,
    tr(l, "Восстановление пароля — Celine Baby", "Құпиясөзді қалпына келтіру — Celine Baby"),
    layout(
      tr(l, "Восстановление пароля", "Құпиясөзді қалпына келтіру"),
      `<p>${tr(l, "Чтобы задать новый пароль, нажмите кнопку ниже. Ссылка действует 1 час.", "Жаңа құпиясөз орнату үшін төмендегі батырманы басыңыз. Сілтеме 1 сағат жарамды.")}</p>${button(link, tr(l, "Задать новый пароль", "Жаңа құпиясөз"))}<p style="color:${C.muted};font-size:12px">${tr(l, "Если вы не запрашивали восстановление, просто проигнорируйте это письмо.", "Егер сіз сұрамасаңыз, бұл хатты елемеңіз.")}</p>`,
      site,
      l,
    ),
  );
}

/** Admin panel: invitation for a new person or a "forgot password" link. */
export async function sendAdminLinkEmail(to: string, link: string, kind: "invite" | "reset", name = "") {
  const site = siteUrl();
  const hello = name ? `${esc(name)}, здравствуйте!` : "Здравствуйте!";
  const body =
    kind === "invite"
      ? `<p>${hello}</p><p>Вас добавили в админку сайта Celine Baby. Нажмите кнопку и придумайте пароль. Ссылка действует 3 дня.</p>${button(link, "Задать пароль")}<p style="color:${C.muted};font-size:12px">Вход в админку: ${esc(site)}/admin, логин — этот e-mail.</p>`
      : `<p>${hello}</p><p>Кто-то запросил новый пароль для админки Celine Baby. Если это вы, нажмите кнопку. Ссылка действует 1 час.</p>${button(link, "Задать новый пароль")}<p style="color:${C.muted};font-size:12px">Если вы ничего не запрашивали, просто удалите это письмо: пароль останется прежним.</p>`;
  return sendEmail(to, kind === "invite" ? "Доступ к админке Celine Baby" : "Новый пароль для админки Celine Baby", layout(kind === "invite" ? "Доступ к админке" : "Восстановление пароля", body, site));
}
